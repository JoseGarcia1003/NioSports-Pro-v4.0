# Plan maestro de reconstrucción de NioSports Pro

Versión 1.4 · 29/09/2026 · Fase actual: **4, APROBADA EN PREPARACIÓN TÉCNICA; EVALUACIÓN EMPÍRICA PENDIENTE**. F0-F3 cerradas; F5-F20 no iniciadas. El propietario autorizó F4 y su continuación; no se inicia F5 en esta entrega.

Este plan sustituye el orden de ejecución de EXCELLENCE_PLAN.md y los siguientes pasos anteriores de WORK_STATE.md. La auditoría original se conserva intacta. Autoridad: [solicitud íntegra del propietario](reconstruction/REQUEST_2026-09-27.md). Acta actual: [Fase 4](reconstruction/PHASE_04.md); [laboratorio NBA](reconstruction/NBA_EXPERIMENTS.md); cierre previo: [Fase 3](reconstruction/PHASE_03.md); [arquitectura](reconstruction/MODEL_ARCHITECTURE.md); cierre previo: [Fase 2](reconstruction/PHASE_02.md); [contrato v1.0.0](reconstruction/DATA_CONTRACT.md); referencia conceptual: [PRODUCT_SPEC v1.0.0](reconstruction/PRODUCT_SPEC.md). [Fase 1](reconstruction/PHASE_01.md) y [Fase 0](reconstruction/PHASE_00.md) históricas. Inventario: [64 hallazgos](reconstruction/FINDINGS.md).

## 1. Mandato y límites

Cadena que debe poder reconstruirse: **DATOS → VARIABLES → MODELO → PROBABILIDAD → LÍNEA/CUOTA → DECISIÓN → PICK → RESULTADO → MÉTRICAS → HISTORIAL → BANKROLL**. Es una cadena de trazabilidad, no un orden literal de llamadas: para calcular una probabilidad de superar una línea, esa línea ya debe existir como entrada.

No se implementa una API deportiva pagada hasta F19. No se compra ningún servicio. No se rediseña la interfaz antes de F17. No se añade un mercado para compensar una inconsistencia. Sin datos suficientes se limita el alcance, se devuelve abstención o se declara pendiente; nunca se fabrica evidencia.

Una prueba de software demuestra un comportamiento en sus condiciones; una demo demuestra una interacción; una API conectada demuestra conectividad; ninguna de ellas demuestra precisión, cobertura, calibración o rentabilidad.

La Fase 0 organizó y verificó el plan. F1 define el producto y sus casos conceptuales. F2 implementa el diccionario y contrato estricto, centraliza nueve recetas y bloquea entrenadores/exportador legacy no certificados. F3 conecta la frontera con APIs y consumidores, separa cinco etapas y retira la inferencia legacy sin trazabilidad. El resolver de producción y los modelos reales siguen sin habilitar; los contratos se verifican con fixtures. No hay validación predictiva nueva ni API deportiva conectada.

## 2. Línea base que no se reescribe

- Producto auditado: commit ab9b63a4982cdb212c43a5f631507fa839e4e4aa.
- Informe y evidencia guardados en a5be119d051c1d3dec09426f0c7286ca1e719478.
- Notas de referencia: global 4,1/10; modelo 3/10 (NBA 2; tenis 4); diseño 7/10.
- 5.999 filas NBA, 26 variables del artefacto; sin línea de mercado histórica en el CSV. Histórico hasta 22/06/2025. No equivale a una muestra comercial representativa verificada.
- 445 pruebas de lógica/servidor y 8 de UI aprobadas durante la auditoría anterior. No ejecutadas de nuevo en F0; no son evidencia predictiva.
- Sitio público auditado y demos examinadas. Cuentas reales, pagos, proveedor, motor Python desplegado y rendimiento objetivo tienen límites expresos.
- No hay resultados nuevos de modelos en esta fase. No aumentar notas del producto por terminar un plan.

## 3. Dependencias técnicas

