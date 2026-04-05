<script>
  import { onMount } from 'svelte';
  import { userId } from '$lib/stores/auth';
  import { picksStore, picksBacktesting } from '$lib/stores/data';
  import { toasts } from '$lib/stores/ui';
  import { FlaskConical, Plus, X, Check, Trash2, Clock, CheckCircle, Target } from 'lucide-svelte';

  let loading = true;
  let showForm = false;
  let formLoading = false;
  let form = { local: '', away: '', period: 'FULL', betType: 'OVER', line: '', trend: '', note: '' };
  let resultInputs = {};

  onMount(() => { setTimeout(() => loading = false, 300); });

  $: allPicks = $picksBacktesting || [];
  $: pending = allPicks.filter(p => !p.status || p.status === 'pending');
  $: resolved = allPicks
    .filter(p => p.status && p.status !== 'pending')
    .sort((a, b) => (b.resolved_at || b.created_at || b.createdAt || '').localeCompare(a.resolved_at || a.created_at || a.createdAt || ''));

  $: wins = resolved.filter(p => p.status === 'win').length;
  $: losses = resolved.filter(p => p.status === 'loss').length;
  $: pushes = resolved.filter(p => p.status === 'push').length;
  $: winRate = (wins + losses) > 0 ? ((wins / (wins + losses)) * 100).toFixed(1) : '—';

  function resetForm() {
    form = { local: '', away: '', period: 'FULL', betType: 'OVER', line: '', trend: '', note: '' };
    showForm = false;
  }

  async function handleAddPick() {
    if (!form.local.trim() || !form.away.trim() || !form.line) {
      toasts.error('Completa equipos y línea.');
      return;
    }
    const line = parseFloat(form.line);
    if (isNaN(line)) { toasts.error('Línea debe ser un número.'); return; }
    formLoading = true;
    try {
      await picksStore.save({
        user_id: $userId,
        home_team: form.local.trim(),
        away_team: form.away.trim(),
        period: form.period,
        direction: form.betType,
        line,
        bet_line: line,
        projection: form.trend ? parseFloat(form.trend) : null,
        note: form.note.trim() || null,
        status: 'pending',
        source: 'backtesting',
        created_at: new Date().toISOString(),
      });
      toasts.success('Pick de backtesting añadido.');
      resetForm();
    } catch { toasts.error('No se pudo guardar.'); }
    finally { formLoading = false; }
  }

  async function handleResolve(pick) {
    const raw = resultInputs[pick.id];
    const actual = parseFloat(raw);
    if (isNaN(actual)) { toasts.error('Ingresa el resultado real.'); return; }
    const line = parseFloat(pick.line || pick.bet_line);
    const dir = pick.direction || pick.betType || 'OVER';
    let status = 'push';
    if (actual !== line) {
      status = dir === 'OVER' ? (actual > line ? 'win' : 'loss') : (actual < line ? 'win' : 'loss');
    }
    try {
      await picksStore.update(pick.id, {
        status,
        result: status,
        actual_total: actual,
        resolved_at: new Date().toISOString(),
      });
      const label = status === 'win' ? 'WIN' : status === 'loss' ? 'LOSS' : 'PUSH';
      toasts.success(`${label} — ${pick.home_team || pick.local} vs ${pick.away_team || pick.away}`);
      resultInputs = { ...resultInputs, [pick.id]: '' };
    } catch { toasts.error('No se pudo resolver.'); }
  }

  async function handleDelete(pickId) {
    try {
      await picksStore.remove(pickId);
      toasts.success('Pick eliminado.');
    } catch { toasts.error('No se pudo eliminar.'); }
  }
</script>

<svelte:head><title>Backtesting — NioSports Pro</title></svelte:head>

