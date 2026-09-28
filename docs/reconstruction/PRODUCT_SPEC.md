# Especificación conceptual única de NioSports Pro

**Versión conceptual: 1.0.0 · Fecha: 28/09/2026 · Estado: aprobada en Fase 1 como referencia de diseño.**

Esta especificación define el producto que se reconstruirá. **No declara que el programa desplegado ya cumpla estas reglas.** No modifica contratos JSON, bases de datos, modelos, interfaz ni liquidaciones existentes. Las fases siguientes deberán implementarla y demostrar conformidad antes de habilitar las capacidades correspondientes.

Referencias: [plan maestro](../RECONSTRUCTION_MASTER_PLAN.md), [auditoría original](../AUDIT_2026-09-27.md), [casos de aceptación conceptual](PHASE_01_CASES.md), [acta de la fase](PHASE_01.md).

## 1. Propósito, público y límites

NioSports es una plataforma de análisis deportivo previo al partido y registro personal de apuestas y capital. Su función es mostrar contexto trazable, estimaciones explícitas, decisiones justificadas y resultados reconciliables. No ejecuta apuestas en casas, no custodia dinero, no garantiza ganancias y no sustituye el saldo oficial de una casa de apuestas.

Destinatario: usuario adulto que quiere analizar encuentros NBA o tenis individual y registrar su exposición. El alcance territorial/comercial y las condiciones de los proveedores deberán comprobarse en las fases de preparación correspondientes; este documento no declara cumplimiento legal.

Objetivos verificables de producto:
- Una cifra se puede explicar por su evento, corte de datos, modelo y versión.
- Una selección recomendada se puede reconstruir a partir de probabilidad, línea/cuota y política de decisión.
- Ninguna ausencia de datos se transforma en cero, una lesión descartada, una cuota predeterminada ni un pick forzado.
- Cada resultado y movimiento monetario se puede reconciliar sin duplicados y con origen identificado.
- El historial personal permanece privado; solo una edición explícitamente autorizada forma parte del historial público.
- La interfaz diferencia datos reales, entrada manual, simulación, estimación experimental y evidencia validada.

Estos son criterios de conformidad, no promesas de acierto o rentabilidad. La utilidad y superioridad frente a referencias requieren los experimentos y evaluaciones del plan.

## 2. Qué se predice y qué no

**NBA:** una estimación numérica de la suma de puntos de ambos equipos para un periodo definido. Para partido completo, la variable objetivo del producto es el marcador final de ambos equipos, incluidas todas las prórrogas. Una estimación de puntos por sí sola NO es una probabilidad ni una recomendación.

Una probabilidad NBA adicional debe responder a un evento específico: superar, quedar por debajo o igualar una línea concreta del mismo periodo. Requiere un modelo de distribución/probabilidad adecuado y evaluado para ese periodo; no se obtiene una probabilidad defendible solo restando la línea a la proyección.

**Tenis:** el alcance inicial es estimar qué jugador gana un encuentro individual que se completa normalmente, con ambos participantes, superficie, circuito y formato identificados. El Elo actual se investiga para ese objetivo condicionado; no estima la probabilidad de retiro, lesión, walkover, ganador de set o número de juegos. Sus resultados aún son experimentales.

Un calendario, ficha H2H, ranking o estadística de saque es información contextual. Solo se llama variable predictora si interviene realmente en el modelo identificado. La lesión reportada puede motivar abstención; un informe ausente significa desconocido, no jugador sano.

## 3. Diccionario conceptual obligatorio

