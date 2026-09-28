# Casos de aceptación conceptual de Fase 1

Versión 1.0.0 · 28/09/2026 · Referencia normativa: [PRODUCT_SPEC.md](PRODUCT_SPEC.md).

**Son ejemplos controlados de especificación, no partidos reales ni pruebas aprobadas de la aplicación.** La revisión comprueba el significado esperado; las fases siguientes deben convertirlos en pruebas sobre los módulos reales. S = importe registrado, d = cuota decimal. No se simulan apuestas reales.

| Caso | Situación controlada | Resultado exigido por la especificación | Referencia |
|---|---|---|---|
| C01 | NBA FULL: solo existe proyección 224, sin línea/cuota | Mostrar puntos como estimación experimental con contexto; no OVER/UNDER, EV ni pick comercial | §2, §5, §7 |
| C02 | NBA FULL OVER 220,5, marcador final 112-109, d=1,91, S=100 | Total 221; won; retorno 191; beneficio 91; no confundir retorno con ganancia | §8-9 |
| C03 | NBA FULL UNDER 220,5, mismo total 221, d=1,91, S=100 | lost; retorno 0; beneficio -100 | §8-9 |
| C04 | NBA FULL OVER 220, total final 220, S=100 | push; retorno 100; beneficio 0; excluir acierto binario, no computar pérdida | §5, §8 |
| C05 | NBA FULL UNDER 220, mismo total 220 | También push; el lado no altera igualdad | §5, §8 |
| C06 | Final reglamentario 105-105, marcador final tras prórroga 116-114; FULL OVER 220,5 | Total del mercado 230, won; no usar 210. Son marcadores inventados solo para este caso | §4 M01-M02, §9 |
| C07 | La casa describe mercado solo reglamentario; modelo/selección FULL incluye prórrogas | Mercado incompatible; no reutilizar probabilidad ni liquidación FULL | §4, §9 |
| C08 | Primera mitad observada Q1=54, Q2=58; segunda mitad/prórroga con otros puntos | Objetivo HALF=112 y solo primera mitad. M03 no está habilitado predictivamente; esto define su futura etiqueta | §4 M03, §9 |
| C09 | Q1 observado=54 y línea=55,5; FULL proyectado=220 | No derivar modelo Q1 de 220×0,25; mercado predictivo no soportado; futuro resultado Q1 sería UNDER, no evaluar contra FULL | §4 M04, §9 |
| C10 | Selección Q2, hándicap NBA, set tenis o dobles | No soportado por motor v1 aunque exista constante/selector; puede ser registro manual separado, nunca inferencia inventada | §4 M05/M08/M10 |
| C11 | Tres probabilidades Q1/HALF/FULL del mismo partido | No multiplicar como independientes ni mostrar cuota justa conjunta; M06 no soportado | §4 M06 |
| C12 | 60% de victoria, 40% derrota, sin push, cuota 1,91, S=100 | EV condicionado=14,60; referencia de precio 52,35602094%; ventaja 7,64397906 puntos porcentuales; no garantía | §6 |
| C13 | 52% victoria, 43% derrota, 5% push, d=1,91, S=100 | EV condicionado=4,32; no -0,68; q decisiva=54,73684211%, distinto de p_won=52% | §5-6 |
| C14 | p_won=0, p_lost=0, p_push=1 | EV=0; q decisiva/cuota justa no disponibles; no pick | §6 |
| C15 | Un campo odds=1,91 no incluye formato | No adivinar “americana” por ser positivo; pedir contrato/normalización de origen | §6 |
| C16 | Americana -110 explícita y decimal 1,91 explícita | Convertir -110 a 1,909090…; reconocer pequeña diferencia de precio, no declararlas exactamente iguales | §6 |
| C17 | Pick emitido con cuota 1,91, ticket del usuario a 1,80; S=100 y won | Beneficio del ticket=80; el pick conserva cuota 1,91; métricas personales y públicas no se mezclan | §6-7, §10 |
| C18 | Probabilidad estimada y EV positivo, modelo sin validación o política inexistente | Análisis experimental; abstención de recomendación por validación/política insuficiente | §6-7 |
| C19 | Datos faltantes, antiguos, futuros, identidad incompatible o cuota ausente | Razón por etapa; no llenar con cero/50%, descansos o precios predeterminados | §7 |
| C20 | API falla y no devuelve encuentros | Mostrar fallo de fuente, no afirmar calendario vacío ni 0% de acierto; no pick forzado | §3, §7, §10 |
| C21 | Dos partidos de tenis individuales con condiciones distintas; A tiene q=0,60 en uno | Probabilidad ligada a ese encuentro/corte/formato; no transferirla al otro ni a un set | §4 M07-M08, §5 |
| C22 | Tenis completado normalmente, gana A, análisis q_A=0,60 | Evento condicional observado A; puede evaluarse esa predicción en cohorte experimental elegible; un caso no prueba calibración | §5 |
| C23 | Tenis termina por retiro de B; la casa paga A bajo regla conocida | Excluir ese partido de calibración de ganador condicionado a finalización; ticket de A puede ser won verificado por regla, no “acierto del Elo” | §5, §8-9 |
| C24 | Walkover, retiro o descalificación, sin reglas verificadas de ticket | Conservar desenlace, análisis no evaluable; ticket pending con revisión, no pérdida/void automáticos | §5, §8 |
| C25 | Ausencia de informe de lesiones y presencia de estadísticas H2H/saque | Lesión desconocida; estadísticas solo contexto si Elo no las usa; ninguna contribución numérica fabricada | §2, §4, §11 |
| C26 | Encuentro ya iniciado o tiene participantes/superficie revisados | No nueva predicción prepartido para el contexto viejo; registro anterior permanece y revisión tiene trazabilidad | §7, §9 |
| C27 | Partido aplazado; ticket ya aceptado con reserva | Evento aplazado, ticket pending hasta regla/resultado; no liberar reserva automáticamente ni borrar pick | §8 |
| C28 | Borrador cancelado antes de aceptación contable | Cancelled, sin reserva/beneficio; no confundir con devolución de ticket aceptado | §8 |
| C29 | Mercado anulado y devolución confirmada; S=100 | void, retorno 100, beneficio 0 y liberación única; no derrota ni push | §8 |
| C30 | Sistema se abstiene y usuario registra una apuesta manual de S=20 | La abstención no reserva; la aceptación separada del ticket manual sí puede reservar; origen manual y sin respaldo del motor | §7-8 |
| C31 | Importe de ejemplo: disponible 1000, reserva 0; aceptar ticket 100 a 1,91 | Disponible 900, reservado 100; ganar termina disponible 1091/reserva 0/beneficio 91; perder 900/0/-100; push o void 1000/0/0 | §7-8, §10 |
| C32 | Llega dos veces el mismo resultado o hay corrección posterior | La repetición no duplica retorno; corrección crea revisión/ajuste trazable. No se prueba aquí que el ledger actual lo haga | §7-8 |
| C33 | Historial 6 won, 4 lost, 2 push, 1 void, 3 pending, 4 abstained | Acierto 60% sobre 10 decisivos; mostrar resto separado; no mezclar abstenciones con pérdidas | §8, §10 |
| C34 | Historial solo pending/void/push/abstained | Acierto no disponible, no 0%; no declarar “actualizado hoy” sin timestamp verificable | §10 |
| C35 | Pick privado o ticket manual; se retira una edición pública que después pierde | Privado nunca publicado por defecto; retirada no borra resultado ni cambia cohorte para ocultar pérdida; separar edición y ticket | §7, §9-10 |
| C36 | Demo con 6 victorias; modelo real tiene 0 resultados verificables | Etiqueta demo; no sumar victorias a validación ni al bankroll real | §3, §10-11 |
| C37 | Modelo entrega expected_total=224; UI lo llama mediana o precisión 80% | Incumplimiento conceptual: media estimada en puntos no equivale a mediana ni a acierto | §3 |
| C38 | Registro manual de cash-out parcial, comisión o cuota con liquidación dividida | Fuera del alcance automático v1; conservar manual explícito; no aplicar fórmula simple de retorno como si cubriera esos contratos | §9 |

