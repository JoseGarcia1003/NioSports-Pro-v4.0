# Informe de cambios para el propietario

Fecha: 12 de septiembre de 2026. Código revisado hasta `cd364db1`.

## Evaluación general

El proyecto mejoró en presentación, control contable y protección de accesos.
Se eliminaron varias conductas que podían mostrar información engañosa.
No está certificado como producto listo para usuarios reales. Tampoco existe
evidencia suficiente para afirmar que sus predicciones son rentables o mejores
que las de otros servicios. Las pruebas de software no prueban precisión deportiva.

Los cambios de código están guardados en GitHub, rama `codex/security-integrity`,
PR #1. Guardar en GitHub no significa publicar la versión en la web principal.
La interfaz accesible en localhost es una vista local; su modo demo utiliza
datos ficticios identificados y no permite registrar operaciones.

## 1. Interfaz de control de bank

Se sustituyó la pantalla de bankroll por un panel con saldo disponible, importe
comprometido en tickets pendientes, beneficio neto y capital aportado menos
retiros. Incluye evolución del saldo, formulario de movimientos, tickets
pendientes e historial. Se corrigió un desbordamiento de pantalla en móvil.

La gráfica incluye aportaciones, retiros y reservas: no debe interpretarse como
una curva de beneficios. La tabla muestra los últimos 100 registros, pero los
saldos toman en cuenta todo el historial. La nueva interfaz no abarca todavía
todas las páginas del producto.

## 2. Contabilidad del usuario

Se creó un registro contable en servidor para aportar capital, registrar retiros,
reservar importe de un ticket y marcarlo ganado, perdido, empate con devolución
o anulado. Se usan centavos enteros para los importes y operaciones completas:
el movimiento y el saldo se actualizan juntos o se rechazan juntos.

Ejemplo: con 100 dólares disponibles, reservar 10 deja 90 disponibles y 10
comprometidos. Si gana a cuota decimal 2.00, se acreditan 20: quedan 110
disponibles, cero comprometidos y 10 de beneficio. Aportar otros 50 no añade
50 al beneficio. El ROI divide beneficio por el importe de tickets resueltos
con ganancia o pérdida; las devoluciones no se cuentan como victorias.

Se bloquean retiros sin saldo, liquidaciones de tickets ajenos, liquidaciones
repetidas y operaciones duplicadas con el mismo identificador. Estas reglas
se probaron en una base PostgreSQL embebida, no bajo tráfico real simultáneo.

Este panel lleva un registro personal: no custodia dinero, no transfiere fondos
y no apuesta en casas. El resultado manual depende de lo que indique el usuario;
no constituye un historial deportivo verificado. Faltan correcciones contables
mediante movimientos de compensación y conciliación de saldos antiguos.

## 3. Identidad y suscripciones

Las peticiones protegidas deben presentar una identificación firmada por Firebase.
El servidor verifica que corresponde al proyecto esperado y que no ha caducado.
Escribir otro identificador de usuario o declararse Elite en el navegador ya no
concede esos derechos en las rutas modificadas.

El plan se consulta en registros comerciales del servidor. La nueva migración
impide que el cliente escriba campos comerciales protegidos. Stripe verifica la
firma de sus avisos y registra sus identificadores para evitar procesar avisos
duplicados. También contempla avisos antiguos y fallos de escritura.

Estas protecciones están implementadas; falta activarlas y comprobarlas con los
servicios configurados. No se ha realizado una compra ni renovación real para
validarlas. Falta comprobar revocación de sesiones, además de caducidad del token.

## 4. Integridad de predicciones

El generador automático antes calculaba una línea de sustitución si no tenía
línea del mercado. Ahora omite esos casos y los juegos marcados como demo.
Las API rechazan equipos iguales, períodos incompatibles, líneas inválidas y
estadísticas insuficientes. Las solicitudes por lotes informan motivos de
abstención para los casos rechazados.

Antes se repetía un promedio en varios campos históricos del modelo remoto.
Ahora ese modelo exige ventanas explícitas, dispersión, descanso y días de
temporada. Si falta ese contrato de datos, puede usarse el cálculo heurístico
identificado: una estimación basada en reglas, no prueba de aprendizaje automático
validado. Se rechazan respuestas remotas numéricamente inválidas o con otra línea.

