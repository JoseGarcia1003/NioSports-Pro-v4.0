# Métricas y comparación de desarrollo — versión 1

Fecha: 29/09/2026. Implementación: `ml/evaluation/`. Alcance: evaluación offline, sin escribir picks, resultados ni movimientos de dinero. El ejecutor de comparación solo acepta fixtures explícitos. Las funciones aritméticas reciben datos canónicos; no autentican por sí mismas la procedencia de una cuota o un resultado.

## Cuatro preguntas diferentes

| Pregunta | Métricas | Lo que no demuestra |
|---|---|---|
| ¿Cuánto falla la proyección de puntos? | MAE, RMSE y sesgo firmado | Probabilidad, acierto de apuestas o beneficio |
| ¿Son coherentes las probabilidades con los resultados? | Brier, log loss, ECE y curvas por clase | Rentabilidad sin precios y reglas de liquidación |
| ¿Qué pasó con las apuestas del universo declarado? | Beneficio, yield, ROI sobre capital, CLV y drawdown | Ventaja estable, causalidad ni retorno futuro |
| ¿Cuántos eventos quedan fuera? | Predicción, abstención, disponibilidad y errores | Calidad de los eventos no observados |

Todas las tasas se devuelven como fracciones: 0,10 significa 10%. Los denominadores vacíos devuelven `null`, nunca un cero que parezca observado. IDs duplicados, valores no finitos y entradas contradictorias producen error. Estas funciones aún no sustituyen los agregados legacy de las pantallas; su integración corresponde a F8/F13/F15.

## A. Proyección numérica

Para cada evento con resultado observado, error = predicción − resultado:

- **MAE:** suma de errores absolutos / número de eventos. Unidad: puntos. Métrica principal fijada en F4 y conservada en F6.
- **RMSE:** raíz de la suma de errores al cuadrado / número de eventos. Unidad: puntos; penaliza más los errores grandes.
- **Sesgo:** suma de errores firmados / número de eventos. Positivo indica sobreestimación promedio; puede ser cero aunque existan errores importantes.

El total se calcula reuniendo los eventos, no promediando indiscriminadamente las medias de bloques de tamaños distintos. No se transforma el total de puntos en una etiqueta binaria contra una mediana inventada. Una proyección de 210 puntos no permite deducir por sí sola una probabilidad de superar 210.

## B. Probabilidades

Cada fila declara un espacio exhaustivo de resultados mutuamente excluyentes y una probabilidad por clase, todas entre 0 y 1 y suma 1 (tolerancia numérica 1e-10). Para una línea entera NBA pueden ser `over`, `under`, `push`; no se elimina push para evaluar una distribución distinta de la pronosticada. La semántica de eventos y las probabilidades admisibles siguen correspondiendo a F7.

**Brier multiclase:** promedio de la suma, sobre todas las clases, de (probabilidad − indicador del resultado)². Convención de suma, rango 0–2. Para dos clases se devuelve además Brier binario = suma multiclase / 2, rango 0–1. No comparar cifras con convenciones diferentes sin convertirlas.

**Log loss:** promedio de −ln(probabilidad asignada al resultado observado), logaritmo natural. Se usa suelo explícito 1e-15 para representación finita; se cuenta por separado cada resultado al que se asignó probabilidad cero. Su pérdida matemática sería infinita: el valor numérico truncado no significa que el error sea aceptable. No se optimizan umbrales de selección con esta función.

**Curvas de calibración:** diez intervalos uniformes por defecto, uno contra el resto para cada clase. Cada intervalo muestra límites, tamaño, probabilidad media y frecuencia observada. Intervalos vacíos conservan n=0 y medias nulas. Intervalos cerrados a izquierda y abiertos a derecha, excepto el último que incluye 1.

**ECE:** media, entre clases, de la suma de diferencias absolutas entre probabilidad media y frecuencia, ponderadas por el tamaño de cada intervalo. Nombre explícito `eceMacroClasswise`; no es el ECE de confianza máxima ni una convención universal. Depende de la partición en intervalos; una cifra baja no prueba calibración ni suficiencia de muestra. Brier/log loss tampoco aíslan exclusivamente calibración.

