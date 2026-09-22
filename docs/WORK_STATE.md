# Punto de control — leer antes de continuar

Actualizado: 22 de septiembre de 2026. Repositorio `JoseGarcia1003/NioSports-Pro-v4.0`. PR #1 integrada en `main` por petición explícita del propietario de guardar todo en GitHub y publicar en su enlace habitual. Mandato: retomar desde este archivo sin reiniciar la auditoría. Plan completo: EXCELLENCE_PLAN.md.

## Publicación principal — 22 de septiembre

- Todos los cambios hasta `ab30a3532a94fd12955a5c236cf6b5cc2a2cb5b0` integrados mediante PR #1. Commit de integración: `064b9abea319a17a89079e4819b55ad58a7e71ce`.
- Vercel completó el despliegue de producción `dpl_5WQ4cSjb5RKZGsKWf2TtcvwBuLfy` desde `main`, estado READY, sin error de alias. El dominio habitual está asignado a este despliegue: https://nio-sports-pro-v4-0.vercel.app/login.
- Verificación del enlace público en navegador: formulario nuevo y portada de tenis visibles, título «Bienvenido de nuevo · NioSports Pro», acceso sin pantalla de Vercel ni enlace temporal; consola sin errores/advertencias. Pestaña entregable abierta. No se inició sesión con credenciales reales ni se completó Google OAuth.
- El rediseño de Cuenta/Login y sus ajustes finales están guardados en GitHub. Validación previa: 444 pruebas de dominio/servidor y 5 de UI aprobadas; check sin errores ni advertencias. Vercel compiló la preview exacta de `ab30a353` correctamente.
- Publicar la versión disponible no certifica las dependencias comerciales pendientes: proveedor deportivo, sesión externa, suscripción de prueba y reconciliación del historial. La petición actual autoriza publicar; sustituye el antiguo aplazamiento de `main` registrado abajo.
- Los apartados históricos siguientes conservan evidencia de entregas anteriores; sus referencias a ajustes locales o producción pendiente ya no describen el estado actual.

## Estado de esta entrega

NUEVA ENTREGA VISUAL EN REVISIÓN FINAL: el propietario rechazó la apariencia anterior por genérica. Se rediseñaron Cuenta e inicio de sesión (AccountExperience.svelte, LoginExperience.svelte, account.css), con portada deportiva original de 175 KB, centro de control visual, panel de acceso y selector de tema. Nav/Logo armonizados en verde. No repetir el controlador del bankroll. Check aprobado con 0 errores/advertencias; 444 pruebas de servidor/dominio y 5 del formulario aprobadas. Primera versión publicada en GitHub 8912ab5e y Vercel READY (qyftc5egf). Cuenta revisada en escritorio/móvil, temas y ayuda. Acceso probado a 360/390/768/1440 px: registro, recuperación, mostrar contraseña y validación nativa, sin efectos externos. Falta publicar y comprobar los ajustes de lectura y navegación detectados en la revisión. Estado de diseño en DESIGN_ACCOUNT_2026-09-20.md. Ajustes finales locales: textos auxiliares mayores, barra inferior verde, separación correcta de palabras en el título móvil, eliminar franja bajo nav, imports individuales de iconos y configuraciones de pruebas de UI/servidor separadas.

Adicional CERRADO: aislamiento del estado propio del bankroll implementado en `src/lib/bankroll/workspace.js`, integrado en BankrollWorkspace.svelte. Commit `367cbf45f04adb1f4fc53f1f479fb78bfc2574e8` guardado en GitHub; Vercel READY, despliegue `dpl_3a6MKt6Q74YQBZ39forP5KCXysUa`. URL actual comprobada: https://nio-sports-pro-v4-0-78xj80f73-niosports-pros-projects.vercel.app/bankroll?demo=1. Incluye todo el diseño anterior. Regresión: 52 pruebas en 4 archivos (15 nuevas); check 0 errores/advertencias. Navegador final: Actualizar conserva demo, Volver a mi cuenta limpia las cifras simuladas y pide sesión, Explorar ejemplo restaura sólo el ejemplo; consola sin errores/warnings. Marcada la pestaña como entregable. Cancelación, generaciones por petición/sesión, limpieza de borradores, bloqueo de doble envío y claves de reintento probados. No repetir este bloque.

