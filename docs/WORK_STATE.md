# Punto de control — leer antes de continuar

Actualizado: 19 de septiembre de 2026. Rama `codex/security-integrity`. Repositorio `JoseGarcia1003/NioSports-Pro-v4.0`, PR #1. Mandato: mejorar producto real, tipografía, fluidez, diseño y fiabilidad con autonomía; retomar desde este archivo, sin reiniciar la auditoría. Plan completo: EXCELLENCE_PLAN.md.

## Estado de esta entrega

Implementación terminada y pruebas aprobadas; pendiente comprobar el despliegue del nuevo commit. El anterior punto de control sí se guardó en GitHub en `07ffce4d`. Nunca confundir los cambios nuevos con la producción main, que no se ha promovido.

Cambios preparados para guardar:
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
- Diseño del catálogo anterior a la última pasada tipográfica: probado en navegador, 390 px sin overflow, filtros, detalle y tema claro. Falta comprobación visual de la pasada final y del despliegue.
- No afirmar login/Stripe/ingesta pagada real probados: faltan validación de entorno y proveedor.

## Base de datos REAL — ya aplicado, NO repetir

Supabase `degwzrlbjqezngduvxtj`:
- 20260913040750 tennis_workspace
- 20260913040915 tennis_immutable_grants
- 20260914151620 daily_prediction_catalog
- 20260919225143 identity_billing_ledger
- 20260919225153 legacy_row_security
- 20260919225419 fixed_trigger_search_path

Se verificó remoto: 0 tablas públicas con RLS desactivada; anónimos no leen perfiles/picks; deportes públicos legibles pero no editables; usuario no cambia su plan, sí preferencias; servidor inserta ledger pero no lo actualiza ni borra. Las migraciones conservaron datos antiguos. Ledger y billing nuevos no migran automáticamente saldos ni suscripciones antiguas. La advertencia de función search_path se corrigió; confirmar asesor final si falta. Las notas RLS sin políticas de las tablas exclusivas de servidor son cierre intencional a clientes.

## Coordinación

No hay tarea pendiente que dependa de un agente. Los trabajos previos de release_checks, session_isolation y visual_typography están incorporados en archivos. Algunos agentes finalizaron por límite después de escribir; raíz verificó la suite conjunta y terminó la migración RLS y sus pruebas. No volver a delegar ni rehacer su trabajo automáticamente.

## Siguiente acción exacta

1. Guardar los archivos completos y este punto de control con commit/push. Verificar SHA remoto. Si ya ocurrió, avanzar al paso 2.
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
