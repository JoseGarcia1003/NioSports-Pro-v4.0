# Registro de hallazgos y criterios de cierre

Fecha inicial: 27/09/2026. Actualización 29/09/2026: **26 registros PARCIALES** (H01-H11, H14-H18, H20-H22, H27, H29, H38, H45, H51, H60 y H62); los otros 38 siguen PENDIENTES. Ningún hallazgo compuesto se cierra sin completar todas sus condiciones e integrar sus consumidores. El avance F3-F5 corresponde a la rama de revisión; no corrige todavía la producción principal.

Evidencia del avance: [PRODUCT_SPEC v1.0.0](PRODUCT_SPEC.md), [C01-C38](PHASE_01_CASES.md) y [acta F1](PHASE_01.md). H01/H02 tienen especificación completa, pero quedan pendientes su aplicación al motor, terminología y pantallas; se amplían las fases responsables para evitar un cierre falso. H27/H38/H45/H51/H60 tienen reglas conceptuales que deberán implementarse o validarse posteriormente.

Avance ejecutable F2: [acta](PHASE_02.md), [contrato](DATA_CONTRACT.md), [inventario del legado](LEGACY_DATA_REPORT.json). H06/H08 incorporan F3 para verificar la integración efectiva; el contrato nuevo no certifica rutas antiguas.

| Registro | Parte implementada en F2 | Sigue pendiente |
|---|---|---|
| H03 | Histórico sin mercado identificado y entrenadores/exportador legacy bloqueados | Nueva evaluación sin líneas sintéticas ni rentabilidad supuesta; backtest antiguo aún por retirar |
| H04 | Definiciones y orden de las 26 entradas; nueve composiciones compartidas | Ablaciones temporales y aporte incremental |
| H05 | Diccionario distingue inputs reales de contexto; no incorpora PACE/lesiones por relato | Coherencia del relato público y selección empírica de variables |
| H06 | Metadatos, unidades, versiones y rechazos de tiempo en nuevo contrato | Conectar productores/consumidores, autenticar procedencia y persistir snapshots |
| H07 | Manifiesto de fechas, IDs, filas por año y límites, sin alterar original | Conciliar universo/temporadas/exclusiones; cobertura real no demostrada |
| H08 | Recuentos exactos, agregados recalculados y ventanas anidadas probados; exportador inseguro bloqueado | Exigir la frontera nueva en todo consumidor y verificar completitud del proveedor |

H14/H19 no se declaran resueltos: el manifiesto de datos no es un experimento reproducible completo y frescura no tiene aún política obligatoria. H17/H29 avanzan parcialmente en F3, según la tabla siguiente. H63 continúa pendiente hasta la auditoría final.

### Avance F3: arquitectura y retirada de caminos no admisibles

Evidencia: [arquitectura](MODEL_ARCHITECTURE.md), [acta F3](PHASE_03.md) y tests de arquitectura/API/consumidores. Se distingue retirar una ruta defectuosa de habilitar su reemplazo validado.

| Registro | Parte implementada en F3 | Sigue pendiente |
|---|---|---|
| H06/H08/H17 | API exige referencia a snapshot del servidor y contrato F2; rechaza JSON legacy. Generador no fabrica solicitudes ni picks; calculadora antigua retirada | Productor real, persistencia y recorrido con datos admisibles; resolver de producción sin registros |
| H15 | Periodo forma parte del contrato y del manifiesto; Q1/HALF no soportados; no se transforma FULL en otros periodos | Distribución y validación independiente por capacidad que se pretenda habilitar |
| H16 | Carga exige todos los archivos/hashes/dimensiones; eliminados padding, truncado y sustitución silenciosa | Arranque e inferencia del servicio Python real con artefacto certificado; servicio externo no desplegado en F3 |
| H18 | Retirada la pantalla que llamaba ML a un fallback; presentador no calcula ni atribuye precisión | Revisión completa del relato público en F15 y recorrido de un modelo habilitado |
| H20 | API/generador/calculadora dejan de inventar líneas, cuotas, EV o picks | Precio observado, procedencia, frescura y política de decisión F8/F9 |
| H21 | Un contrato de probabilidad; retirados cálculos activos duplicados de cliente y API | Distribución F7 y replay F10; fórmulas antiguas de engine/backtest todavía conservadas fuera de esas rutas activas |
| H22 | Retirada la calculadora que multiplicaba periodos solapados; contrato actual no ofrece combinadas | Mantener restricción y regresiones integrales en F7/F9/F16 |
| H29 | Elo separado del contexto H2H/saque; demo bajo contrato fixture y feed real sin procedencia suficiente se abstiene | Validación Elo F11, explicaciones F12 y metodología pública F15 |

