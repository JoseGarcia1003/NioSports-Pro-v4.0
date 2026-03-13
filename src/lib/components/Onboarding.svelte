<!-- src/lib/components/Onboarding.svelte -->
<!--
  Modal de onboarding de 3 pasos para usuarios nuevos.
  
  El plan maestro dice:
  "Un onboarding de 3 pasos que: (1) explica qué es el sistema y
  cómo funciona el modelo con honestidad sobre sus limitaciones,
  (2) guía al usuario a configurar su bankroll inicial, y
  (3) enseña cómo interpretar un pick."
  
  Se muestra UNA SOLA VEZ — la primera vez que el usuario entra
  después de registrarse. Se guarda en Firebase para que no vuelva
  a aparecer aunque cambie de dispositivo.
-->
<script>
  import { onMount }   from 'svelte';
  import { userId }    from '$lib/stores/auth';
  import { toasts }    from '$lib/stores/ui';
  import { dbRead, dbWrite, userPath } from '$lib/firebase';

  // ── Estado ────────────────────────────────────────────────────────
  let visible      = false;
  let currentStep  = 0;
  let bankrollInit = '';
  let saving       = false;

  const STEPS = [
    {
      icon:  '🏀',
      title: 'Bienvenido a NioSports Pro',
      badge: 'Paso 1 de 3',
    },
    {
      icon:  '💰',
      title: 'Configura tu bankroll inicial',
      badge: 'Paso 2 de 3',
    },
    {
      icon:  '📊',
      title: 'Cómo leer un pick',
      badge: 'Paso 3 de 3',
    },
  ];

  // ── Lógica de visibilidad ────────────────────────────────────────
  onMount(async () => {
    if (!$userId) return;
    try {
      const seen = await dbRead(userPath($userId, 'profile', 'onboardingDone'));
      if (!seen) {
        // Pequeño delay para que la app cargue primero
        setTimeout(() => { visible = true; }, 800);
      }
    } catch {
      // Si hay error leyendo, no mostrar el onboarding para no bloquear
    }
  });

  // ── Navegación entre pasos ───────────────────────────────────────
  function next() {
    if (currentStep < STEPS.length - 1) currentStep++;
  }
  function prev() {
    if (currentStep > 0) currentStep--;
  }

  // ── Finalizar onboarding ─────────────────────────────────────────
  async function finish() {
    saving = true;
    try {
      const updates = { onboardingDone: true };

      // Guardar bankroll inicial si el usuario ingresó uno
      const amount = parseFloat(bankrollInit);
      if (amount > 0) {
        await dbWrite(userPath($userId, 'bankroll'), {
          current:  amount,
          initial:  amount,
          lastSync: new Date().toISOString(),
        });
      }

      await dbWrite(userPath($userId, 'profile', 'onboardingDone'), true);
      toasts.success('¡Perfecto! Tu cuenta está lista.');
      visible = false;
    } catch (err) {
      console.error('[Onboarding] Error guardando:', err);
      // Cerrar igual — no bloquear al usuario por un error de guardado
      visible = false;
    } finally {
      saving = false;
    }
  }

  function skip() {
    // Marcar como visto sin guardar bankroll
    if ($userId) {
      dbWrite(userPath($userId, 'profile', 'onboardingDone'), true).catch(() => {});
    }
    visible = false;
  }

  // ── Validación bankroll ──────────────────────────────────────────
  $: bankrollValid = bankrollInit === '' || (parseFloat(bankrollInit) > 0 && parseFloat(bankrollInit) <= 1_000_000);
  $: canFinish     = currentStep === 2;
</script>