| Término | Significado único | No debe confundirse con |
|---|---|---|
| Evento deportivo | Encuentro identificado por participantes, competición, formato y tiempo; conserva su identidad al reprogramarse, con revisión trazable | Una línea de apuesta o un resultado |
| Mercado | Regla que define qué se evalúa: deporte, periodo, selección, línea si procede y tratamiento de excepciones | Cualquier selector visible en la web |
| Predicción | Estimación numérica o probabilística versionada, calculada con información disponible al corte | Recomendación de apostar |
| Probabilidad | Estimación de un evento y universo de resultados explícitos, condicionada a datos, modelo y momento | Certeza, calidad del modelo o frecuencia observada de un solo partido |
| Proyección | Estimación de la media esperada de puntos totales del periodo, condicionada al contexto disponible; en puntos, no redondeada a un marcador cierto | Mediana, percentil o porcentaje de acierto; si un candidato estima otro funcional deberá etiquetarlo y versionarlo, no intercambiarlo silenciosamente |
| Decisión | Resultado de aplicar reglas de admisibilidad a una predicción y a un mercado | Salida automática de cualquier modelo |
| Recomendación | Decisión favorable que supera todos los controles de datos, mercado, modelo, valor y política | Favorito con la probabilidad más alta |
| Pick del sistema | Registro inmutable de una recomendación, con selección/mercado/versión/corte/precio/procedencia; existe solo si la decisión es admisible | Un boleto pagado, una simulación o una predicción sin cuota |
| Selección de análisis | Lado/jugador que se explora en un análisis experimental o manual, sin recomendación validada | Pick comercial del sistema |
| Apuesta registrada o ticket | Registro privado de que el usuario asignó un importe a una selección bajo reglas concretas; puede provenir de un pick o ser manual | Apuesta realmente ejecutada por NioSports; publicación pública |
| Línea | Umbral del mercado; está ligado a periodo y momento | Proyección del modelo; no se fabrica alrededor de ella |
| Cuota | Multiplicador decimal del retorno bruto en una apuesta ganadora; formato de entrada siempre explícito | Probabilidad real del evento |
| Value o valor estimado | Expectativa neta positiva según el modelo para una cuota y reglas concretas, bajo condiciones declaradas | Rentabilidad garantizada; diferencia de puntos por sí sola |
| EV | Valor esperado del beneficio neto por unidad de importe o para un importe declarado, con evento/condiciones explícitos | Beneficio ya realizado ni probabilidad |
| Edge en puntos | Proyección menos línea para NBA; signo positivo favorece OVER en esa comparación numérica | Ventaja probabilística ni prueba de value |
| Ventaja probabilística | Diferencia entre probabilidad del modelo y referencia de precio sobre el mismo evento y condicionamiento | Diferencia de puntos o cuota sin margen |
| Acierto | En una selección evaluable, resultado won; tasa = won / (won + lost), con alcance y muestra declarados | MAE, Brier, ROI, push o void |
| Resultado deportivo | Hecho observado: marcador/desenlace/estado del encuentro, con procedencia y revisión | Beneficio o liquidación del ticket |
| Resultado de selección | won/lost/push/void según el resultado deportivo y las reglas congeladas del mercado | Estado del encuentro ni verificación automática por el mero nombre |
| Liquidación | Aplicación contable de un resultado autorizado sobre un ticket, liberando reserva y reflejando retorno/beneficio una sola vez | Cambiar solo el color de una fila |
| Abstención | Decisión de no emitir estimación utilizable o recomendación, con etapa y razones registradas | Probabilidad cero, derrota, error oculto o ticket con importe |
| Error | Fallo de obtención, validación o ejecución; se conserva su causa y posibilidad de reintento | No hay partidos, no hay valor, ni abstención estadística sin explicación |
| Calibración | Concordancia evaluada entre probabilidades y frecuencias en datos admisibles no reutilizados indebidamente | Asignar la etiqueta HIGH a un porcentaje |
| Validado | Afirmación limitada a versión, población, periodo, métrica, protocolo y fecha documentados | Validado universalmente porque pasan pruebas de software |
| Demostración | Datos controlados identificados para enseñar o probar comportamiento, aislados de registros reales | Evidencia de actualidad, cobertura o rendimiento |

Uso de “pronóstico” en interfaz: debe especificar **estimación experimental** o **pick del sistema**; no puede utilizarse para borrar esa distinción. “Confianza alta”, “Elite Value” y niveles equivalentes no acreditan fiabilidad. Un plan Premium/Elite es un derecho de acceso, no una categoría estadística.

