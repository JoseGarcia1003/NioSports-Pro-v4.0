# NioSports Match Studio — primera entrega de producto

## Dirección del propietario

El 10/10/2026 el propietario pidió potenciar NioSports con autonomía, tomando como referencia de experiencia https://props.cash/nba y dos capturas, sin copiar su identidad ni su interfaz. Esta solicitud amplía el alcance de la revisión anterior a una implementación de producto. Se adelanta una vista de exploración aislada; no se declara cerrada F17 ni se habilitan modelos, mercados individuales, APIs pagadas o recomendaciones comerciales.

## Problema y propuesta

NioSports tiene calendario y una pantalla de capacidades, pero falta una mesa de investigación que permita comparar muestras y explorar referencias con poco esfuerzo. La entrega añade `/sports/nba/analisis`, accesible desde el centro NBA. La navegación y los filtros son funcionales dentro del ejemplo; la pestaña de datos reales muestra explícitamente ausencia de fuente.

La referencia inspira búsqueda, ventanas históricas, vistas comparativas y detalle gráfico. NioSports conserva identidad propia: azul marino y dorado (corregidos por indicación expresa del propietario), tipografía DM Sans, totales de equipos, contadores de observaciones en lugar de porcentajes predictivos, trazabilidad y enlace a bankroll. No se reutilizan logos, fotos, código ni datos de Props.Cash.

## Corrección de identidad — azul marino y dorado

### Segunda iteración: marino intenso, negro y oro luminoso

El propietario indicó después que la primera corrección tampoco le representa: solicita marino fuerte, dorado reluciente y negro combinado. La verificación técnica previa no constituía aceptación estética y esta segunda iteración sustituye su dirección mate/suave.

Paleta: marino #001B52, fondo oscuro #00143D, superficies negras #07090F, navegación #030509, oro brillante #FFD447. El encabezado mezcla marino intenso y negro; título, marca y acciones principales usan un acabado metálico de oro. El tema claro conserva blanco en lectura y tarjetas, con navegación negra, encabezado marino y gráfico negro/oro para mantener fuerza e identidad. El oro oscuro #795600 se reserva para texto pequeño sobre blanco, sin convertir los protagonistas en marrón.

No cambian cálculos ni datos. Riesgos: exceso de brillo, contraste del degradado y pérdida de coherencia al cambiar tema. Se usan efectos estáticos y contenidos, etiquetas de gráfico exactas y regiones con contraste medido. Contrastes sólidos: oro/negro 14,34:1, oro/marino 11,54:1, texto dorado oscuro/blanco 6,68:1; texto oscuro en el punto más oscuro del degradado de acción 5,93:1. No se presenta como auditoría integral de accesibilidad. Cierre técnico y preview se registran tras comprobar escritorio, móvil y ambos temas; aceptación estética pendiente del propietario.

Verificación local de esta segunda iteración: nueve pruebas UI/regresión aprobadas (seis del laboratorio y tres del calendario), Svelte check cero errores y cero advertencias. Implementación `73ba315b6dbdca58d2a530d5f2dbde7ffec62b2b`, rama `codex/match-studio`. No se suman ejecuciones históricas ni se atribuye aprobación estética a estas comprobaciones.

El propietario rechazó los fondos y acentos de la primera preview y especificó azul marino, detalles dorados, negro y blanco, respetando los temas oscuro/claro. Esta preferencia sustituye la propuesta inicial de menta y queda persistida también en AGENTS.md.

