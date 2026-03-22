<!-- src/routes/picks/+page.svelte -->
<script>
  import { onMount, onDestroy } from 'svelte';
  import { userId } from '$lib/stores/auth';
  import { picksStore, picksTotales, teamStats, bankrollStore } from '$lib/stores/data';
  import { toasts } from '$lib/stores/ui';
  import PickCard from '$lib/components/PickCard.svelte';
  import AIPickCard from '$lib/components/AIPickCard.svelte';
  import ResultModal from '$lib/components/ResultModal.svelte';
  import { dbRead, dbWrite, dbPush, dbRemove, dbSubscribe, userPath } from '$lib/firebase';
  import { getGamesToday } from '$lib/services/games-service.js';
  import { generateAIPicks, getPicksSummary } from '$lib/services/ai-picks-generator.js';
  import { MODEL_VERSION } from '$lib/engine/constants.js';

  let loading = true;
  let activeTab = 'ai';
  let cleanupFn = null;

  // Estado para Picks IA
  let aiPicks = [];
  let aiLoading = true;
  let aiError = null;
  let isDemo = false;
  let gamesCount = 0;

  // Trackear picks
  let savedPickKeys = new Set();
  let deletedPickKeys = new Set();

  // Modal de resultado
  let showResultModal = false;
  let selectedPick = null;
  let preselectedResult = null;

  onMount(async () => {
    if (!$userId) return;

    cleanupFn = dbSubscribe(
      userPath($userId, 'picks', 'totales'),
      (data) => {
        picksStore.setByType('totales', data ?? {});
        loading = false;
        updateSavedPickKeys(data ?? {});
      }
    );

    await loadAIPicks();
  });

  onDestroy(() => {
    cleanupFn?.();
  });

  function updateSavedPickKeys(picksData) {
    const keys = new Set();
    Object.values(picksData).forEach(pick => {
      const key = `${pick.localTeam}-${pick.awayTeam}-${pick.period}-${pick.betType}`;
      keys.add(key);
    });
    savedPickKeys = keys;
  }

  async function loadAIPicks() {
    aiLoading = true;
    aiError = null;
    deletedPickKeys = new Set();

    try {
      let stats = $teamStats;
      
      if (!stats || Object.keys(stats).length === 0) {
        const res = await fetch('/data/nba-stats.json');
        const data = await res.json();
        stats = data.teams || data;
        teamStats.set(stats);
      }

      const { games, isDemo: demoMode } = await getGamesToday({ teamStats: stats });
      isDemo = demoMode;
      gamesCount = games.length;

      aiPicks = generateAIPicks(games, stats, {
        maxPicks: 12,
        minEV: 1.5,
        minEdge: 1.0,
      });

    } catch (err) {
      console.error('Error loading AI picks:', err);
      aiError = 'No se pudieron cargar los picks. Intenta de nuevo.';
    } finally {
      aiLoading = false;
    }
  }

  async function handleDeletePick(event) {
    const pickId = event.detail;
    if (!$userId || !pickId) {
      toasts.error('Error: No se pudo identificar el pick.');
      return;
    }
    
    const pickToDelete = picks.find(p => p.id === pickId);
    
    try {
      await dbRemove(userPath($userId, 'picks', 'totales', pickId));
      
      if (pickToDelete) {
        const key = `${pickToDelete.localTeam}-${pickToDelete.awayTeam}-${pickToDelete.period}-${pickToDelete.betType}`;
        deletedPickKeys.add(key);
        savedPickKeys.delete(key);
        deletedPickKeys = deletedPickKeys;
        savedPickKeys = savedPickKeys;
      }
      
      toasts.success('Pick eliminado.');
    } catch (err) {
      console.error('Error deleting pick:', err);
      toasts.error('No se pudo eliminar el pick.');
    }
  }

  // Abrir modal - desde botón "Resultado"
  function handleOpenResultModal(event) {
    const pickId = event.detail;
    selectedPick = picks.find(p => p.id === pickId);
    preselectedResult = null;
    if (selectedPick) {
      showResultModal = true;
    }
  }

  // Abrir modal - desde botones rápidos (con resultado pre-seleccionado)
  function handleQuickResult(event) {
    const { id, result } = event.detail;
    selectedPick = picks.find(p => p.id === id);
    preselectedResult = result;
    if (selectedPick) {
      showResultModal = true;
    }
  }

  function handleCloseResultModal() {
    showResultModal = false;
    selectedPick = null;
    preselectedResult = null;
  }

  async function handleResultSubmit(event) {
    const { pickId, result, actualTotal, modelError, didBet, betAmount } = event.detail;
    
    if (!$userId || !pickId) return;

    try {
      const updates = {
        status: result,
        didBet,
        resolvedAt: new Date().toISOString(),
      };
      
      if (actualTotal !== null) {
        updates.actualTotal = actualTotal;
      }
      if (modelError !== null) {
        updates.modelError = modelError;
      }
      if (betAmount) {
        updates.betAmount = betAmount;
      }

      await dbWrite(userPath($userId, 'picks', 'totales', pickId), updates);

      // Actualizar bankroll si apostó
      if (didBet && betAmount && betAmount > 0) {
        await updateBankrollFromResult(result, betAmount, selectedPick);
      }

      toasts.success(
        result === 'win' ? '✅ ¡Pick ganado!' : 
        result === 'loss' ? '❌ Pick perdido' : 
        '↔️ Push registrado'
      );

      handleCloseResultModal();
    } catch (err) {
      console.error('Error saving result:', err);
      toasts.error('No se pudo guardar el resultado.');
    }
  }

  async function updateBankrollFromResult(result, betAmount, pick) {
    const snapshot = bankrollStore.getSnapshot();
    const currentBalance = snapshot.current ?? 0;
    
    const odds = pick.odds || -110;
    let payout = 0;
    
    if (result === 'win') {
      if (odds < 0) {
        payout = betAmount * (100 / Math.abs(odds));
      } else {
        payout = betAmount * (odds / 100);
      }
    } else if (result === 'loss') {
      payout = -betAmount;
    }

    const newBalance = currentBalance + payout;
    
    const entry = {
      date: new Date().toISOString(),
      type: result === 'win' ? 'bet_win' : result === 'loss' ? 'bet_loss' : 'bet_push',
      amount: Math.abs(payout),
      balance: parseFloat(newBalance.toFixed(2)),
      note: `${pick.localTeam} vs ${pick.awayTeam} - ${pick.period} ${pick.betType} ${pick.line}`,
      pickId: pick.id,
    };

    const newHistory = [...(snapshot.history ?? []), entry];

    await dbWrite(userPath($userId, 'bankroll'), {
      ...snapshot,
      current: parseFloat(newBalance.toFixed(2)),
      history: newHistory,
    });
  }

  async function handleSaveAIPick(event) {
    const pick = event.detail;
    if (!$userId) {
      toasts.error('Inicia sesión para guardar picks.');
      return;
    }

    const pickKey = `${pick.homeTeam}-${pick.awayTeam}-${pick.period}-${pick.direction}`;
    
    if (savedPickKeys.has(pickKey)) {
      toasts.error('Este pick ya fue guardado.');
      return;
    }

    try {
      await dbPush(userPath($userId, 'picks', 'totales'), {
        localTeam: pick.homeTeam,
        awayTeam: pick.awayTeam,
        period: pick.period,
        betType: pick.direction,
        line: pick.line,
        projection: pick.projection,
        probability: pick.probability,
        probabilityPercent: pick.probabilityPercent,
        confidence: pick.confidence,
        ev: pick.ev,
        evPercent: pick.evPercent,
        edge: pick.edge,
        modelVersion: MODEL_VERSION.version,
        source: 'ai-generator',
        odds: -110,
        status: 'pending',
        createdAt: new Date().toISOString(),
        // CLV Tracking - línea al momento de guardar
        lineAtPick: pick.line,
        lineRecordedAt: new Date().toISOString(),
      });
      
      savedPickKeys.add(pickKey);
      deletedPickKeys.delete(pickKey);
      savedPickKeys = savedPickKeys;
      deletedPickKeys = deletedPickKeys;
      
      toasts.success(`✅ Pick guardado: ${pick.direction} ${pick.line} (${pick.period})`);
    } catch (err) {
      console.error('Error saving pick:', err);
      toasts.error('No se pudo guardar el pick.');
    }
  }

  async function handleSaveAllPicks() {
    if (!$userId) {
      toasts.error('Inicia sesión para guardar picks.');
      return;
    }

    let saved = 0;
    for (const pick of visibleAIPicks) {
      const pickKey = `${pick.homeTeam}-${pick.awayTeam}-${pick.period}-${pick.direction}`;
      if (savedPickKeys.has(pickKey)) continue;

      try {
        await dbPush(userPath($userId, 'picks', 'totales'), {
          localTeam: pick.homeTeam,
          awayTeam: pick.awayTeam,
          period: pick.period,
          betType: pick.direction,
          line: pick.line,
          projection: pick.projection,
          probability: pick.probability,
          probabilityPercent: pick.probabilityPercent,
          confidence: pick.confidence,
          ev: pick.ev,
          evPercent: pick.evPercent,
          edge: pick.edge,
          modelVersion: MODEL_VERSION.version,
          source: 'ai-generator',
          odds: -110,
          status: 'pending',
          createdAt: new Date().toISOString(),
          // CLV Tracking - línea al momento de guardar
          lineAtPick: pick.line,
          lineRecordedAt: new Date().toISOString(),
        });
        savedPickKeys.add(pickKey);
        saved++;
      } catch (err) {
        console.error('Error saving pick:', err);
      }
    }
    
    savedPickKeys = savedPickKeys;
    toasts.success(`✅ ${saved} picks guardados correctamente.`);
  }

  $: picks = $picksTotales;
  $: total = picks.length;
  $: wins = picks.filter(p => p.status === 'win').length;
  $: losses = picks.filter(p => p.status === 'loss').length;
  $: pending = picks.filter(p => p.status === 'pending').length;
  $: winRate = (wins + losses) > 0 ? ((wins / (wins + losses)) * 100).toFixed(1) : '—';

  $: visibleAIPicks = aiPicks.filter(pick => {
    const pickKey = `${pick.homeTeam}-${pick.awayTeam}-${pick.period}-${pick.direction}`;
    return !savedPickKeys.has(pickKey) || deletedPickKeys.has(pickKey);
  });

  $: aiSummary = getPicksSummary(visibleAIPicks);
  $: allSaved = aiPicks.length > 0 && visibleAIPicks.length === 0;
