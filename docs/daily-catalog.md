# Catálogo diario: contrato y operación

Implementado el 14 de septiembre de 2026. El catálogo tiene almacenamiento y permisos reales; la disponibilidad de análisis depende del proveedor. No se insertan demostraciones en producción.

## Qué ve cada persona

- Visitante: información del encuentro y fuente; análisis de categoría FREE. Las selecciones Premium no viajan en la respuesta.
- Cuenta FREE: lo anterior y la selección Premium fijada para la edición del día de Guayaquil.
- Pro o Elite vigentes, verificados por el servidor: todos los análisis disponibles de la edición.
- Un token inválido se rechaza. Si falla la consulta de permisos, no se entrega el contenido privado.

`GET /api/catalog` sirve exclusivamente la edición de hoy. No acepta un plan, usuario o fecha del cliente para decidir permisos. Devuelve `private, no-store` y `Vary: Authorization`. Una edición vacía es distinta de un fallo de almacenamiento. El acceso a las tablas está cerrado a `anon` y `authenticated`.

`GET /api/catalog?demo=1` permite revisar el diseño sin credenciales. La respuesta y la pantalla indican que los jugadores, encuentros y probabilidades son ficticios. Esta vía nunca consulta perfiles ni almacenamiento y no concede acceso a contenido real.

## Publicación y retirada

`POST /api/tennis/sync` conserva la entrega verificada del proveedor y trata de publicar la edición. `POST /api/catalog/publish` permite volver a ejecutar solo la publicación. Ambos requieren la credencial de tarea `CRON_SECRET` en `Authorization: Bearer ...`; una cuenta de usuario no puede publicar.

El publicador inicial es de tenis: considera como máximo los primeros 200 encuentros individuales programados hoy, ordenados por hora e identificador, y solo publica los que el motor considera analizables. Rechaza fuentes de más de seis horas, encuentros ya iniciados y demostraciones. La primera selección queda fija como beneficio FREE. Una segunda ejecución devuelve la edición guardada, incluso con publicadores concurrentes; no cambia la selección. Si no hay candidatos válidos, no se reserva una edición vacía.

`POST /api/catalog/withdraw` usa la misma autorización de tarea y un JSON de como máximo 4 KB con `day`, `entryId` y `reason` (1–500 caracteres). La retirada se registra de forma permanente. La API oculta el análisis retirado y comunica el motivo, conservando la selección gratuita original. No existe reactivación ni reemplazo silencioso.

No hay todavía automatización de retiradas por cambios de lesión, cancelación o cuota. La edición es una lectura previa con hora de corte, no un seguimiento en directo. Los encuentros iniciados aparecen como lectura archivada. Debe operarse la retirada cuando una corrección del proveedor invalide un análisis publicado.

## Base de datos y límites

Migración remota aplicada: `20260914151620_daily_prediction_catalog`. Tablas `prediction_editions` y `prediction_withdrawals`, ambas con RLS. Los roles del navegador no tienen permisos; el servidor solo SELECT e INSERT. Se verificaron esos permisos en el proyecto conectado tras aplicar la migración.

La edición guarda fuente, instantánea, versión del motor y evidencia. Los porcentajes siguen siendo experimentales: no hay calibración ni rentabilidad demostradas. El modelo de tenis no incorpora cuotas.

Faltan proveedor contratado y adaptación de su contrato al formato normalizado para publicar datos reales. También falta un publicador NBA que genere esta edición en servidor: los cálculos NBA de su módulo no se convierten automáticamente en catálogo Premium. La estructura admite deportes nuevos, pero no afirma que todos dispongan ya de motor o cobertura real.

Las variables necesarias se describen en `.env.example`. Ningún secreto se incluye en este documento. Los permisos FREE/Pro/Elite se han probado con identidades simuladas; una sesión real y una suscripción real requieren validar la configuración del entorno alojado.
