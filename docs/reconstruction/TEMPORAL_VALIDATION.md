# Validación temporal — protocolo F5

Versión `temporal-protocol-1`. Alcance: infraestructura de separación y trazabilidad; evidencia empírica NBA aún pendiente. Implementación: `ml/validation/temporal.py` y `experiment.py`. Se reutilizan los candidatos y preprocesadores de F4; no se toca el servicio público.

## Separación de responsabilidades

| Bloque | Uso permitido | Uso prohibido |
|---|---|---|
| TRAIN | Ajustar modelos y transformaciones dentro del corte | Utilizar etiquetas o variables que llegaron después del corte |
| VALIDATION temporal | Comparación de desarrollo en F6, con entrenamiento expansivo anterior a cada bloque | Llamarla prueba final independiente o seleccionar con calibración/test |
| CALIBRATION | Preparar predicciones y etiquetas separadas, vinculadas al modelo congelado | Reentrenar ese modelo con estas filas y seguir presentando sus salidas como OOS |
| TEST FINAL | Reserva cerrada; F5 no ofrece lector de objetivos ni evaluador final | Abrirla para ajustar variables, hiperparámetros, calibración o umbrales |

El historial disponible ya fue examinado. Reservar filas por fecha no vuelve independientes sus resultados. El estado del test final real permanece **UNAVAILABLE_INDEPENDENT_DATA**. Una futura muestra prospectiva/externa necesitará procedencia y registro de acceso antes de habilitar el protocolo de evaluación final F10/F19. No se compra una API en esta fase.

## Frontera de metadatos y fechas

El planificador acepta exclusivamente `id`, `group`, `asOf`, `featuresAvailableAt` y `labelAvailableAt`. No recibe objetivos ni vectores. Exige identificadores únicos, fechas con huso y disponibilidad de features no posterior al corte. La etiqueta final debe estar disponible después del corte. Convierte los instantes a UTC antes de ordenar o comparar; no depende del orden de archivo ni de las columnas legacy `date`/`_date`.

Estos metadatos constituyen una declaración de entrada, no una autenticación del proveedor. Para datos reales habrá que derivarlos del contrato F2 y conservar sus revisiones y fuentes. El ejecutor actual acepta exclusivamente fixtures de F4; no admite el CSV legacy ni permite habilitar modelos en producción.

Un grupo declarado y los eventos con el mismo instante de pronóstico forman unidades indivisibles, incluyendo conexiones transitivas. Un grupo que cruza un límite entre TRAIN/VALIDATION/CALIBRATION/reserva se excluye completo y registra `GROUP_CROSSES_BOUNDARY`. No se mueve retrospectivamente un partido para favorecer la muestra. Grupos sin todas sus etiquetas disponibles al momento del informe se excluyen con `LABEL_NOT_AVAILABLE_AT_EVALUATION`. Los metadatos de la reserva pueden describir eventos futuros; sus objetivos siguen cerrados.

## Cortes, disponibilidad y embargo

La política exige cuatro instantes ordenados: `trainEnd < validationEnd < calibrationEnd <= evaluationAsOf`. Cada ventana es cerrada por la izquierda y abierta por la derecha; una fila exactamente en el límite pasa al siguiente bloque.

El embargo es un número de horas configurado antes de ejecutar. Para entrar en el entrenamiento de un pronóstico con corte C, **todas** las etiquetas del grupo deben estar disponibles estrictamente antes de C menos el embargo. Una etiqueta exactamente en esa frontera se excluye. Los IDs excluidos se registran; si no queda entrenamiento suficiente para ejecutar, falla en vez de saltar silenciosamente el bloque.

El ejemplo usa 24 horas para probar la regla; no se declara óptimo para NBA. Un embargo no arregla features calculadas con futuro ni demuestra independencia entre partidos. La disponibilidad de cada variable, la población, las temporadas, el agrupamiento y el mínimo estadístico deberán verificarse con fuentes reales antes de ejecutar comparaciones empíricas.

## Validación y OOF

La validación se divide por grupos enteros, con entrenamiento expansivo. Un bloque anterior de validación puede convertirse en entrenamiento de uno posterior cuando sus resultados ya estén disponibles y cumpla el embargo. Por eso las métricas de esos bloques son de desarrollo retrospectivo, no un test final intocable. F6 deberá evaluar incertidumbre y dependencia, sin interpretar cada fold como experimento independiente.

Cada candidato se instancia desde cero para cada fold. Las tuberías F4 ajustan escaladores X y, en MLP, y solamente con ese train. No se comparte un escalador global. Los recibos conservan IDs, fecha de ajuste, exclusiones, variables y huella de las filas entrenadas.

