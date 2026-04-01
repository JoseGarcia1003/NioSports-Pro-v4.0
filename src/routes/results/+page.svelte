<script>
  import { onMount } from 'svelte';
  import { allPicks } from '$lib/stores/data';
  import { BarChart3, TrendingUp, Target, Activity, Download, Filter } from 'lucide-svelte';
  import ProfitCurve from '$lib/components/charts/ProfitCurve.svelte';
  import WinRateBar from '$lib/components/charts/WinRateBar.svelte';
  import CLVEvolution from '$lib/components/charts/CLVEvolution.svelte';
  import CalibrationPlot from '$lib/components/charts/CalibrationPlot.svelte';

  let loading = true;

  let periodFilter = 'all';
  let monthFilter = 'all';
  let confidenceFilter = 'all';

  onMount(() => { setTimeout(() => loading = false, 300); });

  // Data
  $: picksArray = $allPicks || [];
  $: resolvedPicks = picksArray.filter(p => p.status === 'win' || p.status === 'loss' || p.result === 'win' || p.result === 'loss' || p.status === 'push');

  $: filteredPicks = resolvedPicks.filter(p => {
    if (periodFilter !== 'all' && p.period !== periodFilter) return false;
    if (confidenceFilter !== 'all' && p.confidence !== confidenceFilter) return false;
    if (monthFilter !== 'all') {
      const d = p.resolved_at || p.created_at || p.createdAt || '';
      if (d.slice(0, 7) !== monthFilter) return false;
    }
    return true;
  });

  // Stats
  $: wins = filteredPicks.filter(p => p.status === 'win' || p.result === 'win').length;
  $: losses = filteredPicks.filter(p => p.status === 'loss' || p.result === 'loss').length;
  $: pushes = filteredPicks.filter(p => p.status === 'push' || p.result === 'push').length;
  $: total = wins + losses;
  $: winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : '—';

  $: profitData = calculateProfit(filteredPicks);
  $: profit = profitData.profit;
  $: roi = profitData.roi;
  $: avgCLV = profitData.avgCLV;

  $: availableMonths = [...new Set(resolvedPicks.map(p => {
    const d = p.resolved_at || p.created_at || p.createdAt || '';
    return d.slice(0, 7);
  }).filter(Boolean))].sort().reverse();

  // Chart data
  $: profitCurveData = buildProfitCurve(filteredPicks);
  $: winRateBarData = buildWinRateBar(resolvedPicks);
  $: clvData = buildCLVData(filteredPicks);
  $: calibrationData = buildCalibrationData(resolvedPicks);
  $: periodBreakdown = calculatePeriodBreakdown(resolvedPicks);
  $: monthlyBreakdown = calculateMonthlyBreakdown(resolvedPicks);

  function americanToDecimal(odds) {
    if (!odds) return 1.909;
    if (odds > 0) return (odds / 100) + 1;
    return (100 / Math.abs(odds)) + 1;
  }

  function calculateProfit(picks) {
    let totalProfit = 0;
    let totalCLV = 0;
    let clvCount = 0;

    picks.forEach(p => {
      const result = p.status || p.result;
      if (result === 'push') return;
      const decimalOdds = americanToDecimal(p.odds || -110);
      if (result === 'win') totalProfit += (decimalOdds - 1);
      else if (result === 'loss') totalProfit -= 1;

      if (p.clv_points != null) {
        totalCLV += p.clv_points;
        clvCount++;
      } else if (p.closing_line && p.line) {
        const dir = p.direction || p.betType || 'OVER';
        const clv = dir === 'OVER' ? p.closing_line - p.line : p.line - p.closing_line;
        totalCLV += clv;
        clvCount++;
      }
    });

    const totalBets = picks.filter(p => (p.status || p.result) !== 'push').length;
    return {
      profit: totalProfit.toFixed(2),
      roi: totalBets > 0 ? ((totalProfit / totalBets) * 100).toFixed(1) : '0.0',
      avgCLV: clvCount > 0 ? (totalCLV / clvCount).toFixed(2) : null,
    };
  }

  function buildProfitCurve(picks) {
    const sorted = [...picks]
      .filter(p => (p.status || p.result) !== 'push')
      .sort((a, b) => {
        const da = a.resolved_at || a.created_at || a.createdAt || '';
        const db = b.resolved_at || b.created_at || b.createdAt || '';
        return da.localeCompare(db);
      });

    let cum = 0;
    return sorted.map((p, i) => {
      const result = p.status || p.result;
      const odds = americanToDecimal(p.odds || -110);
      if (result === 'win') cum += (odds - 1);
      else cum -= 1;
      return { date: i, profit: parseFloat(cum.toFixed(2)) };
    });
  }

  function buildWinRateBar(picks) {
    return ['Q1', 'HALF', 'FULL'].map(period => {
      const pp = picks.filter(p => p.period === period);
      const w = pp.filter(p => (p.status || p.result) === 'win').length;
      const l = pp.filter(p => (p.status || p.result) === 'loss').length;
      const t = w + l;
      return { label: period, value: t > 0 ? (w / t) * 100 : 0, total: t };
    });
  }

  function buildCLVData(picks) {
    return picks
      .filter(p => p.clv_points != null)
      .map((p, i) => ({ index: i, clv: p.clv_points }));
  }

  function buildCalibrationData(picks) {
    const withProb = picks.filter(p => p.probability != null || p.probability_pct != null);
    if (withProb.length < 10) return [];

    const bins = Array.from({ length: 10 }, (_, i) => ({
      min: i * 0.1, max: (i + 1) * 0.1, predicted: 0, actual: 0, count: 0,
    }));

    withProb.forEach(p => {
      const prob = p.probability || (p.probability_pct ? p.probability_pct / 100 : null);
      if (prob == null) return;
      const result = (p.status || p.result) === 'win' ? 1 : 0;
      const bin = bins[Math.min(Math.floor(prob * 10), 9)];
      bin.predicted += prob;
      bin.actual += result;
      bin.count++;
    });

    return bins
      .filter(b => b.count >= 3)
      .map(b => ({
        predicted: b.predicted / b.count,
        actual: b.actual / b.count,
        count: b.count,
      }));
  }

  function calculatePeriodBreakdown(picks) {
    return ['Q1', 'HALF', 'FULL'].map(period => {
      const pp = picks.filter(p => p.period === period);
      const w = pp.filter(p => (p.status || p.result) === 'win').length;
      const l = pp.filter(p => (p.status || p.result) === 'loss').length;
      const t = w + l;
      const pd = calculateProfit(pp);
      return { period, wins: w, losses: l, total: t, winRate: t > 0 ? ((w / t) * 100).toFixed(1) : '—', profit: pd.profit, roi: pd.roi };
    });
  }

  function calculateMonthlyBreakdown(picks) {
    const months = [...new Set(picks.map(p => {
      const d = p.resolved_at || p.created_at || p.createdAt || '';
      return d.slice(0, 7);
    }).filter(Boolean))].sort().reverse();

    return months.map(month => {
      const mp = picks.filter(p => {
        const d = p.resolved_at || p.created_at || p.createdAt || '';
        return d.slice(0, 7) === month;
      });
      const w = mp.filter(p => (p.status || p.result) === 'win').length;
      const l = mp.filter(p => (p.status || p.result) === 'loss').length;
      const t = w + l;
      const pd = calculateProfit(mp);
      const [year, m] = month.split('-');
      const name = new Date(year, parseInt(m) - 1).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
      return { month: name, wins: w, losses: l, total: t, winRate: t > 0 ? ((w / t) * 100).toFixed(1) : '—', profit: pd.profit, roi: pd.roi };
    });
  }

  function downloadCSV() {
    const headers = ['Fecha', 'Periodo', 'Direccion', 'Linea', 'Proyeccion', 'Confianza', 'Resultado', 'CLV'];
    const rows = filteredPicks.map(p => [
      (p.resolved_at || p.created_at || p.createdAt || '').slice(0, 10),
      p.period, p.direction || p.betType, p.line || p.bet_line,
      p.projection?.toFixed?.(1) || '', p.confidence,
      p.status || p.result, p.clv_points ?? ''
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `niosports-results-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  function statusBadge(s) {
    if (s === 'win') return { text: 'Win', cls: 'badge--win' };
    if (s === 'loss') return { text: 'Loss', cls: 'badge--loss' };
    return { text: 'Push', cls: 'badge--push' };
  }
</script>

<svelte:head>
  <title>Track Record — NioSports Pro</title>
  <meta name="description" content="Track record público y verificable de NioSports Pro. Resultados con CLV tracking." />
</svelte:head>

<div class="page">
  <header class="page__header">
    <div>
      <span class="page__label">Transparencia total</span>
      <h1 class="page__title">Track Record</h1>
      <p class="page__subtitle">Resultados verificables del Motor Predictivo v3.0</p>
    </div>
    <button class="btn-export" on:click={downloadCSV} disabled={filteredPicks.length === 0}>
      <Download size={16} />
      Exportar CSV
    </button>
  </header>

  <!-- KPIs -->
  <div class="kpi-row">
    <div class="kpi">
      <div class="kpi__icon"><Target size={20} /></div>
      <div class="kpi__body">
        <span class="kpi__value">{total}</span>
        <span class="kpi__label">Picks resueltos</span>
      </div>
      <span class="kpi__badge">{wins}W-{losses}L</span>
    </div>
    <div class="kpi">
      <div class="kpi__icon"><TrendingUp size={20} /></div>
      <div class="kpi__body">
        <span class="kpi__value" class:green={parseFloat(winRate) >= 52.4} class:red={winRate !== '—' && parseFloat(winRate) < 52.4}>{winRate}{winRate !== '—' ? '%' : ''}</span>
        <span class="kpi__label">Win Rate</span>
      </div>
      <span class="kpi__badge">{parseFloat(winRate) >= 52.4 ? 'Sobre BE' : winRate !== '—' ? 'Bajo BE' : '—'}</span>
    </div>
    <div class="kpi">
      <div class="kpi__icon"><BarChart3 size={20} /></div>
      <div class="kpi__body">
        <span class="kpi__value" class:green={parseFloat(profit) >= 0} class:red={parseFloat(profit) < 0}>{parseFloat(profit) >= 0 ? '+' : ''}{profit}u</span>
        <span class="kpi__label">Profit</span>
      </div>
      <span class="kpi__badge">ROI: {parseFloat(roi) >= 0 ? '+' : ''}{roi}%</span>
    </div>
    <div class="kpi">
      <div class="kpi__icon"><Activity size={20} /></div>
      <div class="kpi__body">
        <span class="kpi__value" class:green={avgCLV && parseFloat(avgCLV) > 0} class:red={avgCLV && parseFloat(avgCLV) < 0}>{avgCLV ? (parseFloat(avgCLV) > 0 ? '+' : '') + avgCLV : '—'}</span>
        <span class="kpi__label">CLV Promedio</span>
      </div>
      <span class="kpi__badge">{avgCLV ? 'Pts vs cierre' : 'Sin datos'}</span>
    </div>
  </div>

  <!-- Filters -->
  <div class="filters">
    <Filter size={16} />
    <select bind:value={periodFilter}>
      <option value="all">Todo período</option>
      <option value="Q1">Q1</option>
      <option value="HALF">HALF</option>
      <option value="FULL">FULL</option>
    </select>
    <select bind:value={monthFilter}>
      <option value="all">Todo mes</option>
      {#each availableMonths as m}<option value={m}>{m}</option>{/each}
    </select>
    <select bind:value={confidenceFilter}>
      <option value="all">Toda confianza</option>
      <option value="HIGH">Alta</option>
      <option value="MEDIUM">Media</option>
      <option value="LOW">Baja</option>
    </select>
  </div>

  <!-- Charts Grid -->
  <div class="charts-grid">
    <div class="card card--wide">
      <h2 class="card__title">Evolución del Profit</h2>
      <ProfitCurve data={profitCurveData} />
    </div>
    <div class="card">
      <h2 class="card__title">Win Rate por Período</h2>
      <WinRateBar data={winRateBarData} />
    </div>
    <div class="card card--wide">
      <h2 class="card__title">Evolución CLV</h2>
      <CLVEvolution data={clvData} />
    </div>
    <div class="card">
      <h2 class="card__title">Calibración</h2>
      <CalibrationPlot data={calibrationData} />
    </div>
  </div>

  <!-- Period Breakdown -->
  <div class="card">
    <h2 class="card__title">Rendimiento por Período</h2>
    <div class="breakdown-grid">
      {#each periodBreakdown as item}
        <div class="bd-card">
          <span class="bd-card__period">{item.period}</span>
          <span class="bd-card__wr" class:green={parseFloat(item.winRate) >= 52.4}>{item.winRate}{item.winRate !== '—' ? '%' : ''}</span>
          <span class="bd-card__record">{item.wins}W-{item.losses}L</span>
          <span class="bd-card__profit" class:green={parseFloat(item.profit) >= 0} class:red={parseFloat(item.profit) < 0}>{parseFloat(item.profit) >= 0 ? '+' : ''}{item.profit}u</span>
        </div>
      {/each}
    </div>
  </div>

  <!-- Monthly Table -->
  {#if monthlyBreakdown.length > 0}
    <div class="card">
      <h2 class="card__title">Rendimiento Mensual</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Mes</th><th>Picks</th><th>W-L</th><th>WR</th><th>Profit</th><th>ROI</th></tr></thead>
          <tbody>
            {#each monthlyBreakdown as row}
              <tr>
                <td class="cell-bold">{row.month}</td>
                <td>{row.total}</td>
                <td>{row.wins}-{row.losses}</td>
                <td class:green={parseFloat(row.winRate) >= 52.4}>{row.winRate}%</td>
                <td class="mono" class:green={parseFloat(row.profit) >= 0} class:red={parseFloat(row.profit) < 0}>{parseFloat(row.profit) >= 0 ? '+' : ''}{row.profit}u</td>
                <td class="mono" class:green={parseFloat(row.roi) >= 0} class:red={parseFloat(row.roi) < 0}>{parseFloat(row.roi) >= 0 ? '+' : ''}{row.roi}%</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}

  <!-- Picks History -->
  <div class="card">
    <h2 class="card__title">Historial de Picks ({filteredPicks.length})</h2>
    {#if filteredPicks.length === 0}
      <div class="empty">
        <BarChart3 size={40} strokeWidth={1} />
        <p>No hay picks resueltos con los filtros seleccionados</p>
      </div>
    {:else}
      <div class="table-wrap">
        <table>
          <thead><tr><th>Fecha</th><th>Pick</th><th>Línea</th><th>Proy.</th><th>Conf.</th><th>Resultado</th><th>CLV</th></tr></thead>
          <tbody>
            {#each [...filteredPicks].sort((a, b) => {
              const da = b.resolved_at || b.created_at || b.createdAt || '';
              const db = a.resolved_at || a.created_at || a.createdAt || '';
              return da.localeCompare(db);
            }) as pick}
              {@const result = pick.status || pick.result}
              {@const badge = statusBadge(result)}
              {@const clv = pick.clv_points}
              <tr>
                <td class="cell-muted">{(pick.resolved_at || pick.created_at || pick.createdAt || '').slice(5, 10)}</td>
                <td><span class="dir-badge" class:dir-over={pick.direction === 'OVER' || pick.betType === 'OVER'}>{pick.period} {pick.direction || pick.betType || ''}</span></td>
                <td class="mono">{pick.line || pick.bet_line || '—'}</td>
                <td class="mono">{pick.projection?.toFixed?.(1) || '—'}</td>
                <td><span class="conf conf--{(pick.confidence || 'medium').toLowerCase()}">{pick.confidence || 'MED'}</span></td>
                <td><span class="status {badge.cls}">{badge.text}</span></td>
                <td class="mono" class:green={clv && clv > 0} class:red={clv && clv < 0}>{clv != null ? (clv > 0 ? '+' : '') + clv.toFixed(1) : '—'}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>

  <!-- Disclaimer -->
  <div class="disclaimer">
    Los resultados históricos no garantizan rendimiento futuro. Las predicciones son probabilísticas.
    <a href="/methodology">Ver metodología completa</a>
  </div>
</div>

<style>
  .page { max-width: 1100px; margin: 0 auto; padding: 60px 24px 120px; }
  @media (max-width: 768px) { .page { padding: 32px 16px 100px; } }

  .page__header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; margin-bottom: 36px; }
  .page__label { font-size: 0.8rem; font-weight: 700; color: #6366F1; text-transform: uppercase; letter-spacing: 0.15em; }
  .page__title { font-family: 'Inter', sans-serif; font-size: clamp(1.8rem, 4vw, 2.5rem); font-weight: 900; letter-spacing: -0.03em; margin: 8px 0 6px; }
  .page__subtitle { font-size: 1rem; color: rgba(255,255,255,0.45); }

  .btn-export {
    display: flex; align-items: center; gap: 8px;
    padding: 10px 20px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.7);
    font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s;
  }
  .btn-export:hover:not(:disabled) { background: rgba(255,255,255,0.08); color: #fff; }
  .btn-export:disabled { opacity: 0.3; cursor: not-allowed; }

  /* KPIs */
  .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }
  @media (max-width: 768px) { .kpi-row { grid-template-columns: repeat(2, 1fr); } }

  .kpi {
    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
    border-radius: 16px; padding: 18px; display: flex; align-items: flex-start; gap: 12px; position: relative;
  }
  .kpi__icon { color: #6366F1; margin-top: 2px; }
  .kpi__body { display: flex; flex-direction: column; gap: 2px; }
  .kpi__value { font-family: 'DM Mono', monospace; font-size: 1.5rem; font-weight: 700; }
  .kpi__label { font-size: 0.72rem; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.05em; }
  .kpi__badge { position: absolute; top: 12px; right: 14px; font-size: 0.68rem; font-weight: 600; color: rgba(255,255,255,0.35); background: rgba(255,255,255,0.05); padding: 3px 8px; border-radius: 6px; }

  /* Filters */
  .filters {
    display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
    margin-bottom: 24px; padding: 12px 16px;
    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px;
    color: rgba(255,255,255,0.4);
  }
  .filters select {
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
    border-radius: 8px; padding: 7px 12px; color: rgba(255,255,255,0.8);
    font-size: 0.82rem; cursor: pointer;
  }
  .filters select:focus { outline: none; border-color: #6366F1; }

  /* Charts */
  .charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
  @media (max-width: 768px) { .charts-grid { grid-template-columns: 1fr; } }
  .card--wide { grid-column: 1 / -1; }

  .card {
    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
    border-radius: 16px; padding: 22px 20px; margin-bottom: 16px;
  }
  .card__title { font-family: 'Inter', sans-serif; font-size: 0.95rem; font-weight: 700; margin-bottom: 16px; letter-spacing: -0.01em; }

  /* Period breakdown */
  .breakdown-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  @media (max-width: 640px) { .breakdown-grid { grid-template-columns: 1fr; } }

  .bd-card {
    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
    border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 6px;
  }
  .bd-card__period { font-size: 0.85rem; font-weight: 800; color: #6366F1; }
  .bd-card__wr { font-family: 'DM Mono', monospace; font-size: 1.4rem; font-weight: 700; }
  .bd-card__record { font-size: 0.78rem; color: rgba(255,255,255,0.4); }
  .bd-card__profit { font-family: 'DM Mono', monospace; font-size: 0.9rem; font-weight: 600; }

  /* Tables */
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
  th, td { padding: 11px 10px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.04); }
  th { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: rgba(255,255,255,0.35); font-weight: 600; }
  tbody tr:hover { background: rgba(255,255,255,0.02); }

  .mono { font-family: 'DM Mono', monospace; }
  .cell-bold { font-weight: 600; }
  .cell-muted { color: rgba(255,255,255,0.4); font-size: 0.78rem; }
  .green { color: #10B981; }
  .red { color: #EF4444; }

  .dir-badge {
    display: inline-block; padding: 3px 8px; border-radius: 6px;
    font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
    background: rgba(239,68,68,0.12); color: #F87171;
  }
  .dir-over { background: rgba(16,185,129,0.12); color: #10B981; }

  .conf { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 0.68rem; font-weight: 700; }
  .conf--high { background: rgba(16,185,129,0.12); color: #10B981; }
  .conf--medium { background: rgba(99,102,241,0.12); color: #818CF8; }
  .conf--low { background: rgba(239,68,68,0.12); color: #F87171; }

  .status { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 0.7rem; font-weight: 700; }
  .badge--win { background: rgba(16,185,129,0.15); color: #10B981; }
  .badge--loss { background: rgba(239,68,68,0.15); color: #EF4444; }
  .badge--push { background: rgba(148,163,184,0.15); color: #94A3B8; }

  .empty { text-align: center; padding: 48px 20px; color: rgba(255,255,255,0.25); display: flex; flex-direction: column; align-items: center; gap: 12px; }

  .disclaimer {
    margin-top: 20px; padding: 14px 18px;
    background: rgba(99,102,241,0.05); border: 1px solid rgba(99,102,241,0.15);
    border-radius: 12px; font-size: 0.8rem; color: rgba(255,255,255,0.4); line-height: 1.6;
  }
  .disclaimer a { color: #6366F1; text-decoration: underline; }

  @media (max-width: 640px) {
    .page__header { flex-direction: column; }
    .btn-export { width: 100%; justify-content: center; }
    .filters { flex-direction: column; align-items: stretch; }
    .filters select { width: 100%; }
  }
</style>