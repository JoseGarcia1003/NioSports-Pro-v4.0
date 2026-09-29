# Laboratorio NBA — protocolo de preparación F4

Versión `nba-candidates-1`, 29/09/2026. Objetivo: proyección continua de **puntos combinados al final del partido, incluidas prórrogas (FULL)**. Sin probabilidades, líneas, cuotas, recomendaciones ni rentabilidad. Especificación ejecutable: `ml/experiments/spec.py`. Estado de servicio F3: deshabilitado para datos reales, sin cambios.

## Qué se reconstruyó y por qué

El código anterior entrenaba modelos de puntos y luego una regresión logística contra una mediana artificial; la calibración reutilizaba información del entrenamiento. Esa cadena no demuestra ventaja sobre una línea del mercado. F4 no rehabilita aquellos pesos ni reabre su entrenamiento: prepara candidatos comparables desde cero en ejemplos ficticios.

El nuevo metamodelo es Ridge de **puntos**, entrenado con proyecciones fuera de muestra generadas desde filas anteriores. Una regresión logística puede tener sentido posteriormente para un objetivo binario definido y observado, pero no se reutiliza aquí como probabilidad de superar una línea que no existe. F7 resolverá la distribución y F8/F9 el mercado y la decisión.

## Candidatos y decisiones previas a la ejecución

| Candidato | Cálculo / configuración | Riesgo y razón para compararlo |
|---|---|---|
| Media histórica | Media del objetivo de las filas de entrenamiento | Referencia global sencilla; no representa una temporada o equipo si la muestra no lo permite |
| Media móvil | Promedio de home_total_l20 y away_total_l20 | Ambas entradas son totales combinados históricos: sumarlas duplicaría la escala |
| Árbol simple | Profundidad 2, mínimo 8 filas por hoja | Referencia no lineal pequeña; puede ser inestable con pocas observaciones |
| Ridge | Estandarización X ajustada solo con train; alpha 10, solver SVD | Referencia regularizada para variables correlacionadas |
| XGBoost | 40 árboles, profundidad 2, tasa 0,05, regularización 10 | Interacciones no lineales; complejidad no prueba mejora |
| LightGBM | 40 árboles, hasta 7 hojas/profundidad 3, tasa 0,05, regularización 10 | Otra familia de árboles; no sustituye silenciosamente a XGBoost |
| MLP | Una capa de 8 neuronas tanh, L-BFGS, alpha 1; X e y escalados solo con train | Candidato neuronal deliberadamente pequeño; fallo de convergencia detiene el experimento |
| Media ensemble | Media igual de Ridge, XGB, LGBM y MLP completos | Control del beneficio de combinar; falla si falta un integrante |
| Stacking de puntos | Los mismos cuatro candidatos y Ridge sobre sus predicciones OOF | Evita entrenar el metamodelo con ajustes dentro de muestra; necesita evaluación posterior independiente |

Semilla 1729; árboles con un hilo; bibliotecas fijadas en requirements.txt. No búsqueda de hiperparámetros, selección automática, early stopping con bloques de evaluación ni reducción de variables según el resultado. Las configuraciones son candidatas iniciales, no ajustes óptimos; el presupuesto de selección temporal se fijará en F5/F6 antes de revisar resultados reales.

## Las 26 variables: significado, dependencia y cuestión pendiente

“Información adicional” es una hipótesis que deberá probarse, no una conclusión del ejercicio sintético.

| Variables (cada nombre identifica una columna) | Grupo / dependencia | Riesgo y comparación necesaria |
|---|---|---|
| home_total_l20, away_total_l20 | Ventana larga: 2 entradas | Referencia relativamente estable; adaptación lenta a cambios |
| home_total_l5, away_total_l5 | Ventana corta: 2 entradas | Más actualidad y más ruido; ventanas solapadas con L10/L20 |
| home_total_l10, away_total_l10 | Ventana intermedia: 2 entradas | Posible redundancia con las dos ventanas anteriores |
| home_home_avg, away_away_avg | Localía: 2 entradas | Tamaño de muestra y definición temporal; no confundir contexto con efecto causal |
| home_std, away_std | Dispersión: 2 entradas | Variabilidad histórica no equivale a incertidumbre calibrada de la predicción |
| home_rest_days, away_rest_days | Descanso: 2 entradas | Topes y fechas reales deben concordar con F2 |
| is_b2b_home, is_b2b_away | Descanso: 2 indicadores | Determinados por descanso cero; información redundante |
| rest_diff | Descanso: 1 diferencia | Redundante con ambos descansos; laboratorio comprueba la identidad aritmética |
| altitude_ft | Contexto: 1 entrada | Puede actuar como identificador indirecto de sede/equipo, no prueba causalidad |
| days_into_season | Contexto: 1 entrada | Riesgo de aprender tendencias de una temporada que no se repitan |
| total_sum_l5, total_sum_l10 | Sumas derivadas: 2 columnas | Redundantes linealmente; no son por sí mismas una proyección de puntos |
| total_diff_l5 | Diferencia derivada: 1 columna | No añade información a un modelo lineal con sus dos componentes |
| momentum_5v10 | Diferencia de las dos sumas: 1 columna | Ventanas solapadas; puede amplificar ruido |
| matchup_volatility | Suma de las desviaciones: 1 columna | No es la desviación del total futuro ni autoriza una distribución normal |
| total_rest | Suma de descansos: 1 columna | Dependencia exacta de dos entradas |
| both_rested, both_b2b | Indicadores conjuntos: 2 columnas | Posibles interacciones; sin aporte demostrado |
| venue_split_diff | Diferencia de localías: 1 columna | Dependencia exacta; exige quitar ambos componentes al retirar el grupo |