El plan genera automáticamente folds OOF sobre las filas admisibles de TRAIN+VALIDATION anteriores a calibración. Cada proyección que alimenta al metamodelo procede de modelos entrenados con grupos anteriores y etiquetas disponibles antes de su corte. El periodo inicial sin OOF no se rellena con predicciones dentro de muestra. F4 rechaza además solapamientos y duplicados. El metamodelo Ridge de puntos utiliza exclusivamente esas salidas OOF; no se ajusta con etiquetas de calibración ni de reserva.

Una vez fijados los parámetros, es admisible ajustar el modelo final con TRAIN+VALIDATION y pronosticar CALIBRATION, siempre que respete disponibilidad y embargo. Esto **no** autoriza volver a llamar OOS a los ajustes de TRAIN+VALIDATION ni reajustar posteriormente con CALIBRATION. F6 todavía debe seleccionar la configuración usando solo desarrollo; F5 no escoge ganador.

## Congelación y lote de calibración

`FrozenProjection` no ofrece método público de reajuste. Conserva huella del objeto ajustado, filas de entrenamiento, plan y entradas autorizadas de calibración. Antes y después de pronosticar verifica la identidad del objeto; un cambio de pesos/parámetros por refit invalida el recibo y obliga a generar una nueva cadena de calibración con datos independientes.

La salida se acepta únicamente para los IDs y entradas del lote autorizado. Intentar usar el conjunto reservado, filas de train, entradas alteradas o un recibo modificado falla. Se enlazan las etiquetas mediante una huella separada. La serialización se utiliza solo para calcular un hash local; no se carga ningún pickle externo.

Esto es control de coherencia de un experimento, no una barrera de seguridad contra alguien que puede editar el código o memoria del proceso. La persistencia remota, control de acceso y ciclo de promoción de artefactos todavía necesitan integración posterior.

**No se ajusta un calibrador probabilístico en F5.** La salida dice `INDEPENDENT_BATCH_PREPARED_NOT_CALIBRATED` y `calibratorFitted: false`. Todavía no hay distribución NBA admisible; convertir puntos en probabilidades corresponde a F7. La proyección del stacking sobre calibración se conserva por separado, sin declararla calibrada ni habilitada para producción.

## Reserva final y ensayo adverso

El ejecutor de fixtures selecciona los IDs permitidos antes de validar/copiar valores de features u objetivos. En los tests, los valores de los 20 registros reservados se sustituyen por objetos no serializables: la ejecución sigue dando el mismo resultado. Se leen solo sus metadatos para definir la reserva. Esa prueba verifica que no hay lectura accidental del contenido reservado por esta ruta.

No existe función para abrir el test final en este módulo. Tampoco existe un interruptor que convierta un dataset ya examinado en independiente. La ausencia de evidencia real se conserva como limitación, no se transforma en validación aprobada.

## Ensayo reproducible y límites

Política del fixture (fechas UTC):

| Bloque | Periodo de cortes | Registros nominales |
|---|---|---:|
| TRAIN | 01/01/2020 a antes de 01/03/2020 | 60 |
| VALIDATION | 01/03/2020 a antes de 10/04/2020 | 40 |
| CALIBRATION | 10/04/2020 a antes de 04/05/2020 | 24 |
| Reserva simulada | Desde 04/05/2020 | 20 |

Fecha de evaluación: 24/05/2020. Entrenamiento final admisible: 99 filas; una de las 100 de desarrollo se excluye por embargo/disponibilidad. OOF: 79 filas, después de 20 grupos iniciales. Los 20 registros reservados **no constituyen un test NBA independiente**. Recuentos tan pequeños se usan para verificar el programa, no para justificar suficiencia estadística.

Desde la raíz y el entorno de F4:

```text
.venv-phase4/Scripts/python -m unittest discover -s tests/experiments -v
.venv-phase4/Scripts/python -m unittest discover -s tests/python -v
.venv-phase4/Scripts/python -m ml.validation.experiment > ml/experiments/output/phase05-temporal.json
```

En Linux usar `bin/python`. Crear el directorio de salida antes del comando si no existe. El informe registra política, fechas, IDs/recuentos, variables, hiperparámetros, semilla, versiones del dataset/recetas, huellas de fuentes y datos permitidos, modelo y entorno. Las métricas empíricas quedan nulas: F6 define estimadores y comparación, F7 calibra distribuciones. CI incluye tests e informe temporal; no confundir configuración con ejecución remota verificada.

Fuentes primarias: [scikit-learn 1.5.2, separación de evaluación y preprocesamiento](https://scikit-learn.org/1.5/modules/cross_validation.html) y [calibración con datos separados del ajuste](https://scikit-learn.org/1.5/modules/calibration.html). La política de embargo, agrupamiento y reserva es una decisión explícita de este proyecto; no una garantía que esas bibliotecas otorguen automáticamente.
