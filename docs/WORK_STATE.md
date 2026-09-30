# Punto de control — leer antes de continuar

## Reconstrucción — Fase 6 implementada; selección empírica pendiente (29 de septiembre de 2026)

- Autorizada F6 y continuación. Base 6425f762; implementación 1a3234e1; rama codex/security-integrity, main ab9b63a4. Implementación ml/evaluation y 32 pruebas F6; no cambios web, CSV, pesos o servicio desplegado. Consultar Git para commits finales y verificar remoto antes de afirmar guardado.
- Métricas separadas: MAE/RMSE/sesgo, Brier/log loss/ECE/curvas, beneficio/yield/ROI sobre capital/CLV/drawdown, cobertura/abstenciones. Vacíos no son cero, falta de cuotas bloquea retorno completo, moneda/procedencia homogénea, picks y tickets distintos. Integración con pantallas legacy pendiente F8/F13/F15.
- Comparación de 79 configuraciones (68 candidatos + 11 stacks), cuatro folds exteriores, mismos 40 eventos ficticios. Stacking OOF anidado dentro de cada train. Calibración y reserva: valores no leídos. Sin ganador ni métricas deportivas/retornos empíricos. Dos informes idénticos en procesos separados; consultar CHECKS_PHASE_06 para versión final.
- 70 pruebas de experimentos (19 F4 + 19 F5 + 32 F6) y 17 contratos = 87 aprobadas; tras ajuste de metadatos de referencia histórica se repitieron las 32 F6. No repetir las 539 web históricas sin cambios web. CI configurado, ejecución remota no certificada. Ocho hashes legacy preservados.
- APROBADA la definición/verificación técnica; SELECCIÓN EMPÍRICA BLOQUEADA POR EVIDENCIA. No declarar gate integral de F6 aprobado. Nota técnica 8/10, no precisión. Política de incertidumbre previa: 2000 remuestreos pareados, mínimo ocho bloques; fixture solo tiene cuatro, devuelve intervalo no disponible. No cambiarlo para fabricar significancia.
- Documentos: PHASE_06.md, EVALUATION_METRICS.md, PHASE_06_FIXTURE_RESULTS.md y CHECKS_PHASE_06.json. Plan v1.6; inventario 32 parciales/32 pendientes. Informe completo ignorado y regenerable: ml/experiments/output/phase06-comparison.json.
- Guardar entrega solo en rama de trabajo y comprobar push. Main/dominio habitual no cambian; preview web no valida Python.
- Al continuar: leer acta F6 y abordar su pendiente empírico/alcance antes de iniciar F7. La infraestructura de métricas ya está terminada: no rehacerla ni repetir 79 casos sin cambios. No entrenar CSV en cuarentena, no abrir test final, no seleccionar con fixtures, API pagada solo F19. F7 NO INICIADA; no avanzar automáticamente como si la selección real estuviera aprobada.

## Reconstrucción — Fase 5 cerrada técnicamente (29 de septiembre de 2026)

- Usuario autorizó F5. Implementación 1fabe7e5, base 025c9743, rama codex/security-integrity. Main conserva ab9b63a4. Commit posterior de cierre solo documentación/evidencia; consultar Git para SHA final y remoto. Sin cambios en src/, datos/pesos legacy ni producción.
- ml/validation: metadatos UTC, particiones por fechas, grupos indivisibles/simultáneos, disponibilidad y embargo; cuatro bloques de validación y OOF automático. Modelo final usa solo desarrollo admisible; preprocesadores ajustados dentro de train. Lote de calibración autorizado y recibos ligados a modelo congelado; refit y cambio de lote rechazados.
- Calibración PREPARADA, no ajustada: calibratorFitted=false; distribución/calibrador F7. Test final UNAVAILABLE_INDEPENDENT_DATA, sin lector; sus valores no se consumen. No confundir reserva ficticia con evidencia independiente. Ejecutor sigue fixture-only; no abrir CSV en cuarentena.
- 38 tests de experimentos (19 F4 + 19 F5) y 17 contratos Python: 55 aprobados. Dos procesos generaron informe temporal idéntico. 144 filas ficticias: 60 train, 40 validation, 24 calibration, 20 reservadas; 99 train final, 79 OOF en ocho folds. Ocho hashes legacy intactos, fuentes verificadas y YAML CI válido. CI configurado, ejecución remota NO verificada. Las 539 pruebas web F3 son históricas; no se repitieron sin cambios web.
- APROBADA TÉCNICAMENTE; VALIDACIÓN EMPÍRICA PENDIENTE. Nota técnica 8/10, no precisión. Acta PHASE_05.md, protocolo TEMPORAL_VALIDATION.md y CHECKS_PHASE_05.json. Plan v1.5; inventario 26 parciales/38 pendientes. Informe completo ignorado local: ml/experiments/output/phase05-temporal.json, regenerable. No ganador ni nuevas notas del producto/modelo.
- Guardar cierre y verificar push solo en rama de trabajo. Una preview automática de Vercel no valida Python ni implica promoción a producción.
- Próximo «continúa»: abrir F6, anunciar alcance y formalizar métricas/denominadores y comparación temporal de desarrollo con incertidumbre. Sin precios no hay retorno; sin datos admisibles no afirmar superioridad empírica. Mantener test final cerrado, calibración separada, legacy bloqueado y API pagada F19. F6 NO INICIADA. No repetir F5.