Fuente: [auditoría completa](../AUDIT_2026-09-27.md), código auditado `ab9b63a4982cdb212c43a5f631507fa839e4e4aa`. Las páginas son las 20 secciones del PDF, delimitadas por `<!-- PAGE -->` en Markdown. Consultar sus referencias E1-E13 para archivos y límites. Las referencias abarcan evidencia observada, revisión de código y pendientes NV: **un NV no se convierte aquí en fallo confirmado**. H62 es una inferencia de planificación explícita a partir de datos ya usados, no una observación de un test nuevo. H63 es un riesgo de proceso.

Los hallazgos compuestos se desglosan en pruebas al iniciar su fase. Ningún ID se cierra por editar documentación solamente si exige funcionamiento. “Fases” indica participación, no autorización para ejecutarlas simultáneamente. El cierre requiere todas sus condiciones; una parte resuelta se registra como PARCIAL, nunca como APROBADA.

| ID | Grupo | Prioridad | Páginas fuente | Fases | Problema o límite | Evidencia exigida para cerrar |
|---|---|---|---|---|---|---|
| H01 | G1 | crítico | 3,17 | 1,7,13 | Objetivo de puntos confundido con acertar una apuesta; reglas de prórroga, empate y retiro incompletas. | Especificación distingue evento, mercado, predicción, decisión y liquidación con ejemplos y exclusiones; implementación y resultados respetan esas reglas. |
| H02 | G1 | alto | 6,14,17 | 1,15,17 | Terminología y categorías HIGH/MEDIUM/ELITE VALUE sugieren fiabilidad no demostrada. | Glosario y matriz separan etiqueta descriptiva, probabilidad estimada y evidencia; textos y pantallas cumplen esa distinción. |
| H03 | G2 | crítico | 3,5 | 2,5,10 | CSV sin líneas reales; mediana global 226 usa también evaluación; ROI presupone -110. | No generar líneas a partir del objetivo; sin mercado histórico, métricas de apuestas no disponibles. |
| H04 | G2 | alto | 3 | 2,4 | 26 variables correlacionadas; no se demuestra su contribución incremental. | Diccionario de las 26 variables y ablaciones temporales por grupos, con resultados adversos. |
| H05 | G2 | alto | 3 | 2,15 | adv_df descargado sin incorporarse; PACE, ratings y lesiones no figuran en el artefacto pese al relato. | Inventario de features coincide con entrada y documentación; fuentes no utilizadas identificadas. |
| H06 | G2 | alto | 3,4,17 | 2,3 | Faltan unidades, procedencia, disponibilidad temporal, faltantes y reglas de actualización. | Diccionario completo y validadores rechazan uso de información disponible después de predicted_at; consumidores aplican la frontera. |
| H07 | G2 | alto | 4 | 2,18,19 | 5.999 filas no conciliadas con universo; exclusiones/cobertura y antigüedad no caracterizadas. | Manifiesto por temporada, duplicados, exclusiones y límites; datos antiguos nunca etiquetados actuales. |
| H08 | G2 | alto | 4 | 2,3 | Ventanas L5/L10/L20 no garantizan ese número de encuentros. | Conservar recuentos efectivos y probar inicio de histórico y muestra insuficiente; consumidores no eluden el contrato. |
| H09 | G3 | crítico | 4 | 5 | Entrenamiento ordena date y CSV usa _date; actual orden correcto, procedimiento frágil. | Validar y ordenar fecha disponible; separar grupos temporales sin cruzar fronteras indebidas. |
| H10 | G3 | crítico | 5 | 4,5 | Stacking aprende de predicciones dentro de muestra. | Cada predicción del meta-modelo tiene train_end anterior a su corte; prueba impide solapamiento. |
| H11 | G3 | crítico | 5 | 5 | Calibración presentada OOS procede de modelos reajustados sobre todos los datos. | Calibración independiente y trazabilidad de índices/fechas; refit no reutiliza el bloque evaluado. |
| H12 | G3 | alto | 5 | 4,5,6 | Ensemble no supera Ridge en MAE archivado; falta comparación robusta. | Benchmarks y ablaciones temporales; elegir modelo simple si no hay mejora consistente y relevante. |
| H13 | G3 | crítico | 5 | 6,7 | Brier/ECE archivados desfavorables; faltan log loss, intervalos y estabilidad; objetivo ECE no es resultado. | Métricas separadas, referencias y rangos temporales; no presentar probabilidades como calibradas sin evidencia. |
| H14 | G3 | alto | 4,8,17 | 4,5,10,15 | Experimento sin manifiesto reproducible completo y fechas públicas de folds incorrectas. | Código/dataset/semilla/entorno/fechas/hiperparámetros registrados; reproducción y documentos coinciden. |
| H15 | G4 | crítico | 5,6 | 3,7 | API ensemble no aplica Platt guardado y probabilidad Q1/HALF compara proyección FULL. | Camino de inferencia explícito por versión y periodo; no escalar FULL arbitrariamente; abstenerse sin modelo válido. |
| H16 | G4 | alto | 6 | 3,7 | Carga parcial sustituye LightGBM por XGBoost; recorta/rellena dimensiones. | Artefacto incompleto o features incompatibles producen error/abstención identificada, nunca sustitución silenciosa. |
| H17 | G4 | crítico | 6,13 | 2,3,7 | /totales y /picks incumplen contrato ML: daysIntoSeason/stats.ml ausentes. | Contrato de solicitud comprobado en ambos flujos; respuesta identifica motor realmente ejecutado. |
| H18 | G4 | crítico | 6 | 7,15 | Heuristic-local aparece como ML en calculadora. | Etiqueta deriva del motor real y prueba cubre remoto, heurístico, error y abstención. |
| H19 | G2 | alto | 6,13 | 2,9 | nba-stats estático de enero; no se rechazan 241 días de antigüedad en la fecha auditada. | Reglas de frescura versionadas y rechazo controlado; sin API se usa fixture identificado, no actualidad ficticia. |
| H20 | G4 | crítico | 6 | 7,8,9 | Líneas/cuota/descanso/lesiones por defecto y líneas derivadas de propia proyección. | Separar entrada manual/demostración/observación; no fabricar mercado ni EV; ausencias bloquean recomendación. |
| H21 | G4 | crítico | 6,8 | 7,10 | Dispersiones divergentes en JS, UI y backtest; ajustes iguales para periodos distintos. | Un solo contrato y propietario del cálculo por periodo; API/UI/replay producen la misma salida. |
| H22 | G4 | crítico | 6 | 7,9 | Combinadas multiplican Q1/HALF/FULL solapados sin modelo conjunto. | Retirar probabilidad conjunta salvo modelo de dependencia evaluado; regresión impide producto ingenuo. |
| H23 | G3 | crítico | 8 | 10 | Backtest usa Math.random, líneas fabricadas, parciales inventados y snapshot actual. | Replay usa exclusivamente cortes históricos y resultados observados; no escribe simulación en evidencia pública. |
| H24 | G5 | alto | 7 | 11 | Elo K=24, mezcla 50/50 y mínimos 20/8 no contrastados empíricamente. | Comparar Elo simple, ranking si existe, parámetros y ablaciones temporales sin selección por test. |
| H25 | G5 | alto | 7 | 11 | Sin evaluación suficiente por ATP/WTA/Challenger/ITF, superficie y formato. | Reportar cobertura, muestras, calidad y abstenciones por segmento; insuficiencia explícita. |
| H26 | G5 | alto | 7 | 11 | Inactividad/decay/retorno tras lesión sin comparación; no hay modelo de gravedad. | Evaluar opciones con historia disponible; lesión desconocida no significa ausencia; no inventar impactos. |
| H27 | G5 | alto | 7 | 1,11,13 | Excluir retiros puede desalinear población objetivo y liquidación de tenis. | Reglas de elegibilidad/retiro verificables; sensibilidad y denominadores documentados. |
| H28 | G5 | medio | 7,10 | 11,17 | Mejor superficie con cinco partidos y métricas de muestras distintas sugieren comparabilidad excesiva. | Denominadores e incertidumbre; no atribuir causalidad; comparar muestras compatibles. |
| H29 | G5 | alto | 7,10 | 11,12,15 | H2H/saque/contexto visible no alimenta Elo; demo no demuestra cobertura. | Separar variables del modelo y contexto; procedencia y límites visibles en salida y ficha. |
| H30 | G5 | alto | 8 | 12 | SHAP ausente; factores heurísticos no explican ensemble; topFactors remoto vacío. | Explicación corresponde a modelo/salida reales; no llamarla SHAP sin cálculo ni presentarla como causal. |
| H31 | G6 | crítico | 13 | 8 | Cuota decimal 1,91 reinterpretada americana 1,0191 en results/stats. | Contrato decimal explícito; conversiones solo en bordes; fixtures verifican beneficio 0,91 por unidad. |
| H32 | G6 | crítico | 12,13 | 6,8,13 | Estados won/lost frente a win/loss; pushes excluidos o codificados como pérdida. | Normalización y reglas únicas para pending/won/lost/push/void/cancelled/abstained sin confundir capas. |
| H33 | G6 | alto | 13 | 6,13 | Calibración admite 10 observaciones frente al texto 50; gráficos/KPI con filtros distintos. | Mismo conjunto elegible y denominadores; tamaño mínimo no se presenta como significancia automática. |
| H34 | G6 | alto | 13 | 6,13 | Resultados personales/manuales y unidades hipotéticas confundibles con retorno verificado. | Separar procedencia, importe, unidad, moneda y verificación en métricas. |
| H35 | G7 | crítico | 10,11 | 14 | Guardar pick y llamar addTransaction retirado permite éxito parcial sin reserva. | Operación coherente e idempotente pick-ticket-reserva con recuperación y conciliación. |
| H36 | G7 | alto | 11 | 14,16 | Persistencia/liquidación con cuenta real y conciliación legado no verificadas. | Ensayo aislado de cuenta y migración reversible; saldo/resultado reconstruibles desde ledger. |
| H37 | G7 | alto | 11,15 | 14,16 | Falta recorrido conjunto ante doble clic, dos pestañas, reintentos y cambio de cuenta. | Inyección de fallos antes/después de commit; sin duplicados, saldo negativo inesperado ni datos cruzados. |
| H38 | G7 | medio | 11 | 1,14,17 | Bankroll USD/manual y demo con dos ganadores y ROI 91,1%. | Alcance monetario explícito; demo mixta identificada sin sesgo promocional ni promesa de retorno. |
| H39 | G8 | crítico | 12 | 13 | Historial público consulta picks privilegiados sin publicación explícita; exposición no observada. | Fuente editorial separada; picks personales nunca públicos por defecto; prueba adversarial A/B. |
| H40 | G8 | crítico | 12 | 13 | Errores devuelven ceros; vacío se muestra 0%; rótulo diario sin timestamp. | Distinguir error/vacío/sin muestra/resultado; última actualización verificable. |
| H41 | G8 | crítico | 12 | 6,8,13 | Historial limitado a 100/60 días y cuota fija -110 distorsiona alcance/ROI. | Cuotas reales por pick, paginación y ventana/denominador declarados; agregados conciliados. |
| H42 | G8 | alto | 10,13 | 9,13 | Catálogo sin edición y recorrido /picks paralelo sin política editorial única. | Una política de elegibilidad/publicación/retiro; cada edición vincula decisión y resultado. |
| H43 | G9 | crítico | 12,14 | 15 | Metodología mezcla v3/v4/heurística y promete OOS/no leakage; coeficientes/ejemplo incorrectos. | Ficha versionada alimenta textos; ecuaciones verificadas y limitaciones reflejan implementación. |
| H44 | G9 | crítico | 12,14 | 15 | ~61% en términos/juego responsable; 400+ picks no garantiza significancia; 95% sin fuente. | Retirar afirmaciones no sustentadas; métricas con experimento, muestra e incertidumbre. |
| H45 | G9 | alto | 11,13 | 1,13,15 | Tracking manual enlazado como validación del modelo. | Renombrar seguimiento personal; evidencia científica procede de registro reproducible y no selectivo. |
| H46 | G9 | alto | 14 | 15,16 | Privacidad niega datos financieros aunque hay bankroll; userId Upstash y anonimización Sentry no aclarados. | Inventario de datos/procesadores y verificación de redacción/retención; texto concordante, sin dictamen legal ficticio. |
| H47 | G9 | alto | 14 | 15 | Recursos de juego responsable no comprobados por jurisdicción/vigencia. | Verificar fuentes oficiales y fecha; conservar advertencias sin estadísticas infundadas. |
| H48 | G10 | alto | 2,9,10 | 18,19 | Agenda NBA no disponible; tenis real exige sesión; cobertura y actualidad no certificadas. | Proveedor pendiente explícito; adaptador preparado sin conectar pago; pruebas reales solo F19. |
| H49 | G10 | alto | 2,11 | 16 | OAuth/correo/recuperación/expiración/retorno y perfiles reales no comprobados. | Flujos de prueba autorizados completos con fallos y aislamiento; ausencia de credencial se registra pendiente. |
| H50 | G10 | alto | 2,12,15 | 16 | Compra/cancelación/webhooks y permisos Free/Pro/Elite de extremo a extremo NV. | Checkout de prueba, eventos repetidos/fuera de orden y acceso posterior; sin operaciones financieras reales. |
| H51 | G10 | alto | 12 | 1,15,16 | Planes no aclaran continuidad/cantidad cuando el catálogo está vacío. | Alcance comercial verificable, expectativas de disponibilidad y restricciones coherentes con servicio. |
| H52 | G10 | alto | 2,15 | 3,16,18 | Versión del motor remoto y operación continua no certificadas; health bloqueado no prueba caída. | Respuesta/health trazan versión; observabilidad de latencia/error/frescura y recuperación probada. |
| H53 | G11 | medio | 9,11,15 | 17 | Marca/logos/paletas distintas; tenis domina login multideporte; hero de cuenta desplaza tareas. | Sistema visual único y jerarquía por tarea; matriz de pantallas/temas sin rediseño prematuro. |
| H54 | G11 | alto | 9,15 | 17 | Auxiliares de 8-11 px; gráficos con contraste sospechoso; revisión accesible incompleta. | Medir contraste/tamaños, teclado/zoom/lector y gráficos en ambos temas; no declarar certificación sin alcance. |
| H55 | G11 | medio | 9,10,14,15 | 17 | Tarjetas genéricas, acceso Free confundible con datos; mezcla de términos/idiomas y navegación duplicada. | Componentes/terminología de F1 uniformes; acceso, cobertura y estado diferenciados. |
| H56 | G11 | alto | 2,15 | 16,17 | Móvil/compatibilidad no auditados por completo; fluidez solo percibida. | Matriz de rutas/anchos/navegadores y estados; medición documentada de carga/interacción. |
| H57 | G10 | alto | 2,15 | 16,18 | Escalabilidad, disponibilidad histórica, LCP/INP/CLS y recuperación externa NV. | Ensayos con carga y condiciones declaradas, monitorización y presupuesto; no convertir objetivos en resultados. |
| H58 | G10 | medio | 15,17 | 20 | SEO efectivo, conversión, retención y necesidades de usuarios sin medición. | Plan de medición separado; informe final conserva NV si no hay muestra, sin nota inventada. |
| H59 | G3 | alto | 3,8,17 | 4,12,15 | Random Forest y SHAP solicitados no existen operativamente; bibliografía incompleta. | Describir modelos realmente usados; RF opcional si comparación lo justifica; fuentes primarias por afirmación. |
| H60 | G1 | alto | 17 | 1,15 | Problema/objetivos/viabilidad formulados sin criterios verificables; no existe tesis entregada. | Delimitar población/uso/éxito y dependencias; evaluación documental del producto, no capítulos inventados. |
| H61 | G10 | crítico | 15,18 | 16 | 453 tests no cubren contratos y flujos que fallan; demo no certifica producción. | Matriz por frontera reproduce fallos de auditoría y documenta qué queda fuera de alcance. |
| H62 | G2 | crítico | 2,4,5; inferencia de planificación | 5,10,19 | Histórico completo ya utilizado/inspeccionado; no es un test final nuevo e intocable. | Declarar evaluación retrospectiva; reservar datos realmente no utilizados o estudio prospectivo; no reciclar test para optimizar. |
| H63 | G1 | alto | 1,2,18 | 0,20 | Riesgo de confundir plan/código/test/demo con producto validado o subir notas sin evidencia. | Gates separados y cierre por evidencia; conservar notas iniciales hasta nueva auditoría. |
| H64 | G10 | alto | 2,15 | 16,20 | Seguridad/privacidad solo revisión parcial; sin prueba de penetración ni auditoría jurídica. | Verificar límites de acceso/autorización y declarar alcance; no anunciar certificaciones inexistentes. |

