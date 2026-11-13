# Arquitectura de NioSports Pro

Estado al 7 de noviembre de 2026. Describe lo que existe en el código; lo pendiente está marcado como tal.

## 1. Vista general

```
Navegador (SvelteKit, Svelte 5)
   │  páginas públicas: /, /verificar, /transparencia, /deportes, /legal
   │  páginas con cuenta: /today, /sports/nba/*, /predictions, /bankroll, /account
   ▼
Servidor (funciones Vercel, Node 24)  ── src/routes/api/*
   ├─ identidad: token de Firebase verificado en servidor (src/lib/server/identity.js)
   ├─ permisos: plan desde billing_accounts (entitlements.js) + interruptor premium (access.js)
   ├─ datos deportivos: adaptadores por proveedor (src/lib/sports)
   ├─ modelos: src/lib/models (probabilidades), src/lib/stats (calibración)
   ├─ sellado: src/lib/integrity + src/lib/server/seals.js + OpenTimestamps
   └─ analista IA: src/lib/ai (desactivado sin clave)
   ▼
Supabase (PostgreSQL) — acceso solo con la clave de servicio desde el servidor; RLS sin políticas = clientes sin acceso.
```

Tareas programadas (`vercel.json`): `/api/cron/daily` dos veces al día (10:10 y 16:40 UTC). Ejecuta en paralelo, con plazo y registro propios por paso: calendarios de los 4 deportes, anclajes pendientes, estado de los box scores y, al final, el sellado de la edición del día. El propietario puede lanzarla con `/api/ops/sync`. Los box scores de la NBA llegan desde el script del PC del propietario (los servidores de la NBA rechazan peticiones desde la nube).

## 2. Módulos

| Carpeta | Responsabilidad |
|---|---|
| `src/lib/sports/config.js` | Deportes, mercados, proveedores por tipo de dato y política de frescura |
| `src/lib/sports/providers/` | Un adaptador por proveedor: variables necesarias, límites, `schedule()` → contrato normalizado, `verified` |
| `src/lib/sports/core/` | HTTP resiliente, contratos y validación, deduplicación, caché, frescura |
| `src/lib/sports/registry.js` | Matriz de preparación (conectado / en verificación / pendiente de credenciales) |
| `src/lib/server/sync.js` | Sincronización con conmutación de proveedor y registro en `ingest_runs` |
| `src/lib/server/daily.js` | Tarea diaria: pasos independientes con plazos |
| `src/lib/server/nba-schedule.js` | Una copia cacheada del calendario NBA para toda la web |
| `src/lib/server/signal-edition.js`, `signal-results.js` | Construcción y sellado de la edición; resultados oficiales y anulaciones |
| `src/lib/server/dashboard.js` | Datos del panel Hoy en una sola petición |
| `src/lib/bankroll/metrics.js` | Acierto, yield y ROI con definiciones explícitas |
| `src/lib/nba/` | Lógica NBA existente: props, lectura `reading-v1`, señales, temporada |
| `src/lib/models/nba-points.js` | Modelo probabilístico de puntos (versión, parámetros, calibración, registro de cambios) |
| `src/lib/stats/` | Distribuciones, Wilson, Brier, log loss, curva de calibración, Platt, historial público |
| `src/lib/integrity/` | JSON canónico y cadena SHA-256 (se ejecuta igual en navegador y servidor) |
| `src/lib/ai/` | Ficha de datos, verificador de afirmaciones, cliente del analista |
| `src/lib/bankroll/responsible.js` | Límites, enfriamiento, pausas, alertas de riesgo |

Añadir un proveedor: escribir su adaptador en `providers/index.js`, listarlo en `config.js` y añadir su prueba. Ninguna página ni modelo cambia.

## 3. Base de datos (tablas principales)

