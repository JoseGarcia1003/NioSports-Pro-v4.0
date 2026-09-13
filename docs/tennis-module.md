# Tennis Lab — implementación y conexión del proveedor

## Qué funciona

Ruta `/tennis`, con demostración explícita en `/tennis?demo=1`.
Calendario de hoy/mañana según zona horaria, búsqueda, filtros masculino/femenino,
circuito y superficie, comparación por partido, forma reciente, H2H, resumen de
temporada, rendimiento por superficie, saque/resto y estado físico con enlaces a
informes. Los datos demo son ficticios, incluidos nombres, rankings y competiciones.

Esta entrega cubre individuales en ATP, WTA, Challenger, WTA 125, ITF Men y
ITF Women. Grand Slams y otras competiciones se representan por su torneo y
circuito; no se garantiza cobertura universal sin un contrato con el proveedor.
Dobles, circuito junior y superficies distintas de dura/tierra/césped se rechazan
explícitamente en el contrato inicial. No se simula cobertura real.

## Motor y límites

`src/lib/tennis/domain.js`: Elo cronológico desde 1500, K=24, mezcla 50% valoración
general y 50% valoración en superficie. Estimación experimental de ganador del
partido. No es un modelo entrenado/calibrado ni garantiza valor frente a cuotas.
Referencia conceptual: [introducción a Elo de Tennis Abstract](https://www.tennisabstract.com/blog/2019/12/03/an-introduction-to-tennis-elo/).
La implementación y sus constantes son propias de este prototipo; no replica
los ratings publicados por esa fuente ni presume su rendimiento.

Exige por jugador 20 partidos completos y 8 en superficie, última actividad
registrada menor de 180 días y snapshot de menos de seis horas. Se abstiene
si el partido comenzó, cambió de estado, tiene muestras insuficientes o una
incidencia física reportada sin posterior actualización de recuperación.
Solo usa resultados anteriores al corte y observados antes de ese corte.
Excluye el propio partido, walkovers y abandonos. No mezcla circuitos masculinos
y femeninos. Injuries/H2H/saque se presentan como contexto, sin ajustes inventados.
El formato a 3/5 sets se muestra, pero aún no ajusta la probabilidad: requiere
validación específica. Faltan calibración temporal, evaluación con partidos
reales, odds y mercados por sets/juegos. No se integran aún tickets de tenis
con el ledger ni liquidación automática de tenis.

## Datos y permisos

Supabase conectado: proyecto `niosports-pro`, referencia `degwzrlbjqezngduvxtj`.
Se aplicaron únicamente dos migraciones aditivas de tenis, sin modificar datos NBA:

- `20260913040750_tennis_workspace.sql` crea `tennis_snapshots` y `tennis_analyses`.
- `20260913040915_tennis_immutable_grants.sql` restringe el servidor a SELECT/INSERT.

Los nombres locales se alinearon con las versiones registradas por Supabase al
aplicar la migración remota. Las migraciones de identidad/ledger anteriores
siguen pendientes de coordinación: no ejecutar indiscriminadamente db push.

Snapshots JSONB inmutables: un documento canónico por entrega, con hash SHA-256
y unicidad proveedor/fecha. Esta opción evita actualizaciones parciales de un
calendario y conserva inputs exactos para auditoría; no es un almacén relacional
optimizado para años de histórico. Deberá evolucionar hacia tablas de eventos
e índices por jugador cuando se conozca el volumen real y licencia del proveedor.

RLS activado; anon/authenticated no pueden leer ni escribir estas tablas.
service_role solo lee y añade. No se conceden políticas públicas. Referencia:
[RLS de Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).
Los snapshots demo se rechazan tanto en aplicación como en base de datos.
El servidor no sobreescribe una entrega antigua con un error o una respuesta parcial.

`GET /api/tennis?date=YYYY-MM-DD&tz=America/Guayaquil` devuelve calendario;
`&match=<id>` devuelve informe. Datos reales requieren identidad Firebase.
`demo=1` es público y nunca escribe. `POST /api/tennis` con `{ "matchId": "..." }`
archiva el análisis con su snapshot y versión. Un reintento devuelve el análisis
ya archivado, no sustituye su resultado con uno nuevo.

`POST /api/tennis/sync`, Bearer CRON_SECRET, obtiene el feed por HTTPS, verifica
respuesta y tamaño, valida el contrato y añade una entrega de forma atómica.
No se ha creado un plan de consultas recurrentes a la API de pago: la frecuencia
debe ajustarse a sus cuotas, actualización y coste una vez elegido el proveedor.

## Conectar la API de pago

Secretos solo de servidor: `TENNIS_API_KEY`, `TENNIS_FEED_URL`,
`TENNIS_PROVIDER_ID`. También requiere la configuración existente de Firebase,
Supabase y CRON_SECRET. No poner la clave deportiva en PUBLIC_ ni VITE_.

La entrada implementada es un adaptador HTTP a un **contrato normalizado**;
no es una integración ya certificada con cualquier API comercial. Cuando se
elija proveedor, hay que mapear sus endpoints, IDs, paginación, estados,
zonas horarias, estadísticas e informes a este contrato, y ejecutar pruebas
con sus respuestas reales. Una clave por sí sola no garantiza todos los datos.

El cuerpo JSON debe contener:

```json
{
  "version": 1,
  "provider": "identificador-configurado-en-el-servidor",
  "isDemo": false,
  "fetchedAt": "2026-09-13T10:00:00Z",
  "coverage": ["ATP", "WTA"],
  "players": [],
  "matches": [],
  "history": [],
  "injuries": [],
  "playerStats": []
}
```

- `players`: id estable, name, gender men/women, rank entero positivo o null;
  country opcional. Los IDs incluyen el espacio del proveedor y no son nombres.
- `matches`: id, a/b (IDs distintos), circuit, tournament, round opcional,
  surface hard/clay/grass, indoor boolean o null, bestOf 3/5,
  discipline singles, status scheduled/live/finished/postponed/cancelled,
  startAt ISO con zona horaria. Los horarios sin confirmar deben esperar al
  adaptador; no convertirlos en medianoche ficticia.
- `history`: id, a/b, winner, circuit, surface, discipline singles,
  status completed/retired/walkover, endedAt, observedAt. Este último debe
  representar cuándo estuvo disponible el resultado, no una fecha inventada
  para permitir backtesting. Debe ser igual o posterior a endedAt.
- `injuries`: playerId, status reported/cleared, title, publishedAt, sourceUrl
  HTTPS. Un array vacío significa ausencia de informes, nunca salud confirmada.
- `playerStats` opcional: playerId, season, surface all/hard/clay/grass, asOf,
  matches, servicePoints, firstServeIn, firstServeWon, secondServePoints,
  secondServeWon, breakPointsFaced, breakPointsSaved, breakOpportunities,
  breaksConverted, aces, doubleFaults. Conteos enteros no negativos; se rechazan
  numeradores imposibles. La vista actual usa rollups all de la temporada.
  Una fila requiere todos sus conteos: si faltan, no inventar ceros para rellenar.

El feed debe cubrir ambos días en las zonas ofrecidas y suficientes resultados
históricos para cada jugador. Se valida unicidad, referencias, coherencia de
género/circuito, tiempos, superficies y límites. Se admiten hasta 20.000 jugadores,
5.000 encuentros de calendario y 100.000 resultados por entrega, máximo 10 MB
en transporte; escalar y particionar antes de superar estos límites.

## Verificación y pendientes de entorno

Pruebas del contrato, calendario al cambiar de año/DST, rechazo de demos reales,
fugas temporales, simetría Elo, abstención, roles PostgreSQL, HTTP y fallos de
proveedor. Se utiliza PGlite para esquema/permisos locales y se verificaron los
permisos también en Supabase real. No se insertaron jugadores ni lesiones
ficticios en la base remota. No hubo compras ni llamadas a una API deportiva de pago.

El navegador muestra solo datos demo hasta configurar la fuente. Las nuevas
tablas existen en Supabase, pero la aplicación modificada sigue en rama de trabajo;
no se ha desplegado esta versión en la web pública.

Resultado de validación de esta entrega: suite completa de 295 pruebas aprobadas
y dos comprobaciones adicionales de API aprobadas después (297 casos en total).
Svelte sin errores ni advertencias. Verificado en navegador: calendario de mañana,
filtro femenino, búsqueda sin coincidencias, recuperación con limpiar filtros,
comparación de saque/resto y móvil de 390 px sin desbordamiento. Sin errores
JavaScript en la pestaña de pruebas. El build generó paquetes de cliente y servidor
incluidas las rutas de tenis, pero el empaquetado Vercel volvió a fallar por
permisos de enlaces simbólicos en Windows: no constituye un build completo aprobado.

La revisión remota detectó además problemas **preexistentes** fuera de tenis:
RLS desactivado en nueve tablas, incluidas user_profiles/picks/bankroll_transactions,
y search_path sin fijar en update_updated_at. Se registran aquí sin alterar de
forma aislada los permisos del cliente antiguo. Deben resolverse al coordinar
la migración de identidad y el despliegue. Ver [diagnóstico de RLS desactivado](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public).
El aviso informativo de RLS sin políticas en tenis es intencional: solo el servidor
accede, con privilegios explícitos y sin acceso de clientes.
