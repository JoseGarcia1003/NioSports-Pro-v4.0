<!-- src/routes/stats/+page.svelte -->
<script>
  import { onMount, onDestroy, afterUpdate } from 'svelte';
  import { userId }        from '$lib/stores/auth';
  import { picksStore,
           picksTotales }  from '$lib/stores/data';
  import { dbSubscribe,
           userPath }      from '$lib/firebase';
  import Skeleton          from '$lib/components/Skeleton.svelte';

  let loading   = true;
  let cleanupFn = null;
  let hasSubscribed = false;

  // Canvas refs
  let profitCanvas;
  let periodCanvas;
  let profitChart  = null;
  let periodChart  = null;

  // Suscripción reactiva - se activa cuando userId está disponible
  $: if ($userId && !hasSubscribed) {
    hasSubscribed = true;
    cleanupFn = dbSubscribe(
      userPath($userId, 'picks', 'totales'),
      (data) => {
        picksStore.setByType('totales', data ?? {});
        loading = false;
      }
    );
  }

  // Si no hay userId después de un tiempo, dejar de cargar
  onMount(() => {
    setTimeout(() => {
      if (loading && !$userId) {
        loading = false;
      }
    }, 2000);
  });

  onDestroy(() => {
    cleanupFn?.();
    profitChart?.destroy();
    periodChart?.destroy();
  });

  afterUpdate(() => {
    if (loading || typeof window === 'undefined' || !window.Chart) return;
    if (profitCanvas && resolvedPicks.length >= 3) buildProfitChart();
    if (periodCanvas && resolvedPicks.length >= 1) buildPeriodChart();
  });

  // Función para convertir odds americano a decimal
  function americanToDecimal(odds) {
    const numOdds = parseFloat(odds);
    if (isNaN(numOdds)) return 1.91;
    if (numOdds > 0) {
      return (numOdds / 100) + 1;
    } else {
      return (100 / Math.abs(numOdds)) + 1;
    }
  }

  function getWinProfit(odds) {
    const decimal = americanToDecimal(odds || -110);
    return decimal - 1;
  }

  // Stats derivadas
  $: allPicks      = $picksTotales;
  $: resolvedPicks = allPicks.filter(p => p.status && p.status !== 'pending')
                             .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  $: pendingPicks  = allPicks.filter(p => !p.status || p.status === 'pending');

  $: wins    = resolvedPicks.filter(p => p.status === 'win').length;
  $: losses  = resolvedPicks.filter(p => p.status === 'loss').length;
  $: pushes  = resolvedPicks.filter(p => p.status === 'push').length;
  $: total   = wins + losses;

  $: winRate = total > 0
               ? ((wins / total) * 100).toFixed(1)
               : '0.0';

  $: profitUnits = resolvedPicks.reduce((acc, p) => {
    if (p.status === 'win')  return acc + getWinProfit(p.odds);
    if (p.status === 'loss') return acc - 1;
    return acc;
  }, 0);

  $: roi = total > 0
           ? ((profitUnits / total) * 100).toFixed(1)
           : '0.0';

  // CLV promedio
  $: picksWithCLV = resolvedPicks.filter(p => p.closingLine && p.line && !p.isCombo);
  $: avgCLV = picksWithCLV.length > 0
    ? (picksWithCLV.reduce((sum, p) => {
        const clv = p.betType === 'OVER'
          ? parseFloat(p.closingLine) - parseFloat(p.line)
          : parseFloat(p.line) - parseFloat(p.closingLine);
        return sum + clv;
      }, 0) / picksWithCLV.length).toFixed(2)
    : null;

  // Rendimiento por periodo
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
      period,
      ...s,
      total: s.wins + s.losses + s.pushes,
      winRate: (s.wins + s.losses) > 0
               ? ((s.wins / (s.wins + s.losses)) * 100).toFixed(0)
               : '0',
    }))
    .sort((a, b) => b.total - a.total);

  // Top 8 equipos por profit
  $: teamPerf = (() => {
    const map = {};
    resolvedPicks.forEach(p => {
      [p.localTeam, p.awayTeam].forEach(team => {
        if (!team) return;
        if (!map[team]) map[team] = { wins: 0, losses: 0, profit: 0 };
        if (p.status === 'win') {
          map[team].wins++;
          map[team].profit += getWinProfit(p.odds);
        }
        if (p.status === 'loss') {
          map[team].losses++;
          map[team].profit -= 1;
        }
      });
    });
    return Object.entries(map)
      .map(([team, s]) => ({
        team, ...s,
        total:   s.wins + s.losses,
        winRate: (s.wins + s.losses) > 0
                 ? ((s.wins / (s.wins + s.losses)) * 100).toFixed(0)
                 : '0',
      }))
      .filter(t => t.total >= 2)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 8);
  })();

  // Gráficos
  function buildProfitChart() {
    if (profitChart) { profitChart.destroy(); profitChart = null; }

    let cumulative = 0;
    const data = resolvedPicks.map(p => {
      if (p.status === 'win')  cumulative += getWinProfit(p.odds);
      if (p.status === 'loss') cumulative -= 1;
      return { 
        x: new Date(p.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
        y: parseFloat(cumulative.toFixed(2)) 
      };
    });

    const isPositive = data[data.length - 1]?.y >= 0;

    profitChart = new window.Chart(profitCanvas, {
      type: 'line',
      data: {
        labels: data.map(d => d.x),
        datasets: [{
          data: data.map(d => d.y),
          borderColor: isPositive ? '#34d399' : '#f87171',
          backgroundColor: isPositive ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)',
          borderWidth: 2.5,
          pointRadius: 3,
          tension: 0.4,
          fill: true,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y.toFixed(2)}u` } }
        },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(255,255,255,0.45)', font: { size: 10 } } },
          y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(255,255,255,0.45)', font: { size: 10 }, callback: v => `${v}u` } }
        }
      }
    });
  }

  function buildPeriodChart() {
    if (periodChart) { periodChart.destroy(); periodChart = null; }
    if (periodEntries.length === 0) return;

    periodChart = new window.Chart(periodCanvas, {
      type: 'bar',
      data: {
        labels: periodEntries.map(e => e.period),
        datasets: [
          {
            label: 'Wins',
            data: periodEntries.map(e => e.wins),
            backgroundColor: 'rgba(52,211,153,0.75)',
            borderRadius: 6,
          },
          {
            label: 'Losses',
            data: periodEntries.map(e => e.losses),
            backgroundColor: 'rgba(248,113,113,0.75)',
            borderRadius: 6,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: 'rgba(255,255,255,0.6)', font: { size: 11 } }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.45)' } },
          y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(255,255,255,0.45)', stepSize: 1 } }
        }
      }
    });
  }
</script>

<svelte:head>
  <title>Stats — NioSports Pro</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
</svelte:head>

<div class="page">

  <div class="page__header">
    <h1 class="page__title">📉 Stats Pro</h1>
    <p class="page__subtitle">Análisis avanzado de rendimiento</p>
  </div>

  {#if loading}
    <div class="kpi-grid">
      <Skeleton variant="stat" />
      <Skeleton variant="stat" />
      <Skeleton variant="stat" />
      <Skeleton variant="stat" />
    </div>
    <div class="card">
      <Skeleton variant="text" width="180px" height="20px" />
      <div style="height: 220px; margin-top: 16px;">
        <Skeleton variant="card" height="200px" />
      </div>
    </div>

  {:else if allPicks.length === 0}
    <div class="empty-page">
      <span>📊</span>
      <h2>Aún sin datos</h2>
      <p>Registra picks en la sección <a href="/picks">Mis Picks</a> y vuelve aquí para ver tus estadísticas.</p>
    </div>

  {:else}

    <!-- KPIs -->
    <div class="kpi-grid">
      <div class="kpi">
        <span class="kpi__icon">🎯</span>
        <div class="kpi__value" class:kpi__value--green={parseFloat(winRate) >= 55}
                                class:kpi__value--red={parseFloat(winRate) < 45}>
          {winRate}%
        </div>
        <div class="kpi__label">Win rate</div>
        <div class="kpi__sub">{wins}W / {losses}L / {pushes}P</div>
      </div>

      <div class="kpi">
        <span class="kpi__icon">💰</span>
        <div class="kpi__value"
          class:kpi__value--green={profitUnits >= 0}
          class:kpi__value--red={profitUnits < 0}>
          {profitUnits >= 0 ? '+' : ''}{profitUnits.toFixed(2)}u
        </div>
        <div class="kpi__label">Profit</div>
        <div class="kpi__sub">{total} picks resueltos</div>
      </div>

      <div class="kpi">
        <span class="kpi__icon">📊</span>
        <div class="kpi__value"
          class:kpi__value--green={parseFloat(roi) >= 0}
          class:kpi__value--red={parseFloat(roi) < 0}>
          {parseFloat(roi) >= 0 ? '+' : ''}{roi}%
        </div>
        <div class="kpi__label">ROI</div>
        <div class="kpi__sub">Por pick apostado</div>
      </div>

      <div class="kpi">
        <span class="kpi__icon">⏳</span>
        <div class="kpi__value kpi__value--gold">{pendingPicks.length}</div>
        <div class="kpi__label">Pendientes</div>
        <div class="kpi__sub">{allPicks.length} picks totales</div>
      </div>
    </div>

    <!-- CLV Banner -->
    {#if avgCLV !== null}
      <div class="clv-banner" class:clv-banner--pos={parseFloat(avgCLV) >= 0}>
        <div class="clv-banner__left">
          <span class="clv-banner__icon">🎯</span>
          <div>
            <div class="clv-banner__title">CLV Promedio</div>
            <div class="clv-banner__sub">Closing Line Value — {picksWithCLV.length} picks con dato</div>
          </div>
        </div>
        <div class="clv-banner__value" class:clv-banner__value--pos={parseFloat(avgCLV) >= 0}>
          {parseFloat(avgCLV) >= 0 ? '+' : ''}{avgCLV} pts
        </div>
      </div>
    {/if}

    <!-- Profit Chart -->
    <div class="card">
      <h2 class="card__title">📈 Profit acumulado</h2>
      {#if resolvedPicks.length >= 3}
        <div class="chart-wrap">
          <canvas bind:this={profitCanvas}></canvas>
        </div>
      {:else}
        <p class="chart-placeholder">
          Necesitas al menos 3 picks resueltos para ver la curva.
        </p>
      {/if}
    </div>

    <!-- Period Chart + Table -->
    <div class="two-col">
      <div class="card">
        <h2 class="card__title">📋 Por periodo</h2>
        {#if periodEntries.length > 0}
          <div class="chart-wrap chart-wrap--sm">
            <canvas bind:this={periodCanvas}></canvas>
          </div>
          <div class="period-table">
            {#each periodEntries as e}
              <div class="period-row">
                <span class="period-row__name">{e.period}</span>
                <span class="period-row__wr"
                  class:period-row__wr--good={parseInt(e.winRate) >= 55}
                  class:period-row__wr--bad={parseInt(e.winRate) < 45}>
                  {e.winRate}%
                </span>
                <span class="period-row__detail">{e.wins}W/{e.losses}L/{e.pushes}P</span>
              </div>
            {/each}
          </div>
        {:else}
          <p class="chart-placeholder">Sin datos suficientes.</p>
        {/if}
      </div>

      <!-- Top Equipos -->
      <div class="card">
        <h2 class="card__title">🏆 Mejores equipos</h2>
        {#if teamPerf.length > 0}
          <div class="team-list">
            {#each teamPerf as t}
              <div class="team-row">
                <div class="team-row__left">
                  <span class="team-row__name">{t.team}</span>
                  <span class="team-row__picks">{t.total} picks</span>
                </div>
                <div class="team-row__right">
                  <span class="team-row__wr"
                    class:team-row__wr--good={parseInt(t.winRate) >= 55}
                    class:team-row__wr--bad={parseInt(t.winRate) < 45}>
                    {t.winRate}%
                  </span>
                  <span class="team-row__profit"
                    class:team-row__profit--pos={t.profit >= 0}
                    class:team-row__profit--neg={t.profit < 0}>
                    {t.profit >= 0 ? '+' : ''}{t.profit.toFixed(2)}u
                  </span>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="empty-inline">
            <span>🏀</span>
            <p>Necesitas 2+ picks por equipo para ver rankings.</p>
          </div>
        {/if}
      </div>
    </div>

    <!-- CLV Tip -->
    {#if avgCLV === null}
      <div class="tip">
        💡 <strong>¿Qué es CLV?</strong> El Closing Line Value mide si apostaste antes de que la línea
        se moviera a tu favor. CLV positivo = piensas como un sharp. Agrega la línea de cierre
        a tus picks en <a href="/picks">Mis Picks</a> para activarlo.
      </div>
    {/if}

  {/if}
</div>

<style>
  .page {
    max-width: 1000px;
    margin: 0 auto;
    padding: 32px 20px 80px;
  }
  .page__header   { margin-bottom: 28px; }
  .page__title {
    font-family: 'Orbitron', sans-serif;
    font-size: clamp(1.3rem, 3vw, 1.8rem);
    font-weight: 900;
    margin-bottom: 4px;
  }
  .page__subtitle { color: var(--color-text-muted); font-size: 0.9rem; }

  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 14px;
    margin-bottom: 20px;
  }
  .kpi {
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: 14px;
    padding: 18px 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .kpi__icon   { font-size: 1.2rem; }
  .kpi__value  { font-size: 1.55rem; font-weight: 800; }
  .kpi__label  { font-size: 0.7rem; text-transform: uppercase; letter-spacing: .05em; color: var(--color-text-muted); }
  .kpi__sub    { font-size: 0.75rem; color: var(--color-text-muted); }
  .kpi__value--green { color: #34d399; }
  .kpi__value--red   { color: #f87171; }
  .kpi__value--gold  { color: #fbbf24; }

  .clv-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(248,113,113,0.07);
    border: 1px solid rgba(248,113,113,0.2);
    border-radius: 14px;
    padding: 14px 18px;
    margin-bottom: 20px;
  }
  .clv-banner--pos {
    background: rgba(52,211,153,0.07);
    border-color: rgba(52,211,153,0.2);
  }
  .clv-banner__left  { display: flex; align-items: center; gap: 12px; }
  .clv-banner__icon  { font-size: 1.5rem; }
  .clv-banner__title { font-weight: 700; font-size: 0.9rem; }
  .clv-banner__sub   { font-size: 0.75rem; color: var(--color-text-muted); }
  .clv-banner__value { font-size: 1.6rem; font-weight: 800; color: #f87171; }
  .clv-banner__value--pos { color: #34d399; }

  .card {
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: 16px;
    padding: 22px 20px;
    margin-bottom: 20px;
  }
  .card__title { font-size: 1rem; font-weight: 800; margin-bottom: 16px; }

  .chart-wrap    { height: 220px; }
  .chart-wrap--sm { height: 160px; margin-bottom: 14px; }
  .chart-placeholder {
    text-align: center;
    color: var(--color-text-muted);
    font-size: 0.85rem;
    padding: 24px 0;
  }

  .two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 20px;
  }
  @media (max-width: 640px) { .two-col { grid-template-columns: 1fr; } }

  .period-table { display: flex; flex-direction: column; gap: 6px; }
  .period-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.83rem;
    padding: 6px 0;
    border-bottom: 1px solid rgba(255,255,255,0.04);
  }
  .period-row__name   { font-weight: 700; width: 44px; }
  .period-row__wr     { font-weight: 800; width: 40px; }
  .period-row__wr--good { color: #34d399; }
  .period-row__wr--bad  { color: #f87171; }
  .period-row__detail { color: var(--color-text-muted); font-size: 0.75rem; }

  .team-list { display: flex; flex-direction: column; gap: 8px; }
  .team-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    background: rgba(255,255,255,0.03);
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.04);
  }
  .team-row__left  { display: flex; flex-direction: column; gap: 2px; }
  .team-row__name  { font-weight: 700; font-size: 0.88rem; }
  .team-row__picks { font-size: 0.7rem; color: var(--color-text-muted); }
  .team-row__right { display: flex; align-items: center; gap: 14px; }
  .team-row__wr    { font-weight: 700; font-size: 0.88rem; }
  .team-row__wr--good { color: #34d399; }
  .team-row__wr--bad  { color: #f87171; }
  .team-row__profit   { font-weight: 800; font-size: 0.9rem; font-family: 'DM Mono', monospace; }
  .team-row__profit--pos { color: #34d399; }
  .team-row__profit--neg { color: #f87171; }

  .empty-page {
    text-align: center;
    padding: 80px 20px;
    color: var(--color-text-muted);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }
  .empty-page span { font-size: 3.5rem; }
  .empty-page h2   { font-size: 1.2rem; color: var(--color-text); }
  .empty-page a    { color: var(--color-accent); }

  .empty-inline {
    text-align: center;
    padding: 24px;
    color: var(--color-text-muted);
    font-size: 0.85rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
  .empty-inline span { font-size: 2rem; }

  .tip {
    background: rgba(251,191,36,0.06);
    border: 1px solid rgba(251,191,36,0.15);
    border-radius: 12px;
    padding: 14px 18px;
    font-size: 0.83rem;
    color: var(--color-text-muted);
    line-height: 1.5;
  }
  .tip strong { color: #fbbf24; }
  .tip a      { color: #fbbf24; }
</style>