| Tabla | Contenido | Escritura |
|---|---|---|
| `nba_player_games` | box score por jugador y partido (clave natural `game_id, player_id`) | ingesta con `INGEST_SECRET`; upsert idempotente |
| `nba_signal_editions` | edición diaria de señales | solo inserción; trigger impide cambios |
| `prediction_seals` | cadena de sellos SHA-256 (texto canónico exacto, huella, huella previa) | solo inserción; el trigger recalcula la huella, exige el orden y el sellado antes del primer partido |
| `prediction_seal_anchors` | pruebas OpenTimestamps (.ots) | solo inserción |
| `ingest_runs` | historial de sincronizaciones | solo inserción |
| `bankroll_wallets`, `bankroll_tickets`, `ledger_entries` | registro contable personal | funciones `bankroll_apply` / `bankroll_snapshot` |
| `bankroll_limits`, `bankroll_limit_events` | límites responsables y su historial | servidor; eventos solo inserción |
| `provider_cache` | cachés de proveedores con fecha | servidor |
| `web_vitals`, `app_errors` | observabilidad propia | `telemetry_insert` con límite |
| `billing_accounts`, `billing_events` | suscripciones (Stripe) | webhooks firmados |

Migraciones versionadas en `supabase/migrations/` con el mismo número de versión que en el proyecto Supabase. Las de sellado, ingesta y límites tienen pruebas en PGlite (`tests/unit/*-database.test.js`).

## 4. Modelo `nba-points@1.0.0`

1. Media ponderada exponencial de los puntos recientes (vida media 8 partidos, ventana 40).
2. Contracción hacia la media larga del jugador (peso previo 4 partidos).
3. Varianza ponderada con suelo de Poisson → distribución binomial negativa.
4. P(más/menos/empate) para cualquier línea e intervalo predictivo del 80 %.
5. Recalibración de Platt ajustada solo con partidos anteriores al corte.

Validación (`scripts/backtest-nba-points.mjs`, muestra en `ml/backtest/`): cada partido se predice solo con partidos anteriores; parámetros fijados antes de evaluar; la búsqueda en rejilla no mejoró fuera de muestra y se descartó. Resultado en 1.373 partidos de prueba: Brier 0,244 frente a 0,254 de la regla L10; mejora sobre la tasa base ≈ 2 %; cobertura del intervalo 80 %: 79,4 %. **Limitaciones**: 70 jugadores de una temporada, línea de referencia propia (no la de las casas), ventaja pequeña. No demuestra rentabilidad frente al mercado.

La IA no produce probabilidades: solo explica una ficha de datos y su texto pasa por `verifyAnalysis` (cifras con fuente, fechas registradas, sin lesiones sin dato, sin lenguaje de certeza ni causalidad).

## 5. Sellado y verificación

- Texto exacto = JSON canónico (RFC 8785) con esquema, edición, modelo, datos usados, entradas y huella previa. Huella = SHA-256 del texto.
- La base de datos recalcula la huella al insertar, impone la cadena (`prevHash` = última huella) y que el sello sea anterior al primer partido (salvo registros marcados `backfilled`).
- Compromiso-revelación: la huella es pública al instante; el contenido se muestra después del último partido de la edición.
- `/verificar` recalcula todas las huellas en el navegador con Web Crypto y permite descargar el texto y la prueba `.ots`.
- OpenTimestamps ancla cada huella en Bitcoin a través de calendarios públicos; la prueba se verifica con `ots verify`.

**Límites criptográficos documentados**: (1) hasta que un anclaje se confirma en Bitcoin (horas), la prueba de fecha depende de nuestra base de datos; un administrador con acceso total podría reescribir la cadena completa antes del anclaje. (2) SHA-256 prueba integridad, no calidad del pronóstico. (3) El primer registro (2/11/2026) se selló retroactivamente y está marcado como tal.

## 6. Seguridad

- Identidad verificada en servidor; nunca se acepta un `userId` del cuerpo.
- Restricciones premium aplicadas en servidor (`gateEdition`), interruptor `PREMIUM_GATING_ENABLED` desactivado durante la beta.
- Límites del bankroll comprobados en servidor antes de registrar un ticket.
- Registros de solicitudes a proveedores con claves ocultas; ninguna clave en el cliente ni en el repositorio.
- Pendiente del propietario: rotar las claves expuestas en el pasado.

## 7. Pruebas

`npx vitest run` (unitarias, API, base de datos en PGlite, modelo reproducible), `npx vitest run --config vitest.ui.config.js` (componentes), `npm run check`, `npm run build`. Accesibilidad con axe-core (WCAG 2.2 AA) sobre las páginas en ambos temas.
