# Fase 3 — arquitectura de modelos

Estado: EN CURSO. Base: 0db3c484. No iniciar F4.

1. Problema: mezcla de proyección, probabilidad, decisión y presentación; fallback silencioso y periodos sin modelo propio.
2. Importancia: un resultado debe identificar su entrada, modelo, alcance y límites sin cambiar de significado entre API y pantalla.
3. Archivos: nuevo dominio prediction; servidor prediction-service; rutas predict/predict-batch; API Python; separación Elo de tennis/domain; consumidores NBA, pruebas y documentación.
4. Cambio: cinco etapas con contratos versionados, snapshot estricto de F2, modelos registrados explícitamente y abstenciones ante ausencia/incompatibilidad. Ningún entrenamiento nuevo.
5. Riesgos: deshabilitar temporalmente pronósticos antiguos sin trazabilidad; compatibilidad de consumidores; confundir arquitectura probada con precisión demostrada.
6. Verificación: contratos, cadenas controladas, fallos y dimensiones incompatibles, rutas autenticadas, ausencia de fallback, regresión, check y build remoto de rama.
7. Gate: dependencias unidireccionales; resultados fuera de inferencia; presentador sin cálculos de probabilidad/EV; modelos/periodos habilitados explícitos; errores visibles y sin sustituciones silenciosas.

Pendiente de completar acta, pruebas y veredicto. Producción principal no se modifica.