Resultados pending, void y withdrawn se excluyen con sus recuentos; no pasan a ser derrotas. Una categoría inesperada se rechaza. Una fila excluida no aporta una probabilidad al cálculo. No se ofrecen curvas de modelos deportivos en esta fase porque todavía no existe una distribución admisible: se prueba la aritmética con ejemplos controlados.

## C. Apuestas y capital

Entrada: tickets con ID, referencia de pick, moneda, importe, cuota decimal explícita, estado, fechas y procedencia homogénea (`fixture`, `manual` o `verified`). `verified` es una declaración de entrada que debe autenticar un futuro adaptador; no una certificación otorgada por el evaluador. Mezclar procedencias o monedas se rechaza. Se cuentan tickets y picks distintos con tickets por separado; esto no cuenta recomendaciones que nunca se apostaron.

| Estado | Beneficio en el cálculo | Acierto | Denominador del yield |
|---|---|---|---|
| won | stake × (cuota − 1) | Numerador y denominador | Incluido |
| lost | −stake | Solo denominador | Incluido |
| push | 0 | Excluido | Incluido: hubo exposición y devolución |
| void | Fuera de exposición evaluable | Excluido | Excluido; importe anulado informado aparte |
| pending | No liquidado | Excluido | Excluido; importe pendiente informado aparte |

No se aceptan estados de picks como abstained dentro del estado de un ticket. Retirada/cancelación debe resolverse por las reglas del mercado antes de entrar aquí; no se infiere su liquidación. No hay conversión de cuotas americanas: −110 se rechaza. Una cuota decimal 1,91 conserva su significado.

- **Acierto:** won / (won + lost). No convierte push o void en derrotas.
- **Beneficio:** suma del resultado monetario neto de exposición liquidada. Aritmética Decimal internamente; no sustituye el redondeo de un ledger monetario definitivo.
- **Yield:** beneficio / suma de stakes won, lost y push. No incluye pending ni void. La denominación se fija así para este proyecto; no se devuelve un campo ambiguo llamado simplemente ROI.
- **ROI sobre capital inicial:** beneficio / capital inicial de la misma ventana y moneda. Solo se calcula con capital positivo declarado y sin flujos externos. Depósitos/retiros impiden este cálculo y requieren una metodología posterior de retornos con flujos. No confundir depósito con ganancia.
- **Drawdown realizado:** máxima caída entre un máximo previo del capital inicial + PnL liquidado y su nivel posterior; se informa importe y fracción del máximo correspondiente. Se agrupan liquidaciones del mismo instante antes de medir para evitar un orden artificial. No incluye pérdidas latentes, reservas ni riesgo simultáneo: no es un simulador completo de bankroll. Requiere capital inicial y ausencia de flujos.
- **CLV de precio:** promedio ponderado por stake de (cuota tomada / cuota de cierre − 1), solo cuando ambas corresponden a la misma selección, línea, evento, periodo y reglas mediante `marketKey`, y captura de cierre entre colocación e inicio. Se informa cobertura de cuotas y causas de exclusión. No ajusta margen de la casa, no equivale a EV ni certifica la calidad del proveedor. Una línea distinta se excluye; no se inventa una conversión entre líneas.

Si falta la cuota de cualquier exposición liquidada, **no se publica beneficio, yield o retorno parcial como si representara al conjunto**. Se conservan los IDs afectados y recuentos. Sin exposición liquidada, retorno no disponible. CLV es independiente de haber liquidado el ticket y puede existir para pending si ya existe cierre válido. La ventana, integridad del universo, costes/comisiones y acreditación de fuentes siguen siendo responsabilidades del productor de datos y de F8/F13/F19.

## D. Cobertura

El universo es una fila por evento elegible, definido antes de filtrar por éxito o disponibilidad. Los estados son predicted, abstained, no_data, error y not_covered; toda ausencia de predicción requiere motivo. La disponibilidad de datos es un indicador separado, no inferido de un resultado favorable.

Predicción/universo, abstención/universo, eventos con datos/universo y errores/universo usan el mismo denominador. Un error de servicio permanece como error y no se convierte en abstención estadística ni en “no hay partidos”. Se rechazan predicción sin datos y estado no_data con datos disponibles. El fixture del laboratorio tiene cobertura completa por construcción; no describe cobertura deportiva real.

## Comparación temporal de modelos

