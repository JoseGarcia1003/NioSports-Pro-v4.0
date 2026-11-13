# NIOSPORTS PRO — AUDITORÍA FINAL DE LA MISIÓN (12–13 de noviembre de 2026)

Alcance: trabajo ejecutado sobre el repositorio entre los commits `c4208fdd` (inicio) y el commit que contiene este documento. Todo lo que aquí se afirma como «verificado» indica cómo se verificó. Lo que no pudo verificarse se dice expresamente.

## 1. Estado inicial

- Producto en beta gratuita, en producción (Vercel + Supabase + Firebase Auth). NBA con props, mercado de puntos, estadísticas, clasificación, señales selladas (SHA-256 + OpenTimestamps), transparencia pública y bankroll con límites responsables.
- **Datos parados**: último box score del 31/10; última ingesta el 1/11. Las señales llevaban bloqueadas desde entonces (a propósito: no se publica con datos antiguos).
- Tarea diaria funcionando para calendarios y anclajes. El primer sello tenía ya 3 anclajes externos confirmados.

## 2. Arquitectura encontrada

SvelteKit (Svelte 5) en Vercel; PostgreSQL en Supabase con acceso solo desde el servidor (RLS activo, sin políticas para clientes en las tablas nuevas); identidad con Firebase verificada en servidor; capa multideporte con adaptadores de proveedores; modelo `nba-points@1.0.0`; libro de sellos encadenado. Convivía con un **sistema heredado** casi completo y sin uso (ver §3).

## 3. Problemas identificados (por gravedad)

| # | Problema | Evidencia |
|---|---|---|
| 1 | **Relé abierto al proveedor** `/api/proxy`: sin autenticación, reenviaba cualquier consulta a balldontlie con nuestra clave. Cualquiera podía agotar el límite gratuito (5 peticiones/minuto) y dejar la web sin calendario | Código del endpoint; sin caché en servidor |
| 2 | **Calendario sin caché**: cada visita a portada, Hoy, Partidos o props consumía una petición al proveedor. Con más de 5 visitas por minuto la web dejaba de mostrar partidos | `hooks.server.js` forzaba `no-store` en toda la API |
| 3 | **Arranque lento para miembros**: la pantalla quedaba en blanco hasta que Firebase resolvía la sesión | Datos de campo propios: FCP mediano 2,8 s en `/` con TTFB de 0,16 s (30 muestras) |
| 4 | **Sistema heredado activo en cada inicio de sesión**: cliente Supabase con clave anónima y cargadores de «picks» que siempre fallaban por RLS; SDK de Firebase Realtime Database cargado sin usarse | Grafo de importaciones; políticas RLS consultadas en producción |
| 5 | **Código muerto**: ~3.700 líneas en `src/lib` inalcanzables desde ninguna ruta, más endpoints huérfanos (catálogo, correos, crons antiguos) sobre tablas con 0 filas | Script de grafo; conteos en producción (`picks` 0, `predictions` 0, `prediction_editions` 0) |
| 6 | **Archivos estáticos obsoletos servidos públicamente**: `/data/nba-stats.json` y `/data/backtesting-results.json` | `static/data/` |
| 7 | **Señales pendientes para siempre** si el jugador no jugaba (no hay fila en el box score) | Lógica de liquidación |
| 8 | **La edición diaria solo se sellaba si un usuario abría Señales** antes del primer partido | Ruta de señales |
| 9 | Endpoint de estado de cuotas público y sin uso; CSP con 11 dominios que la aplicación no usa; funciones de trigger ejecutables por `anon` | Código y `pg_proc` |
| 10 | Métrica del bankroll con supuesto inventado (ROI «a cuota −110») en código heredado | `kpi-calculator.js` |

## 4. Mejoras implementadas

