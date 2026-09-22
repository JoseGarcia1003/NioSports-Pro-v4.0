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

GitHub Actions, ejecución `34660552667` del PR #1: el job no se inició.
La anotación de GitHub indica: "The job was not started because your account
is locked due to a billing issue." No hay pasos ejecutados ni logs de pruebas.
Es necesario resolver la facturación de la cuenta para validar en CI; no se
modificó facturación ni se efectuó ningún pago.

No se han ejecutado operaciones sobre datos reales ni enviado correos/pagos.
Stripe/Supabase/proveedores reales y migraciones: no verificables con estas pruebas.

## Segunda entrega: identidad, contabilidad y panel (12 septiembre 2026)

Implementados un panel adaptable de bank, API autenticada con Firebase JWT
RS256 y permisos comerciales obtenidos exclusivamente del servidor. Stripe
registra eventos duraderos y descarta duplicados y eventos anteriores; las
escrituras comerciales del perfil dejan de estar autorizadas al cliente.

La migración `20260919225143_identity_billing_ledger.sql` añade wallets, tickets
y ledger. Operaciones atómicas con bloqueo por usuario y clave idempotente:
aportación, retiro, reserva y liquidación manual win/loss/push/void. El saldo
incluye todo el historial; la tabla muestra los últimos 100 movimientos.
Depósitos no cuentan como beneficio; ROI usa stake resuelto. No realiza
transferencias ni apuestas. El modo demo es explícito y de solo lectura.

Verificación local: 228 pruebas de la suite y 7 pruebas adicionales de API
aprobadas. Svelte: cero errores y advertencias. PostgreSQL embebido PGlite
ejecuta esquema y migración reales para probar invariantes y permisos; no
equivale a prueba concurrente de varias conexiones del servicio remoto.
Navegador: panel visible; detectado y corregido desbordamiento horizontal en
390 px. Sin credenciales locales, el login y datos reales no están verificados.

Activación pendiente: configurar variables de `.env.example`, integrar Firebase
como proveedor externo de Supabase y rol authenticated, verificar firmas con
credenciales de staging y aplicar migración junto con la nueva aplicación.
No se aplicó esta migración a producción: revoca escrituras del cliente antiguo.
Los saldos heredados no se importan automáticamente; requieren conciliación.
Las compensaciones de errores manuales y revocación Firebase aún faltan.
GitHub Actions sigue bloqueado por facturación; no se ha pagado ni desplegado.
La instalación informa 54 vulnerabilidades de dependencias, pendientes de
auditoría y actualización compatible. Las predicciones no están calibradas ni
certificadas: aún quedan features por defecto y validación de fuentes/ML.

## Pendientes críticos restantes; este bloque no certifica producción

Actualización de integridad predictiva: API individual y batch rechazan períodos,
líneas o estadísticas inválidas; batch devuelve motivos de abstención. El
generador automático ya no inventa líneas ni publica juegos marcados demo.
El contrato remoto exige ventanas históricas explícitas, dispersión y descanso;
sin ellas utiliza la heurística identificada. También rechaza respuestas ML
no finitas o incompatibles con la línea solicitada. Totales deja de sustituir
fallos de carga por estadísticas demo y distingue estimación heurística de ML.
Pruebas: suite completa 248 aprobadas, más dos nuevas comprobaciones de API
(abstención y plan/usuario falsificados) aprobadas; Svelte cero errores/avisos.
Todavía falta verificar procedencia y antigüedad de datos, eliminar las líneas
sugeridas del simulador Totales, calibración temporal y el contrato real del
proveedor ML. La presencia de campos no certifica su autenticidad.

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
