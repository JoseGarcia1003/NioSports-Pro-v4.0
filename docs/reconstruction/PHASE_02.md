# Acta de Fase 2: contrato único de datos

28/09/2026 · **APROBADA TÉCNICAMENTE; VALIDACIÓN EMPÍRICA PENDIENTE**. F3 no iniciada. **Nota de fase: 8/10**, valoración del alcance técnico, no del acierto predictivo.

Base: e42a8f33e44382955fd8f528522bc970a4357f84. Implementación guardada en **768e2d50d132f28e090c84359c3b1fd11b5b7dab**, rama codex/security-integrity. Referencia conceptual: [PRODUCT_SPEC](PRODUCT_SPEC.md). Especificación ejecutable explicada en [DATA_CONTRACT](DATA_CONTRACT.md); definiciones en [DATA_DICTIONARY](DATA_DICTIONARY.md).

## Apertura y alcance autorizado

1. **Problema:** las entradas del modelo no acreditaban de forma uniforme significado, unidad, procedencia, ventana ni disponibilidad al predecir; había composiciones duplicadas en Python.
2. **Importancia:** una validación temporal posterior sería engañosa si usara datos conocidos después del partido o medias rellenadas con muestras insuficientes.
3. **Archivos:** ml/contracts, src/lib/data/contract.js, src/lib/server/data-snapshot.js; consumidor ml/api/main.py; entrenadores/exportador legacy; scripts de inventario/diccionario, fixtures, tests, CI y documentación de continuidad.
4. **Cambio:** diccionario versionado, validadores estrictos, ventanas reconstruibles, objetivos separados, recetas compartidas y snapshots con huella/revisión. Clasificar el histórico sin inventar metadatos.
5. **Riesgos:** confundir esquema con autenticidad de fuente; bloquear investigación antigua; llamar inmutable a una base de datos no configurada; dar por migrada la aplicación o por validado el modelo. Los límites se registran abajo.
6. **Verificación:** ejemplos controlados positivos/negativos, equivalencia Python/JS, regresión general/UI, análisis estático, conservación del CSV/modelos y compilación. Ningún entrenamiento, compra, migración remota ni resultado predictivo nuevo.
7. **Cierre:** los campos exigidos tienen definición única; los validadores rechazan futuro, objetivos mezclados, unidades incompatibles y ventanas inconsistentes; revisiones no alteran snapshots previos; el legado no recibe certificación automática; regresiones y empaquetado comprobados con límites explícitos.

## Cambios que funcionan en el código

- **51 definiciones versionadas**, entre ellas las **26 variables NBA** en el orden exacto del artefacto existente. Cada definición tiene tipo, unidad, fuente esperada, uso, alcance y reglas de ausencia/extremos/actualización. Los metadatos de cada observación aportan proveedor, revisión, fechas y contexto concreto.
- Validación de instantes UTC, corte anterior al inicio, publicación/disponibilidad/captura ordenadas, IDs, deporte/liga/periodo, unidades, números finitos y campos no declarados. Fixture requiere habilitación explícita; entrada manual no es evidencia admisible para el modelo estricto.
- L5/L10/L20 requieren exactamente 5/10/20 registros, identidad y tiempos. Se recalculan las medias/desviaciones y se comprueba que las ventanas cortas son las colas de la larga. No se reemplaza una muestra insuficiente por cero u otra media. La completitud frente al universo real sigue siendo responsabilidad del adaptador.
- Valores originales de descanso/días conservados antes del recorte documentado. Nueve composiciones usan la misma definición JSON en JavaScript y Python; la API Python consume esas recetas. No se centralizaron todavía probabilidades, dispersión ni modelos: son fases posteriores.
- Objetivo NBA y ganador de tenis separados de las variables anteriores al partido. La etiqueta posterior exige mismo evento/periodo y estado completado. Retiro no se convierte en victoria del modelo.
- En tenis se distinguen predictores, elegibilidad y contexto. Ranking, H2H o saque no se declaran entradas Elo solo por estar disponibles. No se ha evaluado el Elo ni reconstruido aún la historia de sus ratings.
- Snapshots copiados y congelados profundamente, con SHA-256 estable. Las revisiones enlazan la huella anterior y requieren nueva revisión de origen cuando cambia su contenido. Esto es integridad de objeto, **no persistencia inmutable en una base de datos**.
- Exportador y tres entrenadores antiguos detenidos antes de cargar dependencias o escribir archivos. Se conserva su código y todos los datos/modelos. No hay un interruptor silencioso para reactivar entrenamiento no certificado. Se corrigió además una indentación preexistente en train_model.py para que el bloqueo sea ejecutable.
- Informe de legado y diccionario legible reproducibles. La CI incorpora las pruebas Python sin nuevas dependencias.

## Lo que reveló el histórico disponible

[LEGACY_DATA_REPORT.json](LEGACY_DATA_REPORT.json): **5.999 filas únicas**, fechas 25/12/2020–22/06/2025, orden cronológico; ninguna discrepancia detectada en las recetas numéricas revisadas ni en la suma del objetivo. Sin líneas ni cuotas históricas.

**0 filas acreditadas bajo el nuevo contrato temporal estricto**: faltan disponibilidad/captura, revisión de origen, registros de cada ventana, temporada trazable y valores originales recortados. Esto no significa que todos los marcadores sean falsos: significa que no podemos certificar qué información estaba disponible al emitir cada predicción. El informe es específico del CSV legado, no un validador universal que deba rechazar todo dataset futuro.

