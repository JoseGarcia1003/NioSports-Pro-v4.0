<!-- src/routes/tracking/+page.svelte -->
<script>
  import { onMount, onDestroy } from 'svelte';
  import { userId }          from '$lib/stores/auth';
  import { picksStore,
           picksBacktesting } from '$lib/stores/data';
  import { toasts }           from '$lib/stores/ui';
  import { dbSubscribe,
           dbWrite, dbPush,
           dbRemove,
           userPath }         from '$lib/firebase';
  import Skeleton             from '$lib/components/Skeleton.svelte';

  let loading   = true;
  let cleanupFn = null;
  let hasSubscribed = false;

  let showForm    = false;
  let formLoading = false;
  let form = { local: '', away: '', period: '1Q', betType: 'OVER', line: '', trend: '', note: '' };

  let resultInputs = {};

  // Suscripción reactiva
  $: if ($userId && !hasSubscribed) {
    hasSubscribed = true;
    cleanupFn = dbSubscribe(
      userPath($userId, 'picks', 'backtesting'),
      (data) => {
        picksStore.setByType('backtesting', data ?? {});
        loading = false;
      }
    );
  }

  // Timeout para evitar carga infinita
  onMount(() => {
    setTimeout(() => {
      if (loading && !$userId) {
        loading = false;
      }
    }, 2000);
  });

  onDestroy(() => cleanupFn?.());

  $: allPicks = $picksBacktesting;
  $: pending  = allPicks.filter(p => !p.status || p.status === 'pending');
  $: resolved = allPicks.filter(p => p.status && p.status !== 'pending')
                         .sort((a, b) => new Date(b.resolvedAt ?? b.createdAt) - new Date(a.resolvedAt ?? a.createdAt));

  $: wins    = resolved.filter(p => p.status === 'win').length;
  $: losses  = resolved.filter(p => p.status === 'loss').length;
  $: pushes  = resolved.filter(p => p.status === 'push').length;
  $: winRate = (wins + losses) > 0 ? ((wins / (wins + losses)) * 100).toFixed(1) : '—';

  function resetForm() {
    form = { local: '', away: '', period: '1Q', betType: 'OVER', line: '', trend: '', note: '' };
    showForm = false;
  }

  async function handleAddPick() {
    if (!form.local.trim() || !form.away.trim() || !form.line) { toasts.error('Completa al menos: equipos y línea.'); return; }
    const line = parseFloat(form.line);
    if (isNaN(line)) { toasts.error('La línea debe ser un número válido.'); return; }
    formLoading = true;
    try {
      await dbPush(userPath($userId, 'picks', 'backtesting'), {
        local: form.local.trim(), away: form.away.trim(),
        period: form.period, betType: form.betType,
        line, trend: form.trend.trim() || null,
        note: form.note.trim() || null,
        status: 'pending', createdAt: new Date().toISOString(),
      });
      toasts.success('Pick de backtesting añadido.');
      resetForm();
    } catch {
      toasts.error('No se pudo guardar el pick.');
    } finally {
      formLoading = false;
    }
  }

  async function handleResolve(pick) {
    const raw    = resultInputs[pick.id];
    const actual = parseFloat(raw);
    if (isNaN(actual)) { toasts.error('Ingresa el resultado real del partido.'); return; }
    const line   = parseFloat(pick.line);
    let status   = 'push';
    if (actual !== line) {
      status = pick.betType === 'OVER' ? (actual > line ? 'win' : 'loss') : (actual < line ? 'win' : 'loss');
    }
    try {
      await dbWrite(userPath($userId, 'picks', 'backtesting', pick.id),
        { ...pick, status, actualResult: actual, resolvedAt: new Date().toISOString() });
      const label = status === 'win' ? '✅ WIN' : status === 'loss' ? '❌ LOSS' : '↔️ PUSH';
      toasts.success(`${label} — ${pick.local} vs ${pick.away}`);
      resultInputs = { ...resultInputs, [pick.id]: '' };
    } catch {
      toasts.error('No se pudo resolver el pick.');
    }
  }

  async function handleDelete(pickId) {
    try {
      await dbRemove(userPath($userId, 'picks', 'backtesting', pickId));
      toasts.success('Pick eliminado.');
    } catch {
      toasts.error('No se pudo eliminar.');
    }
  }

  function statusLabel(status) {
    if (status === 'win')  return { text: 'WIN',  cls: 'badge--win' };
    if (status === 'loss') return { text: 'LOSS', cls: 'badge--loss' };
    return { text: 'PUSH', cls: 'badge--push' };
  }