## Reconstrucción — Fase 4 cerrada en preparación técnica (29 de septiembre de 2026)

- Usuario autorizó F4 y su continuación. Implementación c76d0bf3, rama codex/security-integrity; base 94b190a7. No cambios en src/, servicio web, CSV ni pesos. Main conserva ab9b63a4. Commit posterior de cierre solo añade documentación/evidencia; consultar Git para SHA final y remoto.
- Laboratorio ml/experiments: medias histórica/móvil, árbol simple, Ridge, XGBoost, LightGBM, MLP, media ensemble y stacking de puntos con OOF. Once escenarios con derivados retirados si falta su componente. No logística contra mediana artificial, no probabilidad/EV ni recomendaciones nuevas. Entorno local .venv-phase4 ignorado, bibliotecas reales fijadas.
- 19 tests de experimentos + 17 de contratos Python = 36 pruebas actuales aprobadas. Matriz de 68 candidatos/escenarios + 11 stacks = 79 configuraciones; cada una repetida desde cero con resultados idénticos, sin warnings. 144 eventos ficticios, 120 train, 24 comprobación y 80 filas OOF. Informe reproducible y hashes en CHECKS_PHASE_04.json; salida completa local ignorada ml/experiments/output/phase04-fixture-smoke.json. pip check correcto, YAML CI validado. Job remoto configurado, NO se afirma que haya ejecutado.
- APROBADA EN PREPARACIÓN TÉCNICA; EVALUACIÓN EMPÍRICA PENDIENTE. Nota de fase 8/10, no precisión. Acta PHASE_04.md y análisis NBA_EXPERIMENTS.md. Plan v1.4; inventario 23 parciales/41 pendientes. No ganador, no aporte incremental demostrado, ningún cambio en notas de auditoría. Ocho hashes legacy preservados; entrenadores continúan en cuarentena.
- No repetir las 539 pruebas web de F3 sin cambios que lo justifiquen; son históricas. No hay despliegue comercial ni servicio Python habilitado por este laboratorio. Una preview automática de Vercel no verifica los modelos.
- Próximo «continúa»: abrir F5 y anunciar alcance. Implementar TRAIN → VALIDACIÓN TEMPORAL → CALIBRACIÓN → TEST FINAL y controles de disponibilidad, OOF y reserva independiente o no disponible. El particionador real y los datos observados siguen pendientes. No usar CSV en cuarentena ni seleccionar ganador antes de F5/F6. F5 NO INICIADA; diseño F17, API pagada F19.
## Reconstrucción — Fase 3 cerrada en alcance arquitectónico (29 de septiembre de 2026)

