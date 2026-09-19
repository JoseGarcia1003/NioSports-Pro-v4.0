<script>
  import { subscription } from '$lib/stores/subscription';
  import { getMaxPicks } from '$lib/config/plans.js';
  import { onMount, onDestroy } from 'svelte';
  import { userId } from '$lib/stores/auth';
  import { picksStore, allPicks, teamStats, usingDemoStats } from '$lib/stores/data';
  import { toasts } from '$lib/stores/ui';
  import { Cpu, ClipboardList, Trash2, CheckCircle, XCircle, MinusCircle, RefreshCw, Save, Zap, Lock } from 'lucide-svelte';
  import ConfidenceGauge from '$lib/components/charts/ConfidenceGauge.svelte';
  import { getGamesToday } from '$lib/services/games-service.js';
  import { generateAIPicks, getPicksSummary } from '$lib/services/ai-picks-generator.js';
  import { MODEL_VERSION } from '$lib/engine/constants.js';
  import { pickKey, savedAnalysis, resultUpdate } from './pick-actions.js';

  let mounted = false;
  let owner;
  let sessionVersion = 0;
  let generation = 0;
  let controller;
  let activeTab = 'ai';
  let aiPicks = [];
  let aiLoading = true;
  let aiError = null;
  let availability = '';
  let isDemo = false;
  let gamesCount = 0;
  let savedPickKeys = new Set();
  let savingPickKeys = new Set();
  let savingAll = false;
  let resultSaving = false;
  let showResultModal = false;
  let selectedPick = null;
  let resultActualTotal = '';

  onMount(() => { mounted = true; });
  onDestroy(() => { mounted = false; generation++; sessionVersion++; controller?.abort(); });

  $: if (mounted && owner !== $userId) {
    owner = $userId;
    sessionVersion++;
    savedPickKeys = new Set();
    savingPickKeys = new Set();
    savingAll = false;
    resultSaving = false;
    showResultModal = false;
    selectedPick = null;
    loadAIPicks();
  }

  async function loadAIPicks() {
    controller?.abort();
    controller = new AbortController();
    const signal = controller.signal;
    const requestGeneration = ++generation;
    const uid = $userId;
    const current = () => mounted && !signal.aborted && generation === requestGeneration && uid === $userId;
    aiPicks = [];
    aiLoading = true;
    aiError = null;
    isDemo = false;
    gamesCount = 0;
    availability = '';
    if (!uid) {
      aiLoading = false;
      availability = 'Inicia sesión para consultar tus análisis NBA.';
      return;
    }
    try {
      if ($usingDemoStats) {
        availability = 'Las estadísticas disponibles son de demostración. Se necesitan estadísticas y líneas reales para generar análisis.';
        return;
      }
      let stats = $teamStats;
      if (!stats || Object.keys(stats).length === 0) {
        const response = await fetch('/data/nba-stats.json', { signal });
        if (!response.ok) throw new Error('No se pudieron cargar las estadísticas NBA.');
        const data = await response.json();
        stats = data.teams || data;
        if (!stats || typeof stats !== 'object' || Array.isArray(stats) || Object.keys(stats).length === 0) throw new Error('Las estadísticas NBA no están disponibles.');
        if (!current()) return;
        teamStats.set(stats);
      }
      const schedule = await getGamesToday({ teamStats: stats });
      if (!current()) return;
      if (!Array.isArray(schedule.games)) throw new Error('La agenda NBA no está disponible.');
      isDemo = schedule.isDemo;
      if (isDemo) {
        availability = schedule.reason === 'No games today' ? 'La fuente no devolvió partidos para hoy.' : 'No fue posible verificar la agenda NBA con la fuente de datos.';
        return;
      }
      gamesCount = schedule.games.length;
      const results = await generateAIPicks(schedule.games, stats, { maxPicks: 12, minEV: 1.5, minEdge: 1, signal });
      if (!current()) return;
      aiPicks = results;
      availability = gamesCount === 0 ? 'La fuente no devolvió partidos para hoy.' : 'No hay análisis publicables. Se necesitan partidos pendientes, estadísticas suficientes y líneas de mercado; además deben cumplirse los criterios del modelo.';
    } catch (err) {
      if (!current() || err?.name === 'AbortError') return;
      aiError = err?.name === 'TimeoutError' ? 'El análisis tardó demasiado. Inténtalo de nuevo.' : err?.message || 'No se pudieron cargar los análisis.';
    } finally {
      if (current()) aiLoading = false;
    }
  }

  // Filter by owner even if an older store request resolves after a session change.
  $: picks = ($allPicks || []).filter(p => $userId && p.user_id === $userId && ['totales', 'manual', 'model', 'ai'].includes(p.source));
  $: total = picks.length;
  $: wins = picks.filter(p => (p.status || p.result) === 'win').length;
  $: losses = picks.filter(p => (p.status || p.result) === 'loss').length;
  $: pending = picks.filter(p => (p.status || p.result || 'pending') === 'pending').length;
  $: winRate = (wins + losses) > 0 ? `${((wins / (wins + losses)) * 100).toFixed(1)}%` : '—';
  $: userPlan = ['active','trialing'].includes($subscription.status) ? $subscription.plan : 'free';
  $: maxPicks = getMaxPicks(userPlan, aiPicks.length);
  $: visibleAIPicks = aiPicks.slice(0, maxPicks);
  $: hiddenCount = Math.max(0, aiPicks.length - maxPicks);
  $: aiSummary = getPicksSummary(visibleAIPicks);

  async function saveOne(pick, uid, version) {
    const key = pickKey(pick);
    if (!uid || uid !== $userId || version !== sessionVersion || savedPickKeys.has(key) || savingPickKeys.has(key)) return false;
    savingPickKeys = new Set([...savingPickKeys, key]);
    try {
      await picksStore.save(savedAnalysis(pick, uid));
      if (!mounted || uid !== $userId || version !== sessionVersion) return false;
      savedPickKeys = new Set([...savedPickKeys, key]);
      return true;
    } finally {
      if (version === sessionVersion) { const next = new Set(savingPickKeys); next.delete(key); savingPickKeys = next; }
    }
  }

  async function handleSaveAIPick(pick) {
    if (!$userId) { toasts.error('Inicia sesión para guardar análisis.'); return; }
    const uid = $userId;
    const version = sessionVersion;
    try {
      if (await saveOne(pick, uid, version)) toasts.success('Análisis guardado en Mis Picks.');
    } catch {
      if (mounted && uid === $userId && version === sessionVersion) toasts.error('No se pudo guardar. Inténtalo de nuevo.');
    }
  }

  async function handleSaveAll() {
    if (!$userId || savingAll) return;
    const uid = $userId;
    const version = sessionVersion;
    const batch = [...visibleAIPicks];
    savingAll = true;
    let saved = 0;
    let failed = 0;
    try {
      for (const pick of batch) {
        if (!mounted || uid !== $userId || version !== sessionVersion) break;
        try { if (await saveOne(pick, uid, version)) saved++; } catch { failed++; }
      }
      if (mounted && uid === $userId && version === sessionVersion) {
        if (failed) toasts.error(`${saved} guardados; ${failed} no se pudieron guardar. Puedes reintentar.`);
        else if (saved) toasts.success(`${saved} análisis guardados.`);
      }
    } finally { if (version === sessionVersion) savingAll = false; }
  }

  async function handleDeletePick(pickId) {
    if (!picks.some(p => p.id === pickId)) return;
    const version = sessionVersion;
    try {
      await picksStore.remove(pickId);
      if (mounted && version === sessionVersion) toasts.success('Pick eliminado.');
    } catch { if (mounted && version === sessionVersion) toasts.error('No se pudo eliminar.'); }
  }

  function openResult(pick) {
    selectedPick = pick;
    resultActualTotal = '';
    showResultModal = true;
  }

  async function submitResult(result) {
    if (!selectedPick || resultSaving || !picks.some(p => p.id === selectedPick.id)) return;
    const version = sessionVersion;
    resultSaving = true;
    try {
      await picksStore.update(selectedPick.id, resultUpdate(selectedPick, result, resultActualTotal));
      if (!mounted || version !== sessionVersion) return;
      toasts.success('Resultado registrado en tu seguimiento personal.');
      showResultModal = false;
      selectedPick = null;
    } catch (err) { if (mounted && version === sessionVersion) toasts.error(err?.message || 'Error guardando resultado.'); }
    finally { if (version === sessionVersion) resultSaving = false; }
  }

  function confColor(c) {
    if (c === 'HIGH') return '#10B981';
    if (c === 'MEDIUM') return '#6366F1';
    return '#EF4444';
  }