El CSV y los artefactos ML permanecen idénticos a la base Git. La investigación retrospectiva exploratoria sigue siendo posible mediante una futura ruta explícita; no se presenta como prueba independiente o rentabilidad demostrada.

## Pruebas ejecutadas y alcance de su evidencia

| Comprobación | Resultado | Qué demuestra |
|---|---|---|
| Vitest de dominio/servidor | **501/501**, 29 archivos | Regresión y comportamiento bajo los casos definidos; incluye 56 pruebas nuevas del contrato |
| Vitest UI | **8/8**, 2 archivos | Regresiones de componentes existentes; no es una revisión visual nueva |
| unittest Python | **11/11** | Recetas, orden del vector, función real build_features extraída por AST, bloqueo de comandos legacy y conservación del CSV |
| svelte-check | **0 errores, 0 advertencias** | Compatibilidad estática Svelte/JS |
| Diccionario generado | Coincide con JSON | No hay otra lista manual divergente |
| Git del CSV y ml/models | Sin diferencias frente a e42a8f33 | No se entrenó ni sustituyó el histórico/artefactos |
| Build local Windows | **Exit 1 al empaquetar** | Cliente/servidor compilados; adapter-vercel no pudo crear symlink: EPERM |
| Build remoto de la implementación | **READY**, commit 768e2d50 | Vercel completó compilación/empaquetado web de la implementación; no es validación estadística ni del servicio Python |

Comandos reproducibles: node node_modules/vitest/vitest.mjs run; mismo comando con --config vitest.ui.config.js; python -m unittest discover -s tests/python -v; node node_modules/svelte-check/bin/svelte-check --tsconfig ./jsconfig.json; node node_modules/vite/bin/vite.js build. Entorno local: Node 24.19.0, Python 3.12.14, Windows.

Logs locales ignorados por Git: phase02-final-unit.log, phase02-ui.log, phase02-check.log, phase02-build.log. Resumen y huellas en [CHECKS_PHASE_02.json](CHECKS_PHASE_02.json). Los intentos iniciales con restricciones del entorno y la repetición final no se suman como tests diferentes. Total final: **520 pruebas**, de las cuales **67 son nuevas**.

La comprobación AST verifica la función numérica existente sin cargar modelos, FastAPI ni servicios. No demuestra arranque del servidor Python desplegado ni equivalencia probabilística extremo a extremo. El empaquetado web tampoco despliega por sí solo el servicio Python.

El fallo local de symlink no se ocultó ni se resolvió debilitando configuración: la verificación de empaquetado se completó en el entorno remoto del despliegue **dpl_8G1TuYxyQEc7wZsSLxnobAboxZ5r**, SHA exacto 768e2d50d132f28e090c84359c3b1fd11b5b7dab, READY y target=null. [Preview de la implementación](https://nio-sports-pro-v4-0-lctr660up-niosports-pros-projects.vercel.app). La herramienta de logs remotos respondió no disponible; el estado y SHA se comprobaron mediante get_deployment. No se afirma ausencia de advertencias remotas. Las advertencias locales de hooks/chunks/PWA y dependencias opcionales siguen registradas.

GitHub Actions no devolvió ejecuciones de pull request para este SHA. No se anuncia CI remota aprobada: las suites son locales, el build completo es el de Vercel.

## Límites y revisión autocrítica

1. **La aplicación antigua todavía no entrega snapshots nuevos.** Solo se comparte ya el cálculo Python de nueve composiciones. Conectar consumidores y delimitar motores corresponde a F3; no se afirma que todo el tráfico esté protegido por este contrato.
2. La fecha declarada y la lista trustedProviders no autentican una fuente. El adaptador servidor debe comprobarla; jamás aceptar la lista de confianza del visitante.
3. maxAgeMs permite rechazo por antigüedad, pero la política por campo/fuente no está seleccionada. Sin esa opción no hay certificación de frescura. La estadística estática del sitio sigue pendiente.
4. Hash y congelación no protegen por sí solos almacenamiento remoto ni acreditan completitud del calendario. Persistencia y permisos deben verificarse al integrarlos.
5. No hay nuevo dataset certificado, modelo entrenado, calibración, ablación, SHAP, evaluación de precisión ni ventaja económica. Las notas del producto/modelo auditado no aumentan por estos tests.
6. Los entrenadores antiguos quedan intencionadamente inutilizables hasta reconstruir una ruta admisible en F4/F5. Los artefactos históricos se conservan; la inferencia antigua no se convierte en modelo validado.
7. Extremos: se validan dominios explícitos y transformaciones documentadas. No se ha estimado una política estadística de outliers a partir de datos futuros.

## Continuación y publicación

**Veredicto:** se cumplen los criterios técnicos de F2 con casos controlados, conservación del legado y build remoto verificado. Nota 8/10 por definiciones comprobables, validación negativa, equivalencia de recetas y trazabilidad de evidencia. No se concede 10: autenticidad/completitud de datos, persistencia y adopción por consumidores aún no están acreditadas de extremo a extremo. Son dependencias registradas, no una certificación implícita. No existe dataset estricto habilitado para entrenamiento real; los entrenadores legacy permanecen bloqueados. Notas global/modelo de la auditoría: sin cambios.

F3 no se inicia en esta entrega. Tras cerrar F2, su primer paso será conectar el contrato con las interfaces de proyección, distribución y decisión, rechazando entradas/artefactos incompatibles sin sustituciones silenciosas. API pagada sigue reservada a F19, interfaz a F17.

La rama de trabajo conserva la implementación; main sigue en ab9b63a4982cdb212c43a5f631507fa839e4e4aa. La preview automática es una verificación aislada; no representa una promoción al enlace habitual.