## 4. Matriz de capacidades y mercados

“Estado normativo” es lo que esta especificación permite en la reconstrucción; no describe un cambio desplegado hoy. “Admitido experimentalmente” solo autoriza investigación o una presentación claramente experimental después de cumplir sus contratos. Ningún mercado tiene validación comercial acreditada por esta Fase 1.

| ID | Capacidad | Regla exacta de alcance | Situación observada en código | Estado normativo v1 |
|---|---|---|---|---|
| M01 | NBA FULL: proyección de puntos | Suma final de ambos equipos, incluidas prórrogas; solo previo al inicio | Dataset actual_total y modelos/heurística existentes; validación defectuosa | Candidato experimental; requiere contratos y reconstrucción, no probabilidad confiable por defecto |
| M02 | NBA FULL: totales OVER/UNDER | Comparar total FULL con línea exacta; enteros o medios puntos; reglas de prórroga coincidentes | Probabilidades inconsistentes, mercado histórico ausente | Recomendación bloqueada por evidencia; estudio probabilístico experimental |
| M03 | NBA HALF | Primera mitad, suma de Q1+Q2; no segunda mitad ni prórrogas | API aplica factor 0,48 a FULL; no evidencia de modelo/objetivo propios | No soportado predictivamente hasta datos y modelo propios; especificado para futura validación |
| M04 | NBA Q1 | Solo primer cuarto; no fracción estimada del total final | API aplica factor 0,25 a FULL con inconsistencia probabilística | No soportado predictivamente hasta datos y modelo propios |
| M05 | NBA Q2/Q3/Q4, segunda mitad, ganador, hándicap, props | Mercados distintos de M01-M04 | Constantes o nombres parciales no constituyen una cadena validada | Fuera del alcance v1; no anunciar modelo disponible |
| M06 | Combinadas, incluso Q1+HALF+FULL | Evento conjunto que necesitaría dependencia explícita | Multiplicación de probabilidades solapadas | No soportadas por el motor v1; no mostrar probabilidad conjunta inventada |
| M07 | Tenis: ganador individual | Jugador A/B gana un partido completado, prepartido; circuito/superficie/formato explícitos | Elo cronológico experimental 50% general/superficie; no calibrado | Estimación experimental condicionada; no pick comercial validado |
| M08 | Tenis: sets, juegos, hándicap, aces, dobles o en vivo | Objetivos diferentes de ganador individual prepartido | No modelo sustentado en la revisión | Fuera del alcance v1 |
| M09 | Calendario y contexto | Hoy/mañana según zona elegida, filtros, H2H y fichas con fuente/corte/cobertura | UI y demo existentes; proveedor real pendiente | Función informativa; cobertura real no garantizada por una demo |
| M10 | Registro de apuestas y capital | USD en alcance inicial; entrada manual o referencia a pick, siempre privada | Panel ledger existente, integración desde calculadora defectuosa | Capacidad contable a integrar/verificar; no acredita ejecución en una casa |
| M11 | Fútbol, béisbol y otros deportes | Sin modelo auditado en este alcance | Anunciados como próximos | No soportados predictivamente |

Circuitos contemplados en el contexto de tenis: ATP, WTA, Challenger, WTA 125, ITF Men y ITF Women; inclusión en un enum no demuestra cobertura ni calidad por circuito. Superficies iniciales del modelo actual: hard/clay/grass. Indoor/outdoor y formatos a tres/cinco sets no se anuncian como ajustes aprendidos si el motor no los usa; cada segmento necesita evidencia para habilitar recomendación.

Un ticket manual puede registrar una selección no soportada por el motor si se conserva descripción y liquidación manual explícita. Esto no amplía la oferta predictiva ni autoriza liquidación automática de ese mercado.

## 5. Probabilidad: evento, condiciones y reglas