</script>

<svelte:head>
  <title>Picks IA — NioSports Pro</title>
</svelte:head>

<div class="page">
  <div class="page__header">
    <h1 class="page__title">Picks del Modelo</h1>
    <p class="page__subtitle">Motor Predictivo v{MODEL_VERSION.version}</p>
  </div>

  <div class="tabs">
    <button class="tab" class:tab--active={activeTab === 'ai'} on:click={() => activeTab = 'ai'}>
      🎯 Picks del Día
      {#if visibleAIPicks.length > 0}<span class="tab-badge">{visibleAIPicks.length}</span>{/if}
    </button>
    <button class="tab" class:tab--active={activeTab === 'mis-picks'} on:click={() => activeTab = 'mis-picks'}>
      📋 Mis Picks
      {#if pending > 0}<span class="tab-badge tab-badge--pending">{pending}</span>{/if}
    </button>
  </div>

  {#if activeTab === 'ai'}
    {#if isDemo}
      <div class="demo-banner">
        <span>⚠️</span>
        <p>Mostrando picks de demostración. Los partidos reales se cargarán cuando haya juegos programados.</p>
      </div>
    {/if}

    {#if aiLoading}
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Analizando partidos del día...</p>
      </div>
    {:else if aiError}
      <div class="error-state">
        <p>❌ {aiError}</p>
        <button class="retry-btn" on:click={loadAIPicks}>Reintentar</button>
      </div>
    {:else if allSaved}
      <div class="all-saved-state">
        <p>🎉</p>
        <p>¡Todos los picks han sido guardados!</p>
        <p class="muted">Ve a "Mis Picks" para ver tu lista completa.</p>
        <button class="btn-secondary" on:click={() => activeTab = 'mis-picks'}>Ver Mis Picks →</button>
      </div>
    {:else if visibleAIPicks.length === 0}
      <div class="empty-state">
        <p>🏀</p>
        <p>No hay picks con valor suficiente para hoy.</p>
        <p class="muted">El modelo solo recomienda cuando encuentra edge real.</p>
      </div>
    {:else}
      <div class="ai-summary">
        <div class="summary-stat">
          <span class="summary-value">{gamesCount}</span>
          <span class="summary-label">Partidos</span>
        </div>
        <div class="summary-stat">
          <span class="summary-value">{visibleAIPicks.length}</span>
          <span class="summary-label">Picks</span>
        </div>
        <div class="summary-stat">
          <span class="summary-value summary-value--accent">+{aiSummary.avgEV}%</span>
          <span class="summary-label">EV Prom.</span>
        </div>
        <div class="summary-stat">
          <span class="summary-value">{aiSummary.avgEdge}</span>
          <span class="summary-label">Edge Prom.</span>
        </div>
      </div>

      {#if visibleAIPicks.length > 1}
        <div class="save-all-wrapper">
          <button class="btn-save-all" on:click={handleSaveAllPicks}>
            💾 Guardar todos los picks ({visibleAIPicks.length})
          </button>
        </div>
      {/if}

      <div class="ai-picks-list">
        {#each visibleAIPicks as pick (pick.gameId + pick.period)}
          <AIPickCard {pick} on:save={handleSaveAIPick} />
        {/each}
      </div>
    {/if}

  {:else if activeTab === 'mis-picks'}
    {#if !loading && total > 0}
      <div class="stats-row">
        <div class="stat"><span class="stat__value">{total}</span><span class="stat__label">Total</span></div>
        <div class="stat stat--win"><span class="stat__value">{wins}</span><span class="stat__label">Ganados</span></div>
        <div class="stat stat--loss"><span class="stat__value">{losses}</span><span class="stat__label">Perdidos</span></div>
        <div class="stat stat--pending"><span class="stat__value">{pending}</span><span class="stat__label">Pendientes</span></div>
        <div class="stat stat--rate"><span class="stat__value">{winRate}%</span><span class="stat__label">Win rate</span></div>
      </div>
    {/if}

    {#if loading}
      <div class="loading-list">
        {#each Array(4) as _}<div class="skeleton-pick"></div>{/each}
      </div>
    {:else if picks.length === 0}
      <div class="empty-state">
        <p>🎯</p>
        <p>Aún no tienes picks guardados.</p>
        <p>Guarda picks desde la pestaña "Picks del Día" o desde <a href="/totales">Análisis de Totales</a>.</p>
      </div>
    {:else}
      <div class="picks-list">
        {#each picks as pick (pick.id)}
          <PickCard
            {pick}
            on:delete={handleDeletePick}
            on:result={handleQuickResult}
            on:register={handleOpenResultModal}
          />
        {/each}
      </div>
    {/if}
  {/if}
</div>

<ResultModal 
  show={showResultModal}
  pick={selectedPick}
  {preselectedResult}
  on:close={handleCloseResultModal}
  on:submit={handleResultSubmit}
/>

<style>
  .page { max-width: 800px; margin: 0 auto; padding: 32px 20px 80px; }
  .page__header { margin-bottom: 20px; }
  .page__title { font-family: 'Orbitron', sans-serif; font-size: clamp(1.3rem, 3vw, 1.8rem); font-weight: 900; margin-bottom: 4px; }
  .page__subtitle { color: var(--color-text-muted); font-size: 0.85rem; }

  .tabs { display: flex; gap: 8px; margin-bottom: 24px; border-bottom: 1px solid var(--color-border); padding-bottom: 12px; }
  .tab { display: flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 10px; border: 1px solid transparent; background: transparent; color: var(--color-text-muted); font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.15s; }
  .tab:hover { background: rgba(255,255,255,.05); color: var(--color-text); }
  .tab--active { background: rgba(251,191,36,.1); border-color: rgba(251,191,36,.3); color: #fbbf24; }
  .tab-badge { font-size: 0.7rem; font-weight: 700; background: rgba(251,191,36,.2); color: #fbbf24; padding: 2px 8px; border-radius: 10px; }
  .tab-badge--pending { background: rgba(96,165,250,.2); color: #60a5fa; }

  .demo-banner { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: rgba(245,158,11,.1); border: 1px solid rgba(245,158,11,.2); border-radius: 10px; margin-bottom: 20px; font-size: 0.85rem; color: #f59e0b; }
  .demo-banner span { font-size: 1.2rem; }
  .demo-banner p { margin: 0; }

  .ai-summary { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
  .summary-stat { display: flex; flex-direction: column; align-items: center; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 10px; padding: 12px 20px; min-width: 80px; }
  .summary-value { font-size: 1.4rem; font-weight: 800; }
  .summary-value--accent { color: #34d399; }
  .summary-label { font-size: 0.65rem; color: var(--color-text-muted); text-transform: uppercase; }

  .save-all-wrapper { margin-bottom: 16px; }
  .btn-save-all { width: 100%; padding: 14px 20px; background: linear-gradient(135deg, rgba(251,191,36,.15), rgba(52,211,153,.1)); border: 1px solid rgba(251,191,36,.3); border-radius: 12px; color: #fbbf24; font-size: 0.95rem; font-weight: 700; cursor: pointer; transition: all 0.15s; }
  .btn-save-all:hover { background: linear-gradient(135deg, rgba(251,191,36,.25), rgba(52,211,153,.15)); transform: translateY(-1px); }

  .ai-picks-list { display: flex; flex-direction: column; gap: 14px; }

  .stats-row { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
  .stat { display: flex; flex-direction: column; align-items: center; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 10px; padding: 10px 16px; min-width: 70px; }
  .stat__value { font-size: 1.4rem; font-weight: 800; }
  .stat__label { font-size: 0.7rem; color: var(--color-text-muted); }
  .stat--win .stat__value { color: #34d399; }
  .stat--loss .stat__value { color: #f87171; }
  .stat--pending .stat__value { color: #60a5fa; }
  .stat--rate .stat__value { color: #fbbf24; }

  .picks-list { display: flex; flex-direction: column; }

  .loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; color: var(--color-text-muted); gap: 16px; }
  .spinner { width: 40px; height: 40px; border: 3px solid rgba(251,191,36,.2); border-top-color: #fbbf24; border-radius: 50%; animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .loading-list { display: flex; flex-direction: column; gap: 12px; }
  .skeleton-pick { height: 100px; border-radius: 12px; background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.05) 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
  @keyframes shimmer { to { background-position: -200% 0; } }

  .empty-state, .all-saved-state { text-align: center; padding: 60px 20px; color: var(--color-text-muted); display: flex; flex-direction: column; align-items: center; gap: 10px; }
  .empty-state p:first-child, .all-saved-state p:first-child { font-size: 3rem; }
  .empty-state a { color: var(--color-accent); }
  .empty-state .muted, .all-saved-state .muted { font-size: 0.85rem; opacity: 0.7; }
  .all-saved-state { background: linear-gradient(135deg, rgba(52,211,153,.05), rgba(251,191,36,.05)); border: 1px solid rgba(52,211,153,.2); border-radius: 16px; }
  .btn-secondary { margin-top: 10px; padding: 12px 24px; background: rgba(251,191,36,.15); color: #fbbf24; border: 1px solid rgba(251,191,36,.3); border-radius: 10px; font-weight: 700; cursor: pointer; transition: all 0.15s; }
  .btn-secondary:hover { background: rgba(251,191,36,.25); }

  .error-state { text-align: center; padding: 40px 20px; color: #f87171; }
  .retry-btn { margin-top: 12px; padding: 10px 20px; background: rgba(248,113,113,.15); color: #f87171; border: 1px solid rgba(248,113,113,.3); border-radius: 8px; cursor: pointer; font-weight: 600; }
  .retry-btn:hover { background: rgba(248,113,113,.25); }
</style>