Totales ya no usa estadísticas demo cuando falla la carga y distingue el origen
heurístico. Sin embargo, el simulador Totales conserva líneas sugeridas: eliminarlas
o separarlas de líneas reales sigue pendiente. También falta comprobar origen,
antigüedad y significado de los datos. Tener campos completos no garantiza que
sean auténticos. No se ha demostrado calibración ni rentabilidad del modelo.

## 5. Resultados automáticos y tareas internas

Se corrigió la identificación del partido para liquidar resultados NBA y se exige
una coincidencia única. El marcador final solo puede resolver el período de partido
completo; no se usa para resolver primer cuarto o primera mitad. Los casos ambiguos,
combinadas y fuentes simuladas se excluyen del flujo corregido.

La comparación con la cuota de cierre queda desconocida si no hay un cierre previo
al evento verificable. Las tareas internas y rutas de correo requieren autorización
correcta. El correo de bienvenida necesita todavía conectar su disparador seguro.

La liquidación automática antigua y el nuevo registro manual de bank no forman aún
un flujo único de principio a fin. No se afirma que guardar o liquidar cualquier pick
actualice automáticamente el nuevo bank.

## 6. Pruebas y mantenimiento

- Primera suite completa tras la última ampliación: 248 pruebas aprobadas.
- Dos comprobaciones adicionales de API incorporadas después, verificadas junto
  con las dos pruebas existentes de ese archivo: 250 casos aprobados en total,
  no una única ejecución final de los 250 casos.
- Revisión Svelte: cero errores y cero advertencias en la última ejecución.
- Navegador: panel de bank visible y desbordamiento móvil corregido.
- Build: genera paquetes de cliente y servidor; falla el empaquetado final Vercel
  por permisos de enlaces simbólicos de Windows. No es un build completo aprobado.
- GitHub Actions: la última ejecución inspeccionada no comenzó por un bloqueo de
  facturación de la cuenta. No se resolvió mediante un pago.
- La instalación informó 54 vulnerabilidades de dependencias. Falta estudiar su
  alcance y actualizar de forma compatible; no prueba por sí sola 54 fallos explotables.

Se retiraron del control de versiones 47.586 archivos de dependencias y resultados
generados. Permanecen el código y el archivo que fija versiones de dependencias;
no se eliminaron datos de usuarios con esta limpieza.

## 7. Qué falta para lanzar con confianza

1. Configurar autenticación y base de datos y desplegar código y migración juntos.
   La migración restringe escrituras del cliente antiguo, por lo que aplicarla sola
   podría romper esa versión. No se ejecutó sobre producción.
2. Conciliar saldos existentes y comprobar el ciclo completo con cuentas de prueba:
   registro, acceso, permisos, movimientos, tickets, resultados y suscripción.
3. Terminar controles de datos deportivos y de cuotas, eliminar ambigüedades del
   simulador y medir el modelo con resultados históricos separados del entrenamiento.
4. Completar compensaciones, auditoría y unión entre picks y contabilidad.
5. Resolver dependencias, empaquetado y verificación remota antes de publicar.

La mejora comprobable es una base más ordenada, un panel nuevo y barreras contra
errores concretos. No corresponde presentarla aún como plataforma terminada,
financieramente operativa o líder en precisión deportiva.

## Ampliación: nueva presentación pública

Se reemplazó la portada por una presentación adaptable con una nueva jerarquía
visual, acceso directo al bank de ejemplo y tres vistas interactivas: capital,
análisis y registro. La portada deja de mostrar un pick ficticio con 78% de
confianza sin identificarlo como ejemplo. Las cifras de la nueva presentación
se identifican como simuladas, y las preguntas frecuentes explican el alcance.

El inicio autenticado ya no sustituye una consulta vacía o fallida por partidos
ficticios. Distingue una consulta fallida de una fecha sin partidos. Se corrigió
también el inicio de carga cuando la autenticación termina después de montar
la página.

Verificación de esta ampliación: 250 pruebas en una única ejecución completa;
Svelte cero errores y advertencias. Portada comprobada visualmente en escritorio
y a 390 px, vistas de análisis y registro probadas y enlace al bank verificado.
No supone despliegue público ni validación de cuentas reales. El resto del
producto todavía necesita unificar diseño y completar el flujo operativo.