Una probabilidad debe acompañarse conceptualmente de: evento/selección, mercado/periodo/línea cuando proceda, corte, procedencia de datos, modelo/versión, estado de validación y condiciones del universo considerado. El esquema formal vendrá en F2.

### NBA

Para el total entero T y línea L, dentro de encuentros válidos bajo las reglas del mercado:

- p_over = P(T > L), p_under = P(T < L), p_push = P(T = L).
- Las tres están entre 0 y 1 y suman 1, salvo tolerancia numérica declarada.
- Con línea de medio punto, p_push = 0 para un marcador entero.
- Con línea entera, p_push puede ser mayor que cero. No se impone p_under = 1 - p_over ignorando empates.
- Probabilidad ganadora de la selección OVER = p_over; la de UNDER = p_under. Cambiar de lado no cambia el evento observado ni elimina la masa de push.
- Una línea ausente permite estudiar una proyección de puntos, pero impide una probabilidad OVER/UNDER respecto de “la línea”, value y pick.
- Una línea nueva requiere una evaluación nueva vinculada a esa línea. No se reescribe el pick anterior.

Esas probabilidades están condicionadas a que el encuentro/mercado sea válido, salvo que una versión modele explícitamente invalidez. No se presupone probabilidad cero de cancelación. Una distribución continua que no represente push no basta por sí sola para un mercado con línea entera.

### Tenis

Definir q_A = P(A gana | encuentro completado bajo el formato y corte declarados) y q_B = 1 - q_A. Excluir retirados del histórico no demuestra que esa probabilidad condicional esté calibrada: es la hipótesis de producto a evaluar en F11.

- Retiro, walkover, descalificación o abandono no se codifican silenciosamente como derrota para calibrar q_A.
- Para el registro experimental de NioSports, un encuentro que no termina normalmente queda fuera del objetivo y se marca anulado/no evaluable según el contexto. Conservar motivo y contar exclusiones.
- Para un ticket real registrado, aplicar las reglas de la casa que constan en el ticket. Si la casa paga un ganador por retiro, ese resultado contable no demuestra un acierto del modelo condicionado a finalización.
- Si las reglas o el estado son desconocidos, el ticket queda pendiente de revisión, sin liquidación automática.
- Se puede calcular EV condicionado a finalización para investigación, pero no anunciarlo como EV incondicional de la apuesta. El modelo actual no estima probabilidades de retiro ni sus consecuencias contractuales.

Un 60% mostrado no implica que ese partido se gane, ni que haya 60% de “confianza en el motor”. La calibración solo se estudia sobre muchas predicciones elegibles, con incertidumbre y sin selección interesada.

## 6. Precio, valor esperado y selección

La representación conceptual interna será **cuota decimal d > 1**, finita y con procedencia. Americana/fraccional se convierten en los bordes con formato explícito en F8. No se infiere formato solo porque un número sea positivo. Una cuota 1,91 no es exactamente -110: -110 equivale a 1,909090…; el redondeo visual no modifica el precio guardado.

Para importe S y probabilidades del mismo espacio de liquidación:

**EV_condicional(S) = S × [p_won × (d - 1) - p_lost]**.

Aquí se condiciona a que el mercado sea válido; push devuelve el importe y aporta beneficio cero. Si se modela un espacio incondicional que incluye void, su probabilidad también aporta beneficio cero, pero debe estimarse/justificarse y estar etiquetada como otro condicionamiento. No suponer p_lost = 1 - p_won cuando existe push o devolución.

La probabilidad de equilibrio del precio entre resultados decisivos es 1/d. Con push:
- q_decisiva = p_won / (p_won + p_lost), cuando el denominador es positivo.
- edge_prob = q_decisiva - 1/d; expresar en puntos porcentuales.
- Cuota justa del modelo = 1 + p_lost / p_won, si p_won > 0 y el espacio está bien definido.
- Si todo es devolución, no hay ventaja decisiva calculable ni pick.
- 1/d es referencia de precio, no probabilidad verdadera ni cuota “sin margen”. Quitar margen exige precios compatibles de todos los lados y método declarado.
- EV positivo es value estimado, no autorización automática: deben pasar validación, cobertura, frescura, precio y política de decisión.
- Umbrales numéricos de edge/EV, incertidumbre o stake no se inventan en F1. Se fijarán antes de evaluar su rendimiento en las fases correspondientes. Sin política validada no se emite recomendación comercial.

