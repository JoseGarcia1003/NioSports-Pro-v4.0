# Contrato único de datos v1.0.0

Fase 2 · 28/09/2026 · Referencia de producto: [PRODUCT_SPEC](PRODUCT_SPEC.md).

## Alcance implementado y límite de activación

La nueva frontera estricta valida snapshots de variables NBA FULL y tenis MATCH para inferencia o entrenamiento. Incluye diccionario, recetas compartidas, trazabilidad temporal, ventanas verificables, etiquetas separadas y revisión inmutable en memoria con hash. No incorpora una API de pago, no cambia la metodología probabilística y no migra tablas.

**La API pública y las pantallas antiguas todavía no producen estos snapshots.** Su integración completa corresponde a F3 y a los adaptadores F18/F19. El formato antiguo no se convierte automáticamente en v1 y no hereda la certificación de los tests nuevos. La API Python sí consume ya las recetas compartidas de nueve variables compuestas, preservando su comportamiento numérico comprobado. Las demás debilidades de inferencia siguen pendientes.

## Fuente única y consumidores

- [dictionary.json](../../ml/contracts/dictionary.json): definición ejecutable de 51 variables, incluyendo las 26 del vector NBA en el orden del artefacto existente, contexto/entradas de tenis y objetivos.
- [contract.js](../../src/lib/data/contract.js): validación, cálculo de ventanas/derivadas, vector NBA y selección de entradas de tenis.
- [features.py](../../ml/contracts/features.py): consumidor Python de las mismas recetas; no mantiene otra lista de fórmulas.
- [data-snapshot.js](../../src/lib/server/data-snapshot.js): copia profunda, serialización estable, SHA-256 y versiones encadenadas.
- [diccionario legible](DATA_DICTIONARY.md): vista generada de la fuente JSON; no editar sus fórmulas a mano.

Los metadatos de definición (nombre, tipo, unidad, rol, deporte, liga, periodo, uso, faltantes, extremos, versión, actualización, fórmula) están en dictionary.json. Los datos de cada observación (fuente concreta, instantes, partido, temporada y revisión) viajan en el snapshot. Así no se atribuye una fuente ficticia fija a todos los valores de una misma variable.

## Esquema de snapshot: propiedades obligatorias

| Campo | Tipo y significado | Restricción |
|---|---|---|
| schemaVersion | Cadena, 1.0.0 | Cualquier otra versión se rechaza |
| purpose | inference o training_features | Nunca objetivos dentro de observations |
| origin | observed, fixture o manual | fixture requiere permiso explícito; manual no puede entrar en modelo estricto |
| asOf | Instante de corte UTC | Anterior al comienzo y no futuro respecto del reloj de verificación |
| previousHash | null o SHA-256 hexadecimal | Revisión enlaza la huella anterior; no muta el registro anterior |
| event.id | Identidad canónica del encuentro | Cadena no vacía, no nombre de equipo como ID de partido |
| event.sport / league | basketball/NBA o tennis/circuito definido | No reutilizar campos entre deportes/circuitos incompatibles |
| event.season | Identificador explícito de temporada | No derivar el inicio el 1 de octubre por conveniencia |
| event.period | FULL para NBA o MATCH para tenis | Q1/HALF fuera de esta versión estricta |
| event.startsAt | Hora de inicio conocida al corte | Puede estar en el futuro; no confundir horario programado con valor observado |
| event.timezone | Zona IANA válida | Necesaria para reglas de fecha local/descanso |
| event.participants | Dos IDs distintos y ordenados | NBA: local/visitante; tenis: A/B |
| observations | Lista de observaciones versionadas | Entre 1 y 200; sin duplicados por ID o variable/entidad |

Se rechazan propiedades no declaradas. Un campo como actual_total escondido junto al snapshot no pasa silenciosamente.

## Esquema de cada observación

