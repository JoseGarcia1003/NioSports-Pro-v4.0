# Contrato probabilístico event-probability-1

30/09/2026. F7 es infraestructura autorizada expresamente tras F6. La selección empírica F6 continúa pendiente; no se habilitan modelos ni recomendaciones comerciales.

## Significado de cada salida

La etapa probabilística del servidor conserva evento, periodo, fecha de corte, hash de la instantánea, ID/hash de la distribución y ID/hash de la proyección que utiliza. Su valor añade versión de contrato, método, variable objetivo, línea, espacio de resultados y condición de finalización. Cambiar los pesos de una proyección conservando su nombre invalida la compatibilidad con su distribución.

| Capacidad | Objetivo y resultados | Estado |
|---|---|---|
| NBA FULL | Total de puntos incluida prórroga; over, under y push respecto de una línea | Contrato y aritmética probados; ningún artefacto real registrado |
| NBA HALF/Q1 y otros parciales | Necesitarían datos/modelos propios | Rechazados antes de ejecutar distribución; no se reescala FULL |
| Tenis MATCH | Ganador A/B condicionado a completar sin retiro; A/B vinculados a participantes | Elo experimental de demostración; feed real legacy se abstiene |
| Combinadas | No se supone independencia entre mercados | Rechazadas; no hay producto de probabilidades |

Solo se admiten líneas NBA enteras o de medio punto. Una línea de cuarto implica reglas de apuesta dividida que este contrato no soporta y se rechaza expresamente. La cuota no entra en el cálculo de probabilidad; permanece fuera de la etapa matemática. El contrato no liquida retiros, void ni cancelaciones: su tratamiento depende de reglas y resultados, no de convertirlos en derrotas del modelo.

## Núcleo común en Python y JavaScript

`src/lib/prediction/distribution.js` y `ml/contracts/probability.py` implementan la misma especificación, comprobada con un único archivo `tests/fixtures/probability-vectors.json`. Además de comparar contra respuestas conocidas, una prueba JS invoca Python y compara ambos resultados con tolerancia 1e-12.

Para NBA se recibe una distribución **explícita de masa sobre totales enteros no negativos**, con totales únicos y masas entre cero y uno cuya suma sea uno (tolerancia numérica 1e-10). No se reconstruye una distribución con una desviación fija de liga. No se truncan colas ni se renormalizan masas faltantes para ocultar entradas incompletas.

- Over suma masas de totales estrictamente mayores que la línea.
- Under suma masas de totales estrictamente menores.
- Push suma la masa exactamente igual a la línea; es cero en medio punto.
- Over + under + push = 1 dentro de tolerancia; por tanto under no es necesariamente 1 − over.

Ejemplo ficticio: masas 0,2 para 200 puntos, 0,3 para 210 y 0,5 para 220. Respecto de 210: over 0,5, under 0,2 y push 0,3. Respecto de 210,5: over 0,5, under 0,5 y push 0. Esto ilustra aritmética, no una distribución NBA estimada.

El adaptador `fixtureTotalDistribution` exige origen y modelo fixture, copia la distribución y comprueba que su esperanza coincide con la proyección. No admite datos observados ni registra automáticamente modelos de producción. La distribución puede describir un ejemplo coherente sin estar ajustada o calibrada con datos deportivos.

Para tenis, el Elo experimental usa una sola función con escala fija 400; el módulo de ratings y los adaptadores nuevos consumen esa función. Los extremos se manejan sin errores de desbordamiento entre lenguajes. Esta correspondencia aritmética no demuestra que el Elo sea calibrado, ni que el peso por superficie o el K sean óptimos: F11 los evalúa.

## Integración y retirada del legado

La ruta de servicio que alimenta API y generador utiliza la etapa versionada. El presentador conserva sus resultados y no recalcula probabilidades. La calculadora legacy ya estaba retirada en F3. La proyección Python sigue siendo una proyección: no se le añade una probabilidad ficticia a su respuesta HTTP. La paridad Python/JS se verifica en el núcleo, sin afirmar haber desplegado un nuevo servicio Python.

Las entradas predictivas legacy `predict`, `predictAllPeriods`, `quickPredict` y el cálculo antiguo de over se bloquean con error explícito. Under, recomendaciones y análisis antiguos dependen de esa entrada y también fallan. Los tests que exigían inferencias legacy se sustituyen por rechazo; los tests de helpers aritméticos/contextuales que no emiten probabilidades se conservan. El historial Git preserva la versión anterior.

El backtest antiguo queda en cuarentena antes de consultar proveedores o escribir resultados: fabricaba líneas y parciales. F10 construirá replay con datos admisibles. El bloqueo no convierte sus archivos históricos en evidencia válida ni los elimina.

El catálogo demo continúa identificado como ejemplo visual; sus porcentajes ilustrativos no se presentan como salidas del nuevo motor. El publicador de tenis real sigue condicionado al análisis admisible y el feed observado legacy se abstiene. Los registros históricos/resultados conservados no se recalculan con el nuevo núcleo; la conciliación de resultados y publicación corresponde a F8/F13/F15. No se afirma una migración integral de esos consumidores.

## Calibración y evidencia pendientes

Todas las nuevas salidas mantienen `calibrated: false`. No hay calibrador entrenado ni validación fuera de muestra sobre datos deportivos. Preparar un lote separado en F5, disponer de métricas en F6 y comprobar aritmética en F7 no equivale a haber calibrado probabilidades.

Para admitir una distribución real hacen falta: proyección seleccionada mediante evidencia admisible, distribución ajustada sin test final, calibración ligada a la versión congelada, evaluación probabilística posterior independiente y trazabilidad de periodo/corte/datos. El test final permanece cerrado. No se evalúa la calibración sobre los mismos datos usados para ajustarla ni se declara validada por un manifiesto autodescrito.

En esta fase se comprueban sumas, cotas, monotonía respecto de la línea, masa de devolución, simetría de Elo, identidad de participantes, igualdad entre lenguajes, aislamiento respecto de cuotas y rechazo de contratos/contextos incompatibles. Son pruebas del software, no porcentajes de acierto o rentabilidad.