| Grupo | Problema compartido | Depende de | Fases principales | Componentes actuales afectados en fases futuras |
|---|---|---|---|---|
| G1 | Significado del producto y promesas | Auditoría | 1, 15, 20 | Documentación, etiquetas y contratos de todas las rutas |
| G2 | Datos, fechas, procedencia y variables | G1 | 2, 18, 19 | ml/data, ml-input.js, prediction-input.js, nba-stats.json, tennis-feed.js |
| G3 | Entrenamiento y evidencia científica | G1, G2 | 4, 5, 6, 10 | ml/train, ml/models, backtesting-runner.js |
| G4 | Inferencia, probabilidad y decisión | G1, G2, G3 | 3, 7, 8, 9 | ml/api, api/predict, lib/engine, totales, ai-picks-generator |
| G5 | Tenis y explicaciones fieles | G1, G2, G3, G4 | 11, 12 | tennis/domain.js, fichas, adaptador predictivo |
| G6 | Cuotas, estados y métricas compatibles | G1, G2, G4 | 6, 8, 13 | engine/settlement, results, stats, charts |
| G7 | Reserva y contabilidad | G6 y decisiones versionadas G4 | 14 | stores/data.js, bankroll/workspace.js, API y ledger |
| G8 | Publicación e historial verificable | G4, G6 | 9, 13 | catalog, predictions, picks, public/track-record |
| G9 | Documentación que refleja ejecución | G1-G8 | 15 | methodology, legal, pricing, tracking y fichas |
| G10 | Operación, aislamiento y datos reales | G1-G9 | 16, 18, 19 | Identidad, suscripción, jobs, observabilidad, conectores |
| G11 | Presentación y accesibilidad | Lógica verificada G1-G10 | 17 | Componentes, estilos, navegación y gráficos |

Este grafo no permite trabajo simultáneo: conserva las dependencias para decidir el alcance de cada entrega secuencial.

### Tres conflictos del orden original y su resolución explícita

**F4 necesita F5/F6 para demostrar qué modelo gana.** En F4 se reconstruyen candidatos, benchmarks y ablaciones como experimentos ejecutables, sin seleccionar un ganador ni anunciar mejoras a partir de la validación antigua. Su aprobación es de preparación técnica. La demostración comparativa queda obligatoriamente en F6, después de F5. Si F6 muestra defectos, se reabre F4/F5 y no se pasa a F7. No se declara “NBA validado” al cerrar F4.

**F5 necesita reglas de métricas, y F7 necesita la evaluación de una distribución.** En F3 se especifican entradas/salidas y en F4 se predeclaran objetivos del experimento; F5 construye particiones y ejecuta controles temporales. F6 formaliza los estimadores/denominadores y realiza la comparación de desarrollo sin abrir el test final. F7 evalúa sus probabilidades con ese mismo protocolo. La F5 no anuncia un resultado final ni inventa métricas que corresponden a F6.

**Un test final intocable no puede salir de datos ya examinados.** El conjunto disponible ya se utilizó para entrenar y revisar el sistema anterior. Se puede reutilizar para experimentación retrospectiva, con la limitación declarada. No se rebautiza un tramo como evidencia independiente. F5 define una reserva externa o prospectiva y registra su condición; F10 no la abre antes de congelar todo el sistema que vaya a evaluarse. Si no hay datos independientes, el test final queda NO EJECUTADO hasta F19. No es motivo para inventar cuotas ni para comprar una API antes de tiempo. La plataforma puede quedar técnicamente preparada, con modelo experimental y recomendaciones no habilitadas, sin afirmar validación comercial.

Estas distinciones son condiciones visibles de los gates, no dispensas para marcar como completadas pruebas que faltan. Una incapacidad técnica para cumplir el gate propio de una fase da REQUIERE CORRECCIÓN y detiene el avance.

## 4. Secuencia de fases y puertas de salida

F0/F1 están cerradas en su alcance documental/conceptual, F2 en su alcance técnico y F3 en su alcance arquitectónico. F4 está cerrada en preparación técnica con fixtures; F5-F20 están **NO INICIADAS**. F2/F3 no certifican procedencia real, persistencia remota ni rendimiento predictivo; los productores reales todavía no están conectados. “Archivos” son áreas previstas: la lista exacta y los riesgos se anuncian antes de tocar cada fase. Las rutas nuevas se crean solo cuando corresponda.