<div class="page">
  <header class="page__header">
    <div class="page__top">
      <div>
        <span class="page__label">Validación del modelo</span>
        <h1 class="page__title">Backtesting</h1>
        <p class="page__subtitle">Calibración y validación del motor predictivo</p>
      </div>
      <button class="btn-add" on:click={() => showForm = !showForm}>
        {#if showForm}<X size={16} /> Cancelar{:else}<Plus size={16} /> Nuevo pick{/if}
      </button>
    </div>
  </header>

  {#if loading}
    <div class="loading"><div class="spinner"></div><p>Cargando...</p></div>
  {:else}

    <!-- Add Form -->
    {#if showForm}
      <div class="form-card">
        <h2 class="form-title">Añadir pick de backtesting</h2>
        <div class="form-grid">
          <label class="field">
            <span class="field__label">Equipo local *</span>
            <input class="field__input" bind:value={form.local} placeholder="Los Angeles Lakers" />
          </label>
          <label class="field">
            <span class="field__label">Equipo visitante *</span>
            <input class="field__input" bind:value={form.away} placeholder="Boston Celtics" />
          </label>
          <label class="field">
            <span class="field__label">Período</span>
            <select class="field__input" bind:value={form.period}>
              <option value="Q1">Q1</option><option value="HALF">HALF</option><option value="FULL">FULL</option>
            </select>
          </label>
          <label class="field">
            <span class="field__label">Dirección</span>
            <select class="field__input" bind:value={form.betType}>
              <option value="OVER">OVER</option><option value="UNDER">UNDER</option>
            </select>
          </label>
          <label class="field">
            <span class="field__label">Línea *</span>
            <input class="field__input" type="number" step="0.5" bind:value={form.line} placeholder="228.5" />
          </label>
          <label class="field">
            <span class="field__label">Proyección del modelo</span>
            <input class="field__input" type="number" step="0.1" bind:value={form.trend} placeholder="232.1" />
          </label>
          <label class="field field--full">
            <span class="field__label">Nota (opcional)</span>
            <input class="field__input" bind:value={form.note} placeholder="Contexto, factores..." />
          </label>
        </div>
        <div class="form-actions">
          <button class="fbtn fbtn--ghost" on:click={resetForm}>Cancelar</button>
          <button class="fbtn fbtn--primary" on:click={handleAddPick}
            disabled={formLoading || !form.local || !form.away || !form.line}>
            {formLoading ? 'Guardando...' : 'Guardar pick'}
          </button>
        </div>
      </div>
    {/if}

    <!-- Stats -->
    {#if resolved.length > 0}
      <div class="stats-row">
        <div class="st"><span class="st__val">{resolved.length}</span><span class="st__label">Resueltos</span></div>
        <div class="st"><span class="st__val green">{wins}</span><span class="st__label">Wins</span></div>
        <div class="st"><span class="st__val red">{losses}</span><span class="st__label">Losses</span></div>
        <div class="st"><span class="st__val muted">{pushes}</span><span class="st__label">Pushes</span></div>
        <div class="st"><span class="st__val" class:green={parseFloat(winRate) >= 52.4}>{winRate}{winRate !== '—' ? '%' : ''}</span><span class="st__label">Win Rate</span></div>
      </div>
    {/if}

    <!-- Two Columns -->
    <div class="two-col">
      <!-- Pending -->
      <div class="card">
        <h2 class="card__title"><Clock size={16} /> Pendientes ({pending.length})</h2>
        {#if pending.length === 0}
          <div class="empty-inline">
            <FlaskConical size={32} strokeWidth={1} />
            <p>No hay picks pendientes</p>
          </div>
        {:else}
          <div class="pick-list">
            {#each pending as pick (pick.id)}
              {@const home = pick.home_team || pick.local || ''}
              {@const away = pick.away_team || pick.away || ''}
              {@const dir = pick.direction || pick.betType || 'OVER'}
              {@const line = pick.line || pick.bet_line || ''}
              <div class="pitem">
                <div class="pitem__top">
                  <span class="pitem__teams">{home} vs {away}</span>
                  <span class="pitem__period">{pick.period}</span>
                </div>
                <div class="pitem__meta">
                  <span class="pitem__dir" class:over={dir === 'OVER'} class:under={dir === 'UNDER'}>{dir} {line}</span>
                  {#if pick.projection}<span class="pitem__trend">Proy: {pick.projection}</span>{/if}
                </div>
                {#if pick.note}<p class="pitem__note">{pick.note}</p>{/if}
                <div class="pitem__resolve">
                  <input class="resolve-input" type="number" step="0.5" placeholder="Total real"
                    bind:value={resultInputs[pick.id]}
                    on:keydown={e => e.key === 'Enter' && handleResolve(pick)} />
                  <button class="rbtn rbtn--resolve" on:click={() => handleResolve(pick)} disabled={!resultInputs[pick.id]}>
                    <Check size={14} />
                  </button>
                  <button class="rbtn rbtn--del" on:click={() => handleDelete(pick.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Resolved -->
      <div class="card">
        <h2 class="card__title"><CheckCircle size={16} /> Resueltos ({resolved.length})</h2>
        {#if resolved.length === 0}
          <div class="empty-inline">
            <Target size={32} strokeWidth={1} />
            <p>Sin picks resueltos aún</p>
          </div>
        {:else}
          <div class="pick-list">
            {#each resolved as pick (pick.id)}
              {@const home = pick.home_team || pick.local || ''}
              {@const away = pick.away_team || pick.away || ''}
              {@const dir = pick.direction || pick.betType || 'OVER'}
              {@const line = pick.line || pick.bet_line || ''}
              {@const status = pick.status}
              <div class="pitem pitem--resolved" class:pitem--win={status === 'win'} class:pitem--loss={status === 'loss'}>
                <div class="pitem__top">
                  <span class="pitem__teams">{home} vs {away}</span>
                  <span class="badge" class:badge-win={status === 'win'} class:badge-loss={status === 'loss'} class:badge-push={status === 'push'}>
                    {status === 'win' ? 'WIN' : status === 'loss' ? 'LOSS' : 'PUSH'}
                  </span>
                </div>
                <div class="pitem__meta">
                  <span class="pitem__dir" class:over={dir === 'OVER'} class:under={dir === 'UNDER'}>{dir} {line}</span>
                  {#if pick.actual_total != null || pick.actualResult != null}
                    <span>Real: <strong>{pick.actual_total ?? pick.actualResult}</strong></span>
                  {/if}
                  <span class="pitem__period">{pick.period}</span>
                </div>
                <span class="pitem__date">{(pick.resolved_at || pick.created_at || pick.createdAt || '').slice(5, 10)}</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .page { max-width: 1000px; margin: 0 auto; padding: 60px 24px 120px; }
  @media (max-width: 768px) { .page { padding: 32px 16px 100px; } }

  .page__header { margin-bottom: 28px; }
  .page__top { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; }
  .page__label { font-size: 0.8rem; font-weight: 700; color: #6366F1; text-transform: uppercase; letter-spacing: 0.15em; }
  .page__title { font-family: 'Inter', sans-serif; font-size: clamp(1.8rem, 4vw, 2.5rem); font-weight: 900; letter-spacing: -0.03em; margin: 8px 0 6px; }
  .page__subtitle { font-size: 0.9rem; color: var(--color-text-muted); }

  .btn-add { display: flex; align-items: center; gap: 6px; padding: 10px 20px; border-radius: 10px; border: 1px solid rgba(99,102,241,0.25); background: rgba(99,102,241,0.1); color: #6366F1; font-size: 0.85rem; font-weight: 700; cursor: pointer; transition: all 0.15s; }
  .btn-add:hover { background: rgba(99,102,241,0.2); }

  /* Form */
  .form-card { background: var(--color-bg-card); border: 1px solid rgba(99,102,241,0.2); border-radius: 16px; padding: 22px 20px; margin-bottom: 24px; }
  .form-title { font-family: 'Inter', sans-serif; font-size: 1rem; font-weight: 800; margin-bottom: 18px; }
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
  @media (max-width: 540px) { .form-grid { grid-template-columns: 1fr; } }
  .field--full { grid-column: 1 / -1; }
  .form-actions { display: flex; gap: 10px; justify-content: flex-end; }

  .field { display: flex; flex-direction: column; gap: 5px; }
  .field__label { font-size: 0.78rem; color: var(--color-text-muted); font-weight: 600; }
  .field__input { background: var(--color-bg-elevated); border: 1px solid var(--color-border); border-radius: 10px; padding: 9px 13px; color: var(--color-text-primary); font-size: 0.9rem; }
  .field__input:focus { outline: none; border-color: #6366F1; }
  select.field__input { cursor: pointer; }

  .fbtn { padding: 10px 20px; border-radius: 10px; border: none; font-size: 0.85rem; font-weight: 700; cursor: pointer; }
  .fbtn:disabled { opacity: 0.4; cursor: not-allowed; }
  .fbtn--ghost { background: transparent; border: 1px solid var(--color-border); color: var(--color-text-muted); }
  .fbtn--primary { background: #6366F1; color: #fff; }

  /* Stats */
  .stats-row { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; }
  .st { display: flex; flex-direction: column; align-items: center; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 10px; padding: 10px 16px; min-width: 65px; }
  .st__val { font-family: 'DM Mono', monospace; font-size: 1.3rem; font-weight: 800; }
  .st__label { font-size: 0.68rem; color: var(--color-text-muted); text-transform: uppercase; }

  /* Layout */
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media (max-width: 700px) { .two-col { grid-template-columns: 1fr; } }

  .card { background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 16px; padding: 20px; }
  .card__title { font-family: 'Inter', sans-serif; font-size: 0.95rem; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }

  /* Pick Items */
  .pick-list { display: flex; flex-direction: column; gap: 10px; max-height: 520px; overflow-y: auto; }
  .pitem { background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 8px; }
  .pitem--win { border-left: 3px solid #10B981; }
  .pitem--loss { border-left: 3px solid #EF4444; }
  .pitem__top { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .pitem__teams { font-weight: 700; font-size: 0.88rem; }
  .pitem__period { font-size: 0.7rem; background: var(--color-bg-elevated); border-radius: 6px; padding: 2px 8px; color: var(--color-text-muted); }
  .pitem__meta { display: flex; gap: 10px; flex-wrap: wrap; font-size: 0.78rem; color: var(--color-text-muted); }
  .pitem__dir { font-weight: 800; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; }
  .over { background: rgba(16,185,129,0.12); color: #10B981; }
  .under { background: rgba(239,68,68,0.12); color: #EF4444; }
  .pitem__trend { color: #818CF8; }
  .pitem__note { font-size: 0.75rem; color: var(--color-text-muted); font-style: italic; margin: 0; }
  .pitem__date { font-size: 0.7rem; color: var(--color-text-muted); }
  .pitem__resolve { display: flex; gap: 8px; align-items: center; }

  .resolve-input { flex: 1; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--color-border); background: var(--color-bg-elevated); color: #fff; font-family: 'DM Mono', monospace; font-size: 0.85rem; }
  .resolve-input:focus { outline: none; border-color: #6366F1; }

  .rbtn { padding: 8px 12px; border-radius: 8px; border: none; cursor: pointer; display: flex; align-items: center; }
  .rbtn--resolve { background: rgba(16,185,129,0.15); color: #10B981; }
  .rbtn--resolve:hover { background: rgba(16,185,129,0.25); }
  .rbtn--resolve:disabled { opacity: 0.3; cursor: not-allowed; }
  .rbtn--del { background: rgba(239,68,68,0.1); color: #EF4444; }
  .rbtn--del:hover { background: rgba(239,68,68,0.2); }

  .badge { font-size: 0.7rem; font-weight: 800; padding: 3px 10px; border-radius: 20px; text-transform: uppercase; }
  .badge-win { background: rgba(16,185,129,0.15); color: #10B981; }
  .badge-loss { background: rgba(239,68,68,0.15); color: #EF4444; }
  .badge-push { background: rgba(148,163,184,0.15); color: #94A3B8; }

  .green { color: #10B981; }
  .red { color: #EF4444; }
  .muted { color: var(--color-text-muted); }

  .empty-inline { text-align: center; padding: 28px; color: var(--color-text-muted); display: flex; flex-direction: column; align-items: center; gap: 8px; font-size: 0.85rem; }

  .loading { display: flex; flex-direction: column; align-items: center; padding: 60px; gap: 16px; color: var(--color-text-muted); }
  .spinner { width: 32px; height: 32px; border: 3px solid rgba(99,102,241,0.2); border-top-color: #6366F1; border-radius: 50%; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>