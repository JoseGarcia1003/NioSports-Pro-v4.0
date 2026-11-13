# API_INTEGRATION_CHECKLIST — NioSports Pro

Estado al 7 de noviembre de 2026. Este documento dice **dónde entra cada credencial y qué hay que comprobar** cuando se contrate o active un proveedor. Los endpoints listados son los documentados públicamente por cada proveedor. **Ninguna integración marcada «sin verificar» se ha probado contra respuestas reales**: el entorno de desarrollo no tiene salida a esos dominios.

Regla general: las claves van **solo** en las variables de entorno de Vercel (Production y Preview). Nunca en el chat, en documentos ni en el repositorio.

## 1. Proveedores compatibles y estado

| Id del adaptador | Deporte | Datos | Coste | Variables | Estado |
|---|---|---|---|---|---|
| `balldontlie` | NBA | calendario, resultados | gratis | `BALLDONTLIE_API_KEY` | **Conectado y verificado en producción** |
| `nba-stats-ingest` | NBA | box score por jugador | gratis (script en el PC del propietario) | `INGEST_SECRET` | **Conectado**; el envío sigue siendo manual hasta activar la tarea programada |
| `the-odds-api` | NBA, fútbol, MLB | líneas de mercado (mediana entre casas) | gratis, 500 créditos/mes | `ODDS_API_KEY` | **Verificado para NBA** (totales y puntos). Fútbol y MLB: sin verificar |
| `football-data` | Fútbol | calendario, resultados | nivel gratuito con registro | `FOOTBALL_DATA_API_KEY` | Implementado; **pendiente de credencial** |
| `api-football` | Fútbol | calendario, resultados, estadísticas, lesiones, alineaciones | de pago (prueba gratuita limitada) | `API_FOOTBALL_KEY` | Implementado (solo calendario); **pendiente de credencial** |
| `mlb-statsapi` | MLB | calendario, resultados | API pública sin clave; términos de uso no comercial | — | **Verificado** con una respuesta real (13/11); sin partidos en noviembre. Requiere proveedor con licencia antes de cobrar |
| `tennis-feed` | Tenis | dataset propio validado | por contratar | `TENNIS_FEED_URL`, `TENNIS_API_KEY`, `TENNIS_PROVIDER_ID` | Contrato listo; **sin proveedor** |
| `fixture` | todos | datos de prueba marcados `isDemo` | — | — | Solo desarrollo; **rechazado en producción** |
| Analista IA (`anthropic`) | todos | redacción verificada | de pago por uso | `AI_PROVIDER=anthropic`, `ANTHROPIC_API_KEY`, opcional `AI_MODEL`, `AI_MAX_TOKENS` | Implementado; **desactivado** hasta configurar |
| OpenTimestamps | — | anclaje de sellos en Bitcoin | gratis, sin clave | — | Implementado; se verifica en el primer sellado real en producción |

Estado técnico de cada proveedor en vivo: `GET /api/sports/status` (público, sin nombres de claves) y el panel «Estado del sistema» en Cuenta (solo propietario).

### Box scores de la NBA: por qué no hay vía automática gratuita

Comprobado el 13/11/2026: `stats.nba.com` y `cdn.nba.com` rechazan peticiones desde centros de datos (timeout desde Vercel, «Access Denied» desde el entorno de desarrollo). No se sortea ese bloqueo. Opciones reales:

1. **Gratis**: la tarea programada del PC del propietario (`static/tools/nio_tarea_diaria.bat`), que sí puede leer la fuente oficial.
2. **De pago**: un proveedor de estadísticas por jugador que admita servidores y uso comercial. El punto de conexión es `syncNbaBoxScores(db, { provider })` en `src/lib/server/nba-boxscore-sync.js`; el proveedor debe exponer `schedule()`, `scoreboard()` y `boxScore(id)` y devolver filas con la forma de `nba_player_games`. Si sus identificadores de jugador y partido no son los oficiales de la NBA, hay que añadir una tabla de correspondencias antes de mezclar datos (trabajo pendiente y no trivial).

## 2. Variables de entorno

