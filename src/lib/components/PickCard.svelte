<!-- src/lib/components/PickCard.svelte — FASE 6 -->
<!-- Rediseñado: barra de confianza + factores del modelo + WCAG AA -->
<script>
  import { createEventDispatcher } from 'svelte';

  export let pick;
  export let showActions = true;

  const dispatch = createEventDispatcher();

  $: statusClass = pick.status === 'win'  ? 'pick-card--win'
                 : pick.status === 'loss' ? 'pick-card--loss' : '';
  $: statusBadgeClass = pick.status === 'win'  ? 'badge--win'
                      : pick.status === 'loss' ? 'badge--loss' : 'badge--pending';
  $: statusLabel = pick.status === 'win' ? 'Ganado' : pick.status === 'loss' ? 'Perdido' : 'Pendiente';
  $: statusIcon  = pick.status === 'win' ? '✅' : pick.status === 'loss' ? '❌' : '⏳';

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

  // Barra de confianza
  $: confidence = pick.probability ? parseFloat(pick.probability) : 0;
  $: confColor  = confidence >= 68 ? '#34d399' : confidence >= 55 ? '#fbbf24' : '#f87171';
  $: confLabel  = confidence >= 68 ? 'Alta confianza' : confidence >= 55 ? 'Confianza media' : 'Baja confianza';

  // Factores del modelo (opcionales)
  $: factors = pick.factors ?? [];

  // Error del modelo
  $: modelErrorAbs = pick.modelError != null ? Math.abs(parseFloat(pick.modelError)).toFixed(1) : null;

  // Aria description completa
  $: ariaDescription = [
    pick.localTeam + ' vs ' + pick.awayTeam,
    pick.isCombo ? pick.line : (pick.period + ' ' + pick.betType + ' ' + pick.line),
    confidence + '% confianza. ' + confLabel + '.',
    statusLabel,
  ].join('. ');

  function handleDelete()  { dispatch('delete',   pick.id); }
  function handleWin()     { dispatch('result',   { id: pick.id, result: 'win'  }); }
  function handleLoss()    { dispatch('result',   { id: pick.id, result: 'loss' }); }
  function handlePush()    { dispatch('result',   { id: pick.id, result: 'push' }); }
  function handleResult()  { dispatch('register', pick.id); }
  function handleCLV()     { dispatch('clv',      { id: pick.id, line: pick.line }); }
</script>

<article
  class="pick-card {statusClass}"
  class:pick-card--combo={pick.isCombo}
  aria-label={ariaDescription}
