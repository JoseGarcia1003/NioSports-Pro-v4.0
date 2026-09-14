# Plan de excelencia — NioSports Pro

Fecha: 14 de septiembre de 2026. Mandato permanente del propietario: ejecutar mejoras de funcionalidad, interfaz y fluidez con autonomía; conservar el progreso entre pausas y entregar versiones comprobables. Este documento fija el orden y las condiciones de cierre. El estado vivo está en WORK_STATE.md.

## Regla de avance

Trabajar en entregas pequeñas y completas: problema observable → cambio → comprobación → guardado → enlace de revisión. Cada entrega informa también qué falta. No comenzar otra auditoría global al reanudar. Una dependencia externa bloquea su parte, no todo el proyecto. Los defectos críticos de datos o acceso tienen prioridad sobre publicar al público.

## Orden y criterios de aceptación

| Orden | Área | Trabajo exigido | Cómo se considera terminado |
|---|---|---|---|
| 0 | Continuidad y publicación | Punto de control persistente, instrucciones del proyecto, commits y enlace correcto | «Continúa» conduce a la siguiente tarea registrada; el commit y el despliegue coinciden; no se confunden preview y producción |
| 1 | Base funcional y privacidad | Catálogo servidor, FREE/Premium, aislamiento de sesiones, permisos Supabase, saldo y liquidación | Pruebas de cuenta A/B, usuario anónimo, FREE y Premium; sin datos privados en respuesta bloqueada; saldo exacto y operaciones repetidas sin duplicación |
| 2 | Diseño y tipografía | Sistema visual único: familias, jerarquía de títulos/cuerpo/cifras, pesos, espaciado, color y componentes | Fuente elegida por legibilidad real; pesos definidos y usados; cifras alineadas; pantallas Hoy/Pronósticos/Deportes/Tenis/Bankroll/Cuenta coherentes, sin estilos contradictorios |
| 3 | Interacción y móvil | Navegación, filtros, selección de fechas, estados de carga/error/vacío, formularios y movimientos discretos | Flujos completos con teclado y táctil; sin desbordamiento a 360, 390, 768 y 1440 px; foco visible; contraste comprobado; movimiento reducido respetado |
| 4 | Datos deportivos | API pagada de tenis al final de la preparación, cobertura masculina/femenina, hoy/mañana, historial, H2H, superficies, lesiones con procedencia | Contrato del proveedor validado, fecha de corte visible, cobertura declarada exacta; ausencias claras; nunca sustituir fallos por datos inventados; acordar y declarar dobles si se incorpora |
| 5 | Motor y confianza | NBA y tenis reproducibles, abstención con muestra insuficiente, auditoría y validación temporal | Resultados reconstruibles desde instantáneas; sin usar futuro para predecir pasado; informe de calibración/error contra referencia; no prometer rentabilidad sin demostrarla |
| 6 | Bankroll y cuenta | Capital, disponible/reservado, tickets, liquidación, historial, exportación y preferencias | Casos ganada/perdida/nula/repetida probados; separación entre depósito y beneficio; datos conservados; sesión real validada y estados comprensibles |
| 7 | Rendimiento y operación | Medir carga y respuesta en build desplegado, reducir JS y dependencias innecesarias, errores y recuperación | Presupuesto inicial: LCP ≤ 2,5 s, INP ≤ 200 ms y CLS ≤ 0,1 como objetivos a medir, no resultados actuales; carga móvil documentada; errores reproducibles resueltos; APIs privadas fuera de cachés persistentes |
| 8 | Preparación comercial | Login, planes, checkout de prueba, webhooks, acceso, legal y despliegue | Flujo extremo a extremo con cuentas de prueba; eventos repetidos seguros; permisos verificados; revisión de obligaciones según mercado antes de comercializar; credenciales y proveedor real configurados |

Las áreas 2 y 3 deben producir mejoras visibles mientras se cierran las dependencias de las áreas 4–8. No se pospone todo el diseño hasta contratar el proveedor. No se instala una herramienta por novedad: cada integración debe resolver una carencia concreta, justificar mantenimiento/coste y cumplir permisos.

## Próximas entregas concretas

1. Cerrar y guardar catálogo diario, correcciones NBA, aislamiento de sesiones y compilación/CSP; verificar nueva preview.
2. Revisar tipografía y componentes de las seis pantallas principales, implementar la primera pasada visual y entregar comparación verificable.
3. Completar endurecimiento de tablas antiguas, conexión de identidad y ledger sin perder historial; validar con cuentas de prueba.
4. Completar operación del catálogo (publicador NBA, retirada ante datos corregidos, tareas programadas) y revisión de métricas.
5. Conectar el proveedor deportivo cuando se disponga de credenciales y contrato; medir calidad del motor con datos reales.
6. Validación comercial y lanzamiento principal solo con condiciones comprobadas.

## Evaluación honesta

Las antiguas notas 3/10, 4/10 o 5/10 no se elevan por añadir código. Para cada área se registran evidencia, pruebas, limitaciones y próxima mejora. El objetivo es alcanzar excelencia sostenida; «10/10» no sustituye la evaluación ni elimina futuros defectos.