- Fuente única de paleta: `src/lib/styles/brand.css`. Oscuro: fondo #07162B, superficies #0D203B, dorado #D5B46B y texto casi blanco. Claro: fondo #F5F6F8, tarjetas blancas, texto marino/negro y dorado de texto #896219.
- Match Studio, centro NBA, cabecera, logo y barra móvil comparten la identidad. Los tokens de producto y acciones compartidas adoptan el dorado. Las pantallas heredadas con colores propios requieren revisión cuando se integren; no se declara una revisión visual completa de todos los módulos.
- Dorado claro en símbolos y rellenos con texto marino; dorado oscuro para texto pequeño en tema claro. El gráfico conserva etiquetas y valores para distinguir categorías sin depender solo del color.
- Contrastes calculados sobre colores sólidos: dorado oscuro en blanco 5,49:1; sobre selección clara 4,83:1; dorado en superficie oscura 8,21:1; texto marino en relleno dorado 9,12:1. Estas mediciones no equivalen a una auditoría de accesibilidad completa.

Alcance: corrección visual reversible, sin cambios en cálculo, autenticación, muestras ni datos. Riesgo principal: contraste y divergencia entre temas. Cierre requiere revisar ambos temas y móvil en la preview, comprobar el cambio de tema y guardar la entrega. La evidencia de esta corrección se registra al completar la comprobación.

Verificación local de identidad: nueve pruebas UI/regresión aprobadas (seis de laboratorio y tres de calendario), Svelte check cero errores/advertencias. No se vuelven a atribuir las tres pruebas unitarias de la entrega anterior a esta corrección de colores. Commit de implementación: `690d4500b086bcc9d6057eb18351f46f1008d56b`.

Verificación técnica de la primera corrección completada; dirección estética rechazada después por el propietario. Preview `dpl_Dq1BZgDtbLa6WkqEAyAvNwEQhejP`, READY: https://nio-sports-pro-v4-0-hgqf41v4g-niosports-pros-projects.vercel.app/sports/nba/analisis. Comprobados laboratorio y centro NBA en ambos temas a 1440 px, móvil claro a 390 y oscuro a 360, cambio de tema y ajuste de referencia con teclado. Colores renderizados: fondo/cabecera oscuro rgb(7,22,43), claro rgb(245,246,248); acento oscuro #D5B46B y claro #896219. Sin desbordamiento horizontal de página (375/390 y 345/360, descontando scrollbar). Capturas locales `artifacts/match-studio/identidad-oscuro.jpg` y `identidad-claro.jpg`. Producción principal sin promoción. Siguiente trabajo: publicación del historial y afirmaciones heredadas, seguido de viabilidad de datos y F8.

## Implementación

- Explorador de seis encuentros ficticios con búsqueda insensible a acentos, orden por media/referencia y guardados de sesión.
- Ventanas L5/L10/L20; filtro de localía antes de seleccionar los últimos N; tamaño efectivo visible cuando faltan observaciones.
- Gráfico de totales con referencia ajustable, recuentos sobre/bajo/igual, valores exactos en tabla accesible y recuperación de la referencia original.
- Cambio de encuentro restablece la referencia; el modo real no conserva ejemplos.
- Claro/oscuro mediante el tema existente; disposición adaptable, controles de teclado y estados vacíos.
- Separación de los datos de presentación en `src/lib/nba/research-demo.js`. No hay llamadas de escritura ni integración con APIs predictivas, catálogo o ledger.

Los datos ficticios no prueban precisión, rentabilidad ni cobertura NBA. No hay cuotas de casas, jugadores reales o recomendaciones nuevas. El modelo de producción sigue deshabilitado conforme a F7.

## Riesgos y comprobación

Riesgos: confundir demo con fuente real, interpretar frecuencia como probabilidad, arrastrar una referencia al cambiar encuentro, ocultar una muestra insuficiente y perder legibilidad en móvil. Los avisos persistentes, la separación de modos, el reset por contexto y las pruebas de comportamiento cubren estas fronteras.

Criterio de cierre: filtros/selección/gráfico sincronizados, ejemplo identificado, origen real vacío sin sustituciones, datos previos conservados y pruebas pertinentes aprobadas. Comprobación visual y publicación se registran al terminar; no se presuponen a partir de la compilación.