- Implementación y corrección de contraste guardadas en GitHub: 909d40f5 y 4dcceb27, rama codex/security-integrity. Main sigue ab9b63a4. No confundir rama de revisión con el sitio principal.
- Cinco etapas separadas (proyección, probabilidad, decisión, presentación y resultado); contratos versionados enlazados a snapshots F2. API/generador sin fallback ni EV en cliente; calculadora legacy retirada. /totales informa límites y permite consultar disponibilidad. Elo separado del contexto; demo experimental, feed real no certificado se abstiene.
- Producción sin snapshots/modelos registrados: no se habilitan predicciones comerciales. API Python exige artefacto completo y dimensiones exactas; servicio externo NO desplegado/verificado integralmente. CSV y siete archivos del directorio de modelos preservados por hash. Cuarentena F2 intacta.
- Pruebas: 529 dominio/servidor + 10 UI + 17 Python = 556 aprobadas; check 0 errores/warnings. Tras corrección CSS se repitieron las 10 UI, aprobadas. Vercel READY para el código final 4dcceb27, dpl_8w2UjbdSyvUxHwrSqT6we8nvSUtv. Preview: https://nio-sports-pro-v4-0-gojpae80w-niosports-pros-projects.vercel.app/totales (acceso Vercel). Navegador: disponibilidad/reintento/enlace NBA, contraste claro/oscuro; 1265/375 px efectivos sin overflow; demo tenis etiquetada; consola /totales sin errores observados. No repetir todas las pruebas sin un nuevo cambio que lo justifique.
- Acta PHASE_03.md y CHECKS_PHASE_03.json: APROBADA EN ALCANCE ARQUITECTÓNICO; VALIDACIÓN EMPÍRICA PENDIENTE. Nota de fase 8/10 con rúbrica; notas del producto/modelo sin cambios. Plan v1.3; inventario 21 parciales y 43 pendientes. Commit posterior de cierre solo modifica documentación; consultar Git para SHA final. No repetir F3.
- Próximo paso después del acta aprobada: F4, candidatos/benchmarks/ablaciones bajo fixtures, sin entrenar CSV en cuarentena ni seleccionar ganador antes de F5/F6. Interfaz F17 y API pagada F19.
## Historial: Reconstrucción — Fase 2 cerrada técnicamente (28 de septiembre de 2026)

- Mandato actual: F2, contrato/diccionario único. Implementado: `ml/contracts/dictionary.json` (51 definiciones, 26 NBA); `src/lib/data/contract.js`; `src/lib/server/data-snapshot.js`; `ml/contracts/features.py`; informe de cuarentena del CSV y diccionario legible. Detalles en `docs/reconstruction/DATA_CONTRACT.md`.
- Ventanas con registros y recuentos exactos/coherentes; tiempos de publicación/disponibilidad/captura al corte; unidades/orígenes/alcances; objetivos separados; hashes/revisiones. Nueve composiciones compartidas con API Python. No migración remota ni API pagada. Solicitudes antiguas aún no adaptadas; es pendiente de F3, no funcionalidad ya cerrada.
- Entrenadores legacy y exportador feature_engineering bloqueados antes de imports/escrituras; archivos conservados. CSV original y artefactos no modificados. No quitar bloqueos para continuar usando datos no certificados.
- Verificación final local: 501 pruebas de dominio/servidor, 8 UI y 11 Python aprobadas (520 total, 67 nuevas); svelte-check 0 errores/warnings. Vite compila cliente/servidor, pero el empaquetado adapter-vercel termina en EPERM creando symlink en Windows (exit 1). Build completo verificado remotamente: Vercel READY, dpl_8G1TuYxyQEc7wZsSLxnobAboxZ5r, SHA 768e2d50d132f28e090c84359c3b1fd11b5b7dab. No confundir esa evidencia con un build local correcto ni con pruebas remotas de GitHub Actions.
- Acta PHASE_02.md y CHECKS_PHASE_02.json: APROBADA TÉCNICAMENTE; VALIDACIÓN EMPÍRICA PENDIENTE. Nota de fase 8/10, no cambia notas del producto/modelo. Plan v1.2; inventario 13 parciales y 51 pendientes; no hay cierre integral de hallazgos por introducir un contrato todavía no consumido por toda la app.
- Implementación guardada y remoto comprobado en 768e2d50 (codex/security-integrity); main sigue ab9b63a4. Preview READY: https://nio-sports-pro-v4-0-lctr660up-niosports-pros-projects.vercel.app . El commit posterior de cierre solo modifica documentación; consultar Git para SHA final. Sin promoción a producción.
- Próximo «continúa»: abrir F3 y anunciar alcance; separar proyección/distribución/decisión/presentación/resultados e integrar frontera de contratos y compatibilidad de artefactos. F3 NO INICIADA. No repetir F2, no quitar cuarentena legacy, no API pagada antes de F19 ni rediseño antes de F17.

## Reconstrucción rigurosa — Fase 1 cerrada (28 de septiembre de 2026)