| Fase | Problema y cambio previsto | Áreas afectadas | Verificación y criterio de aprobación |
|---|---|---|---|
| 0 | Releer auditoría, inventariar hallazgos, ordenar dependencias y fijar gates | Solo docs y continuidad | Inventario cubre las 20 páginas; cada hallazgo tiene fase y cierre; no se altera app/datos/modelos |
| 1 | Definir evento, probabilidad, pick, value, EV, acierto, resultado y abstención; delimitar mercados | Nueva especificación conceptual, matriz de capacidades | Casos narrados de NBA FULL/HALF/Q1 y tenis ganador; predicción/recomendación/apuesta separadas; prórroga/retiro/push/void sin ambigüedad; mercados no sustentados declarados |
| 2 | Diccionario único y contratos con tiempo de captura/disponibilidad, versión y uso | ml/data; lib/server; contratos compartidos nuevos | Cada variable tiene tipo, unidad, fuente, captura, disponibilidad, deporte/liga/partido/temporada/periodo, faltantes/extremos/actualización y uso train/inferencia; rechazo de futuro, IDs y snapshots inmutables; limitaciones del histórico explícitas |
| 3 | Separar proyección, distribución, decisión, presentación y resultados | API Python/JS, engine, arquitectura documentada | Interfaces versionadas y dependencias unidireccionales; ningún presentador recalcula; incompatibilidad de artefacto no se oculta; qué modelos/periodos están habilitados explícito |
| 4 | Preparar candidatos y ablaciones de las 26 variables | ml/train, configuración de experimentos y tests | Media histórica/móvil, Ridge, referencia simple, XGB, LGBM, MLP y ensemble reproducibles en fixtures; grupos sin/con forma/descanso/todas; metamodelo preparado para OOF; ningún ganador ni superioridad afirmados aún |
| 5 | Reconstruir TRAIN → VALIDATION TEMPORAL → CALIBRATION → TEST FINAL | Particionador, entrenamiento, manifiestos | Fechas y disponibilidad gobiernan cortes; preprocesadores ajustados solo con train; OOF temporal; calibración independiente; cero intersección indebida; test final reservado o NO DISPONIBLE explícito; prohibido el refit que invalida independencia |
| 6 | Separar métricas y ejecutar comparaciones de desarrollo | Evaluación ML, dominio de métricas, reportes | MAE/RMSE; Brier/log loss/ECE/curvas; ROI/yield/CLV/drawdown; cobertura/abstención con denominadores definidos; sin precios no hay retorno; comparación temporal con incertidumbre y ablaciones, decisión técnica fundada; reabrir F4/F5 si falla |
| 7 | Una semántica probabilística por evento/línea/periodo/corte | API Python/JS, predictor, calculadora y consumidores | Misma salida desde fixture común; cotas y suma por espacio de resultados correctas; push considerado cuando proceda; Q1/HALF sin conversión arbitraria desde FULL; sin datos de periodo se deshabilita, no se simula capacidad; combinadas dependientes retiradas |
| 8 | Cuota canónica decimal; conversiones únicamente en bordes | Cuotas, settlement, results/stats, adaptadores | Ejemplos 1,91 y -110; límites/formatos ambiguos rechazados; profit/push/void/stake reconciliados; legado ambiguo en cuarentena, nunca adivinado; ensayo reversible |
| 9 | Decidir solo con evento, precio, datos y modelo admisibles | Nuevo dominio de decisión, catalog, generador, totales | Política versionada de EV/edge/frescura/validación; razón de cada abstención; sin cuota no hay EV; modelo no validado no produce recomendación comercial; decisión separada de ticket |
| 10 | Replay histórico reproducible y aislamiento del backtest sintético | scripts/backtesting-runner.js, replay/evaluación | Corte por partido reconstruido sin futuro; parciales/precios reales o no disponibles; simulaciones solo fixtures; mismas reglas de inferencia/decisión que el programa; huellas y salidas reproducibles; no inventar ROI |
| 11 | Evaluar Elo, superficie, inactividad, lesiones, circuito y formato | tennis/domain.js, evaluación y fixtures | Comparar K/mezcla/decay/mínimos/Elo simple/ranking cuando disponible; retiros/cobertura/calibración/abstención; si no hay histórico suficiente, capacidad experimental limitada y protocolo listo, sin calificación empírica inventada |
| 12 | Explicar el motor realmente usado | Adaptadores de explicación y metadatos | Salida explicada definida: puntos/probabilidad/decisión; versión y features reales; si SHAP, referencia de train y comprobación contra el modelo correspondiente; reglas heurísticas etiquetadas, sin causalidad |
| 13 | Fuente única de resultados y separación pública/personal | settlement, results/stats, catalog, public API | Siete estados solicitados ubicados en su entidad apropiada; publicación explícita y trazable; retiro/corrección auditables; error no es cero; todos los filtros/denominadores/ventanas coinciden; ningún pick personal expuesto por defecto |
| 14 | PICK → STAKE → RESERVA → RESULTADO → LIQUIDACIÓN → BALANCE | Bankroll API/workspace, stores, ledger y migraciones necesarias | Transacción/idempotencia/recuperación, doble clic y pestañas; fallo antes/después de commit; ganada/perdida/push/void y corrección; reservas/profit/balance reconciliados; flujo completo en entorno aislado, sin borrar datos reales |
| 15 | Un relato público que no supere evidencia | Ficha metodológica versionada, metodología/legal/planes/etiquetas | Cada cifra enlaza versión/experimento/corte; no ~61% heredado ni ML falso; tracking no equivale a validación; privacidad concuerda con datos/procesadores; revisar fuentes oficiales cuando corresponda |
| 16 | Matriz integral de pruebas y operación | Tests unitarios/integración/contrato/modelo/datos/E2E; CI; observabilidad | Modelo→API→UI; modelo→pick→results; pick→bankroll; result→statistics; public→registro autorizado; usuarios A/B, anónimo/planes; OAuth y pago de prueba cuando hay acceso; fallos, reintentos, privacidad y conciliación; límites externos pendientes expresos |
| 17 | Unificar UX solo tras estabilizar lógica | Componentes/estilos/navegación/gráficos | Temas, estados, tipografía, términos, teclado/zoom/lector, 360/390/768/1440; carga/interacción medida con condiciones; visualización fiel a estados reales, nunca relleno ficticio |
| 18 | Preparar adaptador sin contratar/conectar API pagada | Contratos/adaptadores, configuración, jobs/observabilidad | Esquema/timestamps/frecuencia/rate limits/cache/error/frescura/cobertura/reconciliación especificados; respuestas controladas válidas, parciales, tardías y revisadas; requisitos de proveedor sin fingir uno seleccionado |
| 19 | Integración final del proveedor y evidencia real | Adaptador aprobado, entorno y pipelines | Credencial aportada por propietario; autenticación/cobertura/precios/lesiones/actualización verificadas; comparación de datos, histórico legítimo si existe y evaluación prospectiva; si cambia método, nueva versión y revalidación |
| 20 | Auditar nuevamente con la misma escala | Informe final y evidencias | Revisión de datos, arquitectura, NBA, tenis, probabilidad/calibración, backtest, explicaciones, decisiones, cuotas/resultados/ledger/historial, seguridad/documentos/UX/operación/comercial; comparar notas con evidencia, mantener NV y sin certificar excelencia universal |