>
  <!-- Header -->
  <div class="pick-card__header">
    <div class="pick-card__teams">
      {#if pick.isCombo}
        <span class="combo-badge">🔥 BET BUILDER</span>
      {/if}
      <p class="pick-card__matchup">{pick.localTeam} vs {pick.awayTeam}</p>
      <p class="pick-card__line">
        {#if pick.isCombo}
          {pick.line}
        {:else}
          <span class="period-tag">{pick.period}</span>
          <span class="bet-type" class:over={pick.betType==='OVER'} class:under={pick.betType==='UNDER'}>{pick.betType}</span>
          <span class="line-num">{pick.line}</span>
        {/if}
      </p>
    </div>
    <span class="status-badge {statusBadgeClass}" aria-label={statusLabel} title={statusLabel}>{statusIcon}</span>
  </div>

  <!-- Barra de confianza -->
  {#if confidence > 0}
    <div class="conf-wrap" aria-label="{confLabel}: {confidence}%">
      <div class="conf-track" role="progressbar" aria-valuenow={confidence} aria-valuemin={0} aria-valuemax={100}>
        <div class="conf-fill" style="width:{confidence}%;background:{confColor}"></div>
      </div>
      <div class="conf-labels">
        <span class="conf-label" style="color:{confColor}">{confLabel}</span>
        <span class="conf-pct">{confidence}%</span>
      </div>
    </div>
  {/if}

  <!-- Stats -->
  <div class="pick-card__stats">
    {#if date}<span class="stat-date" aria-label="Fecha: {date}">📅 {date}</span>{/if}
    {#if pick.odds}<span class="stat-odds" aria-label="Cuota: {pick.odds}">@{pick.odds}</span>{/if}
    {#if pick.ev !== null && pick.ev !== undefined}
      <span class="stat-ev" class:pos={evPositive} class:neg={!evPositive} aria-label="EV: {pick.ev}%">
        EV {evPositive?'+':''}{pick.ev}%
      </span>
    {/if}
    {#if clvDisplay}
      <span class="stat-clv" class:pos={clvDisplay.positive} aria-label="CLV: {clvDisplay.value}">
        CLV {clvDisplay.positive?'+':''}{clvDisplay.value}
      </span>
    {/if}
  </div>

  <!-- Factores del modelo -->
  {#if factors.length > 0}
    <div class="factors" aria-label="Factores del modelo">
      {#each factors.slice(0, 3) as f}
        <span class="factor" class:factor--pos={f.positive} class:factor--neg={!f.positive} title="{f.label}: {f.positive?'+':''}{f.impact} pts">
          {f.positive ? '↑' : '↓'} {f.label} <span class="factor__val">{f.positive?'+':''}{f.impact}</span>
        </span>
      {/each}
    </div>
  {/if}

  <!-- Resultado resuelto -->
  {#if pick.status && pick.status !== 'pending' && (pick.actualTotal || modelErrorAbs)}
    <div class="resolved">
      {#if pick.actualTotal}<span class="resolved-total">Real: <strong>{pick.actualTotal} pts</strong></span>{/if}
      {#if modelErrorAbs}<span class="resolved-err">Error ±{modelErrorAbs} pts</span>{/if}
    </div>
  {/if}

  <!-- Acciones -->
  {#if showActions}
    <div class="pick-card__actions" role="group" aria-label="Acciones">
      {#if pick.status === 'pending'}
        <button class="btn btn--result" on:click={handleResult} aria-label="Registrar resultado">📊 Resultado</button>
        <div class="quick-results" role="group" aria-label="Resultado rápido">
          <button class="btn btn--win"  on:click={handleWin}  aria-label="Marcar ganado"  title="Ganado">✓</button>
          <button class="btn btn--loss" on:click={handleLoss} aria-label="Marcar perdido" title="Perdido">✗</button>
          <button class="btn btn--push" on:click={handlePush} aria-label="Marcar push"    title="Push">↔</button>
        </div>
      {:else if !pick.isCombo && !pick.closingLine}
        <button class="btn btn--clv" on:click={handleCLV} aria-label="Registrar Closing Line Value">+CLV</button>
      {/if}
      <button class="btn btn--delete" on:click={handleDelete} aria-label="Eliminar pick">🗑️</button>
    </div>
  {/if}
</article>

<style>
  .pick-card {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 14px;
    padding: 15px;
    margin-bottom: 12px;
    transition: border-color 0.2s, box-shadow 0.2s;
    animation: cardIn 0.22s ease both;
  }
  @keyframes cardIn { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
  @media (prefers-reduced-motion: reduce) { .pick-card { animation: none; } }

  .pick-card:hover           { border-color: rgba(255,255,255,0.16); }
  .pick-card:focus-within    { box-shadow: 0 0 0 2px rgba(251,191,36,0.4); }
  .pick-card--combo          { border-color: rgba(245,158,11,0.35); }
  .pick-card--win            { border-left: 3px solid #34d399; }
  .pick-card--loss           { border-left: 3px solid #f87171; }

  .pick-card__header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px; }
  .pick-card__teams  { flex:1; min-width:0; padding-right:8px; }

  .combo-badge { display:inline-block; font-size:10px; background:#f59e0b; color:#000; padding:2px 8px; border-radius:99px; font-weight:800; margin-bottom:5px; }

  .pick-card__matchup { font-weight:700; color:var(--color-text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin:0 0 4px; font-size:.95rem; }

  .pick-card__line  { display:flex; align-items:center; gap:5px; font-size:.82rem; margin:0; }
  .period-tag       { color:rgba(255,255,255,.4); font-weight:500; }
  .line-num         { font-family:'DM Mono',monospace; font-size:1rem; color:#fff; font-weight:700; }
  .bet-type         { padding:1px 7px; border-radius:6px; font-size:.7rem; font-weight:800; }
  .over             { background:rgba(52,211,153,.15); color:#34d399; }
  .under            { background:rgba(248,113,113,.15); color:#f87171; }

  .status-badge     { flex-shrink:0; padding:3px 10px; border-radius:99px; font-weight:700; font-size:.78rem; color:#fff; }
  .badge--win       { background:rgba(16,185,129,.25); }
  .badge--loss      { background:rgba(239,68,68,.25); }
  .badge--pending   { background:rgba(245,158,11,.25); }

  /* Barra de confianza */
  .conf-wrap   { margin:8px 0; }
  .conf-track  { height:5px; background:rgba(255,255,255,.08); border-radius:4px; overflow:hidden; margin-bottom:4px; }
  .conf-fill   { height:100%; border-radius:4px; transition:width .5s ease; }
  .conf-labels { display:flex; justify-content:space-between; }
  .conf-label  { font-size:.68rem; font-weight:600; }
  .conf-pct    { font-size:.68rem; color:rgba(255,255,255,.4); font-family:'DM Mono',monospace; }

  /* Stats */
  .pick-card__stats { display:flex; flex-wrap:wrap; gap:6px; font-size:.74rem; margin-bottom:8px; color:rgba(255,255,255,.55); }
  .stat-date  { color:rgba(255,255,255,.35); }
  .stat-odds  { color:#fde68a; font-weight:600; }
  .stat-ev.pos,.stat-clv.pos { color:#34d399; font-weight:600; }
  .stat-ev.neg { color:#f87171; font-weight:600; }

  /* Factores */
  .factors  { display:flex; flex-wrap:wrap; gap:4px; margin-bottom:8px; }
  .factor   { display:inline-flex; align-items:center; gap:3px; padding:2px 8px; border-radius:6px; font-size:.67rem; font-weight:600; border:1px solid transparent; }
  .factor--pos { background:rgba(52,211,153,.07); color:#34d399; border-color:rgba(52,211,153,.2); }
  .factor--neg { background:rgba(248,113,113,.07); color:#f87171; border-color:rgba(248,113,113,.2); }
  .factor__val { opacity:.65; font-family:'DM Mono',monospace; }

  /* Resultado resuelto */
  .resolved { display:flex; gap:12px; align-items:center; font-size:.73rem; margin-bottom:8px; padding:5px 10px; background:rgba(255,255,255,.03); border-radius:8px; }
  .resolved-total { color:#22d3ee; }
  .resolved-total strong { font-family:'DM Mono',monospace; }
  .resolved-err   { color:rgba(255,255,255,.35); }

  /* Acciones */
  .pick-card__actions { display:flex; justify-content:flex-end; align-items:center; gap:6px; border-top:1px solid rgba(255,255,255,.07); padding-top:10px; margin-top:4px; }
  .quick-results      { display:flex; gap:4px; }

  .btn { border:none; cursor:pointer; border-radius:8px; font-size:.75rem; padding:5px 10px; transition:opacity .15s,transform .1s; font-weight:600; font-family:'DM Sans',sans-serif; line-height:1; }
  .btn:focus-visible  { outline:2px solid #fbbf24; outline-offset:2px; }
  .btn:hover          { opacity:.82; }
  .btn:active         { transform:scale(.95); }

  .btn--result  { background:rgba(245,158,11,.14); color:#fbbf24; border:1px solid rgba(245,158,11,.25); }
  .btn--win     { background:rgba(52,211,153,.12);  color:#34d399; font-size:1rem; padding:4px 8px; }
  .btn--loss    { background:rgba(248,113,113,.12); color:#f87171; font-size:1rem; padding:4px 8px; }
  .btn--push    { background:rgba(156,163,175,.12); color:#9ca3af; padding:4px 8px; }
  .btn--clv     { background:rgba(6,182,212,.12);   color:#22d3ee; border:1px solid rgba(6,182,212,.2); }
  .btn--delete  { background:none; color:rgba(255,255,255,.2); font-size:1rem; padding:4px 8px; }
  .btn--delete:hover { color:#f87171; background:rgba(248,113,113,.1); }
</style>