- El propietario autorizó el siguiente paso. F1 completada: `docs/reconstruction/PRODUCT_SPEC.md` v1.0.0, referencia única conceptual; `PHASE_01_CASES.md` con C01-C38; acta `PHASE_01.md`; comprobaciones `CHECKS_PHASE_01.json`.
- APROBADA en alcance conceptual, nota de fase 8/10; notas de producto/modelo sin cambios. Solo documentación, no correcciones funcionales ni despliegue. F2-F20 no iniciadas.
- Decisiones: proyección NBA es media esperada en puntos; FULL incluye prórrogas, HALF primera mitad, Q1 primer cuarto. FULL y ganador individual de tenis son experimentales; Q1/HALF no soportados predictivamente sin datos/modelos propios; combinadas y otros mercados fuera de v1. No confundir estado normativo con lo ya desplegado.
- Probabilidad NBA separa over/under/push; Elo se interpreta como estimación experimental condicionada a finalización. Retiro y reglas de casa no se convierten en acierto del Elo. EV usa victoria/derrota/devolución coherentes; cuota decimal interna; pick, análisis y ticket distintos; abstención no reserva capital. Resultado manual y verificado separados.
- Verificación de F1: contratos actuales contrastados, revisión conceptual de 38 casos, aritmética controlada y checks documentales/Git. No se ejecutaron tests funcionales, entrenamiento ni llamadas deportivas; las 453 pruebas siguen siendo históricas, no nuevas.
- Inventario: siete registros PARCIALES (H01/H02/H27/H38/H45/H51/H60), resto pendiente; ningún defecto del programa se cierra por escribir la regla. Plan maestro actualizado a v1.1 y continuidad inequívoca.
- Base Git 74081246, rama codex/security-integrity. Guardar commit de F1 y verificar push en esa rama; main permanece sin cambios funcionales. Consultar Git para SHA final.
- Próximo «continúa»: abrir FASE 2 (diccionario y contrato único de datos), anunciar siete puntos y partir de PRODUCT_SPEC. No repetir F0/F1, no empezar por rediseño/API. Mantener F17 interfaz y F19 API pagada.

## Reconstrucción rigurosa — Fase 0 cerrada (27 de septiembre de 2026)

- Nuevo mandato: `docs/reconstruction/REQUEST_2026-09-27.md`, copia íntegra de la solicitud del propietario. Solo Fase 0 en esta entrega. Sustituye los siguientes pasos anteriores y la prioridad de diseño de EXCELLENCE_PLAN.
- Plan vigente: `docs/RECONSTRUCTION_MASTER_PLAN.md`. Inventario: `docs/reconstruction/FINDINGS.md`, 64 hallazgos/límites con fuente, dependencia, fase y criterio de cierre. Acta: `docs/reconstruction/PHASE_00.md`. Comprobaciones documentales: `docs/reconstruction/CHECKS_PHASE_00.json`.
- F0: lectura de auditoría completa, clasificación, dependencias y gates. Nota técnica de planificación 8/10; APROBADA dentro de ese alcance, sin subir las notas del producto. No se han corregido los 64 registros ni modificado aplicación, modelos, datos, servicios o producción. Fases 1-20 NO INICIADAS.
- Conflictos resueltos en el plan: F4 prepara candidatos; comparación válida solo tras F5/F6. El histórico ya usado no se declara test final independiente. Infraestructura probada y desempeño empírico son gates diferentes; si falta evidencia se limita la capacidad y no se inventa validación. API pagada F19, interfaz F17.
- Verificación: estructura/trazabilidad documental y conservación del código/datos; no se vuelven a ejecutar las 453 pruebas como si fueran resultados nuevos. Git inicial a5be119d en rama codex/security-integrity, remoto coincidente; main ab9b63a4. Guardar entrega solo en rama de trabajo y verificar push; no implica despliegue.
- Próxima acción cuando el propietario pida continuar: abrir Fase 1 y anunciar sus siete puntos; redactar especificación conceptual única con mercados soportados/experimentales/no soportados, glosario y casos de reglas. No comenzar por fixes de modelo, bankroll, diseño o API. No repetir F0.
- Si hay interrupción durante ese trabajo: conservar acta de la fase activa, cambios, pruebas y gate pendiente; retomar desde ahí. No avanzar por el mero hecho de que exista un commit.

## Auditoría terminada — 27 de septiembre de 2026