El ejecutor `python -m ml.evaluation.run` usa los cortes F5 y evalúa 79 configuraciones: 68 candidatos/escenarios y 11 stacks. Las medias invariantes se ejecutan una sola vez; seis familias se prueban en once escenarios de variables. No se ajustan hiperparámetros después de ver resultados.

Cada configuración predice los mismos 40 eventos de desarrollo, en cuatro bloques, con ajuste independiente a partir del pasado admisible. El stacking genera OOF **dentro del entrenamiento de cada bloque exterior**; no usa OOF generado sobre toda la base para predecir un bloque anterior. El manifiesto conserva fechas, exclusiones, IDs, ajustes internos y proyecciones.

Calibración y reserva final se excluyen antes de leer, copiar, validar o resumir sus variables/resultados. Los tests reemplazan esos valores por objetos no serializables y exigen el mismo informe. Los metadatos se leen para planificar; esto no es abrir sus resultados. No se reutiliza calibración para elegir un modelo.

Se comparan diferencias de MAE/RMSE candidato − referencia sobre los mismos IDs, resultados y bloques. Referencias: media histórica, media móvil, Ridge con todas las variables, árbol simple con todas las variables y el propio candidato con todas las variables. Diferencia negativa significa menor error; ninguna comparación de puntos prueba rentabilidad.

Las ablaciones muestran asociación con el comportamiento de un modelo y un conjunto, no causalidad o importancia universal de una variable. Los derivados se retiran junto con sus componentes según F4.

## Incertidumbre y decisión

Política predefinida: remuestreo pareado de bloques temporales completos, semilla 1729, 2000 repeticiones, intervalo percentil del 95%, mínimo ocho bloques. Los eventos de cada bloque mantienen sus pares y ponderación por número de eventos. El código de intervalos se verifica con ejemplos adicionales; el fixture F5 solo tiene cuatro bloques y devuelve `INSUFFICIENT_TEMPORAL_BLOCKS`.

Incluso con ocho bloques, el intervalo es exploratorio y condicionado a predicciones ya calculadas. No vuelve a entrenar todo el experimento en cada remuestreo; no mide toda la incertidumbre de seleccionar hiperparámetros/modelos ni corrige dependencia entre temporadas. Los bloques pueden mantener dependencia residual. El mínimo de ocho es una guarda operativa, no demostración de suficiencia estadística.

No hay corrección por comparaciones múltiples; por tanto, tampoco hay una regla automática de significancia o ganador entre 79 configuraciones. No se cambia longitud de bloque ni política tras observar la tabla. Antes de una selección empírica habrá que justificar bloques, relevancia práctica mínima, cobertura, incertidumbre y confirmación independiente sobre datos admisibles.

**Decisión actual:** conservar candidatos como experimentales, no seleccionar ganador ni habilitar producción. Se completó la comparación de software; la selección empírica está bloqueada por ausencia de datos deportivos admisibles y suficientes. Una tabla ficticia no decide si conservar o retirar el ensemble real.

## Reproducción y fuentes

Desde la raíz y el entorno aislado F4, crear previamente `ml/experiments/output` si no existe:

```text
.venv-phase4/Scripts/python -m unittest discover -s tests/experiments -v
.venv-phase4/Scripts/python -m unittest discover -s tests/python -v
.venv-phase4/Scripts/python -m ml.evaluation.run > ml/experiments/output/phase06-comparison.json
```

En Linux usar `bin/python`. Progreso por stderr, JSON por stdout. Bibliotecas fijadas, semilla/configuración, versión de métricas, datos permitidos y fuentes se registran con huellas. CI genera el informe; eso no demuestra que un job remoto haya pasado. La salida completa se conserva localmente ignorada y es regenerable.

Referencias primarias consultadas: [métricas scikit-learn 1.5.2](https://scikit-learn.org/1.5/modules/model_evaluation.html), [calibración scikit-learn 1.5.2](https://scikit-learn.org/1.5/modules/calibration.html), [intervalos por bootstrap, SciPy 1.14.1](https://docs.scipy.org/doc/scipy-1.14.1/reference/generated/scipy.stats.bootstrap.html). Los bloques, mínimos, nomenclatura de retorno y límites son decisiones explícitas del proyecto, no garantías proporcionadas por esas bibliotecas. El bootstrap por bloques de este módulo es una implementación propia; no se atribuye a SciPy su tratamiento temporal.