1. **Calendario NBA compartido y cacheado** (`/api/nba/schedule`): una copia por día para toda la web (1 min con partidos en juego, 10 min antes, 6 h cuando todos terminaron); si el proveedor falla sirve la última copia marcada como antigua; nunca inventa partidos; solo acepta «hoy» o «mañana». El relé abierto se eliminó.
2. **Tarea diaria rediseñada** (`src/lib/server/daily.js`): pasos independientes en paralelo, cada uno con plazo propio y registro propio; se ejecuta dos veces al día (10:10 y 16:40 UTC) y bajo demanda por el propietario (`/api/ops/sync`, con bloqueo contra ejecuciones simultáneas).
3. **Sellado automático de la edición diaria** desde la tarea programada (`signal-edition.js`): ya no depende de que alguien abra la página.
4. **Liquidación correcta de quien no jugó**: si el equipo tiene partido guardado ese día y el jugador no aparece, la señal es «anulada», no «pendiente».
5. **Arranque inmediato para miembros**: las rutas privadas se renderizan en servidor; un miembro que vuelve ve navegación y contenido en el primer pintado; las peticiones privadas esperan a la sesión por su cuenta; los visitantes siguen viendo el cargador hasta ser redirigidos.
6. **Panel «Hoy» como centro de operaciones**: avisos del día derivados de datos reales, cuatro indicadores, señales destacadas con probabilidad del modelo, bankroll con métricas, deportes y herramientas. Una sola petición privada (`/api/dashboard`); cada bloque se degrada por separado.
7. **Métricas del bankroll en servidor** (`src/lib/bankroll/metrics.js`) con definiciones explícitas: acierto con intervalo de Wilson, yield = beneficio ÷ apostado, ROI = beneficio ÷ capital neto, y comprobación de coherencia con el libro contable.
8. **Limpieza**: 57 archivos eliminados (≈12.900 líneas contando datos estáticos), dependencias `resend` y `dompurify` retiradas, SDK de Realtime Database fuera del paquete.
9. **MLB verificado** contra una respuesta real (15 partidos del 15/9/2026) y fijado como prueba.

## 5. Archivos creados

`src/lib/server/{daily,dashboard,nba-boxscore-sync,nba-schedule,signal-edition,signal-results}.js`, `src/lib/bankroll/metrics.js`, `src/lib/product/dashboard.js`, `src/routes/api/{dashboard,nba/schedule,ops/sync}/+server.js`, `supabase/migrations/20261112013143_nba_stored_games.sql`, `tests/unit/{auth-ready,bankroll-metrics,daily-pipeline,dashboard,nba-boxscore-sync,nba-schedule}.test.js`, `tests/ui/home-dashboard.test.js`, `tests/fixtures/mlb-schedule-2026-09-15.json`.

## 6. Archivos modificados (principales)

`src/routes/+layout.svelte`, `src/app.html`, `src/hooks.server.js`, `svelte.config.js`, `vercel.json`, `src/lib/firebase/index.js`, `src/lib/stores/auth.js`, `src/lib/services/authenticated-fetch.js`, `src/lib/components/{HomeExperience,OpsHealth,Nav,BankrollWorkspace,AccountExperience}.svelte`, `src/lib/server/{nba-props,sync,transparency}.js`, `src/lib/sports/{config,providers/index,core/http}.js`, `src/routes/api/{nba/signals,bankroll,cron/daily,tennis/sync}/+server.js`.

## 7. Cambios de base de datos (aditivos, aplicados en producción)

Migración `20261112013143_nba_stored_games`: funciones `nba_stored_games(date)` y `nba_teams_played(date[])` (solo `service_role`), y retirada del permiso de ejecución de cinco funciones de trigger a `public`, `anon` y `authenticated`. No se borró ni alteró ningún dato. Las tablas heredadas (`games`, `picks`, `predictions`, `prediction_editions`…) se conservan intactas.

## 8. Cambios de seguridad