| Variable | Obligatoria | Uso |
|---|---|---|
| `VITE_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | sí | base de datos (solo servidor) |
| `CRON_SECRET` | sí | autoriza `/api/cron/*` (Vercel la envía en las tareas programadas) |
| `INGEST_SECRET` | sí | autoriza el envío de box scores |
| `BALLDONTLIE_API_KEY` | sí (NBA) | calendario NBA |
| `ODDS_API_KEY` | recomendada | líneas de mercado |
| `OWNER_USER_IDS` | recomendada | quién ve el panel de estado |
| `FOOTBALL_DATA_API_KEY` | al activar fútbol | adaptador `football-data` |
| `API_FOOTBALL_KEY` | al activar fútbol avanzado | adaptador `api-football` |
| `TENNIS_FEED_URL`, `TENNIS_API_KEY`, `TENNIS_PROVIDER_ID` | al activar tenis | adaptador `tennis-feed` |
| `AI_PROVIDER`, `ANTHROPIC_API_KEY`, `AI_MODEL`, `AI_MAX_TOKENS` | al activar el analista | `src/lib/ai/analyst.js` |
| `PREMIUM_GATING_ENABLED` | no (por defecto desactivado) | `true` = el plan gratuito recibe 1 selección completa al día |
| `BILLING_ENABLED`, `STRIPE_*` | al abrir pagos | checkout y webhooks |

## 3. Credenciales pendientes (las decide y aporta el propietario)

1. Fútbol: `FOOTBALL_DATA_API_KEY` (gratuita con registro) y/o `API_FOOTBALL_KEY` (de pago).
2. Tenis: un proveedor que entregue el contrato de `src/lib/tennis/domain.js` (o un adaptador nuevo para el proveedor elegido).
3. Lesiones y alineaciones NBA: no hay proveedor elegido (`providers.injuries` vacío en `src/lib/sports/config.js`).
4. Analista IA: `ANTHROPIC_API_KEY` y la decisión de presupuesto.
5. Más créditos de The Odds API si se quieren rebotes, asistencias o más mercados con línea real.

## 4. Endpoints que usa cada adaptador (según documentación pública)

- `balldontlie`: `GET https://api.balldontlie.io/v1/games?dates[]=YYYY-MM-DD` · cabecera `Authorization: <clave>`.
- `football-data`: `GET https://api.football-data.org/v4/matches?dateFrom=…&dateTo=…` · cabecera `X-Auth-Token`.
- `api-football`: `GET https://v3.football.api-sports.io/fixtures?date=YYYY-MM-DD` · cabecera `x-apisports-key`.
- `mlb-statsapi`: `GET https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=YYYY-MM-DD`.
- `the-odds-api`: `GET /v4/sports/{sport}/odds` y `/v4/sports/{sport}/events/{id}/odds` (ver `src/lib/server/odds-cache.js`).
- OpenTimestamps: `POST https://a.pool.opentimestamps.org/digest` (y `b.pool`, `a.pool.eternitywall.com`) con los 32 bytes del SHA-256.

## 5. Módulos que reciben los datos

| Flujo | Archivo |
|---|---|
| Adaptadores y normalización | `src/lib/sports/providers/index.js` |
| Configuración por deporte (proveedores, mercados, frescura) | `src/lib/sports/config.js` |
| HTTP resiliente (reintentos, límite local, registro sin secretos) | `src/lib/sports/core/http.js` |
| Contrato normalizado, validación, deduplicación | `src/lib/sports/core/contracts.js` |
| Caché con copia antigua etiquetada | `src/lib/sports/core/cache.js` |
| Antigüedad máxima de los datos | `src/lib/sports/core/freshness.js` |
| Sincronización con conmutación de proveedor y registro | `src/lib/server/sync.js` → tabla `ingest_runs` |
| Tarea diaria (cron y botón del propietario) | `src/lib/server/daily.js`, `src/routes/api/cron/daily/+server.js`, `src/routes/api/ops/sync/+server.js` |
| Calendario NBA cacheado | `src/lib/server/nba-schedule.js`, `src/routes/api/nba/schedule/+server.js` |
| Lectura pública del calendario sincronizado | `src/routes/api/sports/[sport]/schedule/+server.js` |

## 6. Campos normalizados (evento)

`id` (`deporte:proveedor:idExterno`), `sport`, `startsAt` (ISO UTC), `status` (`scheduled|live|final|postponed|cancelled|unknown`), `home{id,name}`, `away{id,name}`, `score{home,away}` (enteros ≥ 0 o null), `competition` (opcional), `provenance{provider, fetchedAt, externalId}`, `isDemo` (solo fixture).

## 7. Validaciones aplicadas

- Cada evento: id, deporte, fecha ISO, estado conocido, participantes distintos, marcador entero, `final` con marcador, procedencia con fecha.
- Lote: si más del 20 % de los registros es inválido, la respuesta se trata como **fallo del proveedor** y se prueba el siguiente.
- Duplicados: se conserva la copia más reciente por `id`.
- Frescura: NBA box score ≤ 3 días para publicar señales; si no, la edición no se genera (`data_stale`).
- El adaptador `fixture` lanza error si `VERCEL_ENV=production`.

## 8. Pruebas de integración al recibir una credencial

1. Añadir la variable en Vercel (Production) y volver a desplegar.
2. Ejecutar el cron diario a mano o esperar a su hora; revisar la fila nueva en `ingest_runs` (estado, registros válidos y rechazados, `details.attempts`).
3. Comparar 3 partidos del día con la web oficial de la competición (equipos, hora, estado, marcador).
4. Si todo coincide, cambiar `verified: true` en el adaptador y añadir una prueba con una respuesta real anonimizada en `tests/unit/sports-core.test.js`.
5. Solo entonces la interfaz mostrará el proveedor como «Conectado y verificado».

## 9. Estado de preparación por deporte

| Deporte | Arquitectura | Datos reales hoy | Modelo publicado | Falta |
|---|---|---|---|---|
| NBA | completa | calendario, box score, líneas de puntos y totales | `nba-points@1.0.0` (validado fuera de muestra) | lesiones/alineaciones, más mercados, **box scores automáticos (hoy dependen del PC del propietario)** |
| Fútbol | completa (adaptadores, validación, página) | ninguno | ninguno | credencial, verificación, modelo y su validación |
| Tenis | contrato y página existentes | ninguno | ninguno | proveedor |
| MLB | completa (adaptador verificado) | calendario (fuera de temporada en noviembre) | ninguno | proveedor con licencia comercial, modelo y su validación |