{#if visible}
  <!-- Backdrop -->
  <div class="onboarding-backdrop" role="dialog" aria-modal="true" aria-label="Configuración inicial">

    <div class="onboarding-modal">

      <!-- Header con progress dots -->
      <div class="onboarding-header">
        <div class="progress-dots">
          {#each STEPS as _, i}
            <button
              class="progress-dot"
              class:progress-dot--active={i === currentStep}
              class:progress-dot--done={i < currentStep}
              on:click={() => { if (i < currentStep) currentStep = i; }}
              aria-label="Paso {i + 1}"
              disabled={i > currentStep}
            ></button>
          {/each}
        </div>
        <button class="onboarding-skip" on:click={skip}>
          Omitir
        </button>
      </div>

      <!-- Contenido por paso -->
      <div class="onboarding-body">

        <!-- PASO 0 — Bienvenida y honestidad del modelo -->
        {#if currentStep === 0}
          <div class="step step--welcome">
            <div class="step__icon">{STEPS[0].icon}</div>
            <span class="step__badge">{STEPS[0].badge}</span>
            <h2 class="step__title">{STEPS[0].title}</h2>

            <p class="step__intro">
              NioSports analiza estadísticas NBA para ayudarte a tomar mejores
              decisiones de apuesta. Antes de empezar, queremos ser honestos contigo:
            </p>

            <div class="honesty-cards">
              <div class="honesty-card honesty-card--green">
                <span class="honesty-card__icon">✅</span>
                <div>
                  <strong>Lo que sí hacemos</strong>
                  <p>Analizamos promedios de equipos, ritmo de juego, ventaja local/visitante y factores contextuales con datos reales de la temporada.</p>
                </div>
              </div>
              <div class="honesty-card honesty-card--yellow">
                <span class="honesty-card__icon">⚠️</span>
                <div>
                  <strong>Lo que debes saber</strong>
                  <p>Las predicciones son probabilísticas, no garantizadas. Ningún modelo predice el futuro con certeza. Usa nuestros picks como una herramienta más de análisis.</p>
                </div>
              </div>
              <div class="honesty-card honesty-card--blue">
                <span class="honesty-card__icon">📊</span>
                <div>
                  <strong>Transparencia total</strong>
                  <p>Mostramos nuestro historial real de aciertos en la sección "Stats". Si el modelo falla, lo verás ahí — sin ocultar malos resultados.</p>
                </div>
              </div>
            </div>
          </div>

        <!-- PASO 1 — Configurar bankroll -->
        {:else if currentStep === 1}
          <div class="step step--bankroll">
            <div class="step__icon">{STEPS[1].icon}</div>
            <span class="step__badge">{STEPS[1].badge}</span>
            <h2 class="step__title">{STEPS[1].title}</h2>

            <p class="step__intro">
              Tu bankroll es el capital que destinas exclusivamente a apuestas.
              NioSports te ayuda a gestionarlo responsablemente.
            </p>

            <div class="bankroll-input-group">
              <label class="bankroll-label" for="bankroll-amount">
                ¿Con cuánto empiezas? (opcional)
              </label>
              <div class="bankroll-field">
                <span class="bankroll-field__prefix">$</span>
                <input
                  id="bankroll-amount"
                  type="number"
                  min="0"
                  max="1000000"
                  step="10"
                  placeholder="Ej: 500"
                  bind:value={bankrollInit}
                  class="bankroll-field__input"
                  class:bankroll-field__input--error={!bankrollValid}
                />
              </div>
              {#if !bankrollValid}
                <p class="bankroll-error">Ingresa un valor válido entre $1 y $1,000,000</p>
              {/if}
            </div>

            <div class="bankroll-tips">
              <h4>💡 Reglas de oro del bankroll:</h4>
              <ul>
                <li>Nunca apostar más del <strong>2-5%</strong> del bankroll por pick</li>
                <li>Separar el bankroll de tus finanzas personales</li>
                <li>Registrar <strong>todos</strong> los resultados, no solo los positivos</li>
                <li>Si llegas al 50% de pérdida, pausar y revisar la estrategia</li>
              </ul>
            </div>
          </div>

        <!-- PASO 2 — Cómo interpretar un pick -->
        {:else if currentStep === 2}
          <div class="step step--picks">
            <div class="step__icon">{STEPS[2].icon}</div>
            <span class="step__badge">{STEPS[2].badge}</span>
            <h2 class="step__title">{STEPS[2].title}</h2>

            <!-- Pick de ejemplo visual -->
            <div class="pick-example">
              <div class="pick-example__header">
                <span class="pick-example__teams">Lakers vs Celtics</span>
                <span class="pick-example__period">1er Cuarto</span>
              </div>
              <div class="pick-example__prediction">
                <div class="pick-example__main">
                  <span class="pick-example__direction over">OVER</span>
                  <span class="pick-example__line">56.5</span>
                </div>
                <div class="pick-example__confidence">
                  <div class="confidence-bar">
                    <div class="confidence-bar__fill" style="width: 68%"></div>
                  </div>
                  <span class="confidence-label">68% confianza</span>
                </div>
              </div>
              <div class="pick-example__factors">
                <span class="factor factor--pos">↑ Pace alto (+3.2 pts)</span>
                <span class="factor factor--neg">↓ Back-to-back Celtics (-2.1 pts)</span>
                <span class="factor factor--pos">↑ Ventaja local (+1.8 pts)</span>
              </div>
            </div>

            <div class="pick-legend">
              <div class="pick-legend__item">
                <span class="legend-dot legend-dot--green"></span>
                <span><strong>68%+</strong> — Alta confianza</span>
              </div>
              <div class="pick-legend__item">
                <span class="legend-dot legend-dot--yellow"></span>
                <span><strong>55-67%</strong> — Confianza media</span>
              </div>
              <div class="pick-legend__item">
                <span class="legend-dot legend-dot--red"></span>
                <span><strong>&lt;55%</strong> — Baja confianza (evitar)</span>
              </div>
            </div>

            <p class="step__note">
              El break-even en apuestas con -110 de juice es <strong>52.4%</strong>.
              Solo picks con confianza ≥ 58% tienen edge estadístico real.
            </p>
          </div>
        {/if}
      </div>

      <!-- Footer con navegación -->
      <div class="onboarding-footer">
        <button
          class="btn btn--secondary"
          on:click={prev}
          disabled={currentStep === 0}
        >
          ← Anterior
        </button>

        {#if currentStep < STEPS.length - 1}
          <button class="btn btn--primary" on:click={next}>
            Siguiente →
          </button>
        {:else}
          <button
            class="btn btn--primary btn--finish"
            on:click={finish}
            disabled={saving || !bankrollValid}
          >
            {saving ? 'Guardando...' : '🚀 ¡Empezar!'}
          </button>
        {/if}
      </div>

    </div>
  </div>
{/if}

<style>
  .onboarding-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.75);
    backdrop-filter: blur(4px);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    animation: fadeIn 0.25s ease;
  }

  .onboarding-modal {
    background: #0f1729;
    border: 1px solid rgba(251,191,36,0.2);
    border-radius: 20px;
    width: 100%;
    max-width: 520px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 25px 60px rgba(0,0,0,0.6);
    display: flex;
    flex-direction: column;
    animation: slideUp 0.3s ease;
  }

  /* Header */
  .onboarding-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px 0;
  }

  .progress-dots {
    display: flex;
    gap: 8px;
  }

  .progress-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    background: rgba(255,255,255,0.15);
    transition: all 0.2s;
    padding: 0;
  }
  .progress-dot--active { background: #fbbf24; transform: scale(1.2); }
  .progress-dot--done   { background: rgba(251,191,36,0.5); cursor: pointer; }
  .progress-dot:disabled { cursor: default; }

  .onboarding-skip {
    background: none;
    border: none;
    color: rgba(255,255,255,0.35);
    cursor: pointer;
    font-size: 0.8rem;
    padding: 4px 8px;
    border-radius: 6px;
    transition: color 0.15s;
  }
  .onboarding-skip:hover { color: rgba(255,255,255,0.7); }

  /* Body */
  .onboarding-body { padding: 24px; flex: 1; }

  .step { display: flex; flex-direction: column; gap: 16px; }

  .step__icon { font-size: 2.5rem; text-align: center; }
  .step__badge {
    text-align: center;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #fbbf24;
    opacity: 0.8;
  }
  .step__title {
    font-family: 'Orbitron', monospace;
    font-size: 1.2rem;
    font-weight: 700;
    text-align: center;
    color: #fff;
    line-height: 1.3;
  }
  .step__intro {
    font-size: 0.875rem;
    color: rgba(255,255,255,0.7);
    line-height: 1.6;
    text-align: center;
  }
  .step__note {
    font-size: 0.78rem;
    color: rgba(255,255,255,0.5);
    text-align: center;
    line-height: 1.5;
    padding: 10px;
    background: rgba(255,255,255,0.03);
    border-radius: 8px;
  }

  /* Honesty cards */
  .honesty-cards { display: flex; flex-direction: column; gap: 10px; }
  .honesty-card {
    display: flex;
    gap: 12px;
    padding: 12px 14px;
    border-radius: 10px;
    font-size: 0.8rem;
    line-height: 1.5;
    border: 1px solid transparent;
  }
  .honesty-card--green  { background: rgba(52,211,153,0.07); border-color: rgba(52,211,153,0.2); }
  .honesty-card--yellow { background: rgba(251,191,36,0.07); border-color: rgba(251,191,36,0.2); }
  .honesty-card--blue   { background: rgba(96,165,250,0.07); border-color: rgba(96,165,250,0.2); }
  .honesty-card__icon   { font-size: 1.1rem; flex-shrink: 0; margin-top: 1px; }
  .honesty-card strong  { display: block; margin-bottom: 4px; color: #fff; }
  .honesty-card p       { color: rgba(255,255,255,0.6); margin: 0; }

  /* Bankroll */
  .bankroll-input-group { display: flex; flex-direction: column; gap: 8px; }
  .bankroll-label { font-size: 0.85rem; color: rgba(255,255,255,0.7); font-weight: 600; }
  .bankroll-field {
    display: flex;
    align-items: center;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 10px;
    overflow: hidden;
  }
  .bankroll-field__prefix {
    padding: 10px 12px;
    color: #fbbf24;
    font-weight: 700;
    font-size: 1rem;
    border-right: 1px solid rgba(255,255,255,0.1);
  }
  .bankroll-field__input {
    flex: 1;
    background: none;
    border: none;
    color: #fff;
    font-size: 1.1rem;
    padding: 10px 14px;
    outline: none;
    font-family: 'DM Mono', monospace;
  }
  .bankroll-field__input--error { border-color: rgba(248,113,113,0.5); }
  .bankroll-error { font-size: 0.75rem; color: #f87171; }

  .bankroll-tips {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    padding: 14px;
    font-size: 0.8rem;
  }
  .bankroll-tips h4 { color: rgba(255,255,255,0.8); margin-bottom: 8px; }
  .bankroll-tips ul { list-style: none; display: flex; flex-direction: column; gap: 6px; }
  .bankroll-tips li { color: rgba(255,255,255,0.55); padding-left: 16px; position: relative; }
  .bankroll-tips li::before { content: '•'; position: absolute; left: 0; color: #fbbf24; }
  .bankroll-tips strong { color: #fbbf24; }

  /* Pick example */
  .pick-example {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 14px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .pick-example__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.8rem;
  }
  .pick-example__teams { font-weight: 700; color: #fff; }
  .pick-example__period { color: rgba(255,255,255,0.45); font-size: 0.72rem; }

  .pick-example__main {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 4px;
  }
  .pick-example__direction {
    font-size: 0.85rem;
    font-weight: 800;
    padding: 3px 10px;
    border-radius: 6px;
    letter-spacing: 0.05em;
  }
  .over  { background: rgba(52,211,153,0.15); color: #34d399; }
  .under { background: rgba(248,113,113,0.15); color: #f87171; }
  .pick-example__line { font-family: 'DM Mono', monospace; font-size: 1.4rem; font-weight: 700; color: #fff; }

  .confidence-bar {
    height: 4px;
    background: rgba(255,255,255,0.1);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 4px;
  }
  .confidence-bar__fill {
    height: 100%;
    background: linear-gradient(90deg, #fbbf24, #34d399);
    border-radius: 4px;
  }
  .confidence-label { font-size: 0.72rem; color: rgba(255,255,255,0.5); }

  .pick-example__factors {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .factor { font-size: 0.72rem; padding: 3px 0; }
  .factor--pos { color: #34d399; }
  .factor--neg { color: #f87171; }

  /* Legend */
  .pick-legend {
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: rgba(255,255,255,0.03);
    border-radius: 10px;
    padding: 12px 14px;
    font-size: 0.8rem;
  }
  .pick-legend__item { display: flex; align-items: center; gap: 8px; color: rgba(255,255,255,0.65); }
  .legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .legend-dot--green  { background: #34d399; }
  .legend-dot--yellow { background: #fbbf24; }
  .legend-dot--red    { background: #f87171; }

  /* Footer */
  .onboarding-footer {
    display: flex;
    gap: 12px;
    padding: 20px 24px;
    border-top: 1px solid rgba(255,255,255,0.07);
  }

  .btn {
    flex: 1;
    padding: 11px 20px;
    border: none;
    border-radius: 10px;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
    font-family: 'DM Sans', sans-serif;
  }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn--secondary {
    background: rgba(255,255,255,0.06);
    color: rgba(255,255,255,0.6);
  }
  .btn--secondary:hover:not(:disabled) { background: rgba(255,255,255,0.1); }
  .btn--primary {
    background: #fbbf24;
    color: #000;
    font-weight: 700;
  }
  .btn--primary:hover:not(:disabled) { background: #f59e0b; }
  .btn--finish { letter-spacing: 0.02em; }

  @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
  @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

  @media (max-width: 480px) {
    .onboarding-modal { border-radius: 16px; }
    .step__title      { font-size: 1rem; }
  }
</style>
