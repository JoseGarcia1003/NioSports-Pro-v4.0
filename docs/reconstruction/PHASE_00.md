# Acta de Fase 0: diagnóstico organizado y control de reconstrucción

Fecha: 27/09/2026. Decisión: **APROBADA, exclusivamente como fase de diagnóstico y planificación**. Nota de la fase: **8/10**. Estado del producto: mantiene 4,1/10 global y 3/10 de modelo de la auditoría. Ninguna nota predictiva nueva.

## Apertura: siete puntos exigidos

1. **Problema:** los defectos se distribuyen entre entrenamiento, inferencia, pantallas, cuotas, resultados y contabilidad. Corregirlos aisladamente puede dejar contradicciones o invalidar una evaluación.
2. **Importancia:** una cadena coherente requiere semántica y datos antes de validar modelos, y contratos de decisión/resultado antes de liquidar importes. La estética no compensa esos errores.
3. **Archivos:** documentación y continuidad exclusivamente: plan maestro, inventario, esta acta, copia de solicitud, registro de comprobaciones, AGENTS, WORK_STATE y aviso de precedencia en EXCELLENCE_PLAN.
4. **Cambios propuestos:** inventario completo de la auditoría, agrupación por dependencia, secuencia 0-20, gates técnicos/empíricos, límites de datos y reglas de reanudación.
5. **Riesgos:** omitir un hallazgo, presentar NV como bug confirmado, confundir plan con implementación, llamar test intocable a datos ya usados, saltar de fase o dejar actuar prioridades antiguas.
6. **Verificación:** lectura de las 20 secciones, matriz de cobertura e IDs, referencias/criterios por registro, revisión de orden y manifiesto de hashes/Git. No corresponde entrenar ni ejecutar backtesting en F0.
7. **Aprobación:** cobertura íntegra de hallazgos/limitaciones, dependencia resuelta, todas las fases con alcance y salida, continuidad persistente y ningún cambio funcional.

## Diagnóstico reanalizado

La debilidad central no es la falta de una API de pago: es la falta de un contrato y una evidencia consistentes a lo largo del sistema.

- **Semántica:** estimar puntos, probabilidades y valor frente al mercado son salidas distintas; recomendación, registro manual y ticket tampoco son equivalentes.
- **Datos:** CSV sin precios históricos; disponibilidad temporal de variables incompleta; estadísticas estáticas antiguas; no hay evidencia de cobertura mundial de tenis.
- **Aprendizaje:** meta-modelo y calibración reutilizan entrenamiento; comparaciones archivadas no justifican complejidad; incertidumbre y métricas insuficientes.
- **Inferencia:** periodos mal escalados, fórmulas duplicadas, fallback mal etiquetado y estimación conjunta no justificada.
- **Resultados:** formatos de cuota y estados distintos; filtros/denominadores no uniformes; error convertido en cero.
- **Capital y publicación:** pick y reserva desconectados; resultado público no separado suficientemente del personal; faltan ensayos integrados.
- **Confianza/operación:** afirmaciones superan evidencia y varios flujos privados no están certificados.
- **Experiencia:** identidad, legibilidad y recorrido diario desiguales, pero la corrección visual queda detrás de la lógica por mandato vigente.

No se diagnostica una caída de Python a partir de un bloqueo del navegador; no se afirma exposición efectiva de picks personales; no se atribuyen fallos al proveedor sin evidencia. Estas reservas se conservan en el inventario.

## Implementación documental realizada

- [Plan maestro](../RECONSTRUCTION_MASTER_PLAN.md): once grupos de dependencia, 21 fases numeradas 0-20, criterios de cierre y protocolo de evidencia.
- [Inventario](FINDINGS.md): 64 registros, con prioridad, origen en páginas, fases responsables y prueba exigida para cerrar. Incluye tanto defectos como pendientes NV y riesgos de proceso, no 64 bugs todos confirmados.
- [Solicitud conservada](REQUEST_2026-09-27.md): mandato íntegro para no depender de la memoria del chat.
- [Comprobaciones](CHECKS_PHASE_00.json): base Git, hashes, controles estructurales y cambios de alcance.
- AGENTS.md, WORK_STATE.md y EXCELLENCE_PLAN.md: orden anterior explícitamente sustituido, parada tras F0 y siguiente paso F1.

