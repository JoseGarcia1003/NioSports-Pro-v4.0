# Integridad: primer bloque de correcciones

Base inspeccionada: `e9b2522d`, rama `main`, 11 de septiembre de 2026.
`NioSports-Auditoria-y-Arquitectura.md` no existe en este árbol y la búsqueda
en GitHub no lo encontró. Los requisitos adjuntos del usuario y el código
fueron la base de este bloque; no se afirma haber leído esa auditoría.

## Comportamiento corregido

- Crons y los tres endpoints de correo rechazan peticiones cuando falta
  `CRON_SECRET` o el Bearer no coincide. Se eliminó el acceso con `welcome`
  y sus llamadas desde el navegador. El correo de bienvenida requiere ahora
  un emisor interno; falta integrar el disparador de registro autenticado.
- Stripe exige secreto configurado, firma válida y cuerpo original. Fallos
  de escritura devuelven 500 para permitir reintentos; no se devuelven errores
  internos al cliente. Checkout/portal no se inicializan durante el build.
- La liquidación NBA identifica el partido por `games.external_id`, exige un
  mapeo único y filtra las filas por `game_id` y `FULL`. No resuelve Q1/HALF
  usando el marcador final. Rechaza líneas y marcadores inválidos, combinadas
  y fuentes demo/backtest/synthetic. Usa `picks.bet_type` y `predictions.direction`.
- Las actualizaciones condicionadas a pendiente evitan sobrescrituras por
  reintentos. Se comprueban errores y se cuentan solamente filas modificadas.
  Esto no constituye todavía un ledger transaccional ni auditoría de liquidaciones.
- El CLV se deja desconocido hasta disponer de un cierre preevento verificable.
  El cron ya no usa la última cuota de cualquier partido del día.
- Vitest incluye las pruebas antes omitidas bajo `src/`. CI ejecuta tests y
  no oculta fallos del chequeo Svelte. Se añadió el `jsconfig.json` ausente.
- Firebase usa variables públicas dinámicas; CI usa los nombres `PUBLIC_FIREBASE_*`.
  La falta de configuración Supabase falla al acceder a datos, no al importar
  el módulo durante el build. No se introducen credenciales de sustitución.
- Se corrige `.gitignore` y se retiran del índice dependencias y artefactos
  generados; los archivos locales y el lockfile se conservan.

## Verificación local

`node node_modules/vitest/vitest.mjs run`: 205 pruebas pasan (8 archivos).
Incluye firmas con el verificador real de Stripe y fixtures de acceso a datos.
El cron se prueba con dos partidos, tres períodos, mapeos ambiguos y reintentos.
Las pruebas con fixtures no certifican concurrencia real de PostgreSQL.

`svelte-check`: cero errores, seis advertencias preexistentes de accesibilidad/CSS
en la primera ejecución tras restaurar la configuración.

`npm run check`: también termina con cero errores y seis advertencias después
de los cambios de configuración.

`npm run build`: Vite genera los bundles cliente/servidor, pero el adaptador
Vercel falla al crear el enlace `.vercel/output/functions/index.func` con
`EPERM: operation not permitted, symlink` en Windows, incluso fuera del sandbox.
El empaquetado completo no está verificado; debe comprobarse en Linux/CI o
en Windows con permisos para enlaces simbólicos. No equivale a build aprobado.

No se han ejecutado operaciones sobre datos reales ni enviado correos/pagos.
Stripe/Supabase/proveedores reales y migraciones: no verificables con estas pruebas.

## Pendientes críticos; este bloque no certifica producción

1. Verificar identidad Firebase en servidor y aplicar permisos de servidor en
   predict, predict-batch, checkout, portal y acceso Supabase/RLS.
2. Stripe: registro duradero de event IDs, exclusión de duplicados, orden temporal,
   renovaciones y revocación coherente de permisos.
3. Ledger, compensaciones y auditoría transaccional de liquidación; resultados
   Q1/HALF, void, partidos atrasados y resultados fuera del día anterior.
4. Migraciones y contrato canónico: el esquema aún contiene discrepancias en
   perfiles y cuotas. La ingestión de cuotas aún empareja incorrectamente por fecha.
5. Integridad de features, abstención, datos demo/real, validación temporal de ML,
   calibración, caché, historial oficial y arquitectura multideporte.
6. Instalación limpia de dependencias y verificación de servicios reales.

No utilizar el build o los tests unitarios como evidencia de un modelo validado.