## Cobertura del documento original

- P1-P2: evaluación, alcance y límites: H49-H52, H56-H58, H61-H64.
- P3: objetivo y variables: H01-H06, H59.
- P4: muestra y división: H07-H09, H14, H62.
- P5: stacking, calibración y métricas: H03, H10-H14, H15.
- P6: inferencia y periodos: H02, H15-H22.
- P7: Elo y limitaciones: H24-H29, H48.
- P8: explicabilidad y backtesting: H14, H23, H30, H59.
- P9: entrada/deportes: H48, H53-H56.
- P10: tenis/catálogo/calculadora: H17-H22, H28-H29, H35, H42.
- P11: cuenta/capital: H35-H38, H45, H49, H53.
- P12: confianza/venta: H39-H44, H50-H51.
- P13: resultados/estadísticas/seguimiento/picks: H17-H19, H31-H34, H42, H45.
- P14: legal/redacción: H02, H43-H47, H55.
- P15: ingeniería/operación: H36-H37, H49-H58, H61, H64.
- P16: diez prioridades: cubiertas por los grupos G1-G11; no son diez problemas adicionales.
- P17: criterios académicos: H01-H14, H24-H30, H43-H47, H58-H60.
- P18: veredicto/preguntas: criterios distribuidos en H01-H64; nota no representa acierto.
- P19-P20: fuentes y verificaciones: referencias preservadas en auditoría; resumen y huellas en CHECKS_PHASE_00.json.