Los hallazgos del producto siguen pendientes. No se altera retrospectivamente la auditoría para suavizar notas ni se reinterpreta el éxito de pruebas antiguas como un avance nuevo.

## Decisiones de planificación, sin implementar fases posteriores

1. F4 puede preparar candidatos; la superioridad solo se estudia con validación/métricas corregidas en F5/F6. Si esa evidencia falla, se reabre el trabajo y se detiene F7.
2. El histórico disponible fue utilizado/inspeccionado: un nuevo corte puede servir al desarrollo retrospectivo, pero no es prueba independiente nunca vista.
3. Ningún mercado NBA parcial se considerará soportado solo porque exista un selector Q1/HALF. La decisión formal se documentará en F1 y se hará exigible en las fases del motor.
4. Sin cuotas históricas verificables no se publica rentabilidad de un backtest. Sin modelo conjunto no se mantiene una probabilidad de combinada por multiplicación.
5. No se contrata proveedor ni se cambia diseño en esta entrega. F18 prepara contrato; F19 conecta y mide datos reales.
6. Los estados solicitados deberán ubicarse en las entidades correctas: una abstención no debe crear accidentalmente una reserva. El esquema aún no se ha definido; corresponde a F1/F2 y F13.
7. La seguridad actual y la documentación pública conservan riesgos hasta su corrección. No se promueve una versión intermedia como “producto validado”.

## Verificación y auditoría de la fase

| Criterio | Evidencia / resultado |
|---|---|
| Fuente y continuidad | Auditoría completa releída; Git inicial limpio, a5be119d coincide con rama remota |
| Cobertura | Matriz manual cubre las 20 páginas; 64 IDs únicos con criterio de cierre y fase |
| Dependencias | Once grupos; conflictos F4/F5/F6 y test final expuestos y resueltos en términos de alcance |
| Orden | F0 actual; F1-F20 no iniciadas; interfaz F17 y API pagada F19 |
| Afirmaciones limitadas | Defectos/NV/inferencias separados; notas del producto conservadas |
| Preservación | Auditoría, CSV y código de aplicación no modificados; hashes y diff documentados |
| Reanudación | Mandato archivado y tres archivos de continuidad actualizados con precedencia explícita |
| Trazabilidad automática | CHECKS_PHASE_00.json registra ejecución y resultado de controles estructurales |

**Pruebas ejecutadas en esta fase:** 12 comprobaciones documentales aprobadas: IDs, campos, referencias de fase, grupos, secuencia, secciones originales, huellas, copia de solicitud, alcance del diff, commit base, espacios y enlaces locales; revisión del contenido por el mismo agente. No se ejecutaron tests funcionales, entrenamiento, pagos, escrituras de usuario ni conexiones deportivas. Las 453 pruebas citadas son exclusivamente la evidencia histórica de la auditoría.

La comprobación estructural no demuestra por sí sola que un plan sea correcto; la lectura completa, la matriz de cobertura y el análisis de dependencias la complementan. Esta no es una revisión independiente por otro auditor.

## Nota, problemas restantes y decisión

**8/10 para la Fase 0.** Justificación: inventario trazable, orden ejecutable y límites expresos; todavía se apoya en la auditoría existente y los criterios deben concretarse en pruebas/casos detallados al abrir cada fase. No merece 10/10 por producir documentación, ni certifica que la reconstrucción futura funcione.

**APROBADA:** satisface la puerta de diagnóstico/planificación y deja un siguiente paso inequívoco. No hay autorización dentro de esta entrega para ejecutar F1. Se detiene aquí conforme a la solicitud.

**Pendiente:** todos los defectos de implementación y la evidencia empírica señalada; prueba independiente/prospectiva; recorridos reales de cuenta/pagos y datos deportivos cuando corresponda. La ausencia de API pagada no impide definir el producto, construir contratos o corregir lógica en sus fases.

**Siguiente entrega:** F1, especificación conceptual única, con sus siete puntos de apertura antes de modificarla. No iniciar todavía. El glosario, mercados y reglas definitivas no forman parte del trabajo realizado en F0.

## Persistencia

Entrega preparada en codex/security-integrity. Su commit y recepción remota se verifican al finalizar y se comunican al propietario. main y la página publicada no forman parte de esta entrega documental. Consultar Git para el identificador del commit que contiene esta acta; no confundir documentos subidos con aplicación corregida o desplegada.
