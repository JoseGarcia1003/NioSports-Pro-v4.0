# Fase 5 — separación temporal y reserva de evaluación

Estado: **APROBADA TÉCNICAMENTE; VALIDACIÓN EMPÍRICA PENDIENTE**. Base 025c9743; autorizada y completada el 29/09/2026. Implementación 1fabe7e5. F6 no iniciada.

1. Problema: evaluación legacy contaminada por entrenamiento, stacking dentro de muestra y calibración reutilizada.
2. Importancia: estimar errores exige conocer exactamente qué información tenía cada modelo y cuándo.
3. Archivos: nuevo ml/validation, pruebas tests/experiments, CI y documentación. No tocar CSV/pesos/servidor ni retirar cuarentena.
4. Cambio: particiones por fechas explícitas, grupos indivisibles, disponibilidad y embargo; OOF temporal generado automáticamente; recibos para ajuste/calibración y reserva final cerrada. Candidatos F4 reutilizados.
5. Riesgos: fechas equivalentes con distintos husos, etiquetas tardías, grupos cruzando cortes, datasets ya examinados llamados independientes, reajuste después de emitir predicciones de calibración.
6. Pruebas: invertir orden, alterar objetivos excluidos, inyectar fechas/IDs incoherentes, forzar solapamiento o refit; integrar candidatos y stacking en fixtures. Registrar versiones, fechas, recuentos y límites.
7. Gate: cero intersección indebida, preprocesadores ajustados dentro de train, OOF anterior al corte, calibración separada y ligada al modelo congelado; test final bloqueado y evidencia real no disponible explícita.

## Resultado implementado

El nuevo particionador `ml/validation/temporal.py` trabaja exclusivamente con metadatos: fechas con zona horaria, disponibilidad de variables y resultados, identificadores y grupos. Normaliza a UTC y mantiene juntos los eventos simultáneos y los grupos relacionados. Excluye grupos que cruzan fronteras o cuyo resultado todavía no estaba disponible. Cada ajuste utiliza solo etiquetas anteriores al corte, con un margen temporal explícito (embargo).

La validación avanza por bloques: los bloques posteriores pueden aprender de los resultados ya disponibles de bloques anteriores, nunca del futuro. Se generan automáticamente folds OOF para que el metamodelo aprenda de predicciones realizadas sin entrenar sobre su propio resultado. Los escaladores se ajustan dentro del entrenamiento correspondiente. El modelo final puede usar TRAIN + VALIDATION admisibles; no incorpora CALIBRATION ni la reserva final.

`ml/validation/experiment.py` integra los candidatos F4 en un ejecutor exclusivo para datos ficticios. Congela la huella del modelo, la de su entrenamiento y el lote de calibración autorizado. Rechaza predicciones con otro lote, recibos alterados o un modelo reajustado. La prueba adversa de refit modifica deliberadamente el estimador y confirma el rechazo. Estas comprobaciones son controles de integridad del flujo, no una barrera contra quien puede modificar el código o la memoria.

**F5 prepara el lote independiente para calibración; no entrena un calibrador probabilístico.** Su salida lo declara expresamente. La distribución y su calibración corresponden a F7. El stacking produce proyecciones separadas sobre ese lote, sin publicarlas como probabilidades calibradas.

La reserva final tiene estado `UNAVAILABLE_INDEPENDENT_DATA` y permanece bloqueada. No hay lector del test final. Se demuestra que esta ruta no lee sus variables ni resultados mediante su sustitución por objetos no serializables. Reservar filas de un fixture no demuestra independencia de datos deportivos reales.

Protocolo y comandos: [TEMPORAL_VALIDATION.md](TEMPORAL_VALIDATION.md). Evidencia portable: [CHECKS_PHASE_05.json](CHECKS_PHASE_05.json).

## Comprobaciones realizadas

| Comprobación | Resultado y alcance |
|---|---|
| Nuevas regresiones F5 | 19 aprobadas: fechas, grupos, disponibilidad, embargo, OOF, reserva, refit, recibos y escaladores |
| Regresión del laboratorio F4 | 19 aprobadas; total de experimentos: 38 en 74,690 s |
| Contratos Python F2/F3 | 17 aprobadas en 2,853 s |
| Todas las familias | Ocho candidatos F4 atraviesan el flujo de congelación y lote; stacking integrado con OOF generado |
| Reproducción | Informe completo idéntico en dos procesos independientes del mismo entorno |
| Ensayo temporal | 144 filas ficticias: 60 TRAIN, 40 VALIDATION, 24 CALIBRATION, 20 reservadas |
| Disponibilidad | 99 filas admisibles para ajuste final; una excluida por embargo; 79 predicciones OOF en ocho folds |
| Validación de desarrollo | Cuatro bloques, ajuste nuevo por bloque y recibos con IDs y fechas |
| Fuentes y legado | Huellas del código verificadas; ocho archivos legacy preservados |
| CI | YAML válido y job ampliado con informe F5; ejecución remota no certificada |

**55 pruebas actuales aprobadas.** Las 539 pruebas web de F3 son históricas y no se repitieron: no hay modificaciones de aplicación, interfaz ni dependencias web. Tampoco se hizo despliegue o evaluación deportiva. No se entrenaron CSV en cuarentena, no se exportaron pesos ni se seleccionó ganador.

## Gate y nota

| Criterio | Dictamen |
|---|---|
| Fechas, disponibilidad, grupos y fronteras | Cumplido en el particionador y pruebas adversas |
| Ajustes y preprocesadores dentro del train permitido | Cumplido con candidatos reales y comprobación del escalador |
| OOF temporal sin solapamiento indebido | Cumplido; folds y sus proyecciones registrados |
| Calibración separada, ligada al modelo y sin refit silencioso | Cumplido para preparación del lote; calibrador probabilístico pendiente F7 |
| Test final reservado o explícitamente no disponible | Cumplido: no disponible, sin lectura de valores ni apertura |
| Reproducibilidad | Cumplida localmente; plataforma remota pendiente |

**Nota técnica de fase: 8/10.** Rúbrica: separación temporal y grupos 2/2; aislamiento de ajustes/OOF 2/2; controles de calibración y reserva 2/2; reproducción operativa 1/2 (local, sin ejecución Linux certificada); aplicabilidad real 1/2 (infraestructura comprobada, procedencia y prueba empírica pendientes). Es una evaluación del mismo agente, no auditoría independiente ni nota de acierto.

La procedencia y disponibilidad reales no pueden certificarse con timestamps declarados por el fixture. El embargo de 24 horas es una política de prueba, no un valor óptimo para NBA. Cambiar reglas tras ver el test final lo convierte en desarrollo. Se mantienen métricas empíricas y ganador nulos y las notas originales de la auditoría sin cambios.

## Guardado y continuación

Entrega en `codex/security-integrity`, con implementación 1fabe7e5 y un commit posterior de cierre documental. `main` permanece en ab9b63a4: esta fase no modifica la página principal. Una preview automática de la web no valida el laboratorio Python.

Siguiente fase: **F6**, formalización de métricas y comparación temporal de desarrollo, con denominadores e incertidumbre; sin precios no hay retorno y sin datos admisibles no hay superioridad empírica demostrada. F6 no se ejecuta en esta entrega. Mantener cuarentena, separación de calibración, reserva cerrada y API pagada en F19.