Verificación local: seis pruebas nuevas de UI y tres regresiones del calendario aprobadas; tres pruebas de muestra/cálculo aprobadas (12 en total, sin duplicar ejecuciones). Svelte check final: cero errores/advertencias, incluido el ajuste de legibilidad del gráfico. Las nueve pruebas de UI/regresión se repitieron tras añadir desplazamiento al gráfico. El servidor local arrancó, pero la conexión del navegador/HTTP agotó el tiempo; se detuvo y se verificó mediante preview remota. No se atribuye el fallo de conexión a un defecto de la interfaz sin evidencia.

La primera preview `dpl_2ToA3M7oNaVqfxSPGF8scXpSa4bt`, implementación `d703b718`, alcanzó READY. Navegador: búsqueda por «ambar», guardados, localía combinada con L20 (10 observaciones efectivas), referencia por teclado y modo real sin ejemplos comprobados. Revisados escritorio 1440 px y móvil 390/360 px, sin desbordamiento horizontal de página, y ambos temas. Se detectaron etiquetas pequeñas en el gráfico móvil y se corrigieron en `fef260d2`: letras mayores y desplazamiento interno accesible por teclado. No se observó fallo funcional del laboratorio; los mensajes de Google/FedCM recogidos pertenecían a la página de acceso de Vercel visitada antes de la preview.

Rama de entrega: `codex/match-studio`. La producción y main no se han promovido. Los movimientos locales de documentos a `docs/carpeta` se conservan fuera de estos commits.

Preview final verificada: https://nio-sports-pro-v4-0-1yvhg5old-niosports-pros-projects.vercel.app/sports/nba/analisis. Deployment `dpl_2nQ4ueC27hFjhnxkjJKe6YwwkC2N`, READY, commit de código `fef260d21071ebd06c44570a2936c5644dad64c1`. En la versión final se comprobó desplazamiento de gráfico con flecha de teclado (40 px), contenido interno de 600 px para L10 y 760 px para L20, página sin desbordamiento a 390/360 px, tema claro y tabla exacta de 20 observaciones. Capturas locales: `artifacts/match-studio/escritorio.jpg` y `artifacts/match-studio/movil.jpg`. Los enlaces temporales de acceso de Vercel no se guardan aquí. Un commit posterior de cierre documental no cambia la funcionalidad comprobada.

## Continuidad del producto completo

Esta entrega establece una dirección tangible; no reemplaza las correcciones urgentes de la revisión previa. Continuar con protección del historial y rectificación de afirmaciones, viabilidad de datos, F8 cuotas y conciliación, F9 decisiones y F13/F14 resultados/bankroll. Integrar datos admisibles antes de reivindicar calidad predictiva. Props de jugadores requieren otro contrato, histórico y validación propios: no se añaden por su presencia en la referencia.

Orden de trabajo propuesto:

1. Corregir la publicación del historial y las afirmaciones heredadas de acierto/ROI; distinguir evidencia disponible, desconocida y no validada.
2. Confirmar viabilidad, licencia, cobertura, fechas de actualización y coste de las fuentes de resultados y líneas. La compra o contratación exige decisión del propietario; no se adelanta una API de pago sin ella.
3. Completar F8/F9 con conciliación de mercados, reglas de over/under/push, contexto temporal y abstención. Los filtros de investigación no deben producir una apuesta por sí solos.
4. Conectar esta mesa de análisis a históricos admisibles; mostrar corte, tamaño de muestra, faltantes y fuente. Sustituir el ejemplo únicamente con evidencia real, sin mezclarla.
5. Completar resultados y bankroll F13/F14 con cuotas observadas, liquidación y trazabilidad; medir rendimiento solo cuando el registro permita hacerlo.
6. Extender investigación a jugadores, lesiones, minutos y matchup únicamente al contar con contrato y datos suficientes. Evaluar utilidad con flujos reales, rendimiento móvil y accesibilidad antes de ampliar deportes.

No se reinicia el plan técnico ni se promete superar empíricamente al referente. La mejora se comprobará en claridad de uso, calidad y actualidad de datos, consistencia de resultados y rendimiento medido.