</script>

<svelte:head><title>Pronósticos NBA — NioSports Pro</title></svelte:head>

<div class="page">
  <header class="page__header">
    <span class="page__label">Laboratorio NBA</span>
    <h1 class="page__title">Pronósticos NBA</h1>
    <p class="page__subtitle">Análisis experimental de totales NBA · Modelo v{MODEL_VERSION.version}</p>
    <p class="page__subtitle">Las probabilidades son estimaciones sin calibración demostrada. La vigencia de las estadísticas requiere verificación; revisa las fuentes antes de usar un análisis.</p>
  </header>

  <!-- Tabs -->
  <div class="tabs">
    <button class="tab" class:tab--active={activeTab === 'ai'} on:click={() => activeTab = 'ai'}>
      <Cpu size={16} />
      Análisis de hoy
      {#if visibleAIPicks.length > 0}<span class="tab-badge">{visibleAIPicks.length}</span>{/if}
    </button>
    <button class="tab" class:tab--active={activeTab === 'mis'} on:click={() => activeTab = 'mis'}>
      <ClipboardList size={16} />
      Mis Picks
      {#if pending > 0}<span class="tab-badge tab-badge--pending">{pending}</span>{/if}
    </button>
  </div>

  <!-- AI PICKS TAB -->
  {#if activeTab === 'ai'}
    {#if isDemo}
      <div class="demo-banner">
        <Zap size={16} />
        <p>La agenda recibida es de demostración. No se generan pronósticos a partir de partidos ficticios.</p>
      </div>
    {/if}

    {#if aiLoading}
      <div class="loading-state"><div class="spinner"></div><p>Analizando partidos del día...</p></div>
    {:else if aiError}
      <div class="error-state">
        <p>{aiError}</p>
        <button class="retry-btn" on:click={loadAIPicks}><RefreshCw size={14} /> Reintentar</button>
      </div>
    {:else if visibleAIPicks.length === 0}
      <div class="empty">
        <Cpu size={48} strokeWidth={1} />
        <p>{availability || 'No hay análisis disponibles para hoy.'}</p>
        {#if !$userId}<a href="/login?redirect=/picks">Iniciar sesión</a>{:else}<button class="retry-btn" on:click={loadAIPicks}><RefreshCw size={14} /> Actualizar datos</button>{/if}
        <span class="muted">El catálogo diario está en <a href="/predictions">Pronósticos</a>. Aquí puedes revisar los análisis experimentales de NBA.</span>
      </div>
    {:else}
      <!-- Summary -->
      <div class="ai-summary">
        <div class="sstat"><span class="sstat__val">{gamesCount}</span><span class="sstat__label">Partidos</span></div>
        <div class="sstat"><span class="sstat__val">{visibleAIPicks.length}</span><span class="sstat__label">Picks</span></div>
        <div class="sstat"><span class="sstat__val green">{aiSummary.avgEV === null ? '—' : `${aiSummary.avgEV > 0 ? '+' : ''}${aiSummary.avgEV}%`}</span><span class="sstat__label">EV · {aiSummary.priced} con cuota</span></div>
        <div class="sstat"><span class="sstat__val">{aiSummary.avgEdge}</span><span class="sstat__label">Edge Prom.</span></div>
      </div>

      {#if visibleAIPicks.length > 1}
        <button class="btn-save-all" disabled={savingAll} on:click={handleSaveAll}>
          <Save size={16} /> {savingAll ? 'Guardando…' : `Guardar análisis (${visibleAIPicks.length})`}
        </button>
      {/if}

      <!-- AI Pick Cards -->
      <div class="ai-list">
        {#each visibleAIPicks as pick (pick.gameId + pick.period)}
          <div class="aicard">
            <div class="aicard__top">
              <div class="aicard__teams">
                <span class="aicard__matchup">{pick.homeTeam} vs {pick.awayTeam}</span>
                <span class="aicard__time">{pick.gameTime || ''}</span>
              </div>
              <ConfidenceGauge value={pick.probabilityPercent} size={52} />
            </div>

            <div class="aicard__body">
              <div class="aicard__main">
                <span class="aicard__dir" class:over={pick.direction === 'OVER'} class:under={pick.direction === 'UNDER'}>
                  {pick.period} {pick.direction}
                </span>
                <span class="aicard__line">{pick.line}</span>
              </div>
              <div class="aicard__meta">
                <span>Proy: <strong>{pick.projection?.toFixed?.(1) || '—'}</strong></span>
                <span>Edge: <strong class:green={pick.edge > 0}>{pick.edge > 0 ? '+' : ''}{pick.edge?.toFixed?.(1) || 0}</strong></span>
                <span>EV: <strong class:green={pick.evPercent > 0}>{pick.evPercent === null ? 'Sin cuota' : `${pick.evPercent > 0 ? '+' : ''}${pick.evPercent.toFixed(1)}%`}</strong></span>
              </div>
              {#if pick.missingContext?.length}<p class="aicard__limitations">{pick.missingContext.join(' · ')}</p>{/if}
            </div>

            <button class="aicard__save" disabled={savedPickKeys.has(pickKey(pick)) || savingPickKeys.has(pickKey(pick)) || savingAll} on:click={() => handleSaveAIPick(pick)}>
              <Save size={14} /> {savedPickKeys.has(pickKey(pick)) ? 'Guardado en Mis Picks' : savingPickKeys.has(pickKey(pick)) ? 'Guardando…' : 'Guardar análisis'}
            </button>
          </div>
        {/each}
      </div>

      <!-- Upgrade Hint -->
      {#if hiddenCount > 0}
        <div class="upgrade-hint">
          <div class="upgrade-hint__left">
            <Lock size={18} />
            <div>
              <strong>{hiddenCount} picks más</strong> disponibles con el plan {userPlan === 'free' ? 'Pro' : 'Elite'}
            </div>
          </div>
          <a href="/pricing" class="upgrade-hint__btn">Ver planes →</a>
        </div>
      {/if}
    {/if}

  <!-- MIS PICKS TAB -->
  {:else}
    {#if total > 0}
      <div class="stats-row">
        <div class="st"><span class="st__val">{total}</span><span class="st__label">Total</span></div>
        <div class="st"><span class="st__val green">{wins}</span><span class="st__label">Ganados</span></div>
        <div class="st"><span class="st__val red">{losses}</span><span class="st__label">Perdidos</span></div>
        <div class="st"><span class="st__val indigo">{pending}</span><span class="st__label">Pendientes</span></div>
        <div class="st"><span class="st__val">{winRate}</span><span class="st__label">Aciertos registrados</span></div>
      </div>
    {/if}

    {#if picks.length === 0}
      <div class="empty">
        <ClipboardList size={48} strokeWidth={1} />
        <p>No tienes picks guardados</p>
        <span class="muted">Guarda un análisis desde esta pantalla o desde <a href="/totales">Totales</a>.</span>
      </div>
    {:else}
      <p class="muted">Seguimiento personal. Estos resultados no modifican el saldo del bankroll ni constituyen un historial predictivo auditado.</p>
      <div class="picks-list">
        {#each [...picks].sort((a, b) => (b.created_at || b.createdAt || '').localeCompare(a.created_at || a.createdAt || '')) as pick (pick.id)}
          {@const status = pick.status || pick.result || 'pending'}
          {@const dir = pick.direction || pick.betType || 'OVER'}
          {@const line = pick.line || pick.bet_line || '—'}
          {@const home = pick.home_team || pick.localTeam || ''}
          {@const away = pick.away_team || pick.awayTeam || ''}
          <div class="pickcard" class:pickcard--win={status === 'win'} class:pickcard--loss={status === 'loss'}>
            <div class="pickcard__top">
              <span class="pickcard__teams">{home} vs {away}</span>
              <span class="pickcard__date">{(pick.created_at || pick.createdAt || '').slice(5, 10)}</span>
            </div>

            <div class="pickcard__body">
              <div class="pickcard__main">
                <span class="pickcard__dir" class:over={dir === 'OVER'} class:under={dir === 'UNDER'}>{pick.period} {dir}</span>
                <span class="pickcard__line">{line}</span>
              </div>
              <div class="pickcard__details">
                <span>Proy: {pick.projection?.toFixed?.(1) || '—'}</span>
                <span>Conf: <strong style="color:{confColor(pick.confidence)}">{pick.confidence || 'MED'}</strong></span>
                {#if pick.clv_points != null}
                  <span>CLV: <strong class:green={pick.clv_points > 0} class:red={pick.clv_points < 0}>{pick.clv_points > 0 ? '+' : ''}{pick.clv_points.toFixed(1)}</strong></span>
                {/if}
              </div>
            </div>

            <div class="pickcard__actions">
              {#if status === 'pending'}
                <button class="abtn abtn--win" on:click={() => openResult(pick)} title="Registrar resultado">
                  <CheckCircle size={16} />
                </button>
                <button class="abtn abtn--del" on:click={() => handleDeletePick(pick.id)} title="Eliminar">
                  <Trash2 size={16} />
                </button>
              {:else}
                <span class="status-badge" class:badge-win={status === 'win'} class:badge-loss={status === 'loss'} class:badge-push={status === 'push'}>
                  {status === 'win' ? 'WIN' : status === 'loss' ? 'LOSS' : 'PUSH'}
                </span>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<!-- Result Modal -->
{#if showResultModal && selectedPick}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="overlay" on:click|self={() => showResultModal = false}>
    <div class="modal" role="dialog" aria-modal="true" tabindex="-1">
      <h3 class="modal__title">Registrar Resultado</h3>
      <p class="modal__sub">{selectedPick.home_team || selectedPick.localTeam} vs {selectedPick.away_team || selectedPick.awayTeam} — {selectedPick.period} {selectedPick.direction || selectedPick.betType}</p>

      <div class="modal__field">
        <label for="actual-total">Total real de {selectedPick.period} (opcional)</label>
        <input id="actual-total" type="number" min="0" step="1" bind:value={resultActualTotal} placeholder="ej: 228" class="modal__input" />
      </div>

      <div class="modal__buttons">
        <button class="rbtn rbtn--win" disabled={resultSaving} on:click={() => submitResult('win')}>
          <CheckCircle size={16} /> Win
        </button>
        <button class="rbtn rbtn--loss" disabled={resultSaving} on:click={() => submitResult('loss')}>
          <XCircle size={16} /> Loss
        </button>
        <button class="rbtn rbtn--push" disabled={resultSaving} on:click={() => submitResult('push')}>
          <MinusCircle size={16} /> Push
        </button>
      </div>

      <button class="modal__cancel" disabled={resultSaving} on:click={() => showResultModal = false}>Cancelar</button>
    </div>
  </div>
{/if}

<style>
  .page { max-width: 800px; margin: 0 auto; padding: 60px 24px 120px; }
  @media (max-width: 768px) { .page { padding: 32px 16px 100px; } }

  .page__header { margin-bottom: 28px; }
  .page__label { font-size: 0.8rem; font-weight: 700; color: #6366F1; text-transform: uppercase; letter-spacing: 0.15em; }
  .page__title { font-family: 'Inter', sans-serif; font-size: clamp(1.8rem, 4vw, 2.5rem); font-weight: 900; letter-spacing: -0.03em; margin: 8px 0 6px; }
  .page__subtitle { font-size: 0.9rem; color: var(--color-text-muted); }

  .tabs { display: flex; gap: 8px; margin-bottom: 24px; border-bottom: 1px solid var(--color-border); padding-bottom: 12px; }
  .tab { display: flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 10px; border: 1px solid transparent; background: transparent; color: var(--color-text-muted); font-size: 0.88rem; font-weight: 600; cursor: pointer; transition: all 0.15s; }
  .tab:hover { background: var(--color-bg-card); color: var(--color-text-primary); }
  .tab--active { background: rgba(99,102,241,0.1); border-color: rgba(99,102,241,0.25); color: #6366F1; }
  .tab-badge { font-size: 0.68rem; font-weight: 700; background: rgba(99,102,241,0.2); color: #818CF8; padding: 2px 8px; border-radius: 10px; }
  .tab-badge--pending { background: rgba(99,102,241,0.15); color: #818CF8; }

  .demo-banner { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.15); border-radius: 10px; margin-bottom: 20px; font-size: 0.85rem; color: #F59E0B; }
  .demo-banner p { margin: 0; }

  .ai-summary { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
  .sstat { display: flex; flex-direction: column; align-items: center; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 10px; padding: 12px 20px; min-width: 80px; }
  .sstat__val { font-family: 'DM Mono', monospace; font-size: 1.3rem; font-weight: 800; }
  .sstat__label { font-size: 0.65rem; color: var(--color-text-muted); text-transform: uppercase; }

  .btn-save-all { width: 100%; padding: 14px; background: rgba(99,102,241,0.08); border: 1px solid rgba(99,102,241,0.2); border-radius: 12px; color: #6366F1; font-size: 0.9rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 16px; transition: all 0.15s; }
  .btn-save-all:hover { background: rgba(99,102,241,0.15); }

  .ai-list { display: flex; flex-direction: column; gap: 12px; }
  .aicard { background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 14px; padding: 18px; transition: border-color 0.2s; }
  .aicard:hover { border-color: rgba(99,102,241,0.25); }
  .aicard__top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
  .aicard__matchup { font-weight: 700; font-size: 0.95rem; }
  .aicard__time { font-size: 0.75rem; color: var(--color-text-muted); display: block; margin-top: 2px; }
  .aicard__body { margin-bottom: 12px; }
  .aicard__main { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .aicard__dir { font-size: 0.75rem; font-weight: 800; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; }
  .over { background: rgba(16,185,129,0.12); color: #10B981; }
  .under { background: rgba(239,68,68,0.12); color: #EF4444; }
  .aicard__line { font-family: 'DM Mono', monospace; font-size: 1.2rem; font-weight: 800; }
  .aicard__meta { display: flex; flex-wrap: wrap; gap: 10px 16px; font-size: 0.82rem; color: var(--color-text-muted); }
  .aicard__limitations { color: var(--color-text-muted); font-size: 0.78rem; line-height: 1.6; margin: 10px 0 0; }
  button:disabled { opacity: .55; cursor: default; }
  .aicard__meta strong { color: var(--color-text-primary); }
  .aicard__save { width: 100%; padding: 10px; border-radius: 10px; border: 1px solid rgba(99,102,241,0.2); background: rgba(99,102,241,0.08); color: #6366F1; font-size: 0.85rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.15s; }
  .aicard__save:hover { background: rgba(99,102,241,0.15); }

  /* ── Upgrade Hint ── */
  .upgrade-hint {
    display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;
    margin-top: 16px; padding: 16px 20px;
    background: linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.06));
    border: 1px solid rgba(99,102,241,0.2); border-radius: 14px;
  }
  .upgrade-hint__left { display: flex; align-items: center; gap: 12px; color: var(--color-text-secondary); font-size: 0.9rem; }
  .upgrade-hint__left strong { color: #a5b4fc; }
  .upgrade-hint__btn {
    padding: 8px 20px; background: #6366f1; color: white; border-radius: 8px;
    font-weight: 700; font-size: 0.85rem; text-decoration: none; transition: background 0.2s;
  }
  .upgrade-hint__btn:hover { background: #4f46e5; }

  .stats-row { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; }
  .st { display: flex; flex-direction: column; align-items: center; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 10px; padding: 10px 16px; min-width: 65px; }
  .st__val { font-family: 'DM Mono', monospace; font-size: 1.3rem; font-weight: 800; }
  .st__label { font-size: 0.68rem; color: var(--color-text-muted); text-transform: uppercase; }

  .picks-list { display: flex; flex-direction: column; gap: 10px; }
  .pickcard { background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 14px; padding: 16px; display: flex; flex-direction: column; gap: 10px; transition: border-color 0.2s; }
  .pickcard--win { border-left: 3px solid #10B981; }
  .pickcard--loss { border-left: 3px solid #EF4444; }
  .pickcard__top { display: flex; justify-content: space-between; }
  .pickcard__teams { font-weight: 700; font-size: 0.9rem; }
  .pickcard__date { font-size: 0.75rem; color: var(--color-text-muted); }
  .pickcard__body { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
  .pickcard__main { display: flex; align-items: center; gap: 8px; }
  .pickcard__dir { font-size: 0.72rem; font-weight: 800; padding: 3px 8px; border-radius: 6px; text-transform: uppercase; }
  .pickcard__line { font-family: 'DM Mono', monospace; font-size: 1.1rem; font-weight: 800; }
  .pickcard__details { display: flex; gap: 12px; font-size: 0.78rem; color: var(--color-text-muted); }
  .pickcard__actions { display: flex; gap: 8px; align-items: center; }

  .abtn { padding: 8px 12px; border-radius: 8px; border: none; cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 0.8rem; font-weight: 600; transition: all 0.15s; }
  .abtn--win { background: rgba(16,185,129,0.1); color: #10B981; }
  .abtn--win:hover { background: rgba(16,185,129,0.2); }
  .abtn--del { background: rgba(239,68,68,0.1); color: #EF4444; }
  .abtn--del:hover { background: rgba(239,68,68,0.2); }

  .status-badge { font-size: 0.72rem; font-weight: 800; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; }
  .badge-win { background: rgba(16,185,129,0.15); color: #10B981; }
  .badge-loss { background: rgba(239,68,68,0.15); color: #EF4444; }
  .badge-push { background: rgba(148,163,184,0.15); color: #94A3B8; }

  .green { color: #10B981; }
  .red { color: #EF4444; }
  .indigo { color: #6366F1; }
  .muted { font-size: 0.85rem; color: var(--color-text-muted); }

  .empty { text-align: center; padding: 60px 20px; color: var(--color-text-muted); display: flex; flex-direction: column; align-items: center; gap: 12px; }
  .empty a { color: #6366F1; text-decoration: underline; }

  .loading-state { display: flex; flex-direction: column; align-items: center; padding: 60px 20px; color: var(--color-text-muted); gap: 16px; }
  .spinner { width: 32px; height: 32px; border: 3px solid rgba(99,102,241,0.2); border-top-color: #6366F1; border-radius: 50%; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .error-state { text-align: center; padding: 40px; color: #EF4444; }
  .retry-btn { margin-top: 12px; padding: 10px 20px; background: rgba(239,68,68,0.1); color: #EF4444; border: 1px solid rgba(239,68,68,0.2); border-radius: 8px; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; }

  .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 50; display: flex; align-items: center; justify-content: center; padding: 20px; }
  .modal { background: var(--color-bg-elevated); border: 1px solid var(--color-border-hover); border-radius: 18px; padding: 28px 24px; width: 100%; max-width: 380px; }
  .modal__title { font-family: 'Inter', sans-serif; font-size: 1.1rem; font-weight: 800; margin-bottom: 6px; }
  .modal__sub { font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: 20px; }
  .modal__field { margin-bottom: 20px; }
  .modal__field label { display: block; font-size: 0.78rem; color: var(--color-text-muted); margin-bottom: 6px; }
  .modal__input { width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--color-border-hover); background: var(--color-bg-elevated); color: #fff; font-family: 'DM Mono', monospace; font-size: 1rem; }
  .modal__input:focus { outline: none; border-color: #6366F1; }
  .modal__buttons { display: flex; gap: 10px; margin-bottom: 14px; }
  .rbtn { flex: 1; padding: 12px; border-radius: 10px; border: none; font-size: 0.85rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; }
  .rbtn--win { background: rgba(16,185,129,0.15); color: #10B981; }
  .rbtn--win:hover { background: rgba(16,185,129,0.25); }
  .rbtn--loss { background: rgba(239,68,68,0.15); color: #EF4444; }
  .rbtn--loss:hover { background: rgba(239,68,68,0.25); }
  .rbtn--push { background: rgba(148,163,184,0.15); color: #94A3B8; }
  .rbtn--push:hover { background: rgba(148,163,184,0.25); }
  .modal__cancel { width: 100%; padding: 10px; background: transparent; border: 1px solid var(--color-border); border-radius: 10px; color: var(--color-text-muted); font-size: 0.85rem; cursor: pointer; }

  @media (max-width: 640px) {
    .ai-summary { flex-direction: row; overflow-x: auto; }
    .pickcard__body { flex-direction: column; align-items: flex-start; }
    .upgrade-hint { flex-direction: column; text-align: center; }
    .upgrade-hint__left { justify-content: center; }
    .upgrade-hint__btn { width: 100%; text-align: center; display: block; }
  }
</style>