| Campo | Tipo / regla |
|---|---|
| id | Identificador único de esta observación/versionado de valor |
| variable | Nombre exacto del diccionario; no se permiten objetivos ni derivadas suministradas por el cliente |
| entityId | ID del evento o participante según la variable; el vector NBA exige el lado correcto |
| value | Tipo definido; nunca se convierte cadena a número implícitamente |
| unit | Unidad exacta; puntos no son porcentajes, pies no son metros |
| source.provider | Identificador de proveedor o productor; no prueba autenticación |
| source.recordId / revision | Registro y revisión de origen; corrección de contenido requiere revisión nueva |
| source.kind | provider o fixture; debe coincidir con el origen del snapshot |
| source.publishedAt | Momento de publicación documentado de esa revisión |
| measuredAt | Fin de lo observado; no es la fecha de descarga |
| availableAt | Primer momento documentado en que esa revisión estuvo disponible |
| capturedAt | Primer momento documentado de captura; no sustituirlo por la fecha de importación actual |
| missingReason | null con valor presente; motivo explícito si value=null |
| rawValue | Original necesario para los recortes explícitos de descanso/temporada; no se pierde |
| sample | Para ventanas: complete=true y registros fuente con ID, fin, disponibilidad, captura, total entero y condición local/visitante |

Todos los instantes se normalizan antes de esta frontera a YYYY-MM-DDTHH:mm:ss.sssZ. Fechas sin hora, offsets no normalizados y fechas imposibles son rechazados; no se adivina una zona. Normalizar un offset conocido no equivale a inventar una hora desconocida.

Para cada valor utilizado:
**measuredAt ≤ availableAt ≤ capturedAt ≤ asOf < startsAt** y **publishedAt ≤ availableAt**.
Para cada resultado histórico usado en una ventana: **endedAt < asOf**, con disponibilidad/captura también previas y coherentes con el agregado.

Esta política es deliberadamente conservadora: una recopilación tardía no prueba disponibilidad pasada. Un proveedor futuro podría aportar evidencia histórica firmada o registros de publicación verificables; admitir otro régimen requeriría versión explícita y revisión, no rellenar timestamps.

## Ventanas, recuentos y coherencia NBA

L5, L10 y L20 requieren exactamente 5, 10 y 20 registros completados y declarados como muestra completa por el productor. Se comprueban IDs únicos, orden temporal, totales enteros, tiempos y el valor agregado. No se acepta que L5 contenga un solo partido ni que L20 copie L5.

- L5 y L10 deben coincidir con la cola correspondiente de L20, incluyendo valor y timestamps.
- Las medias por localía y desviaciones utilizan los mismos diez registros L10.
- La media por localía usa solo la condición correspondiente dentro de esos diez; si no hay ninguno, se rechaza, no se sustituye por media general.
- La desviación es poblacional. Cero es admisible; no se inventa 10 como fallback.
- La completitud frente a todo el universo no la demuestra un booleano: requiere reconciliación del proveedor en F18/F19. El validador comprueba la coherencia de la evidencia recibida, no que nadie haya omitido un partido.
- La diferencia de descanso usa valores originales, no la diferencia de valores recortados. Indicadores B2B deben concordar con descanso cero.
- Descansos se representan conforme al contrato documentado del artefacto: cap 7; días de temporada cap 250. Ambos conservan rawValue. Cambiar esos significados requiere nuevo contrato/modelo.
- Un valor fuera del dominio se rechaza; no se hace winsorización ni imputación escondida. Elegir transformaciones aprendidas corresponde a F4/F5.

El contrato de 26 nombres preserva semántica numérica documentada; NO acredita que los pesos v4 sean compatibles con la calidad de un nuevo conjunto ni que la validación antigua fuera correcta.

## Tenis: variables y contexto

El diccionario distingue rating general/superficie, campos de elegibilidad, superficie/formato y contexto como ranking, H2H o servicio. El extractor no introduce ranking/saque como entradas Elo por su mera presencia.

La selección de entradas exige ambos jugadores, ratings/recuentos y superficie/formato. Rechaza recuento de superficie mayor que historial total. No calcula Elo, no evalúa K, no impone nuevos mínimos ni simula incidencia de lesión: F11 debe reconstruir/evaluar esos comportamientos. Su fuente de ratings debe referenciar la revisión del cálculo; F3/F11 deberán enlazar esa referencia a historia y versión del algoritmo. El contrato no certifica un rating autodeclarado.

training/inference en el diccionario expresa uso admisible como entrada, no una afirmación de entrenamiento/uso actual. role=target y target=true permiten uso como etiqueta separada, aunque training=false como predictor. Contexto válido no se convierte automáticamente en predictor.

## Objetivos separados