### Avance F4: candidatos y evidencia de software

Evidencia: PHASE_04.md, NBA_EXPERIMENTS.md y CHECKS_PHASE_04.json. No se cierra el desempeño predictivo mediante fixtures.

| Registro | Parte implementada en F4 | Sigue pendiente |
|---|---|---|
| H04 | Once ablaciones ejecutables, con eliminación de derivados; análisis explícito de las 26 variables | Aporte incremental con datos admisibles y evaluación temporal F5/F6 |
| H10 | Stacking de puntos entrenado sobre OOF; se rechazan solapamiento/futuro y bloque de comprobación en sus folds; recibos reproducibles | Protocolo temporal real F5 y comparación independiente F6; pesos legacy siguen bloqueados |
| H14 | Configuración, semilla, entorno, fuentes, fixture y predicciones con hashes; 79 casos repetidos idénticamente | Reproducción del experimento empírico y actualización pública de folds reales |
### Avance F5: aislamiento temporal comprobado

Evidencia: [acta F5](PHASE_05.md), [protocolo](TEMPORAL_VALIDATION.md) y [55 pruebas/evidencia](CHECKS_PHASE_05.json). Sin test final real ni métricas empíricas nuevas. La tabla F4 anterior conserva su alcance histórico.

| Registro | Parte implementada en F5 | Sigue pendiente |
|---|---|---|
| H09 | Fechas UTC estrictas, orden determinista, grupos indivisibles, disponibilidad y embargo | Admisión y procedencia de datos reales; legacy en cuarentena |
| H10 | OOF generado temporalmente e integrado con stacking; no usa calibración ni reserva | Comparación de desarrollo F6 y validación deportiva real |
| H11 | Lote separado ligado al modelo congelado; rechazo de refit, recibos alterados y sustitución por reserva | Distribución/calibrador F7 y verificación empírica independiente |
| H14 | Manifiesto temporal con IDs/cortes, hashes de código y desarrollo, entorno; dos procesos idénticos | Reproducción con datos admisibles, ejecución remota y relato público F15 |
| H62 | Reserva sin lector; estado NO DISPONIBLE, prohibido usarla como lote de calibración; valores excluidos de ejecución | Datos externos/prospectivos realmente independientes y evaluación de versión congelada |

## Estados permitidos y responsabilidad

Responsable de ejecución: agente que retome la fase activa. Revisor técnico: mismo agente mediante pase explícito de auditoría; no equivale a revisión independiente. El propietario conserva decisión de alcance.

Estados: PENDIENTE, EN CURSO, PARCIAL, VERIFICADO, BLOQUEADO POR EVIDENCIA. VERIFICADO exige enlace al cambio, test/experimento, resultado y límite. BLOQUEADO no se convierte en aprobado por falta de credenciales. Una función no sustentable puede retirarse del alcance con explicación y regresiones; conservar el histórico y no borrar datos reales.