</script>

<svelte:head>
  <title>Backtesting — NioSports Pro</title>
</svelte:head>

<div class="page">

  <div class="page__header">
    <div class="page__title-row">
      <h1 class="page__title">📊 Backtesting</h1>
      <button class="btn btn--add" on:click={() => showForm = !showForm}>
        {showForm ? '✕ Cancelar' : '+ Nuevo pick'}
      </button>
    </div>
    <p class="page__subtitle">Calibración y validación del modelo predictivo</p>
  </div>

  {#if loading}
    <div class="skeleton-list">
      <Skeleton variant="pick" />
      <Skeleton variant="pick" />
      <Skeleton variant="pick" />
    </div>

  {:else}

    {#if showForm}
      <div class="form-card">
        <h2 class="form-card__title">Añadir pick de backtesting</h2>
        <div class="form-grid">
          <label class="field">
            <span class="field__label">Equipo local *</span>
            <input class="field__input" bind:value={form.local} placeholder="Ej: Los Angeles Lakers" />
          </label>
          <label class="field">
            <span class="field__label">Equipo visitante *</span>
            <input class="field__input" bind:value={form.away} placeholder="Ej: Boston Celtics" />
          </label>
          <label class="field">
            <span class="field__label">Periodo</span>
            <select class="field__input" bind:value={form.period}>
              <option>1Q</option><option>2Q</option><option>3Q</option>
              <option>4Q</option><option>1H</option><option>2H</option><option>FULL</option>
            </select>
          </label>
          <label class="field">
            <span class="field__label">Tipo</span>
            <select class="field__input" bind:value={form.betType}>
              <option value="OVER">OVER</option>
              <option value="UNDER">UNDER</option>
            </select>
          </label>
          <label class="field">
            <span class="field__label">Línea *</span>
            <input class="field__input" type="number" step="0.5" bind:value={form.line} placeholder="Ej: 58.5" />
          </label>
          <label class="field">
            <span class="field__label">Tendencia del modelo</span>
            <input class="field__input" bind:value={form.trend} placeholder="Ej: 60.2" />
          </label>
          <label class="field field--full">
            <span class="field__label">Nota (opcional)</span>
            <input class="field__input" bind:value={form.note} placeholder="Contexto, factores considerados..." />
          </label>
        </div>
        <div class="form-card__actions">
          <button class="btn btn--ghost" on:click={resetForm}>Cancelar</button>
          <button class="btn btn--primary" on:click={handleAddPick}
            disabled={formLoading || !form.local || !form.away || !form.line}>
            {formLoading ? 'Guardando...' : 'Guardar pick'}
          </button>
        </div>
      </div>
    {/if}

    {#if resolved.length > 0}
      <div class="stats-row">
        <div class="stat"><span class="stat__value">{resolved.length}</span><span class="stat__label">Resueltos</span></div>
        <div class="stat stat--win"><span class="stat__value">{wins}</span><span class="stat__label">Wins</span></div>
        <div class="stat stat--loss"><span class="stat__value">{losses}</span><span class="stat__label">Losses</span></div>
        <div class="stat stat--push"><span class="stat__value">{pushes}</span><span class="stat__label">Pushes</span></div>
        <div class="stat stat--rate"><span class="stat__value">{winRate}{winRate !== '—' ? '%' : ''}</span><span class="stat__label">Win rate</span></div>
      </div>
    {/if}

    <div class="two-col">

      <div class="card">
        <h2 class="card__title">⏳ Pendientes ({pending.length})</h2>
        {#if pending.length === 0}
          <div class="empty-inline"><span>📭</span><p>No hay picks pendientes de resolución.</p></div>
        {:else}
          <div class="pick-list">
            {#each pending as pick (pick.id)}
              <div class="pick-item">
                <div class="pick-item__header">
                  <span class="pick-item__matchup">{pick.local} vs {pick.away}</span>
                  <span class="pick-item__period">{pick.period}</span>
                </div>
                <div class="pick-item__meta">
                  <span class="pick-item__bet">{pick.betType} {pick.line}</span>
                  {#if pick.trend}<span class="pick-item__trend">Tendencia: {pick.trend}</span>{/if}
                </div>
                {#if pick.note}<p class="pick-item__note">{pick.note}</p>{/if}
                <div class="pick-item__resolve">
                  <input class="field__input field__input--sm" type="number" step="0.5"
                    placeholder="Resultado real"
                    bind:value={resultInputs[pick.id]}
                    on:keydown={e => e.key === 'Enter' && handleResolve(pick)} />
                  <button class="btn btn--resolve" on:click={() => handleResolve(pick)} disabled={!resultInputs[pick.id]}>✓ Resolver</button>
                  <button class="btn btn--del" on:click={() => handleDelete(pick.id)} aria-label="Eliminar pick">🗑</button>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <div class="card">
        <h2 class="card__title">✅ Resueltos ({resolved.length})</h2>
        {#if resolved.length === 0}
          <div class="empty-inline"><span>📊</span><p>Aún no hay picks resueltos.</p></div>
        {:else}
          <div class="pick-list pick-list--resolved">
            {#each resolved as pick (pick.id)}
              {@const badge = statusLabel(pick.status)}
              <div class="pick-item pick-item--resolved">
                <div class="pick-item__header">
                  <span class="pick-item__matchup">{pick.local} vs {pick.away}</span>
                  <span class="badge {badge.cls}">{badge.text}</span>
                </div>
                <div class="pick-item__meta">
                  <span class="pick-item__bet">{pick.betType} {pick.line}</span>
                  {#if pick.actualResult !== undefined}
                    <span class="pick-item__real">Real: <strong>{pick.actualResult}</strong></span>
                  {/if}
                  <span class="pick-item__period">{pick.period}</span>
                </div>
                {#if pick.resolvedAt}
                  <p class="pick-item__date">
                    {new Date(pick.resolvedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                  </p>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>

    </div>
  {/if}
</div>

<style>
  .page { max-width: 1000px; margin: 0 auto; padding: 32px 20px 80px; }
  .page__header    { margin-bottom: 24px; }
  .page__title-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  .page__title { font-family: 'Orbitron', sans-serif; font-size: clamp(1.3rem, 3vw, 1.8rem); font-weight: 900; }
  .page__subtitle { color: var(--color-text-muted); font-size: 0.9rem; margin-top: 4px; }

  .skeleton-list { display: flex; flex-direction: column; gap: 14px; }

  .btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px; border-radius: 10px; border: none; font-size: 0.85rem; font-weight: 700; cursor: pointer; transition: opacity .15s, transform .1s; }
  .btn:active:not(:disabled) { transform: scale(0.97); }
  .btn:disabled { opacity: .4; cursor: not-allowed; }
  .btn--add     { background: #fbbf24; color: #0a0f1c; }
  .btn--primary { background: #2563eb; color: #fff; }
  .btn--ghost   { background: transparent; border: 1px solid var(--color-border); color: var(--color-text-muted); }
  .btn--resolve { background: #059669; color: #fff; white-space: nowrap; padding: 8px 14px; }
  .btn--del     { background: rgba(239,68,68,.15); color: #f87171; padding: 8px 10px; }

  .form-card { background: var(--color-bg-card); border: 1px solid rgba(251,191,36,.25); border-radius: 16px; padding: 22px 20px; margin-bottom: 22px; }
  .form-card__title { font-weight: 800; margin-bottom: 18px; }
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
  @media (max-width: 540px) { .form-grid { grid-template-columns: 1fr; } }
  .field--full { grid-column: 1 / -1; }
  .form-card__actions { display: flex; gap: 10px; justify-content: flex-end; }

  .stats-row { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 22px; }
  .stat { display: flex; flex-direction: column; align-items: center; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 10px; padding: 10px 18px; min-width: 70px; }
  .stat__value { font-size: 1.4rem; font-weight: 800; }
  .stat__label { font-size: 0.68rem; text-transform: uppercase; letter-spacing: .05em; color: var(--color-text-muted); }
  .stat--win  .stat__value { color: #34d399; }
  .stat--loss .stat__value { color: #f87171; }
  .stat--push .stat__value { color: #94a3b8; }
  .stat--rate .stat__value { color: #fbbf24; }

  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  @media (max-width: 700px) { .two-col { grid-template-columns: 1fr; } }

  .card { background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 16px; padding: 20px; }
  .card__title { font-size: .95rem; font-weight: 800; margin-bottom: 16px; }

  .pick-list           { display: flex; flex-direction: column; gap: 12px; max-height: 520px; overflow-y: auto; }
  .pick-list--resolved { gap: 8px; }

  .pick-item { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 8px; }
  .pick-item--resolved { padding: 10px 14px; }

  .pick-item__header  { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .pick-item__matchup { font-weight: 700; font-size: .88rem; flex: 1; }
  .pick-item__period  { font-size: .72rem; background: rgba(255,255,255,.07); border-radius: 6px; padding: 2px 8px; color: var(--color-text-muted); white-space: nowrap; }
  .pick-item__meta    { display: flex; gap: 10px; flex-wrap: wrap; font-size: .78rem; color: var(--color-text-muted); }
  .pick-item__bet     { font-weight: 700; color: #fbbf24; }
  .pick-item__real    { color: var(--color-text); }
  .pick-item__trend   { color: #7dd3fc; }
  .pick-item__note    { font-size: .75rem; color: var(--color-text-muted); font-style: italic; }
  .pick-item__date    { font-size: .7rem; color: var(--color-text-muted); }
  .pick-item__resolve { display: flex; gap: 8px; align-items: center; margin-top: 2px; }

  .field { display: flex; flex-direction: column; gap: 5px; }
  .field__label { font-size: .78rem; color: var(--color-text-muted); font-weight: 600; }
  .field__input { background: rgba(255,255,255,.05); border: 1px solid var(--color-border); border-radius: 10px; padding: 9px 13px; color: var(--color-text); font-size: .9rem; width: 100%; transition: border-color .15s; }
  .field__input:focus { outline: none; border-color: #fbbf24; }
  .field__input--sm   { padding: 8px 12px; font-size: .85rem; min-width: 0; flex: 1; }
  select.field__input { cursor: pointer; }

  .badge { font-size: .7rem; font-weight: 800; letter-spacing: .05em; padding: 3px 9px; border-radius: 6px; flex-shrink: 0; }
  .badge--win  { background: rgba(52,211,153,.15); color: #34d399; }
  .badge--loss { background: rgba(248,113,113,.15); color: #f87171; }
  .badge--push { background: rgba(148,163,184,.15); color: #94a3b8; }

  .empty-inline { text-align: center; padding: 28px 16px; color: var(--color-text-muted); font-size: .85rem; display: flex; flex-direction: column; align-items: center; gap: 8px; }
  .empty-inline span { font-size: 2rem; }
</style>