validateTrainingLabel comprueba la pareja entre snapshot training_features y etiqueta externa:
- Mismo partido y periodo; evento completado.
- NBA: actual_total entero en puntos. Tenis: tennis.winner debe ser uno de los participantes.
- endedAt posterior al inicio; disponibilidad/captura ordenadas y no posteriores al momento de revisión.
- Publicación y fuente compatibles; demo no puede presentarse como dato observado.
- Retired/walkover no se convierten en completed.
- La etiqueta puede conocerse después del corte original, pero jamás se inserta en el vector predictor.

No se afirma que “completed” pruebe por sí solo la semántica de prórroga o retiro del proveedor. La normalización de resultados y verificación de fuente corresponde a F13/F19.

## Inmutabilidad y revisiones

sealDataSnapshot valida, copia y congela profundamente un objeto independiente y calcula SHA-256 de su contenido con claves ordenadas. Alterar el objeto original no altera la versión sellada. Una revisión debe:
1. Referenciar la huella anterior verificable.
2. Mantener identidad de evento, participantes, alcance, origen y propósito.
3. Tener un corte posterior y datos válidos en ese nuevo corte.
4. Cambiar la revisión de origen si cambia una observación del mismo registro/proveedor.

No se permite convertir fixture en observado mediante una revisión. El hash identifica contenido; no autentica al proveedor ni demuestra que los datos sean verdaderos.

Esta fase no crea un almacén remoto inmutable. La persistencia y los permisos de snapshots deberán integrarse con almacenamiento autorizado; congelación de memoria/hash no sustituye una restricción de escritura de base de datos.

## Frescura, confianza y responsabilidades

validateSnapshot permite una política explícita maxAgeMs respecto de asOf; rechaza política inválida y observación caducada. Sin esa opción **no certifica frescura**. Los umbrales por proveedor/campo serán seleccionados y versionados en F9/F18; no se inventa “seis horas” universal.

observed requiere que el productor esté en trustedProviders suministrado por código de servidor, no por el cuerpo del cliente. Eso es una lista de confianza, no una firma: el llamante sigue siendo responsable de autenticar el adaptador y de verificar la evidencia. No exponer esta función como bypass que acepte proveedores elegidos por el visitante.

Fixtures solo con allowFixtures=true en pruebas/herramientas aisladas. No se conectó la API pagada y no se agregaron credenciales.

## Legado, compatibilidad y cuarentena

[LEGACY_DATA_REPORT.json](LEGACY_DATA_REPORT.json) es reproducible mediante:
`python scripts/audit-data-contract.py --output docs/reconstruction/LEGACY_DATA_REPORT.json`.

Hallazgo: 5.999 registros únicos, ordenados por fecha, sin discrepancias numéricas detectadas entre las recetas revisadas y sin diferencias de suma del objetivo. **0 filas elegibles como datos estrictos con disponibilidad temporal certificada**: faltan timestamps, registros de ventanas, fuentes/revisiones, contexto de temporada y valores originales. Tampoco existen precios históricos.

No se eliminan filas, no se reescribe el CSV y no se anuncian errores en todos sus marcadores. El informe clasifica falta de evidencia, no falsedad general de los datos. Investigación retrospectiva exploratoria sigue siendo conceptualmente posible; no demuestra ventaja frente al mercado ni test final independiente.

Los tres comandos antiguos de entrenamiento quedan bloqueados antes de cargar dependencias, acceder a red o escribir modelos. El código se conserva como referencia para F4/F5, pero no se ejecuta ni siquiera al importarlo. El constructor antiguo de CSV también queda archivado para impedir que regenere ventanas con fallbacks sin trazabilidad. No existe una excepción silenciosa que reactive esas rutas.

La API Python antigua sigue calculando sus primeras entradas bajo sus contratos anteriores, con sus limitaciones conocidas. Se han centralizado las nueve composiciones numéricas, no sus probabilidades, artefactos ni validación estadística. Los callers JavaScript antiguos y el feed de tenis v1 no son adaptadores automáticos de este nuevo contrato.

## Criterios de aprobación F2

Diccionario completo y versionado; validación ejecutable; ventana íntegra y coherente; objetivos separados; source/tiempos requeridos; invariantes de revisión; equivalencia de recetas Python/JS; pruebas negativas; legado clasificado sin inventar fuentes; datos/modelos preservados. Aprobación técnica no significa validación predictiva, conexión de datos reales o migración terminada.
