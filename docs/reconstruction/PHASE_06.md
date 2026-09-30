# Fase 6 — métricas y comparación de desarrollo

Estado: **APROBADA EN DEFINICIÓN Y VERIFICACIÓN TÉCNICA DE MÉTRICAS; SELECCIÓN EMPÍRICA BLOQUEADA POR EVIDENCIA**. Autorizada el 29/09/2026; base 6425f762; implementación 1a3234e1. Esta entrega termina la implementación de F6, no certifica el cierre empírico integral. F7 no iniciada.

1. Problema: métricas históricas mezclan error de puntos, clasificación artificial y retorno sin precios observados.
2. Importancia: la elección del motor requiere comparación sobre los mismos eventos, denominadores explícitos y límites de incertidumbre.
3. Archivos: nuevo ml/evaluation, pruebas tests/experiments, informe regenerable, CI y documentación; sin modificar interfaz, CSV ni pesos legacy.
4. Propuesta: MAE/RMSE, puntuaciones probabilísticas y curvas, rendimiento sobre apuestas/capital, CLV y drawdown por separado; cobertura y abstenciones explícitas. Comparación de candidatos/ablaciones F4 con folds F5, OOF anidado para stacking y diferencias pareadas por bloques.
5. Riesgos: contaminación de calibración/test, comparación de muestras diferentes, pseudoindependencia, escoger ganador entre múltiples pruebas, cuotas/estados faltantes tratados como cero y resultados ficticios interpretados como ventaja real.
6. Verificación: aritmética conocida y contraste con bibliotecas, estados vacíos/parciales, cuotas y mercados incompatibles, incertidumbre determinista, aislamiento de calibración/reserva y ejecución completa de candidatos/ablaciones.
7. Gate: infraestructura y comparación controlada reproducibles; selección empírica exige datos admisibles y evidencia independiente. Registrar el bloqueo de evidencia sin habilitar producción ni afirmar superioridad deportiva.

Política fijada antes de ejecutar: MAE principal, RMSE secundario; referencias histórica/móvil, Ridge y árbol simple. Comparaciones pareadas con referencia histórica y con el mismo candidato usando todas las variables. Intervalos exploratorios del 95% mediante remuestreo de bloques temporales completos; semilla 1729, 2000 repeticiones, mínimo ocho bloques para publicar límites. No ajuste de hiperparámetros ni elección de ganador sobre fixtures. El fixture F5 contiene cuatro bloques de validación: se mostrarán diferencias y el intervalo NO DISPONIBLE por pocos bloques. No acortar bloques después de ver resultados para fabricar intervalos.

## Qué cambió

- `ml/evaluation/metrics.py`: separa errores numéricos, probabilidades, rendimiento de tickets y cobertura. Devuelve muestras, denominadores y estados no disponibles; rechaza entradas contradictorias. Incluye Brier binario/multiclase, log loss, curvas por clase y ECE con convención explícita.
- Beneficio/yield/capital tienen denominadores distintos. Cuotas ausentes bloquean el retorno del conjunto; push, void y pending conservan tratamientos diferentes. No mezcla moneda o procedencias manual/verified/fixture. Distingue número de tickets de picks con tickets; no liquida apuestas ni modifica el ledger.
- `ml/evaluation/comparison.py`: diferencias pareadas de MAE/RMSE; rechaza muestras, objetivos o bloques incompatibles. Bootstrap exploratorio por bloques completos, con mínimo predefinido y sin selección automática.
- `ml/evaluation/run.py`: compara 79 configuraciones sobre los mismos cuatro bloques F5. El stacking genera entrenamiento OOF interno nuevo dentro de cada fold exterior. Calibración y reserva se excluyen antes de leer sus valores.
- CI genera el nuevo informe de comparación. Las pantallas y métricas legacy todavía no consumen este módulo offline: integración F8/F13/F15 pendiente, sin cambios visuales ni publicación comercial.

Definiciones y límites: [EVALUATION_METRICS.md](EVALUATION_METRICS.md). Resultados controlados: [PHASE_06_FIXTURE_RESULTS.md](PHASE_06_FIXTURE_RESULTS.md). Evidencia reproducible: [CHECKS_PHASE_06.json](CHECKS_PHASE_06.json).

