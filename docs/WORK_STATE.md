# Punto de control — leer antes de continuar

Actualizado: 20 de septiembre de 2026. Rama `codex/security-integrity`. Repositorio `JoseGarcia1003/NioSports-Pro-v4.0`, PR #1. Mandato: mejorar producto real, tipografía, fluidez, diseño y fiabilidad con autonomía; retomar desde este archivo, sin reiniciar la auditoría. Plan completo: EXCELLENCE_PLAN.md.

## Estado de esta entrega

Implementación principal guardada en GitHub en `fd1a4410e3bdebbb447a038db28c1376fde5a453`. Vercel confirmó READY para ese SHA: https://nio-sports-pro-v4-0-bljqfcapu-niosports-pros-projects.vercel.app. La vista previa requiere sesión Vercel o acceso temporal autorizado. La producción main no se ha promovido.

Corrección adicional terminada: Nav y Logo respetan el tema claro, visitantes ven «Iniciar sesión» en lugar de un menú de sesión inexistente, botón de cuenta de 44 px y etiqueta accesible. `npm run check` pasó con 0 errores/advertencias después de estos cambios. Guardar esta corrección junto con este punto de control y verificar su despliegue; no repetir la entrega principal ni las migraciones.

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
- Pendiente validar la corrección adicional de navegación, restantes anchuras 360/768/1440, Hoy, Bankroll y API real. Consola capturó fallos de Google en el login de Vercel anterior; no atribuirlos a NioSports. Filtrar logs desde la navegación de la app.
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

1. Guardar la corrección adicional Nav/Logo y este punto con commit/push. Verificar SHA remoto. Si ya ocurrió, avanzar al paso 2.
2. Comprobar despliegue Vercel del SHA exacto. Proyecto prj_En6HSxmihlQTsxgxW53Z6klKzcMB, team team_YUpxoMdWKSgksacyR0qJ2NPX. No deducir fallo remoto por EPERM local Windows. Build remoto previo sí funcionaba.
3. Verificar nueva pantalla `/predictions?demo=1`, filtro, argumentos, móvil y temas; revisar `/today`, `/tennis?demo=1`, `/bankroll?demo=1`, errores JS y respuesta API real. Corregir y repetir sólo lo necesario.
4. Actualizar este punto con SHA y URL realmente comprobados; entregar enlace visible al usuario, distinguiendo preview de main.
5. Continuar siguiente entrega de diseño y rendimiento con criterios del plan.

## Pendientes de producto, no ocultarlos

- Proveedor tenis pagado/contrato: sin él no hay cobertura real garantizada. Motor experimental sin calibración ni rentabilidad demostradas.
- Catálogo: falta publicador NBA, retiradas automáticas ante cambios del proveedor y programación de ingestión. Edición es previa con hora de corte.
- NBA real: las líneas/cuotas y credenciales deben conectarse; abstenerse es correcto mientras falten.
- Validar sesión real, Firebase Third-Party Auth en Supabase y suscripción real de prueba. No importar privilegios desde campos antiguos sin validación Stripe.
- Migración reconciliada de saldos/historial legacy al nuevo ledger pendiente; no recalcular ni borrar registros reales por suposiciones.
- Lanzamiento main pendiente de estos flujos. Tener preview no significa producción promovida.

## Entorno

Windows PowerShell. Repo en subcarpeta niosports. Tests de esbuild pueden necesitar ejecución fuera del sandbox. Los procesos y pestañas anteriores pueden no existir. Comprobar servidor antes de iniciar otro. Evitar build y dev simultáneos sobre .svelte-kit. No se guardan secretos en estos documentos.