- Eliminado el relé abierto al proveedor y el endpoint público de estado de cuotas.
- CSP reducida a los dominios realmente usados (Google/Firebase Auth y Stripe en marcos).
- La clave anónima de Supabase ya no forma parte del paquete del navegador.
- Solo los endpoints de lectura idénticos para todos conservan caché compartida; cualquier respuesta con `Authorization` o de ruta privada sale `private, no-store` (probado).
- Sincronización bajo demanda restringida al propietario y protegida por bloqueo.
- Auditoría de solo lectura de Stripe: firma verificada con el cuerpo original, fallo cerrado sin secreto, estado consultado a Stripe para que un evento atrasado no restaure privilegios, idempotencia por id de evento, 500 para reintento. Sin cambios necesarios. El cobro sigue desactivado (`BILLING_ENABLED`).
- RLS consultado en producción: ninguna tabla con datos de usuario es legible con la clave anónima.

## 9. Cambios visuales

Panel «Hoy» nuevo (escritorio y móvil revisados con capturas); avisos compactos; importes negativos con signo correcto; cargador sin el brillo índigo ajeno a la marca; sin parpadeo de «Iniciar sesión» ni de la portada pública para miembros. El sistema visual (grafito, acento dorado, Barlow Condensed + DM Sans, verde/rojo solo con significado) se mantuvo: no se cambió lo que ya era coherente.

## 10. Mejoras funcionales

Edición diaria autónoma; resultados que anulan a quien no jugó; botón «Sincronizar ahora» y estado de sincronizaciones y sellos en el panel del propietario; métricas de bankroll con definiciones; avisos de actividad en el panel (edición sellada, resultados del último día, tickets pendientes, pausa activa, alertas de riesgo, datos antiguos).

## 11. Mejoras de rendimiento

| Medición | Antes | Después | Tipo |
|---|---|---|---|
| Primer pintado de un miembro con sesión lenta (3 s simulados) | pantalla en blanco hasta resolver la sesión | 0,15–0,23 s con navegación y título visibles | Laboratorio local |
| Peticiones al proveedor de calendario | 1 por visita | 1 por ventana de caché para toda la web | Por diseño; probado con dobles |
| Peticiones fallidas por inicio de sesión (sistema heredado) | 3–4 | 0 | Código eliminado |
| Datos de campo previos (referencia) | FCP mediano 2,8 s en `/` | pendiente de nuevas muestras | Producción, 30 muestras |

No hay todavía datos de campo posteriores al cambio: se acumularán en `web_vitals`.

## 12–13. Pruebas ejecutadas y resultados reales

- **609 pruebas** de lógica, servidor y base de datos y **48 de interfaz**: todas aprobadas en la última ejecución. `svelte-check`: 0 errores, 0 avisos. Build de producción correcto.
- Se eliminaron las pruebas de los módulos heredados retirados y se añadieron 7 archivos de prueba nuevos.
- Navegador real: comportamiento del arranque (miembro, visitante, indicio de sesión caducado) y capturas del panel a 1280 y 390 px.
- Auditor propio (12 casos: 6 páginas × 2 tamaños): 0 desbordes, 0 controles menores de 44 px, 0 identificadores técnicos visibles, 0 infracciones axe WCAG 2.2 AA en ambos temas, 0 errores de JavaScript.
- **Producción** (comprobado directamente): `/api/nba/schedule` devuelve el calendario real con caché pública; `/api/proxy`, `/api/odds/status` y `/data/nba-stats.json` devuelven 404; las rutas privadas responden 200 con su estructura en el HTML.
- **Fallo detectado en producción y corregido**: la primera versión de la tarea diaria no registró nada el 12/11 porque un proveedor que no respondía agotaba el tiempo de la función. Se rediseñó con plazos estrictos; la ejecución del 13/11 a las 10:51 UTC registró calendarios y anclajes correctos y el fallo del proveedor con su causa.

## 14. Problemas pendientes

