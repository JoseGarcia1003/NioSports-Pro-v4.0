# NioSports Pro — acuerdos persistentes

## Mandato vigente de reconstrucción (27 de septiembre de 2026)

- Leer primero `docs/RECONSTRUCTION_MASTER_PLAN.md` y el acta de fase indicada en WORK_STATE. La solicitud íntegra está en `docs/reconstruction/REQUEST_2026-09-27.md`; sustituye el orden anterior de diseño y mejoras.
- Ejecutar una sola fase a la vez: anunciar problema, importancia, archivos, propuesta, riesgos, comprobación y criterio de cierre; implementar, verificar y emitir acta APROBADA / REQUIERE CORRECCIÓN antes de avanzar. Una aprobación técnica no demuestra rendimiento predictivo.
- La entrega inicial se limita a Fase 0. No iniciar Fase 1 dentro de esa entrega. Una continuación posterior retoma la siguiente fase registrada, sin repetir el diagnóstico.
- API deportiva de pago solo en Fase 19; interfaz solo en Fase 17 tras estabilizar lógica. No inventar evidencia ni aprobar gates fallidos por falta de datos. Conservar pendientes empíricos separados de pruebas de software.

## Continuidad

- Al comenzar o reanudar, lee `docs/WORK_STATE.md` y `docs/EXCELLENCE_PLAN.md`. «Continúa» significa retomar la primera acción pendiente verificable, no rehacer la auditoría general.
- Comprueba rama, cambios locales, último commit y estado remoto. Un comando interrumpido puede haber completado su efecto: verifícalo antes de repetirlo, especialmente migraciones, publicación y operaciones externas.
- Conserva los cambios sin confirmar. No descartes trabajo ajeno ni el de agentes. Consulta los agentes activos y sus archivos antes de editar su área.
- Actualiza WORK_STATE después de cada hito y antes de cerrar: hecho, pruebas, pendiente, bloqueo concreto, siguiente acción y estado de Git/publicación. Guarda cambios coherentes en commits y verifica el push antes de decir «guardado en GitHub».
- No prometas memoria perfecta, ejecución mientras el servicio esté pausado, ni recuperación de una operación que nunca llegó a escribirse. Usa los archivos y resultados como evidencia.

## Prioridades del propietario

El usuario quiere un producto excelente y visible: diseño elegante, tipografía y pesos coherentes, lectura clara de cifras, fluidez, buen móvil, datos deportivos verificables y bankroll fiable. La calidad visual es una tarea de producto, no un retoque final que se pospone indefinidamente.

Autoriza las mejoras técnicas razonables del repositorio sin pedir aprobación por cada archivo. Avanza y prueba. Las compras, nuevas credenciales y decisiones externas que no puedas completar requieren intervención concreta; no inventes conexiones ni servicios contratados. Su aspiración «11/10» es una exigencia de calidad, nunca una afirmación publicitaria que debas dar por demostrada.

## Calidad y entregas

- No inventar partidos, lesiones, estadísticas, cuotas, acierto, rentabilidad, clientes ni conexiones. Demostraciones explícitas y aisladas de producción.
- Planes, identidad y datos privados se protegen en servidor. No basta con ocultarlos o difuminarlos en la interfaz.
- Cada entrega debe incluir una mejora utilizable o cerrar un problema concreto con evidencia. Evitar jornadas enteras de análisis sin editar.
- Para cambios funcionales: pruebas de comportamiento y regresión pertinentes. Para interfaz: revisar escritorio, móvil, temas y acciones reales en navegador.
- Distinguir archivos locales, commit, rama remota, vista previa y producción principal. Incluir enlaces comprobados.
- Explicar al usuario en español sencillo qué cambió y qué puede revisar. No presentar un plan o una nota como sustituto del producto.
- No dar notas de calidad nuevas sin medición; no declarar listo para vender si autenticación, pagos, datos o aislamiento siguen sin validarse.
