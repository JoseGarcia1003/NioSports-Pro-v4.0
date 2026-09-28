# Acta de Fase 1: definición única del producto

28/09/2026 · **APROBADA en alcance conceptual** · **Nota de fase: 8/10**.

Referencia: [PRODUCT_SPEC v1.0.0](PRODUCT_SPEC.md). La aplicación publicada todavía no implementa todas estas reglas; las notas globales del producto y del modelo permanecen sin cambios.

## Apertura y alcance autorizado

1. **Problema:** distintos módulos confunden proyección/probabilidad/pick/ticket, formatos de cuota, estados y validación.
2. **Importancia:** una futura reconstrucción no sería coherente si cada módulo interpreta otro evento, periodo o resultado.
3. **Archivos afectados:** nueva especificación, casos conceptuales y acta/verificación; actualización de plan maestro, inventario y WORK_STATE. Sin modificar src, ml, migraciones, API o interfaz.
4. **Cambios:** un glosario, matriz de mercados/capacidades, reglas de prórroga/retiro/push/void, significado del EV y flujo conceptual hasta capital/historial.
5. **Riesgos:** llamar soporte a un selector existente; confundir probabilidad condicionada con retorno incondicional; considerar resuelto el código por escribir la regla; repetir un nuevo plan sin entregar definición.
6. **Verificación:** contrastar contratos actuales de NBA/tenis/liquidación; revisar casos por regla, comprobar aritmética y referencias/alcance Git; no probar rendimiento estadístico con esos ejemplos.
7. **Cierre:** términos requeridos inequívocos, mercados limitados por evidencia, 38 casos coherentes y rutas conceptuales completas, ningún cambio fuera de F1.

La petición de continuar del propietario autoriza F1. La orden inicial de detenerse en F0 se conserva en su acta histórica; no bloquea esta nueva entrega. F2 no se inicia aquí.

## Implementación conceptual realizada

- Definido NioSports como análisis prepartido y registro personal, sin ejecutar apuestas ni custodiar fondos.
- Definida proyección NBA como media esperada de puntos del periodo. FULL incluye todas las prórrogas; HALF significa primera mitad; Q1 primer cuarto. El histórico deberá demostrar compatibilidad con esas etiquetas.
- M01-M11 separan objetivo, presencia en código y capacidad admitida. FULL y ganador individual de tenis son candidatos experimentales. Q1/HALF no tienen soporte predictivo válido acreditado; combinadas y mercados adicionales quedan fuera del motor v1.
- Glosario distingue predicción, recomendación, pick del sistema, selección experimental y ticket manual.
- Probabilidad NBA contempla OVER/UNDER/push. Tenis define victoria condicionada a finalización normal; retiros y reglas de casas se separan del objetivo Elo.
- Cuota canónica conceptual decimal, EV con devoluciones, diferencia entre edge en puntos y probabilístico. No se implementaron conversores.
- Los siete estados se ubican en su entidad: abstención no reserva; cancelación de evento no liquida por sí misma un ticket.
- Definidos procedencia manual/verificada, separación pública/personal, precio del pick frente a precio del ticket y versiones sin reescritura histórica.

## Contraste con el código existente

Revisados src/lib/engine/settlement.js, probability.js, constants.js; src/lib/tennis/domain.js; src/lib/catalog/domain.js; referencias en stores/data.js y bankroll/workspace.js; ml/api/main.py; encabezado de nba_features.csv y cálculo del objetivo en feature_engineering.py/collect_historical.py.

Confirmado: el código actual contiene factores de periodos, nomenclatura win/loss y complemento binario que deberán cambiar. El catálogo experimental no equivale a pick comercial. No se realizó una auditoría nueva de la base de datos remota ni una conexión pagada.

## Pruebas y revisión

[PHASE_01_CASES.md](PHASE_01_CASES.md) define C01-C38. Revisión conceptual de los 38, sin ejecución funcional en la aplicación.

[CHECKS_PHASE_01.json](CHECKS_PHASE_01.json) registra **21 comprobaciones aprobadas** de aritmética, referencias, estructura y alcance documental/Git. Ejemplos principales:
- 60%/40%, cuota 1,91 y 100 unidades → EV 14,60.
- 52%/43%/5% push → EV 4,32; ignorar push produciría -0,68.
- Victoria a 1,91 con 100 → retorno 191, beneficio 91; pérdida -100; devolución 0.
- Americana -110 → 1,909090…; no es exactamente 1,91.
- Cuenta 1000 con reserva 100 → disponibles 900; si gana, saldo disponible final 1091.
- 6 won y 4 lost → 60%, excluyendo estados no decisivos.
- FULL 210 reglamentarios y 230 finales → comparación con 230 bajo la regla conceptual.

No se ejecutaron tests de la aplicación, backtesting ni entrenamiento. No se presentan los tests anteriores de la auditoría como nuevos. Verificar números ilustrativos no valida probabilidades deportivas ni comportamiento del ledger.

## Criterios auditados

| Criterio | Resultado y límite |
|---|---|
| Preguntas de F1 cubiertas | Glosario y §§2-8 definen cada término solicitado y su relación |
| Mercados NBA/tenis | Matriz M01-M11; periodos, exclusiones y limitaciones explícitos |
| Predicción/recomendación/registro | Flujos separados; ninguna reserva automática por emitir análisis |
| Resultado y excepciones | Prórroga, push, retiro, walkover, void, aplazamiento y correcciones tratados |
| Coherencia probabilística | Masa de push y condicionamiento tenis explícitos; no asumir independencia |
| Ejemplos comprobables | C01-C38 con resultados esperados y cálculo independiente de ejemplos numéricos |
| Promesas acotadas | Ningún mercado comercialmente validado por F1; experimental no equivale a recomendado |
| Alcance respetado | Solo documentación; F2/modelos/proveedor/interfaz sin iniciar |

Nota **8/10** como juicio de calidad de especificación: cubre el gate conceptual y corrige ambigüedades importantes. No se otorga 10 porque falta comprobar su implementación mediante contratos formales, pruebas integradas y uso real; esta revisión la hizo el mismo agente y no un evaluador independiente. Es una nota de fase, no una mejora medida de la página.

## Hallazgos y pendientes

H01, H02, H27, H38, H45, H51 y H60 avanzan conceptualmente, pero siguen PARCIALES: no se ha reparado su manifestación en programa/documentación pública. Las demás condiciones del inventario mantienen su estado. No cerrar problemas de cálculo, privacidad o integración por haber definido el resultado correcto.

Decisión: **APROBADA para pasar posteriormente a F2**. No hay contradicción conceptual pendiente que impida formalizar contratos. La implementación, evidencia de rendimiento y habilitación comercial permanecen pendientes en sus fases.

## Continuidad y guardado

Base inicial: 7408124678271fafed585605cc9c959ed0b84a1c, rama codex/security-integrity limpia y coincidente con remoto. Se guarda la entrega documental en esa rama; main conserva la aplicación auditada. Verificar commit/push al cerrar antes de afirmar persistencia remota.

Próximo paso autorizado al retomar: **Fase 2, contrato único de datos y diccionario**, partiendo de PRODUCT_SPEC v1.0.0. Anunciar primero los siete puntos de apertura. No repetir F0/F1 ni empezar por interfaz o proveedor.