- Petición actual: entrar al sitio publicado, evaluar con rigor el producto y especialmente sus modelos y entregar un documento. Auditoría CERRADA; no repetirla al recibir «continúa».
- Entregables: `docs/AUDIT_2026-09-27.md`, PDF de 20 páginas en `output/pdf/NioSports_Auditoria_2026-09-27.pdf`, datos reproducibles en `docs/AUDIT_2026-09-27_DATA.json` y generador `scripts/build-audit-report.py`. PDF renderizado y revisado visualmente; tablas finales comprobadas.
- Código auditado: `ab9b63a4982cdb212c43a5f631507fa839e4e4aa`. Navegación pública realizada en el dominio habitual. No se modificó ni desplegó código de la aplicación durante esta auditoría.
- Notas justificadas: global 4,1/10 (suma ponderada 4,05), modelo 3/10 (NBA 2, tenis 4), diseño 7/10. Son juicios de madurez y evidencia, no porcentajes de acierto.
- Pruebas ejecutadas: 445 de dominio/servidor y 8 de UI, todas aprobadas. No demuestran calidad predictiva. CSV analizado: 5.999 registros únicos; sin línea histórica de mercado. No se ejecutó el backtesting sintético ni entrenamiento nuevo.
- Hallazgos prioritarios: clasificación NBA frente a mediana artificial; stacking y calibración reutilizan datos de entrenamiento; inconsistencia Q1/FULL; etiqueta ML con heurística; estadísticas estáticas antiguas; probabilidades de periodos dependientes multiplicadas; cuotas decimales interpretadas como americanas; guardado de pick desconectado del ledger; historial público confunde fallos con ceros y necesita publicación autorizada explícita. Evidencia y matices en el informe.
- Límites: no certificados autenticación real, pagos, cobertura deportiva completa, servicio Python desplegado, persistencia real por cuenta, rendimiento de carga o auditoría legal. Demos identificadas y recorridos anónimos sí revisados.
- Siguiente acción al retomar mejoras: corregir primero comunicación y contratos de probabilidad/cuotas/periodos/publicación; pruebas de regresión que reproduzcan esos errores. Después integración del stake con ledger y validación temporal reproducible. Estas prioridades sustituyen el antiguo siguiente paso de Planes. No afirmar rentabilidad validada ni aumentar notas por añadir código.
- Guardado: entrega documental en la rama `codex/security-integrity`; verificar commit y remoto para conocer el estado definitivo. La producción de la aplicación conserva la versión auditada; guardar el informe no equivale a corregir sus hallazgos.

## Estado anterior de publicación (conservado como historial)

Actualizado: 22 de septiembre de 2026. Repositorio `JoseGarcia1003/NioSports-Pro-v4.0`. PR #1 integrada en `main` por petición explícita del propietario de guardar todo en GitHub y publicar en su enlace habitual. Mandato: retomar desde este archivo sin reiniciar la auditoría. Plan completo: EXCELLENCE_PLAN.md.

## Publicación principal — 22 de septiembre

### Correcciones tras observaciones del propietario

- `30a3a141`: paleta de tenis compartida por calendario, informe y ficha. Texto oscuro real en tema claro; textos secundarios mayores. Fondo de cancha limitado a NBA/totales.
- `d9fd36c3`: inicio azul noche/celeste/violeta, composición multideporte, selector interactivo NBA/tenis, navegación adaptada y accesos a pronósticos/bankroll.
- `d8464a66`: nuevo centro NBA con hoy/mañana, búsqueda, selección, contexto, reintento y descarte de respuestas tardías; calculadora de totales con guía, tipografía y jerarquía renovadas.
- Los tres bloques están guardados en GitHub, incluidos en `main`. Vercel producción `dpl_ESuzwPTPzF1s4XDR4nHHs5iY3sm6` READY, SHA `d8464a668de6f45522f108d21fb0a1603e5982f1`, dominio `nio-sports-pro-v4-0.vercel.app` asignado sin error. Verificado nuevamente al reanudar el 22 de septiembre.
- Check: 0 errores/advertencias. Pruebas: 5 del contrato del calendario + 8 de UI (3 nuevas NBA y 5 login), aprobadas. Esbuild requiere ejecución fuera del sandbox de Windows; el primer fallo fue de permisos, no de aplicación.
- Navegador en preview de contraste: tenis demo claro/oscuro, informe saque/resto y ficha individual a 390 px sin desbordamiento. Títulos claros corregidos a #182d23; acento #386520; secundarios #4e6557. Contrastes calculados: título/fondo 13,95:1, secundarios/blanco 6,32:1, acento/blanco 6,88:1. Estos valores no certifican todos los elementos de la aplicación.
- Revisión final en PRODUCCIÓN completada: inicio y NBA a 360/390/1440 px sin desbordamiento horizontal; temas claro y oscuro legibles. Inicio: enlace interno a deportes, selector NBA/tenis, contenido y destino de cada selección correctos, enlace a centro NBA funcional. NBA: Mañana cambia el estado seleccionado; reintento muestra carga y vuelve a un estado explícito sin fuente. Consola sin errores/advertencias. No hay partidos reales confirmados con el proveedor actual; selección/filtro con encuentros verificados mediante las 3 pruebas de UI, no presentados como observación de datos reales.
- Esta entrega visual y su publicación están CERRADAS. No repetir estos tres bloques ni su matriz de revisión si no hay cambios nuevos. La calculadora autenticada tiene mejoras de presentación y check aprobado, pero no se ha comprobado con una sesión real en este recorrido.
- Siguiente acción: continuar con Planes y validar los flujos autenticados de NBA y suscripción con una sesión/entorno de prueba disponible. Proveedor deportivo y suscripción real siguen pendientes; la publicación visual no demuestra esos flujos.

