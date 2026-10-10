# Match Studio — flujo de análisis, 10 de octubre de 2026

Petición: dejar los colores a un lado y mejorar funcionalidad y diseño de uso. La paleta compartida permanece intacta. Trabajo aislado en `codex/match-studio`, sin promoción a producción.

## Cambio

- En móvil, Encuentros y Análisis comparten una navegación persistente. Seleccionar un encuentro abre su detalle y lleva el foco al título; regresar conserva referencia, ventana y selección. Escritorio mantiene ambos paneles visibles.
- L5/L10/L20 muestran simultáneamente media, tamaño efectivo y recuento sobre la referencia. Localía puede reducir la muestra; las tarjetas muestran ese tamaño real.
- Referencia editable numéricamente y con deslizador. Valores vacíos, fuera de 180–270 o ajenos a pasos de 0,5 se rechazan sin cambiar el gráfico. Restablecer y cambiar de encuentro sincronizan los controles.
- Corregida inconsistencia de L20: los minigráficos antes recortaban a diez observaciones aunque la media usaba veinte. Ahora representan la ventana completa disponible.
- Cabecera y contexto más compactos para llegar antes a la herramienta, sin otra iteración de color.

## Verificación y límite

Doce pruebas de UI/regresión aprobadas: nueve del laboratorio (tres nuevas para ventana completa, referencia numérica y navegación/foco móvil) y tres del calendario. Comprobación Svelte inicial: cero errores y advertencias. Pendiente verificación de preview en escritorio/móvil y ambos temas; no declarar cierre antes de esas comprobaciones.

Los seis encuentros y sus resultados siguen siendo ficticios. El modo real continúa mostrando ausencia de fuente. Esta entrega no conecta históricos, cuotas, props de jugadores ni modelos predictivos; tampoco cierra F8 o F17. Los pendientes técnicos y empíricos anteriores conservan su prioridad.
