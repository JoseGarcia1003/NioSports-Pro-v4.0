# Fase 4 — candidatos NBA y ablaciones

Estado: **APROBADA EN PREPARACIÓN TÉCNICA; EVALUACIÓN EMPÍRICA PENDIENTE**. Autorizada y completada el 29/09/2026. Base: 94b190a7. F5 no iniciada.

1. Problema: ensemble histórico sin prueba válida de aporte incremental; mezclaba regresión de puntos con clasificación frente a una mediana artificial.
2. Importancia: complejidad no equivale a valor. Se necesitan referencias simples y candidatos comparables antes de decidir qué conservar.
3. Archivos: nuevo ml/experiments, dependencias aisladas, tests de experimentos y acta/continuidad. Entrenadores, CSV y pesos legacy permanecen intactos.
4. Cambio: candidatos de puntos FULL y configuración reproducible de grupos de variables; ablaciones con dependencias cerradas; interfaz de metamodelo entrenado solo con predicciones fuera de muestra (OOF).
5. Riesgos: fuga entre entrenamiento/evaluación, derivados que reintroducen variables eliminadas, presentar métricas sintéticas como deportivas, dependencias ausentes y resultados no reproducibles.
6. Verificación: ejecutar los modelos reales de las bibliotecas en fixtures explícitos; determinismo, referencia aritmética, aislamiento de escaladores, orden de variables, folds incompatibles, errores sin fallback; preservar hashes del legado.
7. Gate: referencias y todos los candidatos ejecutables, ablaciones coherentes, ensemble preparado para OOF temporal, informe sin ganador ni claims empíricos. F5 define protocolo temporal real y F6 evalúa valor incremental.

## Resultado concreto

Implementación `c76d0bf3`: laboratorio ejecutable en `ml/experiments/`, con las bibliotecas reales de Ridge, XGBoost, LightGBM y MLP. Añade dos medias de referencia, árbol simple, media de los cuatro modelos y stacking de puntos con Ridge. No usa mocks para fingir que los modelos se entrenan. Entorno aislado `.venv-phase4`; dependencias fijadas e independientes del servidor web.

La regresión logística/meta-modelo histórica no se conserva como predictor de puntos: aprendía otra variable objetivo, definida con una mediana artificial. El reemplazo preparado aprende puntos continuos con predicciones OOF. No se afirma que sea mejor hasta F5/F6. Los artefactos antiguos permanecen intactos y deshabilitados.

Se analizaron las 26 columnas, su redundancia y grupos. Once escenarios incluyen baseline, forma, descanso, todas y siete retiradas de grupos. Las derivadas desaparecen si falta cualquiera de sus componentes; así, quitar L5 retira también su suma, diferencia y momentum. El documento [NBA_EXPERIMENTS.md](NBA_EXPERIMENTS.md) detalla cada variable, candidato, supuesto y límite.

## Pruebas y ejecución

| Verificación actual | Resultado | Alcance |
|---|---|---|
| Tests de candidatos | 19 aprobados | Referencias aritméticas, escaladores, determinismo, abstención ante errores, invariancia al retirar descanso y trazabilidad OOF |
| Regresiones Python F2/F3 | 17 aprobadas | Recetas, cuarentena legacy, contratos y proyección |
| Matriz candidatos × escenarios | 68 configuraciones ejecutadas dos veces | Cinco estimadores y media ensemble en 11 escenarios + dos medias invariantes |
| Stacking × escenarios | 11 configuraciones ejecutadas dos veces | 4 folds temporales explícitos y 80 filas OOF; sin usar las 24 filas finales |
| Repeticiones | 79/79 idénticas, 0 advertencias | Mismo entorno, no garantía binaria multiplataforma |
| Dependencias | pip check sin incompatibilidades | Python 3.12, versiones exactas registradas |
| Preservación | 8/8 hashes legacy intactos | CSV original y siete archivos de ml/models |

**36 pruebas actuales aprobadas**, más 79 configuraciones repetidas. No se suman como pruebas nuevas las 539 verificaciones web de F3, que no se repitieron: F4 no cambia `src/`, el servicio web ni sus dependencias. No se requiere una revisión visual nueva para este laboratorio fuera de la aplicación.

El informe completo usa **144 eventos ficticios**, 120 para ajuste y 24 posteriores para comprobación de software. Cada caso se entrena desde cero dos veces. El stacking conserva las proyecciones OOF y los IDs/fechas de cada fold; una prueba reconstruye sus predicciones sin utilizar las etiquetas de las filas pronosticadas. Otra altera las etiquetas finales y comprueba que no cambian las predicciones. Los datos controlados no acreditan procedencia real, representatividad ni tamaño de muestra suficiente para NBA.

Evidencia portable: [CHECKS_PHASE_04.json](CHECKS_PHASE_04.json), con configuración, matriz, hashes de código, fixture y resultados; informe detallado local regenerable en `ml/experiments/output/phase04-fixture-smoke.json`. No se guardaron pesos nuevos ni se conectó proveedor. Job de CI añadido para repetir la matriz, sin afirmar que GitHub Actions ya lo ejecutó.

## Gate, nota y límites

| Criterio F4 | Dictamen |
|---|---|
| Benchmarks simples y todos los candidatos ejecutables | Cumplido con bibliotecas reales y datos ficticios |
| 26 variables analizadas y ablaciones sin reintroducción de derivados | Cumplido en configuración y pruebas |
| Metamodelo preparado para OOF temporal | Cumplido para folds explícitos; particionador real F5 |
| Reproducción y fallos sin sustitución silenciosa | Cumplido en entorno local registrado |
| No escoger ganador sin evaluación válida | Cumplido: ganador y métricas empíricas nulos; servicio no habilitado |

**Nota de preparación: 8/10.** Rúbrica: candidatos/referencias 2/2; grupos y dependencias 2/2; controles de OOF y aislamiento 2/2; reproducibilidad operativa 1/2 (local verificada, ejecución Linux remota pendiente); aplicabilidad real 1/2 (frontera preparada, datos y comparación empírica pendientes). Es juicio técnico del mismo agente, no revisión independiente ni calificación de precisión.

No se ha determinado qué modelo aporta valor, qué variables mejoran el error ni si el ensemble debe conservarse. Los hiperparámetros son una propuesta inicial fijada antes del ensayo, sin optimización. No existe nuevo porcentaje de acierto, calibración, ROI o prueba final independiente. Las notas del producto/modelo de la auditoría permanecen sin actualizar.

## Continuación

F5 deberá implementar el protocolo TRAIN → VALIDACIÓN TEMPORAL → CALIBRACIÓN → TEST FINAL, con ajuste de preprocesadores dentro de cada corte, OOF temporal real y reserva independiente o explícitamente no disponible. No usar el CSV en cuarentena sin resolver su procedencia ni convertir datos ya examinados en test virgen. F6 comparará modelos/ablaciones con métricas e incertidumbre antes de elegir ganador. F5 no se inicia en esta entrega.

Entrega solo en `codex/security-integrity`; `main` y el dominio principal no cambian. El push puede generar una preview automática, pero compilar la web no valida estos experimentos Python.