Ejemplo controlado sin push: p_won = 0,60, p_lost = 0,40, d = 1,91, S = 100 → EV = 14,60; referencia de precio 52,356%; ventaja estimada 7,644 puntos porcentuales. No es un pronóstico real.

Ejemplo controlado con push: p_won = 0,52, p_lost = 0,43, p_push = 0,05, d = 1,91, S = 100 → EV = 4,32. Contar ese 5% como derrota daría -0,68, un resultado incorrecto.

La cuota y línea de un pick se congelan al emitirlo; la cuota realmente registrada del ticket puede ser distinta y se conserva separada. Cada EV se calcula respecto de su precio y corte. Si se quiere una nueva recomendación a otro precio, necesita reevaluación de datos y política.

## 7. Del análisis a la apuesta registrada

1. Obtener evento/contexto disponible al corte. Rechazar identidad ambigua, tiempos inválidos y datos posteriores.
2. Intentar predicción del mercado soportado. Registrar error o abstención cuando no procede; no sustituirlos por 50% o cero.
3. Si existe estimación válida, compararla con una línea y precio observados, temporalmente compatibles y bajo reglas explícitas.
4. Aplicar política de decisión: recomendar o abstenerse con razones. Una proyección puede existir aunque no haya recomendación.
5. Solo una recomendación admisible crea pick del sistema. Un análisis experimental puede publicarse como análisis experimental, sin representar un pick validado ni un desempeño comercial.
6. El usuario puede registrar un ticket privado, indicando stake, cuota real y regla, con referencia opcional al pick. Registrar no es enviar una apuesta.
7. Una aceptación contable del ticket reserva el importe. Generar/ver/guardar un análisis no reserva dinero.
8. Cuando existe resultado suficiente, liquidar conforme a reglas del ticket con procedencia manual o verificada. Una corrección posterior se registra como revisión, sin borrar la historia.
9. Publicar métricas sobre el universo declarado; el historial público incluye solo ediciones autorizadas, nunca picks personales por defecto.

Diseño de idempotencia, transacciones y formato de IDs se realizará en F2/F13/F14. Estas son invariantes de producto, no una implementación adelantada del ledger.

### Razones de abstención a distinguir

Datos ausentes, caducados o contradictorios; muestra insuficiente; mercado/periodo no soportado; línea o cuota ausente/incompatible; reglas de liquidación desconocidas; encuentro ya iniciado; incidencia física reportada; modelo/artefacto incompatible; validación insuficiente; incertidumbre no admisible; ausencia de value o umbral no alcanzado.

Separar la etapa: **sin estimación** frente a **estimación disponible pero sin recomendación**. Conservar todas las razones relevantes; no reducir todo a “sin partidos”. Error de servicio puede originar una decisión de no recomendar, pero debe permanecer identificable como error operativo.

## 8. Estados y consecuencias

Los siete estados solicitados pertenecen a entidades diferentes; no se usarán como una única columna indiferenciada. El detalle del esquema corresponde a F2/F13.

