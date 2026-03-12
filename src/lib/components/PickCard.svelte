<!-- src/lib/components/PickCard.svelte -->
<!--
  REEMPLAZA: el template literal de picksHtml en renders.js (líneas 1313-1349)
  
  ESTO es el cambio que elimina 'unsafe-inline':
  
  ANTES (renders.js):
    picksHtml += `
      <button onclick="deletePick('${pick.id}')">🗑️</button>
    `;
    // El navegador evalúa el string "deletePick('id123')" como código JS
    // → requiere 'unsafe-inline' en la CSP
  
  AHORA (PickCard.svelte):
    <button on:click={() => dispatch('delete', pick.id)}>🗑️</button>
    // Svelte conecta el handler con addEventListener internamente
    // → CERO strings evaluados como código → sin 'unsafe-inline'
  
  DATOS: el componente recibe el pick como prop tipada. Svelte garantiza
  que los valores interpolados en el template ({pick.localTeam}) son
  escapados automáticamente como texto plano. No necesitamos llamar
  nsSafe() porque Svelte ya hace XSS escaping por diseño.
  
  {pick.localTeam} en Svelte → equivalente a nsSafe(pick.localTeam) en renders.js
  Las llaves simples en Svelte siempre producen texto, nunca HTML crudo.
  Para HTML crudo se necesita {@html ...} que es explícito y auditeable.
-->