Entrega visual anterior guardada y comprobada: `e0f3abdcf90733ac5c37dea2c509537908548650`, despliegue `dpl_EkxCwarMDSjXfpcC9SYkAJN96eot`, READY. URL: https://nio-sports-pro-v4-0-ohnzh6lkh-niosports-pros-projects.vercel.app. Incluye el catálogo de fd1a4410, navegación de cfe08c46 y contraste final del bankroll; también está incluida en la preview actual 367cbf45. La vista previa requiere sesión Vercel o acceso temporal autorizado; no guardar tokens de acceso en documentos. La producción main no se ha promovido. Los commits posteriores de documentación no cambian las implementaciones comprobadas.

Corrección Nav/Logo guardada y desplegada en `cfe08c466b309695413a5ce6f22086c6a79d58c8`: https://nio-sports-pro-v4-0-o1m6jww90-niosports-pros-projects.vercel.app (READY). Nav y Logo respetan el tema claro, visitantes ven «Iniciar sesión», botón de cuenta de 44 px y etiqueta accesible. Revisado en navegador remoto. No repetir la entrega principal ni las migraciones.

La revisión detectó bajo contraste del bankroll en tema claro. Se sustituyeron sus colores fijos por variables para ambos temas, DM Sans, textos auxiliares mayores, cifras alineadas y controles de 44 px. Cambio sólo de presentación en BankrollWorkspace.svelte. `npm run check` aprobado con 0 errores y 0 advertencias. Verificado en preview e0f3abdc: títulos, avisos, tarjetas, gráfico y formulario legibles en claro/oscuro; 390 px sin overflow; sin errores/warnings de consola. Despliegue final aprobado.

Cambios de la entrega principal ya guardados:
- Catálogo diario persistente con autorización real: FREE abre una selección Premium fija y Pro/Elite vigentes todas; el contenido bloqueado no viaja al cliente. Ediciones inmutables, procedencia y retirada con motivo. Publicador inicial de tenis tras sync. Demo explícita sin almacenamiento real.
- Pantalla Pronósticos renovada: tipografía DM Sans coherente, jerarquía y pesos definidos, selección gratuita destacada, probabilidad separada de evidencia, estados vacíos útiles, controles de 44 px, claro/oscuro, foco y movimiento reducido. Tokens y CSS compartidos mejoran páginas del producto.
- NBA: esperar generación asíncrona, cancelar solicitudes obsoletas, evitar descansos/lesiones/cuotas inventadas, abstenerse si faltan líneas, proteger guardado y coherencia de resultados.
- Datos por sesión: logout/cambio de cuenta limpia stores inmediatamente; respuestas y mutaciones tardías no restauran datos antiguos.
- Identidad: usar FIREBASE_PROJECT_ID o PUBLIC_FIREBASE_PROJECT_ID; rechazar discrepancias; firma, emisor y audiencia siguen verificándose.
- CSP centralizada en SvelteKit conservando nonce; APIs no-store y fuera de caché persistente; actualización del SW limpia cachés de predicciones antiguas.
- CI Node24 ejecuta check, pruebas y build sin entregar secretos de producción al build de PR.
- Bankroll avisa que es un registro nuevo y que no se importó automáticamente el historial antiguo.

## Verificación completada

- Suite completa: 429 pruebas en 27 archivos, todas aprobadas (`tests-verification.log`, 19 septiembre).
- `npm run check`: 0 errores y 0 advertencias.
- Git diff sin errores de espacios; avisos CRLF habituales de Windows.
- Preview fd1a4410: catálogo final abrió y respondió al filtro NBA (vacío), restablecer y desplegar evidencia. Se comprobó DM Sans y 390 px sin desbordamiento horizontal, temas claro/oscuro. Tenis demo respondió a Femenino + Mañana con dos encuentros del día siguiente. No son datos reales. La captura completa de navegador tiene artefactos de composición; preferir captura de viewport.
- Preview cfe08c46: navegación anónima y tema claro corregidos; catálogo sin overflow a 360/768/1440 px, bankroll a 390 px. Hoy muestra ausencia de fuente NBA y requisito de sesión tenis; catálogo real respondió sin edición publicada, sin sustituirla por ejemplos. Sin errores/warnings de consola de la app en estas rutas (filtrados desde 16:28 UTC del 20 septiembre). La revisión final de Bankroll en e0f3abdc pasó después de corregir colores.
- GitHub Actions 35522610659 no inicia el job: la página de ejecución confirma bloqueo de cuenta por facturación. Es independiente de los créditos Codex. No se cambió facturación ni se pagó. Vercel sí compila; no afirmar CI GitHub verde.
- No afirmar login/Stripe/ingesta pagada real probados: faltan validación de entorno y proveedor.

