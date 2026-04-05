<!-- src/lib/components/ResultModal.svelte -->
<script>
  import { createEventDispatcher } from 'svelte';

  export let pick = null;
  export let show = false;
  export let preselectedResult = null; // 'win', 'loss', 'push' o null

  const dispatch = createEventDispatcher();

  let actualTotal = '';
  let manualResult = null; // Para cuando no hay total real
  let didBet = true;
  let betAmount = '';
  let loading = false;
  let useManualResult = false;

  $: if (show && pick) {
    // Reset form when modal opens
    actualTotal = '';
    didBet = true;
    betAmount = '';
    loading = false;
    useManualResult = !!preselectedResult;
    manualResult = preselectedResult;
  }

  // Calcular resultado basado en el total real
  $: projectedLine = pick?.line ? parseFloat(pick.line) : 0;
  $: actualNum = actualTotal ? parseFloat(actualTotal) : null;
  
  $: calculatedResult = (() => {
    // Si hay resultado manual preseleccionado y no se ingresó total
    if (useManualResult && manualResult && actualNum === null) {
      return manualResult;
    }
    // Si se ingresó total, calcular automáticamente
    if (actualNum !== null && pick) {
      if (actualNum === projectedLine) return 'push';
      if (pick.betType === 'OVER') {
        return actualNum > projectedLine ? 'win' : 'loss';
      } else {
        return actualNum < projectedLine ? 'win' : 'loss';
      }
    }
    return manualResult;
  })();

  $: modelError = actualNum !== null && pick?.projection 
    ? (actualNum - parseFloat(pick.projection)).toFixed(1) 
    : null;

  $: canSubmit = calculatedResult !== null;

  function close() {
    dispatch('close');
  }

  function selectManualResult(result) {
    manualResult = result;
    useManualResult = true;
  }

  function submit() {
    if (!calculatedResult) return;
    
    loading = true;
    
    dispatch('submit', {
      pickId: pick.id,
      result: calculatedResult,
      actualTotal: actualNum,
      modelError: modelError ? parseFloat(modelError) : null,
      didBet,
      betAmount: didBet && betAmount ? parseFloat(betAmount) : null,
    });
  }
</script>

