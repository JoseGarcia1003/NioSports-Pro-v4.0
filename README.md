# NioSports Pro

Plataforma de análisis deportivo en español: props de jugadores y de equipo de la NBA, con cada cifra trazable a su fuente, pronósticos sellados criptográficamente antes de cada partido y rendimiento público calibrado. Arquitectura preparada para fútbol, tenis y MLB.

**Estado (7/11/2026):** beta abierta y gratuita en producción (https://nio-sports-pro-v4-0.vercel.app). No cobra. No está certificada como modelo rentable: el modelo publicado mejora a una regla ingenua fuera de muestra, pero su ventaja sobre la tasa base es pequeña y no se ha medido frente a las líneas de las casas.

## Qué hay

- **NBA**: partidos, props de jugadores (L5/L10/L20/temporada, local/visitante, con/sin compañero, defensa rival), mercado de puntos, estadísticas y clasificación desde el box score oficial.
- **Modelo `nba-points@1.0.0`**: probabilidad e intervalo 80 % por prop, validado con prueba temporal reproducible (`scripts/backtest-nba-points.mjs`).
- **Señales selladas**: cadena SHA-256 verificada por la base de datos, anclaje OpenTimestamps y verificación en el navegador (`/verificar`).
- **Transparencia**: acierto con intervalos de Wilson, Brier, log loss y calibración (`/transparencia`).
- **Multideporte**: adaptadores de proveedores con reintentos, límites, validación, caché y estado honesto por deporte (`/deportes`).
- **Bankroll responsable**: registro contable con límites, enfriamiento de 24 h, pausas y alertas aplicados en servidor.
- **Analista IA**: arquitectura y verificador de afirmaciones; desactivado hasta configurar un proveedor.

## Documentación

- [Arquitectura](docs/ARCHITECTURE.md) — módulos, base de datos, modelo, sellado y límites criptográficos.
- [API_INTEGRATION_CHECKLIST](docs/API_INTEGRATION_CHECKLIST.md) — proveedores, variables, endpoints, validaciones y estado por deporte.
- [Estado del trabajo](docs/WORK_STATE.md) — hecho, pendiente y bloqueos.
- Variables de entorno: `env.example` (las claves solo en Vercel, nunca en el repositorio).

## Desarrollo

```bash
npm ci
```

```bash
npx vitest run && npx vitest run --config vitest.ui.config.js
```

```bash
npm run check && npm run build
```

Backtest del modelo con la muestra incluida:

```bash
node scripts/backtest-nba-points.mjs ml/backtest/nba-points-sample-2025-26.json --split 2026-02-15
```

## Despliegue

`main` se despliega automáticamente en Vercel. Las migraciones de `supabase/migrations/` se aplican al proyecto Supabase con el mismo número de versión. Tareas programadas en `vercel.json` (`/api/cron/daily`, `/api/cron/verify-results`), autorizadas con `CRON_SECRET`.

## Reglas del producto

Sin cifras inventadas; datos de prueba siempre marcados y rechazados en producción; sin comparación de cuotas entre casas (la mediana del mercado solo es referencia); la IA explica datos verificados y nunca aporta cifras propias. Juego responsable: el bankroll es un registro personal; NioSports no custodia dinero ni acepta apuestas.

Autor: José García.
