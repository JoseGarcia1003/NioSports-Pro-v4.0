# Punto de control — leer antes de continuar

Actualizado: 14 de septiembre de 2026. Trabajo EN CURSO. El usuario pidió preservar explícitamente el progreso y retomar desde aquí cuando diga «Continúa».

## Objetivo y preferencias

Mejorar NioSports Pro hasta un producto pulido, fiable y verificable: NBA, tenis, pronósticos y bankroll. Prioridad expresa a tipografía, pesos, elegancia, móvil y fluidez. No solicitar permiso por cambios técnicos ya autorizados. No inventar datos ni afirmar perfección. Consultar EXCELLENCE_PLAN.md.

## Ubicación y publicación comprobadas

- Repositorio: subcarpeta `niosports` dentro del proyecto de trabajo.
- Rama: `codex/security-integrity`.
- Remoto: https://github.com/JoseGarcia1003/NioSports-Pro-v4.0
- PR de revisión: https://github.com/JoseGarcia1003/NioSports-Pro-v4.0/pull/1
- Último commit remoto verificado al crear este punto: `15a794c9bda613644b67982d57f0c51c5074f378` (reorganización multideporte).
- Preview de ese commit, READY confirmado: https://nio-sports-pro-v4-0-amqnvu5jz-niosports-pros-projects.vercel.app
- La producción principal seguía en `e9b2522d`. No afirmar que main tiene las mejoras ni que esta preview contiene cambios posteriores.
- Vercel sí genera previews al hacer push. El EPERM de empaquetado local Windows no implica fallo de compilación remota.

## Cambios nuevos escritos, aún por integrar y guardar en Git

- Catálogo: `src/lib/catalog/`, `src/lib/server/catalog.js`, `src/lib/server/job-secret.js`, `src/routes/api/catalog/`.
- Interfaz: `DailyCatalog.svelte`, página Pronósticos; textos de Hoy y Precios para edición disponible.
- FREE recibe una selección Premium fija por fecha; Pro/Elite verificados reciben todas. El servidor no envía los análisis bloqueados. Fallos de identidad o permisos no abren acceso.
- Edición inmutable con procedencia y hora de corte. Retirada append-only con motivo, sin reemplazar el premio diario.
- Publicación inicial de tenis tras sincronización verificada, con hasta 200 candidatos. No hay todavía publicador NBA ni retirada automática por cambios del proveedor.
- Demo pública y claramente ficticia en `/predictions?demo=1`, aislada de almacenamiento y cuentas.
- Documentación operativa: `docs/daily-catalog.md`.
- Agente NBA trabaja en generador asíncrono, cancelación, eliminación de supuestos inventados y guardado; no se debe dar por terminado hasta recibir su informe y pruebas.

## Pruebas comprobadas en esta entrega

- Catálogo dominio/API/base de datos: 23 pruebas aprobadas, `catalog-tests.log`.
- Operaciones de publicación/retirada: 5 pruebas aprobadas, `catalog-job-tests.log`.
- `npm run check`: 0 errores y 0 advertencias tras estas modificaciones.
- Navegador local: demo con tres tarjetas, una Premium abierta, una bloqueada y una FREE; expansión de evidencia; filtro NBA sin resultados; móvil 390 px sin desbordamiento; tema claro; sin errores JS en esa revisión.
- Suite anterior completa: 315 pruebas. NO sumar automáticamente ni afirmar que la suite nueva completa pasó hasta ejecutarla.
- Compilación y nueva preview de esta entrega: pendientes.

## Base de datos remota

Proyecto Supabase `degwzrlbjqezngduvxtj`.

- Migraciones de tenis aplicadas: `20260913040750_tennis_workspace`, `20260913040915_tennis_immutable_grants`.
- Catálogo aplicado y verificado: `20260914151620_daily_prediction_catalog`.
- `prediction_editions` y `prediction_withdrawals`: RLS activo; anon y authenticated sin SELECT; service_role con INSERT, sin UPDATE ni DELETE. No se insertaron ejemplos.
- `20260912154104_identity_billing_ledger.sql` seguía pendiente. Contiene tablas/RPC aditivos y un bloque de cambio de permisos de perfiles antiguos. Revisar compatibilidad antes de aplicar completa; no confundir tests PGlite con migración remota.
- Auditoría de RLS/tablas antiguas y compatibilidad Firebase en curso. No afirmar que está resuelta.

## Coordinación activa (reconsultar al retomar)

- `/root/deployment_quality`: package/lock, svelte/vite config, CI, vercel.json, hooks.server.js. Corregir build Windows con adapter-node explícito, conservar build Vercel real, consolidar CSP y eliminar caché persistente de APIs privadas. Sin commits ni despliegue propio.
- `/root/nba_integrity`: generador NBA, ruta picks, pick-actions y tests; ampliado a `src/lib/stores/data.js` para impedir respuestas tardías tras logout/cambio de usuario. Sin commits.
- `/root/security_audit`: solo lectura Supabase/configuración; espera conclusiones sobre RLS y migración billing/ledger. No autorizar DDL a partir de un informe incompleto.

## Siguiente acción exacta

1. Comprobar Git y agentes; guardar este punto de control y el plan con commit/push verificables. No incluir archivos parcialmente editados de agentes por accidente.
2. Integrar informes y cambios de los agentes. Revisar diffs, especialmente sesión/identidad, CSP y caché. Resolver auditoría remota con migraciones probadas sin borrar historial.
3. Ejecutar suite completa y check. Corregir fallos. El test `tennis-feed.test.js` importa sync; revisar efecto de la nueva publicación enlazada al sync.
4. Completar build local/CI según resultados del agente, commit/push de implementación y comprobar preview READY del SHA exacto.
5. Verificar interfaz y API en esa preview; abrir al usuario el enlace comprobado. Actualizar este archivo con SHA, pruebas, estado remoto y siguiente tarea visual.
6. Seguir con tipografía y sistema visual de EXCELLENCE_PLAN, sin pedir otra autorización técnica.

## Precauciones para reanudar

- Un servidor de desarrollo pudo quedar abierto en 127.0.0.1:5173. Comprobar salud antes de arrancar otro. Los identificadores de procesos/pestañas no son persistentes.
- No ejecutar build y verificación del dev server simultáneamente si comparten .svelte-kit.
- Los tests usan mocks y PGlite; las cuentas y suscripciones reales siguen por validar.
- Tenis necesita proveedor/credencial y adaptación. No prometer todas las competiciones reales mientras no exista cobertura comprobada.
- No se pueden garantizar cambios no escritos antes de una interrupción abrupta. Git, archivos, historial de migraciones y despliegues son las fuentes de verdad.
