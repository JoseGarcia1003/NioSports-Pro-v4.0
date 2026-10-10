# NioSports Match Studio — primera entrega de producto

## Dirección del propietario

El 10/10/2026 el propietario pidió potenciar NioSports con autonomía, tomando como referencia de experiencia https://props.cash/nba y dos capturas, sin copiar su identidad ni su interfaz. Esta solicitud amplía el alcance de la revisión anterior a una implementación de producto. Se adelanta una vista de exploración aislada; no se declara cerrada F17 ni se habilitan modelos, mercados individuales, APIs pagadas o recomendaciones comerciales.

## Problema y propuesta

NioSports tiene calendario y una pantalla de capacidades, pero falta una mesa de investigación que permita comparar muestras y explorar referencias con poco esfuerzo. La entrega añade `/sports/nba/analisis`, accesible desde el centro NBA. La navegación y los filtros son funcionales dentro del ejemplo; la pestaña de datos reales muestra explícitamente ausencia de fuente.

La referencia inspira búsqueda, ventanas históricas, vistas comparativas y detalle gráfico. NioSports conserva identidad propia: paleta azul noche/menta, tipografía DM Sans, totales de equipos, contadores de observaciones en lugar de porcentajes predictivos, trazabilidad y enlace a bankroll. No se reutilizan logos, fotos, código ni datos de Props.Cash.

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
