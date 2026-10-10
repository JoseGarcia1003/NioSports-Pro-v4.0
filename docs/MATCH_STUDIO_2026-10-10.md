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

Verificación local: seis pruebas nuevas de UI y tres regresiones del calendario aprobadas; tres pruebas de muestra/cálculo aprobadas (12 en total, sin duplicar ejecuciones). Svelte check inicial: cero errores/advertencias. Check final y revisión visual pendientes de registrar. El servidor local arrancó, pero la conexión del navegador/HTTP agotó el tiempo; se detuvo y se prepara preview remota en la rama `codex/match-studio`. No se atribuye el fallo de conexión a un defecto de la interfaz sin evidencia.

## Continuidad del producto completo

Esta entrega establece una dirección tangible; no reemplaza las correcciones urgentes de la revisión previa. Continuar con protección del historial y rectificación de afirmaciones, viabilidad de datos, F8 cuotas y conciliación, F9 decisiones y F13/F14 resultados/bankroll. Integrar datos admisibles antes de reivindicar calidad predictiva. Props de jugadores requieren otro contrato, histórico y validación propios: no se añaden por su presencia en la referencia.