Son 17 columnas base del diccionario (incluyendo indicadores y rest_diff) y 9 recetas explícitas, **26 en total**. Se conservan nombres y orden F2. El laboratorio no añade lesiones, ritmo o H2H que no están en estas entradas.

## Matriz de ablaciones ejecutable

| Escenario | Columnas | Pregunta futura |
|---|---:|---|
| baseline | 2 | ¿Cuánto explican los totales L20 de ambos equipos? |
| plus_form | 10 | ¿Mejoran L5/L10 y sus combinaciones? |
| plus_rest | 18 | ¿Añade algo el descanso sobre la forma? |
| all | 26 | ¿Mejora el conjunto completo? |
| without_long | 24 | ¿Hace falta L20 si ya está la forma reciente? |
| without_short | 21 | ¿Hace falta L5? Se retiran suma, diferencia y momentum dependientes |
| without_medium | 22 | ¿Hace falta L10? También desaparece momentum |
| without_venue | 23 | ¿Aporta localía? Se retira su diferencia |
| without_dispersion | 23 | ¿Aportan desviaciones? También se retira su suma |
| without_rest | 18 | ¿Aporta el grupo completo de descanso? Ningún derivado lo reintroduce |
| without_context | 24 | ¿Aportan altitud y avance de temporada? |

Los cinco estimadores aprendidos y la media ensemble se ejecutan en los once escenarios: 66 casos. Las dos medias de referencia, invariantes, se ejecutan una vez: **68 casos**. El stacking se ejecuta también en los once escenarios: **79 configuraciones**, cada una repetida desde cero. Esto no son 79 pruebas de hipótesis ni 79 evidencias deportivas independientes.

No se interpreta que una caída de error sintético demuestre aporte incremental. Las columnas derivadas contienen información ya presente en sus componentes; las ablaciones por grupos responden a retener/eliminar fuentes de información, no atribuyen causalidad ni sustituyen SHAP (F12).

## Frontera de datos y stacking

El ejecutable no ofrece opción de cargar un CSV. Genera 144 eventos inequívocamente ficticios, con vector completo, identificador fixture, fecha de corte, disponibilidad del resultado y objetivo entero. Valida orden, recetas, tipos y coherencia de descanso. **No son snapshots observados certificados por F2**: son vectores de prueba que reutilizan sus definiciones numéricas. Cambiar una etiqueta `origin` no autentica datos; no se expone este laboratorio como API de producción.

Para el ensayo: primeras 120 filas como entrenamiento y 24 posteriores como comprobación de software. Cuatro folds manuales 40→20, 60→20, 80→20 y 100→20 generan 80 filas OOF. Cada predicción exige que todos los resultados usados para entrenar estén disponibles antes de su corte. Duplicados, solapamientos, IDs desconocidos y folds que usan el bloque final se rechazan. El comienzo de 40 filas sin OOF se excluye del ajuste del meta-modelo.

Cada fold ajusta sus modelos y escaladores desde cero. Ridge meta aprende solo de los 80 vectores OOF; después los modelos base se reajustan con las 120 filas para predecir las 24 posteriores. Ese reajuste **no** incluye el bloque de comprobación. El informe conserva IDs, cortes y matriz OOF para reproducirla. No hay calibrador ni test final independiente en F4. El particionador real, grupos simultáneos, temporadas, exclusiones y reserva prospectiva pertenecen a F5.

## Ejecutar y reproducir

Desde la raíz del repositorio, usando Python 3.12 y un entorno virtual:

```text
python -m venv .venv-phase4
.venv-phase4/Scripts/python -m pip install -r ml/experiments/requirements.txt
.venv-phase4/Scripts/python -m unittest discover -s tests/experiments -v
.venv-phase4/Scripts/python -m unittest discover -s tests/python -v
.venv-phase4/Scripts/python -m ml.experiments.run > phase04-fixture-smoke.json
```

En Linux sustituir `Scripts/python` por `bin/python`. CI incluye un job separado con estas bibliotecas y el informe como artefacto de prueba. Su configuración no constituye una ejecución remota aprobada; consultar CHECKS_PHASE_04.json.

El informe contiene configuración, entorno, versiones, hashes de fuentes/fixture, predicciones y recibos OOF. Incluye `selectedWinner: null`, `empiricalMetrics: null` y `productionEnabled: false`. Comprueba igualdad exacta entre repeticiones en el mismo entorno; no promete igualdad binaria entre sistemas o versiones distintas. No guarda modelos nuevos en ml/models ni escribe datos deportivos.

## Qué falta para decidir el mejor modelo

F5/F6 deben aprobar procedencia y población de datos, particiones temporales, preprocesamiento dentro de cada corte, presupuesto de ajuste, métricas MAE/RMSE y umbrales de relevancia antes de abrir resultados. Después se comparará cada candidato con las referencias, por cortes/temporadas y con incertidumbre. Un modelo más complejo solo se conservará con evidencia suficiente; si no mejora, se descarta. Si no hay datos admisibles, no se selecciona ganador.

La calibración de probabilidades y evaluación frente a cuotas reales son preguntas posteriores. Ninguna salida de F4 justifica hablar de porcentaje de acierto o retorno financiero.

Fuentes metodológicas primarias consultadas: [scikit-learn, prevención de fuga y pipelines](https://scikit-learn.org/0.24/common_pitfalls.html) y [StackingRegressor: riesgo de entrenar el metamodelo con predicciones dentro de muestra](https://scikit-learn.org/1.3/modules/generated/sklearn.ensemble.StackingRegressor.html). El laboratorio usa implementación explícita de folds aportados por el llamador; no el CV predeterminado de StackingRegressor. Las versiones consultadas documentan estos principios; las versiones ejecutadas están fijadas en requirements.txt.
