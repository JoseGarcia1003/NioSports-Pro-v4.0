# Fase 3 — arquitectura de modelos

Estado: **APROBADA EN ALCANCE ARQUITECTÓNICO; VALIDACIÓN EMPÍRICA PENDIENTE**. Cierre: 29/09/2026. Base: 0db3c484. F4 no iniciada.

1. Problema: mezcla de proyección, probabilidad, decisión y presentación; fallback silencioso y periodos sin modelo propio.
2. Importancia: un resultado debe identificar su entrada, modelo, alcance y límites sin cambiar de significado entre API y pantalla.
3. Archivos: nuevo dominio prediction; servidor prediction-service; rutas predict/predict-batch; API Python; separación Elo de tennis/domain; consumidores NBA, pruebas y documentación.
4. Cambio: cinco etapas con contratos versionados, snapshot estricto de F2, modelos registrados explícitamente y abstenciones ante ausencia/incompatibilidad. Ningún entrenamiento nuevo.
5. Riesgos: deshabilitar temporalmente pronósticos antiguos sin trazabilidad; compatibilidad de consumidores; confundir arquitectura probada con precisión demostrada.
6. Verificación: contratos, cadenas controladas, fallos y dimensiones incompatibles, rutas autenticadas, ausencia de fallback, regresión, check y build remoto de rama.
7. Gate: dependencias unidireccionales; resultados fuera de inferencia; presentador sin cálculos de probabilidad/EV; modelos/periodos habilitados explícitos; errores visibles y sin sustituciones silenciosas.

## Implementación entregada

Commit de código: `909d40f51da2e7c7e9cc6907feba0a46019c9f98`, guardado y comprobado en `codex/security-integrity`. Producción principal conserva `ab9b63a4982cdb212c43a5f631507fa839e4e4aa`.

- Nuevo dominio `src/lib/prediction`: proyección, probabilidad, decisión, presentación y resultado posterior, unidos por identidad de evento, periodo, corte y huella del snapshot. Contrato `prediction-chain-1`.
- `prediction-pipeline` conecta el contrato de datos F2. El modelo recibe variables, no cuotas. La probabilidad recibe proyección y línea, no cuotas. El presentador copia resultados sin inventar confianza ni EV. El resultado posterior no vuelve a ejecutar inferencia.
- `prediction-service` y las dos rutas API exigen referencia a snapshot del servidor. El cliente no puede autorizar fixtures, proveedores ni modelos. Se conservan identidad, plan y límites de solicitudes. Las peticiones legacy se rechazan explícitamente.
- API Python restringida a proyección: manifiesto y hashes completos, orden exacto y dimensiones de las 26 variables; sin recortar/rellenar ni sustituir LightGBM por XGBoost. El adaptador remoto comprueba identidad y artefacto de la respuesta.
- Elo separado del contexto de tenis. La demo conserva su condición experimental y pasa por contrato de datos controlados. Feed real sin procedencia suficiente produce abstención; H2H/saque no se anuncian como variables del Elo.
- Calculadora NBA antigua retirada. `/totales` muestra disponibilidad, reintento y enlaces; no genera picks ni altera registros anteriores. El generador de picks ya no calcula probabilidades/EV en cliente. La ruta informativa es pública; las operaciones predictivas mantienen autorización de servidor.

Especificación completa: [MODEL_ARCHITECTURE.md](MODEL_ARCHITECTURE.md). Esta fase modifica arquitectura y limita comportamientos no sustentados; no es un rediseño comercial ni un nuevo entrenamiento.

## Matriz de capacidades vigente

| Capacidad | Estado al cerrar implementación | Motivo / fase siguiente |
|---|---|---|
| NBA FULL, incluidas prórrogas | Deshabilitada para datos reales | Sin snapshots/modelos registrados; candidatos y evidencia F4–F6 |
| NBA Q1/HALF | No soportada | No existen modelos propios admisibles |
| Probabilidad NBA | Interfaz probada con fixtures, adaptador real ausente | Una media no determina una distribución; F7 |
| Tenis ganador | Demo experimental; feed real se abstiene | Procedencia pendiente y evaluación de Elo F11 |
| EV/picks/combinadas | Sin nuevas recomendaciones comerciales | Precio y política admisibles F8/F9 |
| Resultado posterior | Contrato independiente probado | Persistencia, liquidación y ledger integrado F13/F14 |

## Verificaciones ejecutadas

Ejecuciones de 28/09/2026 conservadas y comprobadas al retomar el 29/09/2026; no se cuentan de nuevo las repeticiones focalizadas.

| Comprobación | Resultado | Evidencia local |
|---|---|---|
| Vitest dominio/servidor completo | 529 aprobadas, 30 archivos | phase03-final-unit.log |
| Componentes de interfaz | 10 aprobadas, 3 archivos | phase03-ui.log |
| Contratos Python | 17 aprobadas | phase03-python.log |
| Svelte/JS | 0 errores, 0 advertencias | phase03-check-final.log |
| Total de pruebas | **556 aprobadas** | 529 + 10 + 17 |
| Integridad del legado | 8 archivos iguales a las huellas F2 | CSV y siete archivos de ml/models |
| Git | Commit remoto idéntico; main sin cambios; diff sin errores de espacios | Verificación de refs del 29/09/2026 |