<script>
  import { createEventDispatcher } from 'svelte';

  // Props — la interfaz pública del componente
  // Cualquier componente padre que use <PickCard pick={...} />
  // debe pasar estos datos con esta forma.
  export let pick;          // El objeto completo del pick
  export let showActions = true; // Mostrar botones de acción

  const dispatch = createEventDispatcher();

  // Computed values — en Svelte, $: significa "reactivo a sus dependencias"
  $: statusClass = pick.status === 'win' ? 'pick-card__status--win'
                 : pick.status === 'loss' ? 'pick-card__status--loss'
                 : 'pick-card__status--pending';

  $: statusIcon = pick.status === 'win' ? '✅'
                : pick.status === 'loss' ? '❌'
                : '⏳';

  $: date = pick.createdAt
    ? new Date(pick.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
    : '';

  $: evPositive = pick.ev && parseFloat(pick.ev) >= 0;

  $: clvDisplay = (() => {
    if (!pick.closingLine || !pick.line || pick.isCombo) return null;
    const clv = pick.betType === 'OVER'
      ? parseFloat(pick.closingLine) - parseFloat(pick.line)
      : parseFloat(pick.line) - parseFloat(pick.closingLine);
    return { value: clv.toFixed(1), positive: clv >= 0 };
  })();

  // Handlers que despachan eventos al componente padre
  // El padre decide qué hacer — PickCard solo avisa
  function handleDelete()  { dispatch('delete',  pick.id); }
  function handleWin()     { dispatch('result',  { id: pick.id, result: 'win'  }); }
  function handleLoss()    { dispatch('result',  { id: pick.id, result: 'loss' }); }
  function handlePush()    { dispatch('result',  { id: pick.id, result: 'push' }); }
  function handleResult()  { dispatch('register',pick.id); }
  function handleCLV()     { dispatch('clv',     { id: pick.id, line: pick.line }); }
</script>

<article class="pick-card" class:pick-card--combo={pick.isCombo}>
  <!-- Header: equipos + status -->
  <div class="pick-card__header">
    <div class="pick-card__teams">
      {#if pick.isCombo}
        <span class="pick-card__combo-badge">🔥 BET BUILDER</span>
      {/if}
      <!--
        {pick.localTeam} → Svelte escapa esto como texto plano.
        Es imposible que un pick.localTeam malicioso con <script> inyecte
        código aquí — Svelte convierte < en &lt; automáticamente.
        Este es el XSS safety "gratis" que Svelte da por diseño.
      -->
      <p class="pick-card__matchup">{pick.localTeam} vs {pick.awayTeam}</p>
      <p class="pick-card__line">
        {#if pick.isCombo}
          {pick.line}
        {:else}
          {pick.period} {pick.betType} {pick.line}
        {/if}
      </p>
    </div>
    <span class="pick-card__status {statusClass}">{statusIcon}</span>
  </div>

  <!-- Stats row -->
  <div class="pick-card__stats">
    <span class="pick-card__date">📅 {date}</span>
    {#if pick.odds}
      <span class="pick-card__odds">@{pick.odds}</span>
    {/if}
    <span class="pick-card__prob">{pick.probability}% prob</span>
    {#if pick.ev !== null && pick.ev !== undefined}
      <span class="pick-card__ev" class:pick-card__ev--pos={evPositive} class:pick-card__ev--neg={!evPositive}>
        EV: {evPositive ? '+' : ''}{pick.ev}%
      </span>
    {/if}
    {#if clvDisplay}
      <span class="pick-card__clv" class:pick-card__clv--pos={clvDisplay.positive}>
        CLV: {clvDisplay.positive ? '+' : ''}{clvDisplay.value}
      </span>
    {/if}
  </div>

  <!-- Action buttons — on:click sin strings evaluados como código -->
  {#if showActions}
    <div class="pick-card__actions">
      {#if pick.status === 'pending'}
        <button class="pick-card__btn pick-card__btn--result" on:click={handleResult}>
          📊 Resultado
        </button>
        <button class="pick-card__btn pick-card__btn--win"  on:click={handleWin}>✓</button>
        <button class="pick-card__btn pick-card__btn--loss" on:click={handleLoss}>✗</button>
        <button class="pick-card__btn pick-card__btn--push" on:click={handlePush}>↔️</button>
      {:else}
        {#if pick.actualTotal}
          <span class="pick-card__actual">Real: {pick.actualTotal} pts</span>
        {/if}
        {#if pick.modelError != null}
          <span class="pick-card__error">Error: ±{pick.modelError.toFixed(1)}</span>
        {/if}
        {#if !pick.isCombo && !pick.closingLine}
          <button class="pick-card__btn pick-card__btn--clv" on:click={handleCLV}>+CLV</button>
        {/if}
      {/if}
      <button class="pick-card__btn pick-card__btn--delete" on:click={handleDelete}>🗑️</button>
    </div>
  {/if}
</article>

<style>
  .pick-card {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    padding: 14px;
    margin-bottom: 12px;
    transition: border-color 0.2s;
  }

  .pick-card--combo {
    border-color: rgba(245,158,11,0.5);
  }

  .pick-card__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 8px;
  }

  .pick-card__teams {
    flex: 1;
    min-width: 0;
    padding-right: 8px;
  }

  .pick-card__combo-badge {
    display: inline-block;
    font-size: 11px;
    background: #f59e0b;
    color: #000;
    padding: 1px 8px;
    border-radius: 99px;
    font-weight: 700;
    margin-bottom: 4px;
  }

  .pick-card__matchup {
    font-weight: 700;
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin: 0 0 2px;
  }

  .pick-card__line {
    font-size: 0.85rem;
    color: rgba(255,255,255,0.8);
    font-weight: 600;
    margin: 0;
  }

  .pick-card__status {
    flex-shrink: 0;
    padding: 3px 10px;
    border-radius: 99px;
    font-weight: 700;
    font-size: 0.8rem;
    color: #fff;
  }

  .pick-card__status--win     { background: rgba(16,185,129,0.3); }
  .pick-card__status--loss    { background: rgba(239,68,68,0.3);  }
  .pick-card__status--pending { background: rgba(245,158,11,0.3); }

  .pick-card__stats {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    font-size: 0.8rem;
    margin-bottom: 8px;
    color: rgba(255,255,255,0.7);
  }

  .pick-card__odds   { color: #fde68a; font-weight: 600; }
  .pick-card__prob   { color: #c4b5fd; font-weight: 600; }
  .pick-card__ev--pos{ color: #34d399; font-weight: 600; }
  .pick-card__ev--neg{ color: #f87171; font-weight: 600; }
  .pick-card__clv--pos { color: #34d399; }

  .pick-card__actions {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 6px;
    border-top: 1px solid rgba(255,255,255,0.1);
    padding-top: 8px;
  }

  .pick-card__btn {
    border: none;
    cursor: pointer;
    border-radius: 6px;
    font-size: 0.75rem;
    padding: 4px 8px;
    transition: opacity 0.15s;
    font-weight: 600;
  }
  .pick-card__btn:hover { opacity: 0.8; }

  .pick-card__btn--result { background: rgba(245,158,11,0.2); color: #fbbf24; }
  .pick-card__btn--win    { background: none; color: #34d399; font-size: 1.1rem; }
  .pick-card__btn--loss   { background: none; color: #f87171; font-size: 1.1rem; }
  .pick-card__btn--push   { background: none; color: #9ca3af; }
  .pick-card__btn--clv    { background: rgba(6,182,212,0.2); color: #22d3ee; }
  .pick-card__btn--delete { background: none; color: #6b7280; font-size: 1.1rem; }
  .pick-card__btn--delete:hover { color: #f87171; }

  .pick-card__actual { font-size: 0.75rem; color: #22d3ee; }
  .pick-card__error  { font-size: 0.75rem; color: #9ca3af; }
</style>
