# Match Studio — flujo de análisis, 10 de octubre de 2026

Petición: dejar los colores a un lado y mejorar funcionalidad y diseño de uso. La paleta compartida permanece intacta. Trabajo aislado en `codex/match-studio`, sin promoción a producción.

## Cambio

- En móvil, Encuentros y Análisis comparten una navegación persistente. Seleccionar un encuentro abre su detalle y lleva el foco al título; regresar conserva referencia, ventana y selección. Escritorio mantiene ambos paneles visibles.
- L5/L10/L20 muestran simultáneamente media, tamaño efectivo y recuento sobre la referencia. Localía puede reducir la muestra; las tarjetas muestran ese tamaño real.
- Referencia editable numéricamente y con deslizador. Valores vacíos, fuera de 180–270 o ajenos a pasos de 0,5 se rechazan sin cambiar el gráfico. Restablecer y cambiar de encuentro sincronizan los controles.
- Corregida inconsistencia de L20: los minigráficos antes recortaban a diez observaciones aunque la media usaba veinte. Ahora representan la ventana completa disponible.
- Cabecera y contexto más compactos para llegar antes a la herramienta, sin otra iteración de color.

## Verificación y límite

Quince pruebas pertinentes aprobadas: nueve de UI del laboratorio (tres nuevas para ventana completa, referencia numérica y navegación/foco móvil), tres regresiones del calendario y tres de muestra/cálculo. Comprobación Svelte final: cero errores y advertencias. No sumar repeticiones ni las pruebas históricas de otras fases.

Implementación `2df50055e727bb02b0b79319ca8481c14be83ea2` guardada/subida y extremo remoto comprobado. Primera preview `dpl_2hMWHPpd3pDDoXjpBzK4eRTLBfvJ` READY: referencia inválida no cambia gráfico; Enter aplica 235,5; localía + L20 muestra diez disponibles; todos los minigráficos L20 tienen veinte barras antes del filtro; volver conserva selección, L5 y referencia 240. Modo real sin gráfico; sin overflow de página a 1440/390/360.

La prueba visual detectó que el título del detalle quedaba oculto por la navegación fija móvil. Corregido en `8bd390e7475e5af6150f1ec2e2b11091804fbc46`: desplazamiento dirigido al título con margen para las dos barras; prueba de comportamiento verifica que se desplaza el mismo elemento que recibe foco. Las doce UI/regresiones y Svelte check 0/0 se repitieron tras la corrección, sin sumarlas como pruebas nuevas. Main conserva `ab9b63a4982cdb212c43a5f631507fa839e4e4aa`.

## Cierre: APROBADO TÉCNICAMENTE EN ESTE ALCANCE

Preview final `dpl_F6JeSPmFaTm8vVoajxagCG7dQBco` READY, código `8bd390e7`: https://nio-sports-pro-v4-0-e77x1i6z3-niosports-pros-projects.vercel.app/sports/nba/analisis. Verificada en navegador a 1440, 390 y 360 px, ambos temas, sin overflow horizontal de página. En móvil, título del detalle a 195,8 px y barra fija terminando a 159,1 px; al regresar, título de la lista a 196,2 px. Foco correcto en ambos sentidos; L5, selección Coral y referencia 240 conservados. Restablecer vuelve a 218,5. Gráfico L20 desplazable con teclado: scroll 40 px, ancho 760 px; ambos paneles visibles en escritorio.

Evidencia local en `artifacts/match-studio/`: flujo-escritorio.jpg, flujo-escritorio-oscuro.jpg, flujo-movil-analisis.jpg, flujo-movil-oscuro.jpg. Pestaña de preview entregada en claro, viewport temporal restablecido. Las capturas no se incluyen en Git. Reorganización documental del propietario conservada, WORK_STATE actualizado en docs/carpeta. Valoración estética/uso del propietario pendiente; no equivale a certificación integral de producto o modelos.

Los seis encuentros y sus resultados siguen siendo ficticios. El modo real continúa mostrando ausencia de fuente. Esta entrega no conecta históricos, cuotas, props de jugadores ni modelos predictivos; tampoco cierra F8 o F17. Los pendientes técnicos y empíricos anteriores conservan su prioridad.