## Base de datos REAL — ya aplicado, NO repetir

Supabase `degwzrlbjqezngduvxtj`:
- 20260913040750 tennis_workspace
- 20260913040915 tennis_immutable_grants
- 20260914151620 daily_prediction_catalog
- 20260919225143 identity_billing_ledger
- 20260919225153 legacy_row_security
- 20260919225419 fixed_trigger_search_path

Se verificó remoto: 0 tablas públicas con RLS desactivada; anónimos no leen perfiles/picks; deportes públicos legibles pero no editables; usuario no cambia su plan, sí preferencias; servidor inserta ledger pero no lo actualiza ni borra. Las migraciones conservaron datos antiguos. Ledger y billing nuevos no migran automáticamente saldos ni suscripciones antiguas. Asesor final: sin errores ni advertencias tras corregir search_path; sólo 9 notas informativas de RLS sin políticas en tablas exclusivas de servidor (cierre intencional a clientes).

## Coordinación

No hay tarea pendiente que dependa de un agente. Los trabajos previos de release_checks, session_isolation y visual_typography están incorporados en archivos. Algunos agentes finalizaron por límite después de escribir; raíz verificó la suite conjunta y terminó la migración RLS y sus pruebas. No volver a delegar ni rehacer su trabajo automáticamente.

## Siguiente acción exacta

1. La entrega anterior está cerrada, guardada y desplegada. No repetir migraciones, suite completa ni el mismo recorrido visual si no hay cambios nuevos.
2. El estado propio de BankrollWorkspace está corregido, probado y desplegado. No rehacer el controlador ni los stores. Continuar con el paso 3.
3. Cuenta/Login y navegación rediseñados y guardados en `ab30a353`. Continuar la coherencia visual en Planes y tenis, con comprobación real de contraste, teclado y móvil. Evitar rehacer el catálogo o el rediseño ya cerrado.
4. Validar identidad y suscripción con cuentas de prueba y entorno correcto; si faltan credenciales, registrar dependencia concreta y avanzar en operación del catálogo y medición de rendimiento.
5. Registrar la siguiente entrega con sus propias pruebas, SHA y preview. Proyecto Vercel prj_En6HSxmihlQTsxgxW53Z6klKzcMB, team team_YUpxoMdWKSgksacyR0qJ2NPX. No confundir build Windows EPERM con estado remoto.

## Pendientes de producto, no ocultarlos

- Proveedor tenis pagado/contrato: sin él no hay cobertura real garantizada. Motor experimental sin calibración ni rentabilidad demostradas.
- Catálogo: falta publicador NBA, retiradas automáticas ante cambios del proveedor y programación de ingestión. Edición es previa con hora de corte.
- NBA real: las líneas/cuotas y credenciales deben conectarse; abstenerse es correcto mientras falten.
- Validar sesión real, Firebase Third-Party Auth en Supabase y suscripción real de prueba. No importar privilegios desde campos antiguos sin validación Stripe.
- Migración reconciliada de saldos/historial legacy al nuevo ledger pendiente; no recalcular ni borrar registros reales por suposiciones.
- `main` integrada por petición explícita el 22 de septiembre. Las dependencias de estos flujos siguen pendientes aunque la versión disponible se publique.

## Entorno

Windows PowerShell. Repo en subcarpeta niosports. Tests de esbuild pueden necesitar ejecución fuera del sandbox. Los procesos y pestañas anteriores pueden no existir. Comprobar servidor antes de iniciar otro. El dev local tardó mucho y se detuvo; validar preferentemente en preview remota. Evitar build y dev simultáneos sobre .svelte-kit. No se guardan secretos en estos documentos.