{#if show && pick}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="modal-overlay" on:click|self={close}>
    <div class="modal">
      <div class="modal__header">
        <h3 class="modal__title">📊 Registrar Resultado</h3>
        <button class="modal__close" on:click={close}>✕</button>
      </div>

      <!-- Pick Info -->
      <div class="pick-info">
        <p class="pick-info__matchup">{pick.localTeam} vs {pick.awayTeam}</p>
        <p class="pick-info__bet">
          <span class="period">{pick.period}</span>
          <span class="bet-type" class:over={pick.betType === 'OVER'} class:under={pick.betType === 'UNDER'}>
            {pick.betType}
          </span>
          <span class="line">{pick.line}</span>
        </p>
        {#if pick.projection}
          <p class="pick-info__proj">Proyección del modelo: <strong>{pick.projection}</strong></p>
        {/if}
      </div>

      <!-- Resultado manual (botones) -->
      <div class="result-selector">
        <p class="field__label">¿Cuál fue el resultado?</p>
        <div class="result-buttons">
          <button 
            class="result-btn result-btn--win" 
            class:active={calculatedResult === 'win'}
            on:click={() => selectManualResult('win')}
          >
            ✅ Ganado
          </button>
          <button 
            class="result-btn result-btn--loss" 
            class:active={calculatedResult === 'loss'}
            on:click={() => selectManualResult('loss')}
          >
            ❌ Perdido
          </button>
          <button 
            class="result-btn result-btn--push" 
            class:active={calculatedResult === 'push'}
            on:click={() => selectManualResult('push')}
          >
            ↔️ Push
          </button>
        </div>
      </div>

      <!-- Input: Total Real (opcional) -->
      <label class="field">
        <span class="field__label">Puntos anotados en {pick.period} (opcional)</span>
        <input 
          class="field__input" 
          type="number" 
          min="0" 
          step="0.5"
          placeholder="Ej: 112 - para análisis del modelo"
          bind:value={actualTotal}
        />
        <span class="field__hint">Esto ayuda al modelo a aprender de sus errores</span>
      </label>

      <!-- Info del error del modelo -->
      {#if modelError}
        <div class="model-error-info">
          <span>📊 Error del modelo: <strong>{modelError > 0 ? '+' : ''}{modelError} pts</strong></span>
        </div>
      {/if}

      <!-- ¿Apostaste? -->
      <div class="bet-question">
        <p class="bet-question__label">¿Realizaste esta apuesta en tu casa de apuestas?</p>
        <div class="bet-options">
          <button 
            class="bet-option" 
            class:active={didBet}
            on:click={() => didBet = true}
          >
            ✅ Sí, aposté
          </button>
          <button 
            class="bet-option" 
            class:active={!didBet}
            on:click={() => didBet = false}
          >
            ❌ No aposté
          </button>
        </div>
      </div>

      <!-- Monto apostado (solo si apostó) -->
      {#if didBet}
        <label class="field">
          <span class="field__label">¿Cuánto apostaste? ($)</span>
          <input 
            class="field__input" 
            type="number" 
            min="0" 
            step="0.01"
            placeholder="Ej: 10.00"
            bind:value={betAmount}
          />
          <span class="field__hint">Esto actualizará tu bankroll automáticamente</span>
        </label>
      {/if}

      <!-- Preview del resultado -->
      {#if calculatedResult && didBet && betAmount}
        {@const odds = pick.odds || -110}
        {@const amount = parseFloat(betAmount) || 0}
        {@const payout = calculatedResult === 'win' 
          ? (odds < 0 ? amount * (100 / Math.abs(odds)) : amount * (odds / 100))
          : calculatedResult === 'loss' ? -amount : 0}
        <div class="payout-preview" class:win={payout > 0} class:loss={payout < 0}>
          <span class="payout-label">Impacto en bankroll:</span>
          <span class="payout-value">
            {payout >= 0 ? '+' : ''}{payout.toFixed(2)}$
          </span>
        </div>
      {/if}

      <!-- Actions -->
      <div class="modal__actions">
        <button class="btn btn--ghost" on:click={close} disabled={loading}>
          Cancelar
        </button>
        <button 
          class="btn btn--primary" 
          on:click={submit}
          disabled={loading || !canSubmit}
        >
          {#if loading}
            <span class="spinner"></span>
          {:else}
            Guardar Resultado
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.7);
    backdrop-filter: blur(4px);
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .modal {
    background: #0f1729;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 18px;
    padding: 24px;
    width: 100%;
    max-width: 440px;
    max-height: 90vh;
    overflow-y: auto;
  }

  .modal__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .modal__title {
    font-size: 1.1rem;
    font-weight: 800;
  }

  .modal__close {
    background: none;
    border: none;
    color: var(--color-text-muted);
    font-size: 1.2rem;
    cursor: pointer;
    padding: 4px 8px;
  }

  /* Pick Info */
  .pick-info {
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 14px;
    margin-bottom: 20px;
  }

  .pick-info__matchup {
    font-weight: 700;
    font-size: 0.95rem;
    margin-bottom: 6px;
  }

  .pick-info__bet {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }

  .period {
    color: var(--color-text-muted);
    font-size: 0.8rem;
  }

  .bet-type {
    padding: 2px 8px;
    border-radius: 6px;
    font-size: 0.7rem;
    font-weight: 800;
  }

  .over {
    background: rgba(52,211,153,0.15);
    color: #34d399;
  }

  .under {
    background: rgba(248,113,113,0.15);
    color: #f87171;
  }

  .line {
    font-family: 'DM Mono', monospace;
    font-weight: 700;
  }

  .pick-info__proj {
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  .pick-info__proj strong {
    color: #fbbf24;
  }

  /* Result Selector */
  .result-selector {
    margin-bottom: 16px;
  }

  .result-buttons {
    display: flex;
    gap: 8px;
  }

  .result-btn {
    flex: 1;
    padding: 12px 8px;
    border-radius: 10px;
    border: 1px solid var(--color-border);
    background: var(--color-bg-card);
    color: var(--color-text-muted);
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
  }

  .result-btn:hover {
    background: var(--color-bg-elevated);
  }

  .result-btn--win.active {
    background: rgba(52,211,153,0.15);
    border-color: rgba(52,211,153,0.4);
    color: #34d399;
  }

  .result-btn--loss.active {
    background: rgba(248,113,113,0.15);
    border-color: rgba(248,113,113,0.4);
    color: #f87171;
  }

  .result-btn--push.active {
    background: rgba(156,163,175,0.15);
    border-color: rgba(156,163,175,0.4);
    color: #9ca3af;
  }

  /* Field */
  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 16px;
  }

  .field__label {
    font-size: 0.8rem;
    color: var(--color-text-muted);
    font-weight: 600;
  }

  .field__input {
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: 10px;
    padding: 12px 14px;
    color: var(--color-text);
    font-size: 1rem;
    width: 100%;
  }

  .field__input:focus {
    outline: none;
    border-color: #fbbf24;
  }

  .field__hint {
    font-size: 0.72rem;
    color: var(--color-text-muted);
  }

  /* Model Error Info */
  .model-error-info {
    background: rgba(251,191,36,0.08);
    border: 1px solid rgba(251,191,36,0.2);
    border-radius: 10px;
    padding: 10px 14px;
    margin-bottom: 16px;
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  .model-error-info strong {
    color: #fbbf24;
    font-family: 'DM Mono', monospace;
  }

  /* Bet Question */
  .bet-question {
    margin-bottom: 16px;
  }

  .bet-question__label {
    font-size: 0.8rem;
    color: var(--color-text-muted);
    font-weight: 600;
    margin-bottom: 10px;
  }

  .bet-options {
    display: flex;
    gap: 10px;
  }

  .bet-option {
    flex: 1;
    padding: 12px;
    border-radius: 10px;
    border: 1px solid var(--color-border);
    background: var(--color-bg-card);
    color: var(--color-text-muted);
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
  }

  .bet-option:hover {
    background: var(--color-bg-elevated);
  }

  .bet-option.active {
    background: rgba(251,191,36,0.1);
    border-color: rgba(251,191,36,0.4);
    color: #fbbf24;
  }

  /* Payout Preview */
  .payout-preview {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px;
    border-radius: 12px;
    margin-bottom: 16px;
  }

  .payout-preview.win {
    background: rgba(52,211,153,0.1);
    border: 1px solid rgba(52,211,153,0.3);
  }

  .payout-preview.loss {
    background: rgba(248,113,113,0.1);
    border: 1px solid rgba(248,113,113,0.3);
  }

  .payout-label {
    font-size: 0.85rem;
    color: var(--color-text-muted);
  }

  .payout-value {
    font-size: 1.2rem;
    font-weight: 800;
    font-family: 'DM Mono', monospace;
  }

  .payout-preview.win .payout-value {
    color: #34d399;
  }

  .payout-preview.loss .payout-value {
    color: #f87171;
  }

  /* Actions */
  .modal__actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    margin-top: 20px;
  }

  .btn {
    padding: 12px 20px;
    border-radius: 10px;
    border: none;
    font-size: 0.9rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn--ghost {
    background: transparent;
    color: var(--color-text-muted);
    border: 1px solid var(--color-border);
  }

  .btn--primary {
    background: #fbbf24;
    color: #000;
  }

  .btn--primary:hover:not(:disabled) {
    background: #f59e0b;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(0,0,0,0.3);
    border-top-color: #000;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>