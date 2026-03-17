<!-- src/routes/results/+page.svelte -->
<script>
  import { onMount, onDestroy, afterUpdate } from 'svelte';
  import { picksTotales } from '$lib/stores/data';
  import SkeletonCard from '$lib/components/SkeletonCard.svelte';

  let loading = true;
  let chartCanvas;
  let chartInstance = null;
  
  // Filtros
  let periodFilter = 'all';
  let monthFilter = 'all';
  let confidenceFilter = 'all';

  onMount(() => {
    // Simular carga inicial
    setTimeout(() => loading = false, 500);
  });

  onDestroy(() => {
    chartInstance?.destroy();
  });

  afterUpdate(() => {
    if (!chartCanvas || loading) return;
    if (resolvedPicks.length >= 2) {
      buildChart();
    }
  });

  // Datos reactivos
  $: allPicks = $picksTotales || [];
  $: resolvedPicks = allPicks.filter(p => p.status && p.status !== 'pending');
  
  // Aplicar filtros
  $: filteredPicks = resolvedPicks.filter(p => {
    if (periodFilter !== 'all' && p.period !== periodFilter) return false;
    if (confidenceFilter !== 'all' && p.confidence !== confidenceFilter) return false;
    if (monthFilter !== 'all') {
      const pickMonth = new Date(p.createdAt).toISOString().slice(0, 7);
      if (pickMonth !== monthFilter) return false;
    }
    return true;
  });

  // Estadísticas
  $: wins = filteredPicks.filter(p => p.status === 'win').length;
  $: losses = filteredPicks.filter(p => p.status === 'loss').length;
  $: pushes = filteredPicks.filter(p => p.status === 'push').length;
  $: total = wins + losses;
  $: winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : '—';

  // Calcular profit/ROI
  $: profitData = calculateProfit(filteredPicks);
  $: profit = profitData.profit;
  $: roi = profitData.roi;
  $: avgCLV = profitData.avgCLV;

  // Meses disponibles para filtro
  $: availableMonths = [...new Set(resolvedPicks.map(p => 
    new Date(p.createdAt).toISOString().slice(0, 7)
  ))].sort().reverse();

  // Desglose por período
  $: periodBreakdown = calculatePeriodBreakdown(resolvedPicks);

  // Desglose mensual
  $: monthlyBreakdown = calculateMonthlyBreakdown(resolvedPicks);

  function americanToDecimal(odds) {
    if (odds > 0) return (odds / 100) + 1;
    else return (100 / Math.abs(odds)) + 1;
  }

  function calculateProfit(picks) {
    let totalProfit = 0;
    let totalCLV = 0;
    let clvCount = 0;
    
    picks.forEach(p => {
      if (p.status === 'push') return;
      
      const odds = p.odds || -110;
      const decimalOdds = americanToDecimal(odds);
      
      if (p.status === 'win') {
        totalProfit += (decimalOdds - 1); // Profit per unit
      } else if (p.status === 'loss') {
        totalProfit -= 1; // Lost 1 unit
      }

      // CLV calculation
      if (p.closingLine && p.line) {
        const clv = p.betType === 'OVER' 
          ? p.line - p.closingLine 
          : p.closingLine - p.line;
        totalCLV += clv;
        clvCount++;
      }
    });

    const totalBets = picks.filter(p => p.status !== 'push').length;
    
    return {
      profit: totalProfit.toFixed(2),
      roi: totalBets > 0 ? ((totalProfit / totalBets) * 100).toFixed(1) : '0.0',
      avgCLV: clvCount > 0 ? (totalCLV / clvCount).toFixed(2) : '—'
    };
  }

  function calculatePeriodBreakdown(picks) {
    const periods = ['Q1', 'HALF', 'FULL'];
    return periods.map(period => {
      const periodPicks = picks.filter(p => p.period === period);
      const w = periodPicks.filter(p => p.status === 'win').length;
      const l = periodPicks.filter(p => p.status === 'loss').length;
      const t = w + l;
      const wr = t > 0 ? ((w / t) * 100).toFixed(1) : '—';
      const profitData = calculateProfit(periodPicks);
      
      return { period, wins: w, losses: l, total: t, winRate: wr, profit: profitData.profit, roi: profitData.roi };
    });
  }

  function calculateMonthlyBreakdown(picks) {
    const months = [...new Set(picks.map(p => 
      new Date(p.createdAt).toISOString().slice(0, 7)
    ))].sort().reverse();

    return months.map(month => {
      const monthPicks = picks.filter(p => 
        new Date(p.createdAt).toISOString().slice(0, 7) === month
      );
      const w = monthPicks.filter(p => p.status === 'win').length;
      const l = monthPicks.filter(p => p.status === 'loss').length;
      const t = w + l;
      const wr = t > 0 ? ((w / t) * 100).toFixed(1) : '—';
      const profitData = calculateProfit(monthPicks);
      
      const [year, m] = month.split('-');
      const monthName = new Date(year, parseInt(m) - 1).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
      
      return { month: monthName, wins: w, losses: l, total: t, winRate: wr, profit: profitData.profit, roi: profitData.roi };
    });
  }

  function buildChart() {
    if (typeof window === 'undefined' || !window.Chart) return;
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

    // Calcular profit acumulado por fecha
    const sortedPicks = [...filteredPicks]
      .filter(p => p.status !== 'push')
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    let cumulative = 0;
    const dataPoints = sortedPicks.map(p => {
      const odds = p.odds || -110;
      const decimalOdds = americanToDecimal(odds);
      
      if (p.status === 'win') {
        cumulative += (decimalOdds - 1);
      } else {
        cumulative -= 1;
      }
      
      return {
        x: new Date(p.createdAt),
        y: parseFloat(cumulative.toFixed(2))
      };
    });

    const isProfit = dataPoints.length > 0 && dataPoints[dataPoints.length - 1].y >= 0;

    chartInstance = new window.Chart(chartCanvas, {
      type: 'line',
      data: {
        datasets: [{
          label: 'Profit Acumulado (u)',
          data: dataPoints,
          borderColor: isProfit ? '#34d399' : '#f87171',
          backgroundColor: isProfit ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
          borderWidth: 2.5,
          pointRadius: 3,
          pointBackgroundColor: isProfit ? '#34d399' : '#f87171',
          tension: 0.3,
          fill: true,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: ctx => new Date(ctx[0].parsed.x).toLocaleDateString('es-ES'),
              label: ctx => ` ${ctx.parsed.y >= 0 ? '+' : ''}${ctx.parsed.y.toFixed(2)}u`
            }
          }
        },
        scales: {
          x: {
            type: 'time',
            time: { unit: 'day', displayFormats: { day: 'dd MMM' } },
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 11 } }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: {
              color: 'rgba(255,255,255,0.5)',
              font: { size: 11 },
              callback: v => `${v >= 0 ? '+' : ''}${v}u`
            }
          }
        }
      }
    });
  }

  function downloadCSV() {
    const headers = ['Fecha', 'Equipos', 'Período', 'Tipo', 'Línea', 'Proyección', 'Confianza', 'Odds', 'Resultado', 'CLV'];
    const rows = filteredPicks.map(p => [
      new Date(p.createdAt).toLocaleDateString('es-ES'),
      `${p.awayTeam} @ ${p.localTeam}`,
      p.period,
      p.betType,
      p.line,
      p.projection?.toFixed(1) || '',
      p.confidence,
      p.odds || -110,
      p.status,
      p.closingLine ? (p.betType === 'OVER' ? p.line - p.closingLine : p.closingLine - p.line).toFixed(1) : ''
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `niosports-results-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function getStatusBadge(status) {
    switch (status) {
      case 'win': return { text: 'Ganado', class: 'badge--win' };
      case 'loss': return { text: 'Perdido', class: 'badge--loss' };
      case 'push': return { text: 'Push', class: 'badge--push' };
      default: return { text: status, class: '' };
    }
  }
</script>

<svelte:head>
  <title>Resultados — NioSports Pro</title>
  <meta name="description" content="Track record público y verificable de NioSports Pro. Historial completo de picks con estadísticas de rendimiento." />
  <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3.0.0/dist/chartjs-adapter-date-fns.bundle.min.js"></script>
</svelte:head>

<div class="page">

  <div class="page__header">
    <div class="page__header-content">
      <h1 class="page__title">📊 Resultados Públicos</h1>
      <p class="page__subtitle">Track record verificable del Motor Predictivo v2.0</p>
    </div>
    <button class="btn btn--export" on:click={downloadCSV} disabled={filteredPicks.length === 0}>
      ⬇️ Descargar CSV
    </button>
  </div>

  {#if loading}
    <SkeletonCard type="kpi" count={4} />
    <SkeletonCard type="chart" />
  {:else}

    <!-- KPIs principales -->
    <div class="kpi-grid">
      <div class="kpi">
        <span class="kpi__icon">🎯</span>
        <div class="kpi__value">{total}</div>
        <div class="kpi__label">Picks Resueltos</div>
        <div class="kpi__sub kpi__sub--neutral">{wins}W - {losses}L - {pushes}P</div>
      </div>

      <div class="kpi">
        <span class="kpi__icon">📈</span>
        <div class="kpi__value" class:kpi__value--win={parseFloat(winRate) >= 52.4}>
          {winRate}{winRate !== '—' ? '%' : ''}
        </div>
        <div class="kpi__label">Win Rate</div>
        <div class="kpi__sub" class:kpi__sub--pos={parseFloat(winRate) >= 52.4} class:kpi__sub--neg={parseFloat(winRate) < 52.4 && winRate !== '—'}>
          {parseFloat(winRate) >= 52.4 ? '✓ Sobre break-even' : winRate !== '—' ? '⚠ Bajo break-even' : ''}
        </div>
      </div>

      <div class="kpi">
        <span class="kpi__icon">💰</span>
        <div class="kpi__value" class:kpi__value--win={parseFloat(profit) >= 0} class:kpi__value--loss={parseFloat(profit) < 0}>
          {parseFloat(profit) >= 0 ? '+' : ''}{profit}u
        </div>
        <div class="kpi__label">Profit Total</div>
        <div class="kpi__sub" class:kpi__sub--pos={parseFloat(roi) >= 0} class:kpi__sub--neg={parseFloat(roi) < 0}>
          ROI: {parseFloat(roi) >= 0 ? '+' : ''}{roi}%
        </div>
      </div>

      <div class="kpi">
        <span class="kpi__icon">📐</span>
        <div class="kpi__value" class:kpi__value--win={avgCLV !== '—' && parseFloat(avgCLV) > 0}>
          {avgCLV !== '—' ? (parseFloat(avgCLV) > 0 ? '+' : '') + avgCLV : '—'}
        </div>
        <div class="kpi__label">CLV Promedio</div>
        <div class="kpi__sub kpi__sub--neutral">Closing Line Value</div>
      </div>
    </div>

    <!-- Filtros -->
    <div class="filters">
      <div class="filter-group">
        <label class="filter-label">Período</label>
        <select class="filter-select" bind:value={periodFilter}>
          <option value="all">Todos</option>
          <option value="Q1">Q1</option>
          <option value="HALF">HALF</option>
          <option value="FULL">FULL</option>
        </select>
      </div>

      <div class="filter-group">
        <label class="filter-label">Mes</label>
        <select class="filter-select" bind:value={monthFilter}>
          <option value="all">Todos</option>
          {#each availableMonths as month}
            <option value={month}>{month}</option>
          {/each}
        </select>
      </div>

      <div class="filter-group">
        <label class="filter-label">Confianza</label>
        <select class="filter-select" bind:value={confidenceFilter}>
          <option value="all">Todas</option>
          <option value="HIGH">Alta</option>
          <option value="MEDIUM">Media</option>
          <option value="LOW">Baja</option>
        </select>
      </div>
    </div>

    <!-- Gráfico de profit acumulado -->
    <div class="card">
      <h2 class="card__title">📈 Evolución del Profit</h2>
      {#if filteredPicks.length >= 2}
        <div class="chart-wrap"><canvas bind:this={chartCanvas}></canvas></div>
      {:else}
        <div class="empty-state empty-state--inline">
          <span>📉</span>
          <p>Se necesitan al menos 2 picks resueltos para mostrar el gráfico.</p>
        </div>
      {/if}
    </div>

    <!-- Desglose por período -->
    <div class="card">
      <h2 class="card__title">🎯 Rendimiento por Período</h2>
      <div class="breakdown-grid">
        {#each periodBreakdown as item}
          <div class="breakdown-item">
            <div class="breakdown-item__period">{item.period}</div>
            <div class="breakdown-item__stats">
              <span class="breakdown-item__wr" class:positive={parseFloat(item.winRate) >= 52.4}>
                {item.winRate}{item.winRate !== '—' ? '%' : ''}
              </span>
              <span class="breakdown-item__record">{item.wins}W - {item.losses}L</span>
            </div>
            <div class="breakdown-item__profit" class:positive={parseFloat(item.profit) >= 0} class:negative={parseFloat(item.profit) < 0}>
              {parseFloat(item.profit) >= 0 ? '+' : ''}{item.profit}u
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Desglose mensual -->
    {#if monthlyBreakdown.length > 0}
      <div class="card">
        <h2 class="card__title">📅 Rendimiento Mensual</h2>
        <div class="table-wrap">
          <table class="results-table">
            <thead>
              <tr>
                <th>Mes</th>
                <th>Picks</th>
                <th>W-L</th>
                <th>Win Rate</th>
                <th>Profit</th>
                <th>ROI</th>
              </tr>
            </thead>
            <tbody>
              {#each monthlyBreakdown as row}
                <tr>
                  <td class="cell--month">{row.month}</td>
                  <td>{row.total}</td>
                  <td>{row.wins}-{row.losses}</td>
                  <td class:cell--positive={parseFloat(row.winRate) >= 52.4}>{row.winRate}%</td>
                  <td class:cell--positive={parseFloat(row.profit) >= 0} class:cell--negative={parseFloat(row.profit) < 0}>
                    {parseFloat(row.profit) >= 0 ? '+' : ''}{row.profit}u
                  </td>
                  <td class:cell--positive={parseFloat(row.roi) >= 0} class:cell--negative={parseFloat(row.roi) < 0}>
                    {parseFloat(row.roi) >= 0 ? '+' : ''}{row.roi}%
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}

    <!-- Historial de picks -->
    <div class="card">
      <h2 class="card__title">📋 Historial de Picks ({filteredPicks.length})</h2>
      {#if filteredPicks.length === 0}
        <div class="empty-state">
          <span>📭</span>
          <p>No hay picks resueltos con los filtros seleccionados.</p>
        </div>
      {:else}
        <div class="table-wrap">
          <table class="results-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Partido</th>
                <th>Pick</th>
                <th>Línea</th>
                <th>Proyección</th>
                <th>Conf.</th>
                <th>Resultado</th>
                <th>CLV</th>
              </tr>
            </thead>
            <tbody>
              {#each [...filteredPicks].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) as pick}
                {@const badge = getStatusBadge(pick.status)}
                {@const clv = pick.closingLine ? (pick.betType === 'OVER' ? pick.line - pick.closingLine : pick.closingLine - pick.line) : null}
                <tr>
                  <td class="cell--date">
                    {new Date(pick.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                  </td>
                  <td class="cell--teams">
                    <span class="teams-text">{pick.awayTeam} @ {pick.localTeam}</span>
                  </td>
                  <td>
                    <span class="pick-badge" class:pick-badge--over={pick.betType === 'OVER'} class:pick-badge--under={pick.betType === 'UNDER'}>
                      {pick.period} {pick.betType}
                    </span>
                  </td>
                  <td class="cell--mono">{pick.line}</td>
                  <td class="cell--mono">{pick.projection?.toFixed(1) || '—'}</td>
                  <td>
                    <span class="conf-badge conf-badge--{pick.confidence?.toLowerCase() || 'medium'}">
                      {pick.confidence || 'MED'}
                    </span>
                  </td>
                  <td>
                    <span class="status-badge {badge.class}">{badge.text}</span>
                  </td>
                  <td class="cell--mono" class:cell--positive={clv && clv > 0} class:cell--negative={clv && clv < 0}>
                    {clv !== null ? (clv > 0 ? '+' : '') + clv.toFixed(1) : '—'}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>

    <!-- Disclaimer -->
    <div class="disclaimer">
      <p>
        <strong>⚠️ Aviso:</strong> Los resultados históricos no garantizan rendimiento futuro. 
        Las predicciones son probabilísticas y deben usarse como herramienta de análisis, no como consejo financiero.
        <a href="/methodology">Ver metodología completa →</a>
      </p>
    </div>

  {/if}
</div>

<style>
  .page { max-width: 1100px; margin: 0 auto; padding: 32px 20px 80px; }
  
  .page__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 28px;
  }
  
  .page__title {
    font-family: 'Orbitron', sans-serif;
    font-size: clamp(1.3rem, 3vw, 1.8rem);
    font-weight: 900;
    margin-bottom: 4px;
  }
  
  .page__subtitle { color: var(--color-text-muted); font-size: 0.9rem; }

  .btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 10px 18px; border-radius: 10px; border: none;
    font-size: 0.85rem; font-weight: 700; cursor: pointer;
    transition: opacity 0.15s, transform 0.1s;
  }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn--export { background: linear-gradient(135deg, #059669, #047857); color: #fff; }
  .btn--export:hover:not(:disabled) { transform: translateY(-1px); }

  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 14px;
    margin-bottom: 24px;
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
  
  .kpi__icon  { font-size: 1.3rem; margin-bottom: 4px; }
  .kpi__value { font-size: 1.6rem; font-weight: 800; font-family: 'DM Mono', monospace; color: var(--color-text); }
  .kpi__value--win  { color: #34d399; }
  .kpi__value--loss { color: #f87171; }
  .kpi__label { font-size: 0.72rem; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
  .kpi__sub   { font-size: 0.78rem; font-weight: 600; margin-top: 2px; }
  .kpi__sub--pos     { color: #34d399; }
  .kpi__sub--neg     { color: #f87171; }
  .kpi__sub--neutral { color: var(--color-text-muted); }

  .filters {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 24px;
    padding: 16px;
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: 12px;
  }
  
  .filter-group { display: flex; flex-direction: column; gap: 4px; }
  .filter-label { font-size: 0.72rem; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
  .filter-select {
    background: rgba(255,255,255,0.05);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 8px 12px;
    color: var(--color-text);
    font-size: 0.85rem;
    min-width: 120px;
    cursor: pointer;
  }
  .filter-select:focus { outline: none; border-color: #fbbf24; }

  .card {
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: 16px;
    padding: 22px 20px;
    margin-bottom: 20px;
  }
  
  .card__title { font-size: 1rem; font-weight: 800; margin-bottom: 16px; }
  .chart-wrap { height: 280px; }

  .breakdown-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 12px;
  }
  
  .breakdown-item {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.05);
    border-radius: 12px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .breakdown-item__period {
    font-size: 0.9rem;
    font-weight: 800;
    color: #fbbf24;
  }
  
  .breakdown-item__stats {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .breakdown-item__wr {
    font-size: 1.3rem;
    font-weight: 800;
    font-family: 'DM Mono', monospace;
  }
  
  .breakdown-item__wr.positive { color: #34d399; }
  .breakdown-item__record { font-size: 0.78rem; color: var(--color-text-muted); }
  
  .breakdown-item__profit {
    font-size: 0.9rem;
    font-weight: 700;
    font-family: 'DM Mono', monospace;
  }
  
  .breakdown-item__profit.positive { color: #34d399; }
  .breakdown-item__profit.negative { color: #f87171; }

  .table-wrap { overflow-x: auto; }
  
  .results-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
  }
  
  .results-table th,
  .results-table td {
    padding: 12px 10px;
    text-align: left;
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }
  
  .results-table th {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
    font-weight: 600;
  }
  
  .results-table tbody tr:hover {
    background: rgba(255,255,255,0.02);
  }

  .cell--date { white-space: nowrap; color: var(--color-text-muted); font-size: 0.78rem; }
  .cell--month { font-weight: 600; }
  .cell--teams { max-width: 200px; }
  .teams-text { font-size: 0.82rem; }
  .cell--mono { font-family: 'DM Mono', monospace; }
  .cell--positive { color: #34d399; }
  .cell--negative { color: #f87171; }

  .pick-badge {
    display: inline-block;
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
  }
  
  .pick-badge--over { background: rgba(52,211,153,0.15); color: #34d399; }
  .pick-badge--under { background: rgba(248,113,113,0.15); color: #f87171; }

  .conf-badge {
    display: inline-block;
    padding: 3px 6px;
    border-radius: 4px;
    font-size: 0.68rem;
    font-weight: 700;
  }
  
  .conf-badge--high { background: rgba(52,211,153,0.15); color: #34d399; }
  .conf-badge--medium { background: rgba(251,191,36,0.15); color: #fbbf24; }
  .conf-badge--low { background: rgba(248,113,113,0.15); color: #f87171; }

  .status-badge {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 0.72rem;
    font-weight: 700;
  }
  
  .badge--win { background: rgba(52,211,153,0.2); color: #34d399; }
  .badge--loss { background: rgba(248,113,113,0.2); color: #f87171; }
  .badge--push { background: rgba(148,163,184,0.2); color: #94a3b8; }

  .empty-state {
    text-align: center;
    padding: 48px 20px;
    color: var(--color-text-muted);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
  
  .empty-state span { font-size: 2.5rem; }
  .empty-state--inline { padding: 28px 20px; }

  .disclaimer {
    background: rgba(251,191,36,0.08);
    border: 1px solid rgba(251,191,36,0.2);
    border-radius: 12px;
    padding: 16px 20px;
    margin-top: 8px;
  }
  
  .disclaimer p {
    font-size: 0.82rem;
    color: var(--color-text-muted);
    line-height: 1.5;
    margin: 0;
  }
  
  .disclaimer strong { color: #fbbf24; }
  .disclaimer a { color: #fbbf24; text-decoration: underline; }

  @media (max-width: 640px) {
    .page__header { flex-direction: column; align-items: stretch; }
    .btn--export { width: 100%; justify-content: center; }
    .filters { flex-direction: column; }
    .filter-select { width: 100%; }
    .kpi-grid { grid-template-columns: repeat(2, 1fr); }
    .breakdown-grid { grid-template-columns: 1fr; }
  }
</style>