### Límite explícito de aprobación técnica

Fases 2, 5, 10 y 11 pueden cerrar infraestructura verificada con datos controlados o histórico disponible, sin cerrar rendimiento en población real. El acta debe decir **APROBADA TÉCNICAMENTE; VALIDACIÓN EMPÍRICA PENDIENTE**, detallando la capacidad deshabilitada. No sustituye un gate fallido: las pruebas de infraestructura sí deben pasar y los límites sí deben estar implementados.

F16 exige el flujo integrado completo en entorno aislado; fixtures unitarios solos no bastan. Si una prueba externa obligatoria no puede ejecutarse, se registra BLOQUEADA POR EVIDENCIA y se detiene el gate correspondiente, sin pedir la API deportiva antes de F19. Un entorno de pruebas de identidad/pagos no equivale al proveedor deportivo pagado.

F20 no puede aprobar preparación comercial si faltan las pruebas reales de F19 o los recorridos privados/comerciales. El test final evalúa una versión congelada; cambiar variables, reglas, K, umbrales o calibración después de verlo lo convierte en desarrollo y requiere nueva evidencia independiente.

## 5. Registro de evidencias y control de cambios

Cada objeto de la cadena deberá conservar identificadores compatibles y versiones; su esquema definitivo corresponde a F1/F2, no a esta fase. Debe permitir localizar snapshot, features, artefacto, probabilidad/mercado, política, decisión, publicación, resultado y asiento sin recalcular con datos futuros.