Los casos incluyen futuro/objetivo en entradas, periodos incompatibles, orden/dimensiones incorrectos, artefactos alterados, probabilidades inválidas, fallo remoto y ausencia de fallback, contexto distinto entre etapas, inmutabilidad, abstención, identidad/plan/cuota de solicitudes y recuperación de la pantalla informativa. Algunas expectativas antiguas que exigían fallback o EV en cliente se sustituyeron por la nueva conducta deliberada; la cifra de pruebas no representa una mejora en acierto.

## Límites que no deben desaparecer del informe

1. Resolver de snapshots y registro de modelos de producción vacíos por decisión explícita. No hay predicciones reales nuevas verificadas. No se crea un manifiesto que certifique artificialmente los pesos antiguos.
2. Pruebas Python de contratos y funciones, incluyendo extracción AST; no se arrancó ni desplegó el servicio FastAPI completo con XGBoost/LightGBM reales. Vercel compila la aplicación web, no el servicio Python externo.
3. Datos históricos y pesos preservados; entrenadores/exportador legacy siguen en cuarentena F2. No se compró/conectó una API deportiva ni se modificaron credenciales o bases remotas.
4. Fórmulas antiguas conservadas en engine/backtest fuera de las rutas predictivas activas retiradas; replay unificado pendiente F10. Resultados y ledger no se consideran integrados por añadir una interfaz de resultado.
5. No hay evidencia nueva de calibración, precisión, rentabilidad ni superioridad del ensemble. La nota del producto y del modelo de la auditoría no se incrementa.

## Publicación y revisión final

- Corrección posterior de contraste: `4dcceb2723e4162739ace5ada7c7579b370f8352`. En navegador se detectaron enlaces amarillos poco legibles en tema claro; ahora usan el color primario de texto y subrayado. Se repitió la suite UI: 10/10. Es el único cambio de aplicación posterior a las suites completas del 28/09.
- Vercel **READY**: `dpl_8w2UjbdSyvUxHwrSqT6we8nvSUtv`, commit exacto `4dcceb27`, sin error de alias. Compilación remota aproximada: 199 segundos. [Vista previa](https://nio-sports-pro-v4-0-gojpae80w-niosports-pros-projects.vercel.app/totales), protegida por acceso Vercel. No se guardan enlaces temporales de acceso en Git.
- Revisión del código de arquitectura en la primera preview: carga real de `/totales`, confirmación del servicio, reintento y enlace al centro NBA. Tenis demo carga cuatro encuentros ficticios con aviso explícito y probabilidades señaladas como simulación sin calibración demostrada. Ninguna operación de apuesta ni modificación de cuenta.
- Revisión final de contraste en la segunda preview: enlaces oscuros en claro y claros en oscuro; contenido legible. Anchuras de documento/scroll observadas iguales, 1265/1265 px en escritorio y 375/375 px en móvil (override solicitado de 390 px; se registra el tamaño efectivo, no se presume identidad). Sin errores ni advertencias en los logs del recorrido de `/totales`. No equivale a auditoría integral de accesibilidad/rendimiento.
- La limitación local de symlinks en Windows documentada en F2 no se presenta como build aprobado. F3 utiliza la compilación remota completa como evidencia. No se afirma ejecución de GitHub Actions ni publicación del servicio Python externo.
- Copias promocionales antiguas del centro NBA todavía mencionan explorar tres periodos; quedan identificadas para F15. Las capacidades efectivas de `/totales` y las APIs no las habilitan. No se declara coherencia completa del sitio ni cierre H18/H29.

## Gate y veredicto

| Criterio de F3 | Evidencia | Dictamen |
|---|---|---|
| Interfaces versionadas y etapas separadas | Cinco módulos, identidad compartida y contratos probados | Cumplido |
| Dependencias unidireccionales; resultados fuera de inferencia | Orquestador sin import de resultados; registro posterior independiente e inmutable | Cumplido |
| Presentación no recalcula probabilidad/EV | Presentador sin matemática predictiva; consumidor legacy retirado | Cumplido en rutas migradas |
| Incompatibilidad no se oculta | Hashes/orden/dimensiones/recibos y ausencia de fallback probados | Cumplido en software; ejecución real Python pendiente |
| Capacidad y periodos explícitos | Matriz compartida y pantalla; no hay modelo real habilitado | Cumplido |
| Compilación y regresiones | 556 pruebas, check limpio y preview final READY | Cumplido con límites descritos |

**APROBADA EN ALCANCE ARQUITECTÓNICO.** La base ejecutable y las restricciones necesarias están implementadas. No se aprueba un motor comercial ni se libera el entrenamiento legacy. Evaluación por el mismo agente, no auditoría independiente.

**Nota técnica de fase: 8/10**, juicio de madurez con rúbrica explícita: separación y semántica 2/2; contratos y rechazos 2/2; regresión y conservación del legado 2/2; integración con fuentes/modelos reales 1/2 (frontera preparada, conectores deshabilitados); verificación operativa 1/2 (web comprobada, servicio Python completo pendiente). No es una medición de precisión ni reemplaza las notas de la auditoría.

Inventario actualizado: 21 hallazgos PARCIALES y 43 PENDIENTES; ninguno se da por resuelto íntegramente. Evidencia estructurada y hashes: [CHECKS_PHASE_03.json](CHECKS_PHASE_03.json).

## Punto de continuación

F4: preparar candidatos, benchmarks y ablaciones reproducibles, empezando por referencias simples. No entrenar el CSV en cuarentena; no elegir ganador hasta el protocolo temporal y las métricas de F5/F6. F4 no se ejecutó en esta entrega. Main y el dominio habitual conservan la versión anterior; la rama y la preview contienen la reconstrucción.