1. **Box scores de la NBA sin vía automática gratuita.** Los servidores de la NBA (`stats.nba.com` y `cdn.nba.com`) rechazan peticiones desde centros de datos: en Vercel no responden (timeout registrado) y desde el entorno de desarrollo devuelven «Access Denied». No se disfrazan peticiones para sortear ese bloqueo. Hoy la única vía es el script del PC del propietario; mientras no se ejecute, no hay señales nuevas ni resultados.
2. Vulnerabilidades de herramientas de desarrollo (`vitest`, `tinypool`, `vite`): 21 avisos de `npm audit`, 2 críticos, ninguno en código que llegue a producción. Corregirlos exige subir de versión mayor todo el entorno de pruebas.
3. Sin datos de campo posteriores a las mejoras de arranque.
4. Rendimiento de páginas privadas con sesión real: no medido (requiere credenciales de un usuario).
5. Fútbol y tenis sin proveedor; lesiones y alineaciones sin fuente.
6. Pruebas con usuarios reales y aprobación estética del propietario.

## 15. Dependencias externas necesarias

- **Para automatizar la NBA**: un proveedor de box scores que admita servidores y uso comercial. El paso `syncNbaBoxScores` ya acepta cualquier proveedor con la forma `{ id, limits, schedule(), scoreboard(), boxScore(id) }`.
- Claves de fútbol (`FOOTBALL_DATA_API_KEY` o `API_FOOTBALL_KEY`), proveedor de tenis, `ANTHROPIC_API_KEY` para el analista.
- `OWNER_USER_IDS` en Vercel para ver el panel de estado y el botón de sincronización.
- Revisión legal y pruebas de pago de principio a fin antes de activar `BILLING_ENABLED`.

## 16. Preparación para futuras API deportivas

Ver `docs/API_INTEGRATION_CHECKLIST.md`. Estado: NBA calendario y cuotas conectados y verificados; MLB calendario verificado técnicamente (licencia no comercial); fútbol y tenis implementados a la espera de credenciales. Añadir un proveedor sigue siendo escribir un adaptador y declararlo en `src/lib/sports/config.js`.

## 17. Riesgos residuales

- Dependencia del PC del propietario para los datos que alimentan todo el producto (riesgo operativo alto).
- Términos de uso de las fuentes gratuitas (NBA, MLB) incompatibles con un servicio de pago.
- Valor predictivo no demostrado: 1 edición sellada, 12 señales, ninguna liquidada.
- Un solo mantenedor; las herramientas de desarrollo con avisos de seguridad.
- El cambio de CSP y del arranque afecta al inicio de sesión: probado en local sin Firebase real; conviene que el propietario confirme un inicio de sesión con Google y con correo en producción.

## 18. Instrucciones de mantenimiento

- Antes de publicar: `npx vitest run`, `npx vitest run --config vitest.ui.config.js`, `npm run check`, `npm run build`.
- Migraciones: aplicarlas en Supabase y nombrar el archivo con la versión que Supabase asigna.
- Estado diario: tabla `ingest_runs` (una fila por paso) y panel «Estado del sistema» en Cuenta.
- Nunca marcar un adaptador como verificado sin respuestas reales; nunca editar el libro de sellos; nunca servir datos de ejemplo en producción.
- Datos NBA: mantener activa la tarea `nio_tarea_diaria.bat` en el PC hasta contratar un proveedor.

## Comparación entre el estado inicial y el final

| Aspecto | Inicial | Final |
|---|---|---|
| Relé público al proveedor | Abierto | Eliminado; calendario cacheado y acotado |
| Sellado de la edición diaria | Solo si un usuario abría la página | Automático dos veces al día |
| Jugador que no juega | Señal pendiente indefinidamente | Anulada al guardarse el partido |
| Arranque de un miembro | Pantalla en blanco hasta resolver la sesión | Contenido en el primer pintado |
| Panel «Hoy» | Lista de enlaces | Centro de operaciones con datos del servidor |
| Métricas del bankroll | Cálculo en el navegador | En servidor, con definiciones y control de coherencia |
| Código heredado sin uso | ~3.700 líneas alcanzables por nadie + endpoints huérfanos | Eliminado |
| Tarea diaria ante un proveedor colgado | Se agotaba sin registrar nada | Cada paso con plazo y registro propios |
| Box scores NBA automáticos | No | **No** (bloqueo del origen, documentado) |
| Pruebas | 743 + 44 (incluían módulos heredados) | 609 + 48, todas sobre código en uso |