## Recorridos completos narrados

**NBA experimental:** contexto previo → proyección FULL → falta de mercado o de validación → análisis/abstención → no pick → no reserva. El intento y sus razones se conservan para cobertura; no se cuenta como derrota.

**NBA cuando exista soporte validado (no existente por esta acta):** datos/corte → proyección → distribución para FULL y línea observada → precio/reglas → política admite → pick congelado → usuario registra su cuota/stake → reserva → marcador final compatible → liquidación → métricas y saldo reconciliados. La rama pública usa el pick autorizado; la privada usa el ticket real del usuario.

**Tenis experimental:** historia elegible → Elo → q de victoria condicionada a finalización → análisis identificado → sin recomendación comercial por falta de validación. Si hay retiro, no se falsea la evaluación del modelo para coincidir con el pago de una casa.

## Resultado de revisión

Los 38 casos tienen resultado esperado compatible con PRODUCT_SPEC v1.0.0; los ejemplos aritméticos se recomputan en CHECKS_PHASE_01.json. Esta aprobación es de la especificación. **No se ejecutó ninguno de estos recorridos en producción ni se convirtieron todavía en tests funcionales.**

Al llevarlos al código, usar estos IDs para enlazar las pruebas y registrar los casos que fallen; no modificar expectativas solo para que pase la implementación antigua.