| Estado | Entidad y significado | Consecuencia monetaria prevista | Acierto/calibración |
|---|---|---|---|
| pending | Resultado de selección o ticket aún no resoluble; incluye partido aplazado sin dictamen | Si ticket aceptado, reserva continúa; no hay beneficio realizado | Excluir hasta resultado evaluable |
| won | Selección gana bajo regla congelada | Retorno bruto S×d; beneficio S×(d-1); liberar reserva una sola vez | Acierto en universo válido; probabilidad evaluada solo si corresponde al mismo evento |
| lost | Selección pierde bajo regla congelada | Retorno 0; beneficio -S; liberar reserva una sola vez | Fallo en universo válido |
| push | Resultado exactamente igual a línea entera bajo regla de devolución | Retorno S; beneficio 0; liberar reserva | No acierto ni derrota; evaluar como tercera categoría si el modelo la predijo, no convertir en pérdida binaria |
| void | Mercado/ticket anulado según reglas confirmadas, no simple ausencia de fuente | Retorno S; beneficio 0; liberar reserva | Fuera del objetivo válido y separado de pushes; publicar cantidad y motivo |
| cancelled | Cancelación del evento, retirada editorial o cancelación de borrador, cada una con entidad/motivo | Cancelar evento/edición NO liquida automáticamente ticket; aplicar regla confirmada, habitualmente resolver void cuando corresponda | No cuenta como derrota; no borra picks ya emitidos ni apuestas aceptadas |
| abstained | Decisión sin recomendación, o sin estimación según etapa | No crear ticket ni reserva por la abstención | No entra al acierto; sí al registro de cobertura y razones |

Un ticket manual sigue pudiendo registrarse aunque el sistema se abstenga: es otra acción del usuario, con procedencia manual y sin respaldo del motor. Nunca una reserva automática originada por abstained.

Resultado “manual” y resultado “verificado por fuente” son propiedades de procedencia, no sinónimos de won/lost. El historial puede mostrar una ganancia manual sin atribuirla a validación científica.

Aplazado: mantener estado deportivo y horario revisado; reevaluar análisis si los datos cambian. No reutilizar silenciosamente una recomendación con un contexto ya distinto. Reprogramación, cancelación, suspensión o final administrativo no implican una regla universal de devolución; si no hay regla específica verificada, no liquidar automáticamente.

## 9. Reglas de mercado del producto v1

**NBA FULL:** solo aceptar resultados identificados y definitivos cuyo total incluya las prórrogas para ese mercado. En investigación histórica, verificar que la fuente representa ese objetivo; el nombre actual_total no lo prueba por sí solo. Un mercado “solo tiempo reglamentario” es distinto y queda fuera de v1.

**NBA HALF:** primera mitad completada, Q1+Q2 observados. **Q1:** primer cuarto completado observado. Si más tarde se suspendió el partido, la resolución del periodo depende de las reglas registradas; no extrapolar regla FULL. Hoy no están admitidos como capacidad predictiva, aunque se definan sus objetivos para futura investigación.

Para NBA v1 se admiten conceptualmente líneas positivas en incrementos de 0,5. Líneas de cuartos (ej. 220,25), apuestas divididas, cuotas promocionales, comisiones de exchange, cash-out parcial o liquidaciones parciales quedan fuera de la liquidación automática inicial. Conservar registro manual explícito si el usuario necesita seguimiento sin declarar soporte automático.

**Tenis individual:** mercado condicionado a finalización normal; ganador por abandono/walkover/retiro/descalificación no es etiqueta válida del objetivo actual. Reglas de casas que pagan en esos casos solo afectan su ticket correspondiente, no la evaluación del Elo. Superficie/formato/circuito y participantes revisados requieren nueva evaluación; no heredar probabilidades entre partidos.

**Publicación:** retirada editorial conserva el pick y motivo de retirada. No borrar pérdidas ni seleccionar solo casos favorables. Los análisis experimentales, apuestas manuales y picks admisibles tienen cohortes separadas; no sumarlos para un porcentaje atractivo.

## 10. Métricas y dinero: fronteras de significado