- Todos los cambios hasta `ab30a3532a94fd12955a5c236cf6b5cc2a2cb5b0` integrados mediante PR #1. Commit de integración: `064b9abea319a17a89079e4819b55ad58a7e71ce`.
- Vercel completó el despliegue de producción `dpl_5WQ4cSjb5RKZGsKWf2TtcvwBuLfy` desde `main`, estado READY, sin error de alias. El dominio habitual está asignado a este despliegue: https://nio-sports-pro-v4-0.vercel.app/login.
- Verificación del enlace público en navegador: formulario nuevo y portada de tenis visibles, título «Bienvenido de nuevo · NioSports Pro», acceso sin pantalla de Vercel ni enlace temporal; consola sin errores/advertencias. Pestaña entregable abierta. No se inició sesión con credenciales reales ni se completó Google OAuth.
- El rediseño de Cuenta/Login y sus ajustes finales están guardados en GitHub. Validación previa: 444 pruebas de dominio/servidor y 5 de UI aprobadas; check sin errores ni advertencias. Vercel compiló la preview exacta de `ab30a353` correctamente.
- Publicar la versión disponible no certifica las dependencias comerciales pendientes: proveedor deportivo, sesión externa, suscripción de prueba y reconciliación del historial. La petición actual autoriza publicar; sustituye el antiguo aplazamiento de `main` registrado abajo.
- Los apartados históricos siguientes conservan evidencia de entregas anteriores; sus referencias a ajustes locales o producción pendiente ya no describen el estado actual.

## Historial de entregas anteriores (los pendientes antiguos no sustituyen el estado actual)

NUEVA ENTREGA VISUAL EN REVISIÓN FINAL: el propietario rechazó la apariencia anterior por genérica. Se rediseñaron Cuenta e inicio de sesión (AccountExperience.svelte, LoginExperience.svelte, account.css), con portada deportiva original de 175 KB, centro de control visual, panel de acceso y selector de tema. Nav/Logo armonizados en verde. No repetir el controlador del bankroll. Check aprobado con 0 errores/advertencias; 444 pruebas de servidor/dominio y 5 del formulario aprobadas. Primera versión publicada en GitHub 8912ab5e y Vercel READY (qyftc5egf). Cuenta revisada en escritorio/móvil, temas y ayuda. Acceso probado a 360/390/768/1440 px: registro, recuperación, mostrar contraseña y validación nativa, sin efectos externos. Falta publicar y comprobar los ajustes de lectura y navegación detectados en la revisión. Estado de diseño en DESIGN_ACCOUNT_2026-09-20.md. Ajustes finales locales: textos auxiliares mayores, barra inferior verde, separación correcta de palabras en el título móvil, eliminar franja bajo nav, imports individuales de iconos y configuraciones de pruebas de UI/servidor separadas.

Adicional CERRADO: aislamiento del estado propio del bankroll implementado en `src/lib/bankroll/workspace.js`, integrado en BankrollWorkspace.svelte. Commit `367cbf45f04adb1f4fc53f1f479fb78bfc2574e8` guardado en GitHub; Vercel READY, despliegue `dpl_3a6MKt6Q74YQBZ39forP5KCXysUa`. URL actual comprobada: https://nio-sports-pro-v4-0-78xj80f73-niosports-pros-projects.vercel.app/bankroll?demo=1. Incluye todo el diseño anterior. Regresión: 52 pruebas en 4 archivos (15 nuevas); check 0 errores/advertencias. Navegador final: Actualizar conserva demo, Volver a mi cuenta limpia las cifras simuladas y pide sesión, Explorar ejemplo restaura sólo el ejemplo; consola sin errores/warnings. Marcada la pestaña como entregable. Cancelación, generaciones por petición/sesión, limpieza de borradores, bloqueo de doble envío y claves de reintento probados. No repetir este bloque.

