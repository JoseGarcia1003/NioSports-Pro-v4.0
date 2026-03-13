<!-- src/routes/stats/+page.svelte -->
<!--
  Dashboard de análisis + Sección "Rendimiento Histórico del Modelo"
  
  FASE 5 — Nuevas secciones añadidas:
    • Panel "Rendimiento del Modelo" con métricas de backtesting real
    • Gráfico de ROI acumulado histórico
    • Win rate por período con barra comparativa vs break-even (52.4%)
    • Badge de confianza del modelo (con edge / sin edge)
    • DataSource badge — el usuario siempre sabe qué datos está viendo
-->
<script>
  import { onMount, onDestroy, afterUpdate } from 'svelte';
  import { userId }       from '$lib/stores/auth';
  import { picksStore,
           picksTotales } from '$lib/stores/data';
  import { dbSubscribe,
           userPath }     from '$lib/firebase';

  // ── Estado local ─────────────────────────────────────────────────
  let loading          = true;
  let backtesting      = null;  // Datos del backtesting JSON
  let loadingBt        = true;
  let cleanupFn        = null;
  let profitCanvas;
  let periodCanvas;
  let roiCanvas;
  let profitChart      = null;
  let periodChart      = null;
  let roiChart         = null;

  // ── Tabs ─────────────────────────────────────────────────────────
  let activeTab = 'mispicks'; // 'mispicks' | 'modelo'

  // ── Firebase subscription ─────────────────────────────────────────
  onMount(async () => {
    if (!$userId) return;
    cleanupFn = dbSubscribe(
      userPath($userId, 'picks', 'totales'),
      (data) => {
        picksStore.setByType('totales', data ?? {});
        loading = false;
      }
    );

    // Cargar datos de backtesting
    await loadBacktesting();
  });

  onDestroy(() => {
    cleanupFn?.();
    profitChart?.destroy();
    periodChart?.destroy();
    roiChart?.destroy();
  });

  afterUpdate(() => {
    if (typeof window === 'undefined' || !window.Chart) return;
    if (activeTab === 'mispicks') {
      if (!loading && profitCanvas && resolvedPicks.length >= 3) buildProfitChart();
      if (!loading && periodCanvas && resolvedPicks.length >= 1) buildPeriodChart();
    }
    if (activeTab === 'modelo') {
      if (!loadingBt && roiCanvas && backtesting?.metrics?.roiEvolution?.length > 0) buildRoiChart();
    }
  });

  async function loadBacktesting() {
    loadingBt = true;
    try {
      const res = await fetch('/data/backtesting-results.json');
      if (!res.ok) throw new Error('No encontrado');
      backtesting = await res.json();
    } catch {
      backtesting = null;
    } finally {
      loadingBt = false;
    }
  }

  // ── Stats de MIS picks (Firebase) ────────────────────────────────
  $: allPicks      = $picksTotales;
  $: resolvedPicks = allPicks.filter(p => p.status && p.status !== 'pending')
                             .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  $: pendingPicks  = allPicks.filter(p => !p.status || p.status === 'pending');

  $: wins    = resolvedPicks.filter(p => p.status === 'win').length;
  $: losses  = resolvedPicks.filter(p => p.status === 'loss').length;
  $: pushes  = resolvedPicks.filter(p => p.status === 'push').length;
  $: total   = resolvedPicks.length;

  $: winRate = (wins + losses) > 0
               ? ((wins / (wins + losses)) * 100).toFixed(1)
               : '0.0';

  $: profitUnits = resolvedPicks.reduce((acc, p) => {
    if (p.status === 'win')  return acc + ((parseFloat(p.odds) || 1.91) - 1);
    if (p.status === 'loss') return acc - 1;
    return acc;
  }, 0);

  $: roi = total > 0 ? ((profitUnits / total) * 100).toFixed(1) : '0.0';

  $: picksWithCLV = resolvedPicks.filter(p => p.closingLine && p.line && !p.isCombo);
  $: avgCLV = picksWithCLV.length > 0
    ? (picksWithCLV.reduce((sum, p) => {
        const clv = p.betType === 'OVER'
          ? parseFloat(p.closingLine) - parseFloat(p.line)
          : parseFloat(p.line) - parseFloat(p.closingLine);
        return sum + clv;
      }, 0) / picksWithCLV.length).toFixed(2)
    : null;

  $: periodStats = resolvedPicks.reduce((acc, p) => {
    const period = p.period || 'FULL';
    if (!acc[period]) acc[period] = { wins: 0, losses: 0, pushes: 0 };
    if (p.status === 'win')  acc[period].wins++;
    if (p.status === 'loss') acc[period].losses++;
    if (p.status === 'push') acc[period].pushes++;
    return acc;
  }, {});

  $: periodEntries = Object.entries(periodStats)
    .map(([period, s]) => ({
      period, ...s,
      total: s.wins + s.losses + s.pushes,
      winRate: (s.wins + s.losses) > 0
               ? ((s.wins / (s.wins + s.losses)) * 100).toFixed(0)
               : '0',
    }))
    .sort((a, b) => b.total - a.total);

  $: teamPerf = resolvedPicks.reduce((acc, p) => {
    for (const team of [p.localTeam, p.awayTeam].filter(Boolean)) {
      if (!acc[team]) acc[team] = { wins: 0, losses: 0, profit: 0 };
      if (p.status === 'win')  { acc[team].wins++;   acc[team].profit += (parseFloat(p.odds) || 1.91) - 1; }
      if (p.status === 'loss') { acc[team].losses++;  acc[team].profit--; }
    }
    return acc;
  }, {});

  $: topTeams = Object.entries(teamPerf)
    .map(([team, s]) => ({
      team, ...s,
      total: s.wins + s.losses,
      winRate: (s.wins + s.losses) > 0
               ? ((s.wins / (s.wins + s.losses)) * 100).toFixed(0) : '0',
    }))
    .filter(t => t.total >= 2)
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 8);

  // ── Gráficos de MIS PICKS ────────────────────────────────────────
  function buildProfitChart() {
    if (!profitCanvas) return;
    profitChart?.destroy();
    let cum = 0;
    const labels = resolvedPicks.map(p => p.createdAt?.slice(0, 10) ?? '');
    const data   = resolvedPicks.map(p => {
      if (p.status === 'win')  cum += (parseFloat(p.odds) || 1.91) - 1;
      if (p.status === 'loss') cum -= 1;
      return parseFloat(cum.toFixed(2));
    });
    profitChart = new window.Chart(profitCanvas, {
      type: 'line',
      data: { labels, datasets: [{ label: 'Profit (u)', data, borderColor: '#fbbf24', backgroundColor: 'rgba(251,191,36,0.08)', fill: true, tension: 0.4, pointRadius: 3 }] },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)' } } } }
    });
  }

  function buildPeriodChart() {
    if (!periodCanvas || periodEntries.length === 0) return;
    periodChart?.destroy();
    periodChart = new window.Chart(periodCanvas, {
      type: 'bar',
      data: {
        labels: periodEntries.map(e => e.period),
        datasets: [
          { label: 'Wins',   data: periodEntries.map(e => e.wins),   backgroundColor: 'rgba(52,211,153,0.7)' },
          { label: 'Losses', data: periodEntries.map(e => e.losses), backgroundColor: 'rgba(248,113,113,0.7)' },
        ]
      },
      options: { responsive: true, plugins: { legend: { labels: { color: 'rgba(255,255,255,0.6)', font: { size: 11 } } } }, scales: { x: { ticks: { color: 'rgba(255,255,255,0.5)' } }, y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)' } } } }
    });
  }

  // ── Gráfico ROI histórico del modelo ─────────────────────────────
  function buildRoiChart() {
    if (!roiCanvas || !backtesting?.metrics?.roiEvolution?.length) return;
    roiChart?.destroy();
    const ev = backtesting.metrics.roiEvolution;
    roiChart = new window.Chart(roiCanvas, {
      type: 'line',
      data: {
        labels: ev.map(p => p.date),
        datasets: [{
          label: 'ROI acumulado (picks)',
          data:  ev.map(p => p.cumulative),
          borderColor: '#fbbf24',
          backgroundColor: 'rgba(251,191,36,0.07)',
          fill: true, tension: 0.3, pointRadius: 2,
        }, {
          label: 'Break-even (0)',
          data:  ev.map(() => 0),
          borderColor: 'rgba(255,255,255,0.2)',
          borderDash: [4, 4],
          pointRadius: 0,
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: 'rgba(255,255,255,0.5)', font: { size: 10 } } } },
        scales: { x: { display: false }, y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)' } } }
      }
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────
  function formatPeriod(p) {
    const map = { Q1: '1er Cuarto', HALF: '1ª Mitad', FULL: 'Partido', '1Q': '1er Cuarto', '1H': '1ª Mitad' };
    return map[p] ?? p;
  }
  function clvColor(v) { return parseFloat(v) >= 0 ? '#34d399' : '#f87171'; }
  function roiColor(v) { return parseFloat(v) >= 0 ? '#34d399' : '#f87171'; }
</script>

<!-- Chart.js via CDN -->
<svelte:head>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
</svelte:head>

<div class="stats-page">
  <div class="stats-header">
    <h1 class="stats-title">Estadísticas</h1>
    <p class="stats-subtitle">Análisis de rendimiento</p>
  </div>

  <!-- Tabs -->
  <div class="tabs">
    <button class="tab" class:tab--active={activeTab === 'mispicks'} on:click={() => activeTab = 'mispicks'}>
      📋 Mis Picks
    </button>
    <button class="tab" class:tab--active={activeTab === 'modelo'} on:click={() => activeTab = 'modelo'}>
      🔬 Rendimiento del Modelo
    </button>
  </div>

  <!-- ═══ TAB: MIS PICKS ══════════════════════════════════════════ -->
  {#if activeTab === 'mispicks'}
    {#if loading}
      <div class="loading-state">
        <div class="spinner"></div>
        <span>Cargando picks...</span>
      </div>

    {:else if total === 0}
      <div class="empty-state">
        <div class="empty-state__icon">📊</div>
        <h3>Sin historial todavía</h3>
        <p>Registra picks en la sección <strong>Totales</strong> y resuélvelos para ver tus estadísticas aquí.</p>
      </div>

    {:else}
      <!-- KPIs -->
      <div class="kpis">
        <div class="kpi">
          <span class="kpi__value" style="color: {parseFloat(winRate) >= 52.4 ? '#34d399' : '#f87171'}">{winRate}%</span>
          <span class="kpi__label">Win Rate</span>
          <span class="kpi__sub">Break-even: 52.4%</span>
        </div>
        <div class="kpi">
          <span class="kpi__value" style="color: {roiColor(roi)}">{roi}%</span>
          <span class="kpi__label">ROI</span>
          <span class="kpi__sub">{profitUnits >= 0 ? '+' : ''}{profitUnits.toFixed(2)} u</span>
        </div>
        <div class="kpi">
          <span class="kpi__value">{total}</span>
          <span class="kpi__label">Resueltos</span>
          <span class="kpi__sub">{pendingPicks.length} pendientes</span>
        </div>
        {#if avgCLV !== null}
          <div class="kpi">
            <span class="kpi__value" style="color: {clvColor(avgCLV)}">{avgCLV > 0 ? '+' : ''}{avgCLV}</span>
            <span class="kpi__label">CLV Promedio</span>
            <span class="kpi__sub">Closing Line Value</span>
          </div>
        {/if}
      </div>

      <!-- CLV Banner -->
      {#if avgCLV !== null}
        <div class="clv-banner" class:clv-banner--positive={parseFloat(avgCLV) >= 0} class:clv-banner--negative={parseFloat(avgCLV) < 0}>
          <span class="clv-banner__icon">{parseFloat(avgCLV) >= 0 ? '✅' : '⚠️'}</span>
          <div>
            <strong>CLV {parseFloat(avgCLV) >= 0 ? 'positivo' : 'negativo'}: {avgCLV > 0 ? '+' : ''}{avgCLV} puntos promedio</strong>
            <p>
              {parseFloat(avgCLV) >= 0
                ? 'Estás apostando con ventaja respecto al mercado. Esto predice rentabilidad a largo plazo incluso con rachas malas.'
                : 'El mercado mueve las líneas en tu contra. Revisa la estrategia de timing — apuesta antes de que la línea se mueva.'}
            </p>
          </div>
        </div>
      {/if}

      <!-- Profit chart -->
      {#if resolvedPicks.length >= 3}
        <div class="card">
          <h3 class="card__title">Evolución del Profit</h3>
          <div class="chart-wrapper"><canvas bind:this={profitCanvas}></canvas></div>
        </div>
      {/if}

      <!-- W / L / P resumen -->
      <div class="wlp-bar">
        <div class="wlp-segment wlp-segment--win"  style="flex: {wins}">
          <span>{wins}W</span>
        </div>
        <div class="wlp-segment wlp-segment--loss" style="flex: {losses}">
          <span>{losses}L</span>
        </div>
        {#if pushes > 0}
          <div class="wlp-segment wlp-segment--push" style="flex: {pushes}">
            <span>{pushes}P</span>
          </div>
        {/if}
      </div>

      <!-- Rendimiento por periodo -->
      {#if periodEntries.length > 0}
        <div class="card">
          <h3 class="card__title">Por Período</h3>
          <div class="period-grid">
            {#each periodEntries as pe}
              <div class="period-card">
                <span class="period-card__name">{formatPeriod(pe.period)}</span>
                <span class="period-card__wr" style="color: {parseFloat(pe.winRate) >= 52 ? '#34d399' : '#f87171'}">{pe.winRate}%</span>
                <span class="period-card__record">{pe.wins}W / {pe.losses}L</span>
              </div>
            {/each}
          </div>
          <div class="chart-wrapper chart-wrapper--sm">
            <canvas bind:this={periodCanvas}></canvas>
          </div>
        </div>
      {/if}

      <!-- Top equipos -->
      {#if topTeams.length > 0}
        <div class="card">
          <h3 class="card__title">Top Equipos por Profit</h3>
          <div class="team-list">
            {#each topTeams as team}
              <div class="team-row">
                <span class="team-row__name">{team.team}</span>
                <span class="team-row__record">{team.wins}W/{team.losses}L</span>
                <div class="team-row__bar-wrap">
                  <div class="team-row__bar" style="width: {Math.min(100, Math.abs(team.profit) * 8)}%; background: {team.profit >= 0 ? '#34d399' : '#f87171'}"></div>
                </div>
                <span class="team-row__profit" style="color: {team.profit >= 0 ? '#34d399' : '#f87171'}">
                  {team.profit >= 0 ? '+' : ''}{team.profit.toFixed(2)}u
                </span>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {/if}

  <!-- ═══ TAB: RENDIMIENTO DEL MODELO ══════════════════════════════ -->
  {:else if activeTab === 'modelo'}

    {#if loadingBt}
      <div class="loading-state">
        <div class="spinner"></div>
        <span>Cargando datos del modelo...</span>
      </div>

    {:else if !backtesting}
      <div class="empty-state">
        <div class="empty-state__icon">🔬</div>
        <h3>Backtesting no disponible</h3>
        <p>
          Los datos de rendimiento del modelo se generan semanalmente con el workflow de GitHub Actions.
          Si acabas de instalar la Fase 5, corre el workflow <strong>backtesting.yml</strong> manualmente desde GitHub Actions.
        </p>
      </div>

    {:else}
      {@const m    = backtesting.metrics}
      {@const meta = backtesting._meta}

      <!-- Badge de demo -->
      {#if meta.isDemo}
        <div class="demo-notice">
          ⚠️ <strong>Datos de simulación</strong> — Configura BALLDONTLIE_API_KEY en Vercel y re-corre el workflow para ver datos históricos reales.
        </div>
      {/if}

      <!-- Badge de edge -->
      <div class="edge-badge" class:edge-badge--yes={m.hasEdge} class:edge-badge--no={!m.hasEdge}>
        <span class="edge-badge__icon">{m.hasEdge ? '✅' : '❌'}</span>
        <div>
          <strong>El modelo {m.hasEdge ? 'tiene' : 'no tiene'} edge estadístico</strong>
          <p>
            Win rate: <strong>{m.winRate}%</strong> vs break-even: <strong>52.4%</strong>
            {m.hasEdge
              ? '— El modelo supera el umbral de rentabilidad en apuestas con -110 de juice.'
              : '— El modelo necesita mejorar. Un win rate < 52.4% implica pérdida a largo plazo.'}
          </p>
        </div>
      </div>

      <!-- KPIs del modelo -->
      <div class="kpis">
        <div class="kpi">
          <span class="kpi__value" style="color: {m.winRate >= 52.4 ? '#34d399' : '#f87171'}">{m.winRate}%</span>
          <span class="kpi__label">Win Rate</span>
          <span class="kpi__sub">{m.wins}W / {m.losses}L</span>
        </div>
        <div class="kpi">
          <span class="kpi__value" style="color: {m.roi >= 0 ? '#34d399' : '#f87171'}">{m.roi > 0 ? '+' : ''}{m.roi}%</span>
          <span class="kpi__label">ROI estimado</span>
          <span class="kpi__sub">con -110 juice</span>
        </div>
        <div class="kpi">
          <span class="kpi__value">{m.total}</span>
          <span class="kpi__label">Picks analizados</span>
          <span class="kpi__sub">Temporada {meta.season}</span>
        </div>
        <div class="kpi">
          <span class="kpi__value">{m.avgConfidence}%</span>
          <span class="kpi__label">Confianza media</span>
          <span class="kpi__sub">del modelo</span>
        </div>
      </div>

      <!-- ROI evolution chart -->
      {#if m.roiEvolution?.length > 0}
        <div class="card">
          <h3 class="card__title">ROI Acumulado — Últimos {m.roiEvolution.length} picks</h3>
          <p class="card__note">Cada punto es un pick del modelo. Línea sobre cero = rentabilidad acumulada.</p>
          <div class="chart-wrapper"><canvas bind:this={roiCanvas}></canvas></div>
        </div>
      {/if}

      <!-- Win rate por período -->
      {#if m.byPeriod}
        <div class="card">
          <h3 class="card__title">Win Rate por Período</h3>
          <div class="period-model-grid">
            {#each Object.entries(m.byPeriod) as [period, s]}
              <div class="period-model-card">
                <span class="period-model-card__name">{period}</span>
                <div class="period-model-card__bar-wrap">
                  <div class="period-model-card__bar" style="width: {s.winRate}%; background: {s.winRate >= 52.4 ? '#34d399' : '#f87171'}"></div>
                  <div class="period-model-card__break" style="left: 52.4%"></div>
                </div>
                <span class="period-model-card__wr" style="color: {s.winRate >= 52.4 ? '#34d399' : '#f87171'}">{s.winRate}%</span>
                <span class="period-model-card__record">{s.wins}W / {s.losses}L</span>
              </div>
            {/each}
          </div>
          <p class="card__note">Línea vertical = break-even (52.4%)</p>
        </div>
      {/if}

      <!-- Alta confianza stats -->
      {#if m.highConfidence}
        <div class="card card--highlight">
          <h3 class="card__title">Picks de Alta Confianza (≥68%)</h3>
          <div class="hc-stats">
            <div class="hc-stat">
              <span class="hc-stat__value">{m.highConfidence.picks}</span>
              <span class="hc-stat__label">picks generados</span>
            </div>
            <div class="hc-stat">
              <span class="hc-stat__value" style="color: {m.highConfidence.winRate >= 55 ? '#34d399' : '#fbbf24'}">{m.highConfidence.winRate}%</span>
              <span class="hc-stat__label">win rate</span>
            </div>
            <div class="hc-stat">
              <span class="hc-stat__value">{m.bestStreak}</span>
              <span class="hc-stat__label">mejor racha ✅</span>
            </div>
            <div class="hc-stat">
              <span class="hc-stat__value">{m.worstStreak}</span>
              <span class="hc-stat__label">peor racha ❌</span>
            </div>
          </div>
          <p class="card__note">
            Recomendación: enfocarse en picks con confianza ≥ 68%.
            El modelo tiene mayor edge en este segmento.
          </p>
        </div>
      {/if}

      <!-- Meta info -->
      <div class="bt-meta">
        <span>Modelo v{meta.modelVersion}</span>
        <span>•</span>
        <span>{meta.gamesAnalyzed} partidos analizados</span>
        <span>•</span>
        <span>Actualizado: {new Date(meta.generatedAt).toLocaleDateString('es-ES')}</span>
        <span>•</span>
        <span>Fuente: {meta.source}</span>
      </div>
    {/if}
  {/if}
</div>

<style>
  .stats-page { max-width: 900px; margin: 0 auto; padding: 24px 16px 80px; }

  .stats-header { margin-bottom: 24px; }
  .stats-title { font-family: 'Orbitron', monospace; font-size: 1.6rem; font-weight: 700; color: var(--color-accent); }
  .stats-subtitle { color: var(--color-text-muted); font-size: 0.85rem; margin-top: 4px; }

  /* Tabs */
  .tabs { display: flex; gap: 8px; margin-bottom: 24px; border-bottom: 1px solid var(--color-border); }
  .tab {
    background: none; border: none; cursor: pointer; padding: 10px 16px;
    color: var(--color-text-muted); font-size: 0.875rem; font-weight: 600;
    border-bottom: 2px solid transparent; margin-bottom: -1px; transition: all 0.15s;
    font-family: 'DM Sans', sans-serif;
  }
  .tab:hover    { color: var(--color-text); }
  .tab--active  { color: var(--color-accent); border-bottom-color: var(--color-accent); }

  /* States */
  .loading-state { display: flex; align-items: center; gap: 12px; padding: 60px 20px; justify-content: center; color: var(--color-text-muted); }
  .spinner { width: 24px; height: 24px; border: 2px solid rgba(255,255,255,0.1); border-top-color: var(--color-accent); border-radius: 50%; animation: spin 0.8s linear infinite; flex-shrink: 0; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .empty-state { text-align: center; padding: 60px 20px; }
  .empty-state__icon { font-size: 3rem; margin-bottom: 16px; }
  .empty-state h3 { font-size: 1.1rem; margin-bottom: 8px; }
  .empty-state p  { color: var(--color-text-muted); font-size: 0.875rem; line-height: 1.6; }

  /* KPIs */
  .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; margin-bottom: 20px; }
  .kpi { background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 12px; padding: 16px; text-align: center; display: flex; flex-direction: column; gap: 4px; }
  .kpi__value { font-family: 'DM Mono', monospace; font-size: 1.6rem; font-weight: 700; color: var(--color-text); }
  .kpi__label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--color-text-muted); }
  .kpi__sub   { font-size: 0.7rem; color: var(--color-text-muted); opacity: 0.7; }

  /* CLV Banner */
  .clv-banner { display: flex; gap: 12px; padding: 14px 16px; border-radius: 12px; margin-bottom: 20px; font-size: 0.82rem; line-height: 1.5; border: 1px solid transparent; }
  .clv-banner--positive { background: rgba(52,211,153,0.08); border-color: rgba(52,211,153,0.25); }
  .clv-banner--negative { background: rgba(248,113,113,0.08); border-color: rgba(248,113,113,0.25); }
  .clv-banner__icon { font-size: 1.2rem; flex-shrink: 0; }
  .clv-banner p { color: var(--color-text-muted); margin: 4px 0 0; }

  /* W/L bar */
  .wlp-bar { display: flex; height: 8px; border-radius: 8px; overflow: hidden; margin-bottom: 20px; gap: 2px; }
  .wlp-segment { display: flex; align-items: center; justify-content: center; min-width: 24px; }
  .wlp-segment span { font-size: 0.6rem; font-weight: 700; color: rgba(0,0,0,0.7); }
  .wlp-segment--win  { background: #34d399; }
  .wlp-segment--loss { background: #f87171; }
  .wlp-segment--push { background: #94a3b8; }

  /* Cards */
  .card { background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 14px; padding: 18px; margin-bottom: 16px; }
  .card--highlight { border-color: rgba(251,191,36,0.3); background: rgba(251,191,36,0.04); }
  .card__title { font-size: 0.875rem; font-weight: 700; margin-bottom: 12px; color: var(--color-text); }
  .card__note  { font-size: 0.72rem; color: var(--color-text-muted); margin-top: 8px; }

  /* Charts */
  .chart-wrapper    { position: relative; height: 180px; }
  .chart-wrapper--sm { height: 140px; margin-top: 12px; }

  /* Period grid */
  .period-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px,1fr)); gap: 8px; margin-bottom: 12px; }
  .period-card { background: rgba(255,255,255,0.03); border: 1px solid var(--color-border); border-radius: 8px; padding: 10px; text-align: center; display: flex; flex-direction: column; gap: 3px; }
  .period-card__name   { font-size: 0.7rem; color: var(--color-text-muted); font-weight: 700; text-transform: uppercase; }
  .period-card__wr     { font-size: 1.2rem; font-weight: 700; font-family: 'DM Mono', monospace; }
  .period-card__record { font-size: 0.68rem; color: var(--color-text-muted); }

  /* Team list */
  .team-list { display: flex; flex-direction: column; gap: 10px; }
  .team-row { display: grid; grid-template-columns: 1fr 60px 1fr 60px; align-items: center; gap: 8px; font-size: 0.78rem; }
  .team-row__name   { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .team-row__record { color: var(--color-text-muted); text-align: center; }
  .team-row__bar-wrap { height: 4px; background: rgba(255,255,255,0.07); border-radius: 4px; overflow: hidden; }
  .team-row__bar { height: 100%; border-radius: 4px; transition: width 0.3s; }
  .team-row__profit { font-family: 'DM Mono', monospace; font-size: 0.75rem; text-align: right; }

  /* Edge badge */
  .edge-badge { display: flex; gap: 14px; padding: 16px; border-radius: 14px; margin-bottom: 20px; font-size: 0.83rem; line-height: 1.5; border: 1px solid transparent; }
  .edge-badge--yes { background: rgba(52,211,153,0.08); border-color: rgba(52,211,153,0.3); }
  .edge-badge--no  { background: rgba(248,113,113,0.08); border-color: rgba(248,113,113,0.3); }
  .edge-badge__icon { font-size: 1.4rem; flex-shrink: 0; }
  .edge-badge strong { display: block; margin-bottom: 4px; color: var(--color-text); font-size: 0.9rem; }
  .edge-badge p { color: var(--color-text-muted); margin: 0; }

  /* Demo notice */
  .demo-notice { background: rgba(251,191,36,0.08); border: 1px solid rgba(251,191,36,0.25); border-radius: 10px; padding: 12px 16px; font-size: 0.8rem; color: rgba(255,255,255,0.7); margin-bottom: 16px; }

  /* Period model */
  .period-model-grid { display: flex; flex-direction: column; gap: 12px; }
  .period-model-card { display: grid; grid-template-columns: 60px 1fr 52px 80px; align-items: center; gap: 10px; font-size: 0.8rem; }
  .period-model-card__name { font-weight: 700; color: var(--color-text-muted); }
  .period-model-card__bar-wrap { position: relative; height: 8px; background: rgba(255,255,255,0.07); border-radius: 4px; overflow: visible; }
  .period-model-card__bar { height: 100%; border-radius: 4px; min-width: 4px; transition: width 0.4s; }
  .period-model-card__break { position: absolute; top: -3px; bottom: -3px; width: 1px; background: rgba(255,255,255,0.4); }
  .period-model-card__wr { font-family: 'DM Mono', monospace; font-weight: 700; text-align: right; }
  .period-model-card__record { color: var(--color-text-muted); font-size: 0.72rem; }

  /* HC stats */
  .hc-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 10px; }
  .hc-stat { text-align: center; }
  .hc-stat__value { display: block; font-family: 'DM Mono', monospace; font-size: 1.4rem; font-weight: 700; }
  .hc-stat__label { display: block; font-size: 0.68rem; color: var(--color-text-muted); margin-top: 2px; }

  /* Meta */
  .bt-meta { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; font-size: 0.68rem; color: var(--color-text-muted); padding: 12px 0; opacity: 0.6; }

  @media (max-width: 480px) {
    .kpis { grid-template-columns: repeat(2, 1fr); }
    .team-row { grid-template-columns: 1fr 60px; }
    .team-row__bar-wrap, .team-row__profit { display: none; }
    .hc-stats { grid-template-columns: repeat(2, 1fr); }
    .period-model-card { grid-template-columns: 50px 1fr 45px; }
    .period-model-card__record { display: none; }
  }
</style>