- Error de puntos se mide en puntos; no llamarlo “porcentaje de acierto”.
- Probabilidades se evalúan con métricas adecuadas al evento y al tratamiento de push/void. La tasa de acierto de favoritos no mide calibración.
- Tasa de acierto: won/(won+lost); si el denominador es cero, **no disponible**, no 0%. Mostrar además pending, push, void, retirados y abstenciones.
- Beneficio monetario es retorno menos stake; devolución de capital no es beneficio. Depósitos y retiros de capital son flujos externos, no victorias o pérdidas.
- Rendimiento de apuestas y rendimiento sobre capital son distintos; sus denominadores y nomenclatura definitiva se especifican en F6 antes de implementarse. Ninguna pantalla podrá usar “ROI” sin declarar qué divide.
- Cobertura usa un universo elegible definido antes de seleccionar resultados. Mostrar separadamente eventos sin cobertura, sin datos, abstenciones y decisiones válidas.
- Una apuesta manual no entra en rendimiento del modelo. Una apuesta basada en pick a cuota distinta puede tener beneficio personal distinto del rendimiento del pick publicado.
- Actualizar un filtro cambia coherentemente población, gráfica, numerador y denominador.
- Un historial público vacío no acredita 0% de acierto ni actualización diaria. Error, vacío y muestra insuficiente tienen mensajes diferentes.

## 11. Lenguaje de interfaz y fuentes de verdad futuras

Mensajes permitidos cuando sean ciertos: “Estimación experimental, sin calibración demostrada”; “Falta una cuota verificada”; “Mercado no soportado”; “Resultado registrado manualmente”; “Análisis disponible; no se emite recomendación”; “Datos al [fecha/hora/zona]”.

Mensajes prohibidos sin evidencia: “validado” por una demo; “ML” para fórmula heurística; “en vivo” con datos estáticos; “61% de acierto” sin cohorte reproducible; “alto valor” por diferencia de puntos; “todos los partidos” sin cobertura demostrada; “sin lesiones” por ausencia de informes.

La UI presentará los resultados del dominio y su procedencia, sin recalcular probabilidades, cambiar formatos ni completar faltantes. La especificación dirige esos cambios, pero corregir los textos públicos y el código queda para sus fases: no se afirma que hoy estén corregidos.

## 12. Evidencia actual y brechas que deben implementarse

Código revisado al iniciar F1, sin cambios respecto de la aplicación auditada:
- ml/data/feature_engineering.py utiliza actual_total = full_total; collect_historical.py parte de marcadores finales. Aún debe verificarse la semántica y calidad de cada fuente en F2.
- ml/api/main.py contiene factores Q1/HALF y calcula meta_prob antes del escalado: contradice el soporte exigido.
- src/lib/engine/probability.js mezcla recomendación/probabilidad/EV, usa americana y complemento binario: deberá separarse.
- src/lib/engine/settlement.js restringe liquidación automática a FULL/no combo y devuelve win/loss/push: la futura normalización won/lost es un cambio, no se considera ya hecho.
- src/lib/tennis/domain.js filtra completed y devuelve experimental/abstained con calibrated:false: candidato para la interpretación condicionada, no evidencia de calibración.
- src/lib/catalog/domain.js publica análisis experimentales. Su campo selection no se convierte por nombre en recomendación comercial validada.

Prioridad de conformidad: F2 formaliza los datos; F3 separa responsabilidades; F4-F7 reconstruyen/evalúan modelos y probabilidades; F8-F14 conectan precios, decisiones, resultados y capital; F15-F17 sincronizan documentación/interfaz. No actualizar silenciosamente datos históricos con los nuevos significados.

## 13. Versionado y aceptación

Esta versión cierra definiciones conceptuales, no el desempeño. Toda modificación que cambie evento objetivo, tratamiento de prórroga/retiro/push, significado de probabilidad, reglas de resultado o elegibilidad exige versión nueva, justificación e impacto en comparaciones históricas.

F2 tomará esta referencia para crear contratos formales, con mapeo del legado y campos requeridos. Si al implementarla aparece una contradicción, se reabre explícitamente la sección afectada; no se adapta una etiqueta al código defectuoso para evitar corregirlo.

Criterio de F1: glosario completo; mercados y exclusiones explícitos; casos NBA FULL/HALF/Q1 y tenis narrados; flujos y siete estados compatibles; ejemplos de EV/retorno sin ambigüedad; correspondencia entre objetivo, predicción y evaluación. Comprobaciones y límites en el acta F1.