Entrega visual anterior guardada y comprobada: `e0f3abdcf90733ac5c37dea2c509537908548650`, despliegue `dpl_EkxCwarMDSjXfpcC9SYkAJN96eot`, READY. URL: https://nio-sports-pro-v4-0-ohnzh6lkh-niosports-pros-projects.vercel.app. Incluye el catálogo de fd1a4410, navegación de cfe08c46 y contraste final del bankroll; también está incluida en la preview actual 367cbf45. La vista previa requiere sesión Vercel o acceso temporal autorizado; no guardar tokens de acceso en documentos. La producción main no se ha promovido. Los commits posteriores de documentación no cambian las implementaciones comprobadas.

Corrección Nav/Logo guardada y desplegada en `cfe08c466b309695413a5ce6f22086c6a79d58c8`: https://nio-sports-pro-v4-0-o1m6jww90-niosports-pros-projects.vercel.app (READY). Nav y Logo respetan el tema claro, visitantes ven «Iniciar sesión», botón de cuenta de 44 px y etiqueta accesible. Revisado en navegador remoto. No repetir la entrega principal ni las migraciones.

La revisión detectó bajo contraste del bankroll en tema claro. Se sustituyeron sus colores fijos por variables para ambos temas, DM Sans, textos auxiliares mayores, cifras alineadas y controles de 44 px. Cambio sólo de presentación en BankrollWorkspace.svelte. `npm run check` aprobado con 0 errores y 0 advertencias. Verificado en preview e0f3abdc: títulos, avisos, tarjetas, gráfico y formulario legibles en claro/oscuro; 390 px sin overflow; sin errores/warnings de consola. Despliegue final aprobado.

Cambios de la entrega principal ya guardados:
- Catálogo diario persistente con autorización real: FREE abre una selección Premium fija y Pro/Elite vigentes todas; el contenido bloqueado no viaja al cliente. Ediciones inmutables, procedencia y retirada con motivo. Publicador inicial de tenis tras sync. Demo explícita sin almacenamiento real.
- Pantalla Pronósticos renovada: tipografía DM Sans coherente, jerarquía y pesos definidos, selección gratuita destacada, probabilidad separada de evidencia, estados vacíos útiles, controles de 44 px, claro/oscuro, foco y movimiento reducido. Tokens y CSS compartidos mejoran páginas del producto.
- NBA: esperar generación asíncrona, cancelar solicitudes obsoletas, evitar descansos/lesiones/cuotas inventadas, abstenerse si faltan líneas, proteger guardado y coherencia de resultados.
- Datos por sesión: logout/cambio de cuenta limpia stores inmediatamente; respuestas y mutaciones tardías no restauran datos antiguos.
- Identidad: usar FIREBASE_PROJECT_ID o PUBLIC_FIREBASE_PROJECT_ID; rechazar discrepancias; firma, emisor y audiencia siguen verificándose.
- CSP centralizada en SvelteKit conservando nonce; APIs no-store y fuera de caché persistente; actualización del SW limpia cachés de predicciones antiguas.
- CI Node24 ejecuta check, pruebas y build sin entregar secretos de producción al build de PR.
- Bankroll avisa que es un registro nuevo y que no se importó automáticamente el historial antiguo.

## Verificación completada