Por fase:
1. Abrir acta PHASE_NN con problema, importancia, archivos, propuesta, riesgos, verificación y aprobación.
2. Identificar IDs del registro cubiertos y reproducir el fallo antes de corregir cuando sea posible.
3. Implementar únicamente su alcance; pruebas relevantes y revisión contra la auditoría.
4. Registrar comando, entorno, fecha, resultado y artefacto; distinguir histórico de ejecución nueva.
5. Emitir nota de fase justificada y APROBADA / REQUIERE CORRECCIÓN, con límites empíricos separados.
6. Guardar commit coherente, verificar remoto y actualizar WORK_STATE antes de terminar.
7. Solo después abrir la siguiente fase autorizada. Esta entrega se detiene en F4; el siguiente paso es F5 (particiones y validación temporal), todavía no iniciado. No entrenar el CSV en cuarentena ni declarar un modelo ganador antes de F5/F6.

La aprobación técnica la emite el revisor con criterios comprobados, no el mero paso del tiempo ni un test verde aislado. No implica auditoría independiente. Si el propietario cambia el alcance, registrar la decisión y sus consecuencias antes de ejecutar. No solicitar confirmaciones repetidas para tareas ya autorizadas, pero no atravesar una orden explícita de detenerse en una fase.

## 6. Riesgos y decisiones que se preservan

- **Datos insuficientes:** limitar mercados; no convertir FULL en parciales inventados ni forzar cuotas. Fixtures prueban software, no rentabilidad.
- **Modelo complejo sin mejora:** descartar ensemble si la comparación no aporta evidencia; conservar artefactos antiguos como históricos, no seguir sirviéndolos como validados.
- **Legado ambiguo:** no adivinar moneda, formato de cuota o estado; cuarentena/reconciliación y migración reversible con conservación del original.
- **Privacidad:** la ruta pública auditada sigue siendo un riesgo pendiente; ausencia de filas visibles no prueba aislamiento. No ampliar su publicación durante la reconstrucción.
- **Versiones mezcladas:** experimentos y cambios intermedios en rama de trabajo; no promover una cadena parcialmente migrada a producción.
- **Afirmaciones vigentes:** el sitio principal conserva defectos mientras se reconstruye la cadena en la rama de trabajo. Los contratos nuevos no retiran por sí solos las afirmaciones antiguas. No lanzar campaña ni presentar nuevos porcentajes apoyándose en ellos.
- **Costes y servicios:** ninguna contratación/API de pago en F0-F18; credencial y condiciones comerciales se resuelven al llegar a F19.
- **Tiempo:** no prometer fecha de excelencia ni de validación prospectiva sin conocer volumen y cobertura. Reportar progreso por gates cumplidos, no por cantidad de archivos.

## 7. Condiciones globales para hablar de producto defendible

No deben quedar contradicciones críticas abiertas entre módulos ni exposición personal involuntaria. Las cuotas y liquidaciones deben reconciliarse; las probabilidades deben corresponder a un evento y versión claros; métricas/desempeño deben poder reconstruirse con tiempos y precios observados. Lo no validado debe estar deshabilitado o marcado experimental sin recomendación comercial.

Una mejora del MAE no demuestra rentabilidad. Un ROI favorable sin incertidumbre, cobertura y trazabilidad tampoco demuestra ventaja estable. Los umbrales cuantitativos de aceptación se fijan antes de mirar los resultados nuevos, en las fases metodológicas apropiadas. No se fijan después para favorecer un modelo.
