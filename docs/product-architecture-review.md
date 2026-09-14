# Reorganización de producto — NioSports Pro

Entrega del 13 de septiembre de 2026. Este informe distingue los cambios implementados de las dependencias que todavía impiden considerar el producto listo para vender sin reservas.

## Decisión principal

Después del login se abre **Hoy**. Su orden es: contexto personal y plan, agenda recibida de NBA y tenis, acceso al análisis gratuito, directorio de deportes, seguimiento personal y comparación de planes. El visitante también puede explorar esta pantalla sin crear una cuenta; los datos privados y las APIs autenticadas conservan su protección.

No se muestran cifras de actividad ni cantidades de pronósticos que no procedan de una consulta. La agenda distingue una fuente caída de un calendario vacío. NBA usa el día de Nueva York; tenis, el de Guayaquil, indicados en pantalla. Los ejemplos del proxy NBA se rechazan en esta nueva agenda.

## Auditoría y cambios

| Área | Problema observado | Cambio aplicado |
|---|---|---|
| Entrada y login | El producto se presentaba como exclusivamente NBA y enviaba al usuario a un panel de métricas personales | Texto multideporte y destino `/today` tras email, registro o Google |
| Dashboard | El capital y las métricas competían con encontrar un deporte | Agenda, siguiente acción y deportes primero; bankroll con acceso propio |
| Menú | Nueve destinos mezclaban deportes, herramientas y seguimiento | Cinco destinos compartidos por escritorio y móvil: Hoy, Pronósticos, Deportes, Bankroll, Cuenta |
| Navegación activa | El resaltado podía quedarse en una ruta anterior | Comparación reactiva de la ruta actual; límites exactos para rutas anidadas |
| Deportes | Tenis era un enlace añadido a una navegación de NBA | Directorio central con NBA y tenis disponibles; fútbol y béisbol próximos, sin enlaces ficticios |
| NBA | No había un centro propio de esta disciplina | Página con calendario y entradas a totales y pronósticos |
| Tenis | Su módulo necesitaba encajar en la plataforma | Se conserva calendario, comparaciones y fichas; pertenece a Deportes |
| Pronósticos | El nombre Picks no explicaba bien su función y se mezclaba con otras herramientas | Centro multideporte y pantalla existente renombrada Pronósticos NBA |
| FREE | El límite visual era un porcentaje que podía dar más de una selección | Cero cuando no hay ninguna; exactamente una cuando hay contenido; no se desbloquea la siguiente al guardar |
| Pro | Solo mostraba el 70 % de las selecciones | Muestra todas las disponibles; Elite también |
| Valor gratuito | El dashboard y las estadísticas personales tenían restricciones que contradecían la propuesta | Dashboard, bankroll personal y resultados básicos abiertos en FREE; CLV avanzado mantiene su acceso por plan |
| Cuenta | El avatar solo ofrecía salir | Cuenta central con perfil, estado del plan, gestión de suscripción y accesos personales |
| Estadísticas | El nombre podía confundirse con estadísticas deportivas | Mis estadísticas y Mis resultados; los datos deportivos se consultan dentro del deporte |
| Bloqueos | El contenido Premium se renderizaba detrás de una capa borrosa; había excepción de propietario en cliente | El componente ya no renderiza el contenido bloqueado y verifica el estado del plan; no equivale a protección del servidor |
| Precios | Se anunciaban porcentajes y un motor NBA concreto desactualizado | Mensajes coherentes con FREE y todos los pronósticos disponibles en planes de pago; precios y productos Stripe existentes conservados |
| Móvil | Menú horizontal con destinos ocultos | Cinco accesos permanentes; directorio en dos columnas y contenidos principales apilados |
| Tema claro | Los colores deportivos de los enlaces tenían contraste insuficiente | Texto de enlace legible; color deportivo reservado al acento; navegación con contraste propio |

## Escalabilidad

`src/lib/product/navigation.js` concentra el catálogo y el menú. Un nuevo deporte requiere su entrada y su módulo, sin añadir un botón a la barra principal. Fútbol y béisbol no se presentan como funcionalidades operativas. Las rutas antiguas permanecen para conservar enlaces y herramientas existentes.

## FREE y Premium: alcance real

La presentación y las reglas visuales están implementadas. La página de pronósticos indica que el catálogo Premium diario está en preparación. **Todavía no existe una selección diaria persistente, única y protegida en servidor que unifique todos los deportes.** La lista NBA sigue calculándose en el cliente; el límite visual no es una barrera de seguridad ni garantiza persistencia entre dispositivos. No debe anunciarse este beneficio como una entrega diaria ya operativa.

Las API de predicción conservan las cuotas técnicas existentes. Esas cuotas de cálculo no son el beneficio comercial de una selección Premium diaria. La entrega completa requiere un catálogo publicado en servidor, selección fija por fecha, autorización de lectura y comprobación con cuentas FREE y Premium. No se han inventado selecciones ni insertado ejemplos en la base de datos para simularlo.

El plan real se consulta al servidor. Si no se puede verificar, Cuenta muestra “Plan por verificar”. No se han creado suscripciones, cobrado pagos ni cambiado precios de Stripe.

## Verificación y límites

- Suite general: 311 pruebas aprobadas después de la reorganización inicial.
- Pruebas posteriores específicas: 9 aprobadas, incluidas tres nuevas de agenda para fecha, rechazo de ejemplos y fuente vacía frente a fuente fallida.
- Revisión Svelte: sin errores ni advertencias antes de los últimos ajustes de contraste; se vuelve a ejecutar al cerrar la entrega.
- Navegador: Hoy, directorio, enlace activo tras navegar, estados de proveedor no disponible; directorio a 390 px sin desbordamiento horizontal; inspección de tema claro y oscuro.
- No se ha completado una sesión real de login, checkout ni consulta de datos privados en este entorno sin configuración. Se ha conservado el mecanismo existente y cambiado su destino; no se afirma una prueba real de autenticación.
- Proveedor de tenis pendiente. Predicciones sin calibración demostrada. Migración del ledger anterior pendiente de coordinación. Las incidencias de seguridad antiguas de la base de datos documentadas previamente siguen pendientes.
- El empaquetado de Vercel falla en Windows por permisos de enlaces simbólicos. Una vista local operativa no significa publicación en producción.

## Para revisar sin ser programador

1. Abrir `/today`: comprobar si se entiende qué hacer sin leer instrucciones.
2. Entrar a Deportes y distinguir lo disponible de lo próximo.
3. Abrir tenis y su demostración; conservar las comparaciones y fichas existentes.
4. Entrar a Pronósticos y comprobar que el estado de preparación no se confunde con una selección disponible.
5. Abrir Cuenta y encontrar el plan, estadísticas y seguimiento.
6. Reducir la ventana: los cinco destinos deben permanecer visibles.

La arquitectura y el recorrido se han mejorado. No se considera todavía un lanzamiento comercial validado: datos reales, catálogo Premium persistente, identidad y pruebas de producción requieren completar los puntos anteriores.

Cierre de revisión: 315 pruebas en 19 archivos aprobadas y Svelte sin errores ni advertencias. Cuenta incluye ahora una guía voluntaria que sustituye el tour automático antiguo. La revisión del navegador confirmó Cuenta, expansión de la guía y navegación a planes sin errores de JavaScript en esa sesión. En Precios se corrigieron además el falso aviso de activación basado solo en la URL, la marca de plan actual sin sesión y la mención de selección diaria sin indicar su preparación. El plan activo se verifica en el servidor; volver de Stripe no se presenta por sí solo como una suscripción activada.