- Suite completa: 429 pruebas en 27 archivos, todas aprobadas (`tests-verification.log`, 19 septiembre).
- `npm run check`: 0 errores y 0 advertencias.
- Git diff sin errores de espacios; avisos CRLF habituales de Windows.
- Preview fd1a4410: catálogo final abrió y respondió al filtro NBA (vacío), restablecer y desplegar evidencia. Se comprobó DM Sans y 390 px sin desbordamiento horizontal, temas claro/oscuro. Tenis demo respondió a Femenino + Mañana con dos encuentros del día siguiente. No son datos reales. La captura completa de navegador tiene artefactos de composición; preferir captura de viewport.
- Preview cfe08c46: navegación anónima y tema claro corregidos; catálogo sin overflow a 360/768/1440 px, bankroll a 390 px. Hoy muestra ausencia de fuente NBA y requisito de sesión tenis; catálogo real respondió sin edición publicada, sin sustituirla por ejemplos. Sin errores/warnings de consola de la app en estas rutas (filtrados desde 16:28 UTC del 20 septiembre). La revisión final de Bankroll en e0f3abdc pasó después de corregir colores.
- GitHub Actions 35522610659 no inicia el job: la página de ejecución confirma bloqueo de cuenta por facturación. Es independiente de los créditos Codex. No se cambió facturación ni se pagó. Vercel sí compila; no afirmar CI GitHub verde.
- No afirmar login/Stripe/ingesta pagada real probados: faltan validación de entorno y proveedor.

## Base de datos REAL — ya aplicado, NO repetir

Supabase `degwzrlbjqezngduvxtj`:
- 20260913040750 tennis_workspace
- 20260913040915 tennis_immutable_grants
- 20260914151620 daily_prediction_catalog
- 20260919225143 identity_billing_ledger
- 20260919225153 legacy_row_security
- 20260919225419 fixed_trigger_search_path

Se verificó remoto: 0 tablas públicas con RLS desactivada; anónimos no leen perfiles/picks; deportes públicos legibles pero no editables; usuario no cambia su plan, sí preferencias; servidor inserta ledger pero no lo actualiza ni borra. Las migraciones conservaron datos antiguos. Ledger y billing nuevos no migran automáticamente saldos ni suscripciones antiguas. Asesor final: sin errores ni advertencias tras corregir search_path; sólo 9 notas informativas de RLS sin políticas en tablas exclusivas de servidor (cierre intencional a clientes).

## Coordinación

No hay tarea pendiente que dependa de un agente. Los trabajos previos de release_checks, session_isolation y visual_typography están incorporados en archivos. Algunos agentes finalizaron por límite después de escribir; raíz verificó la suite conjunta y terminó la migración RLS y sus pruebas. No volver a delegar ni rehacer su trabajo automáticamente.

## Siguiente acción exacta

1. La entrega anterior está cerrada, guardada y desplegada. No repetir migraciones, suite completa ni el mismo recorrido visual si no hay cambios nuevos.
2. El estado propio de BankrollWorkspace está corregido, probado y desplegado. No rehacer el controlador ni los stores. Continuar con el paso 3.
3. Cuenta/Login y navegación rediseñados y guardados en `ab30a353`. Continuar la coherencia visual en Planes y tenis, con comprobación real de contraste, teclado y móvil. Evitar rehacer el catálogo o el rediseño ya cerrado.
4. Validar identidad y suscripción con cuentas de prueba y entorno correcto; si faltan credenciales, registrar dependencia concreta y avanzar en operación del catálogo y medición de rendimiento.
5. Registrar la siguiente entrega con sus propias pruebas, SHA y preview. Proyecto Vercel prj_En6HSxmihlQTsxgxW53Z6klKzcMB, team team_YUpxoMdWKSgksacyR0qJ2NPX. No confundir build Windows EPERM con estado remoto.

## Pendientes de producto, no ocultarlos

- Proveedor tenis pagado/contrato: sin él no hay cobertura real garantizada. Motor experimental sin calibración ni rentabilidad demostradas.
- Catálogo: falta publicador NBA, retiradas automáticas ante cambios del proveedor y programación de ingestión. Edición es previa con hora de corte.
- NBA real: las líneas/cuotas y credenciales deben conectarse; abstenerse es correcto mientras falten.
- Validar sesión real, Firebase Third-Party Auth en Supabase y suscripción real de prueba. No importar privilegios desde campos antiguos sin validación Stripe.
- Migración reconciliada de saldos/historial legacy al nuevo ledger pendiente; no recalcular ni borrar registros reales por suposiciones.
- `main` integrada por petición explícita el 22 de septiembre. Las dependencias de estos flujos siguen pendientes aunque la versión disponible se publique.

## Entorno

Windows PowerShell. Repo en subcarpeta niosports. Tests de esbuild pueden necesitar ejecución fuera del sandbox. Los procesos y pestañas anteriores pueden no existir. Comprobar servidor antes de iniciar otro. El dev local tardó mucho y se detuvo; validar preferentemente en preview remota. Evitar build y dev simultáneos sobre .svelte-kit. No se guardan secretos en estos documentos.