## Verificación final

| Comprobación | Resultado |
|---|---|
| Pruebas nuevas F6 | 32 aprobadas: aritmética, bibliotecas de referencia, vacíos, contratos, procedencia, precios, cobertura, incertidumbre y aislamiento |
| Laboratorio F4/F5 | 38 regresiones aprobadas; total de experimentos 70 |
| Contratos Python F2/F3 | 17 aprobadas |
| Total actual | **87 pruebas aprobadas** |
| Comparación | 79 configuraciones × 4 folds exteriores = 316 evaluaciones, cada una sobre 10 eventos; 40 eventos distintos por configuración |
| Repetición | Dos procesos independientes con informe completo idéntico en el mismo entorno |
| Aislamiento | Alterar los valores de calibración/reserva no cambia el informe; objetivos del primer bloque no modifican sus predicciones |
| Stacking | OOF interno pertenece al train de cada fold exterior; no contiene eventos del bloque evaluado |
| Incertidumbre | Ejecución de intervalos probada con ocho bloques controlados; el fixture comparativo de cuatro devuelve no disponible |
| Integridad | Huellas de fuentes y ocho archivos legacy comprobadas; YAML CI válido |

No se repitieron las 539 pruebas web históricas: no se modifica `src/`, build web o dependencias web. CI está configurado; no se afirma ejecución remota verificada. No hubo entrenamiento de los CSV legacy, acceso a API pagada, lectura del test final, exportación de pesos o despliegue.

## Interpretación de los resultados

El informe presenta errores de puntos ficticios, diferencias contra referencias y ablaciones. En el escenario de todas las variables, Ridge produce MAE 3,359 y stacking 3,285; la media móvil produce 2,598. Estas cifras comprueban que el comparador distingue comportamientos; **no justifican escoger ninguno para NBA real**. Los datos fueron construidos para verificar software. No se promueve la complejidad por ser más vistosa ni se interpreta una diferencia pequeña como significancia.

No hay probabilidades deportivas admisibles, cuotas observadas ni tickets reales evaluados: métricas probabilísticas y de decisión del experimento son no disponibles. Sus funciones se verifican por separado con casos controlados. No se publica ROI ficticio.

## Dictamen y límites del cierre

| Criterio F6 | Dictamen |
|---|---|
| Métricas separadas y denominadores explícitos | APROBADO en código offline y pruebas |
| Comparación temporal y ablaciones de candidatos | APROBADO como experimento de software con fixtures |
| Incertidumbre sin falsa precisión ni selección automática | APROBADO: límites e insuficiencia visibles |
| Aislamiento de calibración y reserva final | APROBADO en la ruta probada |
| Selección robusta de un modelo deportivo | **BLOQUEADA POR EVIDENCIA**: datos admisibles, cobertura y tamaño temporal insuficientes |
| Rentabilidad y calidad de probabilidades reales | **NO EVALUADAS**: requieren distribución y datos/precios observados |

**Nota técnica de esta entrega: 8/10.** Métricas/denominadores 2/2; comparación temporal y aislamiento 2/2; pruebas/reproducción 2/2; incertidumbre aplicable 1/2 (método probado, bloques deportivos suficientes ausentes); integración/evidencia real 1/2 (módulo offline sin productores reales). Es juicio del mismo agente, no auditoría externa, acierto ni nota del producto. Las notas de auditoría permanecen intactas.

No se afirma que el gate integral de selección empírica de F6 esté aprobado. Tampoco se modifica el plan para fingir una excepción o contratar una API antes de F19. La decisión técnica fundada es mantener todos los candidatos experimentales y la producción deshabilitada. Para cerrar la selección se necesitan datos admisibles, justificar bloques y relevancia mínima antes de ver resultados, y confirmar evidencia independiente; no basta con ordenar esta tabla ficticia.

## Guardado y continuidad

Cambios solo en la rama `codex/security-integrity`. `main` sigue ab9b63a4 y la página habitual no cambia. El punto de control distingue implementación terminada de selección bloqueada. Al continuar, no repetir esta matriz ni reabrir F4/F5 sin un fallo nuevo; revisar primero el pendiente empírico de F6 y el alcance del siguiente paso. F7 no se inicia automáticamente desde esta entrega.
