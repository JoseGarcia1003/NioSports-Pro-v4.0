# Fase 7 — contrato probabilístico compartido

Estado: APROBADA TÉCNICAMENTE; VALIDACIÓN EMPÍRICA PENDIENTE. Cierre documental: 09/10/2026; pruebas finalizadas el 06/10. Autorización expresa del propietario el 30/09/2026; base b9bb2a4f. F6 mantiene selección empírica bloqueada; esta autorización permite avanzar solo en infraestructura, no certificar datos/modelos ni recomendar apuestas.

1. Problema: contrato genérico sin identificar semántica de distribución, código legacy con desviación fija y backtest sintético ejecutable.
2. Importancia: una probabilidad debe identificar evento, periodo, línea, corte, datos y modelos sin omitir push ni convertir FULL en parciales.
3. Archivos: núcleo probabilístico JS/Python, adaptador/pipeline, Elo de demostración, límites legacy, fixtures/pruebas y acta. No cambios de diseño, CSV/pesos, API pagada o habilitación comercial.
4. Propuesta: distribución discreta explícita de puntos y regla Elo central; recibos ligados a proyección por ID y hash, contrato versionado y ámbito soportado. Los artefactos controlados son fixtures, no distribuciones NBA calibradas.
5. Riesgos: perder masa al truncar colas, confundir under con 1-over en líneas enteras, mezclar versiones o cortes, cuartos sin datos, evaluar el calibrador sobre su ajuste.
6. Verificación: vectores compartidos con resultados conocidos en ambos lenguajes, sumas/cotas/monotonía/simetría, fallos y contexto incompatible, pipeline de API, cuarentena sin escritura; regresiones JS/Python.
7. Gate: mismas salidas y semántica; producción sin artefacto admisible permanece deshabilitada. Calibración y rendimiento deportivos siguen pendientes; no se elige una distribución a partir del test final ni de fixtures.

## Implementación y comprobación del cierre

Implementación: `1dd6ec69f1cf31985d405d471c992ac339806940`, guardada y contrastada con GitHub en `codex/security-integrity`. Especificación: [contrato probabilístico](PROBABILITY_CONTRACT.md). Evidencia reproducible: [CHECKS_PHASE_07.json](CHECKS_PHASE_07.json).

- NBA: suma exacta de una distribución discreta explícita para over, under y devolución por empate (push). Se rechazan masas inválidas/incompletas, líneas de cuartos y cualquier intento de convertir FULL en Q1/HALF. El adaptador disponible es exclusivamente de pruebas; no se ha ajustado una distribución NBA real.
- Tenis: cálculo Elo centralizado, con los mismos vectores conocidos en Python y JavaScript. La estimación se condiciona a partido completado sin retiro; no determina por sí sola cómo liquida una casa una apuesta.
- Recibos: evento, periodo, snapshot, corte, versión y hash de proyección compatibles. Las cuotas no alteran la estimación; combinadas no soportadas se rechazan. Se indica `calibrated:false`.
- Fórmulas y entradas de inferencia legacy bloqueadas; backtest sintético aborta antes de consultar red o escribir resultados. Se preservan CSV y siete archivos de modelos, comprobados por hash. Replay histórico completo corresponde a F10.
- Revisión final: se corrigió una tolerancia numérica que podía aceptar una probabilidad individual ligeramente superior a 1. Pruebas nuevas en ambos lenguajes reproducen y rechazan ese caso.

| Comprobación | Resultado y fecha |
|---|---|
| Dominio/servidor JavaScript, suite completa | **551 aprobadas**, 31 archivos, 06/10; incluye paridad ejecutando Python desde JavaScript |
| Contratos Python | **23 aprobadas**, 06/10; seis pruebas F7 y 17 regresiones |
| Interfaz, regresión | **10 aprobadas**, 30/09, tres archivos; posteriores cambios limitados a la validación numérica y su prueba |
| Análisis Svelte | **0 errores, 0 advertencias**, 30/09 y repetido el 06/10 tras corregir runtime |
| Total de pruebas de esta entrega | **584 aprobadas**; no sumar otra vez las 146 pruebas enfocadas, que son un subconjunto anterior |
| Build local Windows | Cliente/servidor compilan; empaquetado Vercel falla con EPERM al crear symlink. No se registra como build aprobado |
| Integridad histórica | Ocho hashes conservados respecto de F6; no entrenamiento, migración o borrado de datos |

Las 70 pruebas de experimentos F4-F6 son evidencia histórica y no se suman a esta entrega. La compilación web remota, cuando se confirma en el registro de comprobaciones, solo verifica el paquete web; no valida el servicio Python desplegado, ni datos deportivos ni rendimiento comercial.

### Incidencia de publicación corregida

El primer intento remoto (`dpl_DayTJi2DqVDefHmyEUVtoT6P9EzZ`) compiló, pero Vercel rechazó publicar funciones con `nodejs20.x`. Se corrigió `svelte.config.js` a `nodejs24.x` en `9df7d0bbb6680eccc8c5dd133ddd94c54d43ee5d`, alineado con CI y el Node 24 local de las pruebas. No se modificaron dependencias, secretos ni servicios. El análisis Svelte posterior pasó. Referencias oficiales consultadas: [versiones de Node admitidas](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions) y [configuración del adaptador](https://svelte.dev/docs/kit/adapter-vercel). La segunda preview dpl_HEWNTgy2BjHmNpefsyXAsht9Rw5r quedó READY el 06/10 para el commit 9df7d0bb. Evidencia en CHECKS_PHASE_07.json; no se promovió a main. El 09/10, /totales respondió HTTP 200 con el HTML de arranque; esta comprobación no ejecuta hidratación ni verifica un recorrido autenticado.

## Dictamen y pendientes obligatorios

Gate técnico de F7 aprobado: semántica compartida, paridad numérica, eventos compatibles, push, restricciones de periodos/combinadas y cuarentena comprobados. **No está aprobado el gate empírico integral de F6/F7**: faltan una distribución ajustada con datos admisibles, calibración independiente y evaluación deportiva con el protocolo temporal F5/F6. No se asigna un modelo ganador ni se habilitan recomendaciones comerciales.

Nota técnica de alcance: **8/10**. Semántica 2/2; paridad y aritmética 2/2; protecciones y regresiones 2/2; integración 1/2 (pipeline controlado, sin servicio real certificado); evidencia aplicable 1/2 (fixtures reproducibles, sin distribución/calibración observada). Evaluación del mismo agente, no revisión externa ni porcentaje de acierto. No cambia las notas de la auditoría del producto.

Las fichas demo de tenis conservan su formato experimental; este cierre no certifica todos los registros históricos/catálogos como recibos nuevos. Las páginas públicas de metodología, métricas y sus afirmaciones heredadas se revisan en sus fases correspondientes; no se consideran corregidas automáticamente.

## Continuidad

F8 NO INICIADA. Siguiente paso autorizado de la secuencia: cuota canónica decimal, conversiones en los bordes y conciliación de liquidaciones; no repetir F7 ni entrenar con datos en cuarentena. F6 empírica sigue pendiente, test final cerrado, API pagada F19 e interfaz F17. Cambios en rama de revisión; `main` permanece en ab9b63a4 y el dominio habitual conserva su versión anterior.
