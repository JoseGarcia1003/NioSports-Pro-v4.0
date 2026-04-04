<script>
  import UpgradeGate from '$lib/components/UpgradeGate.svelte';
  import { onMount } from 'svelte';
  import { userId } from '$lib/stores/auth';
  import { allPicks } from '$lib/stores/data';
  import { TrendingUp, Target, BarChart3, Clock, Activity, Trophy, Info } from 'lucide-svelte';
  import ProfitCurve from '$lib/components/charts/ProfitCurve.svelte';
  import WinRateBar from '$lib/components/charts/WinRateBar.svelte';
  import CLVEvolution from '$lib/components/charts/CLVEvolution.svelte';
  import Sparkline from '$lib/components/charts/Sparkline.svelte';

  let loading = true;
  onMount(() => { setTimeout(() => loading = false, 300); });

  function americanToDecimal(odds) {
    const n = parseFloat(odds);
    if (isNaN(n)) return 1.909;
    return n > 0 ? (n / 100) + 1 : (100 / Math.abs(n)) + 1;
  }

  function getWinProfit(odds) { return americanToDecimal(odds || -110) - 1; }

  // Reactive data from Supabase
  $: picks = $allPicks || [];
  $: resolvedPicks = picks
    .filter(p => p.status === 'win' || p.status === 'loss' || p.result === 'win' || p.result === 'loss')
    .sort((a, b) => (a.created_at || a.createdAt || '').localeCompare(b.created_at || b.createdAt || ''));
  $: pendingPicks = picks.filter(p => p.status === 'pending' || (!p.status && !p.result));

  $: wins = resolvedPicks.filter(p => (p.status || p.result) === 'win').length;
  $: losses = resolvedPicks.filter(p => (p.status || p.result) === 'loss').length;
  $: pushes = resolvedPicks.filter(p => (p.status || p.result) === 'push').length;
  $: total = wins + losses;
  $: winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0';

  $: profitUnits = resolvedPicks.reduce((acc, p) => {
    const r = p.status || p.result;
    if (r === 'win') return acc + getWinProfit(p.odds);
    if (r === 'loss') return acc - 1;
    return acc;
  }, 0);

  $: roi = total > 0 ? ((profitUnits / total) * 100).toFixed(1) : '0.0';

  // CLV
  $: picksWithCLV = resolvedPicks.filter(p => p.clv_points != null);
  $: avgCLV = picksWithCLV.length > 0
    ? (picksWithCLV.reduce((s, p) => s + p.clv_points, 0) / picksWithCLV.length).toFixed(2)
    : null;

  // Chart data
  $: profitCurveData = (() => {
    let cum = 0;
    return resolvedPicks.map((p, i) => {
      const r = p.status || p.result;
      if (r === 'win') cum += getWinProfit(p.odds);
      else if (r === 'loss') cum -= 1;
      return { date: i, profit: parseFloat(cum.toFixed(2)) };
    });
  })();

  $: winRateBarData = ['Q1', 'HALF', 'FULL'].map(period => {
    const pp = resolvedPicks.filter(p => p.period === period);
    const w = pp.filter(p => (p.status || p.result) === 'win').length;
    const l = pp.filter(p => (p.status || p.result) === 'loss').length;
    const t = w + l;
    return { label: period, value: t > 0 ? (w / t) * 100 : 0, total: t };
  });

  $: clvData = picksWithCLV.map((p, i) => ({ index: i, clv: p.clv_points }));

  // Sparkline: rolling profit last 20
  $: recentProfits = (() => {
    const last20 = resolvedPicks.slice(-20);
    let cum = 0;
    return last20.map(p => {
      const r = p.status || p.result;
      if (r === 'win') cum += getWinProfit(p.odds);
      else if (r === 'loss') cum -= 1;
      return cum;
    });
  })();

  // Period stats
  $: periodStats = ['Q1', 'HALF', 'FULL'].map(period => {
    const pp = resolvedPicks.filter(p => p.period === period);
    const w = pp.filter(p => (p.status || p.result) === 'win').length;
    const l = pp.filter(p => (p.status || p.result) === 'loss').length;
    const t = w + l;
    const profit = pp.reduce((a, p) => {
      const r = p.status || p.result;
      if (r === 'win') return a + getWinProfit(p.odds);
      if (r === 'loss') return a - 1;
      return a;
    }, 0);
    return { period, wins: w, losses: l, total: t, winRate: t > 0 ? ((w / t) * 100).toFixed(1) : '—', profit: profit.toFixed(2) };
  });

  // Top teams
  $: teamPerf = (() => {
    const map = {};
    resolvedPicks.forEach(p => {
      const home = p.home_team || p.localTeam;
      const away = p.away_team || p.awayTeam;
      [home, away].forEach(team => {
        if (!team) return;
        if (!map[team]) map[team] = { wins: 0, losses: 0, profit: 0 };
        const r = p.status || p.result;
        if (r === 'win') { map[team].wins++; map[team].profit += getWinProfit(p.odds); }
        if (r === 'loss') { map[team].losses++; map[team].profit -= 1; }
      });
    });
    return Object.entries(map)
      .map(([team, s]) => ({ team, ...s, total: s.wins + s.losses, winRate: (s.wins + s.losses) > 0 ? ((s.wins / (s.wins + s.losses)) * 100).toFixed(0) : '0' }))
      .filter(t => t.total >= 2)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 8);
  })();
</script>

<svelte:head><title>Estadísticas — NioSports Pro</title></svelte:head>

<div class="page">
  <header class="page__header">
    <span class="page__label">Tu rendimiento</span>
    <h1 class="page__title">Estadísticas</h1>
    <p class="page__subtitle">Análisis detallado de tu historial de picks</p>
  </header>

  {#if loading}
    <div class="loading"><div class="spinner"></div><p>Cargando estadísticas...</p></div>
  {:else if picks.length === 0}
    <div class="empty">
      <BarChart3 size={48} strokeWidth={1} />
      <h2>Sin datos aún</h2>
      <p>Registra picks en <a href="/picks">Picks</a> y vuelve aquí para ver tus estadísticas.</p>
    </div>
  {:else}
  <UpgradeGate feature="fullStats" requiredPlan="elite" title="Estadísticas Avanzadas" description="Accede a CLV tracking, gráficos de profit, win rate por período y ranking de equipos con el plan Elite.">

    <!-- KPIs -->
    <div class="kpi-row">
      <div class="kpi">
        <div class="kpi__icon"><Target size={20} /></div>
        <div class="kpi__body">
          <span class="kpi__value" class:green={parseFloat(winRate) >= 52.4} class:red={total > 0 && parseFloat(winRate) < 52.4}>{winRate}%</span>
          <span class="kpi__label">Win Rate</span>
        </div>
        <span class="kpi__badge">{wins}W-{losses}L</span>
      </div>
      <div class="kpi">
        <div class="kpi__icon"><TrendingUp size={20} /></div>
        <div class="kpi__body">
          <span class="kpi__value" class:green={profitUnits >= 0} class:red={profitUnits < 0}>{profitUnits >= 0 ? '+' : ''}{profitUnits.toFixed(2)}u</span>
          <span class="kpi__label">Profit</span>
        </div>
        <div class="kpi__spark"><Sparkline data={recentProfits} color="auto" width={72} height={28} /></div>
      </div>
      <div class="kpi">
        <div class="kpi__icon"><BarChart3 size={20} /></div>
        <div class="kpi__body">
          <span class="kpi__value" class:green={parseFloat(roi) >= 0} class:red={parseFloat(roi) < 0}>{parseFloat(roi) >= 0 ? '+' : ''}{roi}%</span>
          <span class="kpi__label">ROI</span>
        </div>
        <span class="kpi__badge">{total} picks</span>
      </div>
      <div class="kpi">
        <div class="kpi__icon"><Clock size={20} /></div>
        <div class="kpi__body">
          <span class="kpi__value indigo">{pendingPicks.length}</span>
          <span class="kpi__label">Pendientes</span>
        </div>
        <span class="kpi__badge">{picks.length} total</span>
      </div>
    </div>

    <!-- CLV Banner -->
    {#if avgCLV !== null}
      <div class="clv-banner" class:clv-pos={parseFloat(avgCLV) >= 0}>
        <div class="clv-left">
          <Activity size={20} />
          <div>
            <span class="clv-title">CLV Promedio</span>
            <span class="clv-sub">{picksWithCLV.length} picks con dato</span>
          </div>
        </div>
        <span class="clv-value" class:green={parseFloat(avgCLV) >= 0} class:red={parseFloat(avgCLV) < 0}>
          {parseFloat(avgCLV) >= 0 ? '+' : ''}{avgCLV} pts
        </span>
      </div>
    {/if}

    <!-- Charts Grid -->
    <div class="charts-grid">
      <div class="card card--wide">
        <h2 class="card__title">Profit Acumulado</h2>
        <ProfitCurve data={profitCurveData} />
      </div>
      <div class="card">
        <h2 class="card__title">Win Rate por Período</h2>
        <WinRateBar data={winRateBarData} />
      </div>
      <div class="card">
        <h2 class="card__title">Evolución CLV</h2>
        <CLVEvolution data={clvData} />
      </div>
    </div>

    <!-- Period + Teams -->
    <div class="two-col">
      <div class="card">
        <h2 class="card__title">Rendimiento por Período</h2>
        <div class="period-list">
          {#each periodStats as s}
            <div class="period-row">
              <span class="period-name">{s.period}</span>
              <span class="period-wr" class:green={parseFloat(s.winRate) >= 52.4}>{s.winRate}{s.winRate !== '—' ? '%' : ''}</span>
              <span class="period-record">{s.wins}W-{s.losses}L</span>
              <span class="period-profit mono" class:green={parseFloat(s.profit) >= 0} class:red={parseFloat(s.profit) < 0}>
                {parseFloat(s.profit) >= 0 ? '+' : ''}{s.profit}u
              </span>
            </div>
          {/each}
        </div>
      </div>

      <div class="card">
        <h2 class="card__title"><Trophy size={16} /> Mejores Equipos</h2>
        {#if teamPerf.length > 0}
          <div class="team-list">
            {#each teamPerf as t, i}
              <div class="team-row">
                <div class="team-left">
                  <span class="team-rank">#{i + 1}</span>
                  <div>
                    <span class="team-name">{t.team}</span>
                    <span class="team-picks">{t.total} picks</span>
                  </div>
                </div>
                <div class="team-right">
                  <span class="team-wr" class:green={parseInt(t.winRate) >= 55}>{t.winRate}%</span>
                  <span class="team-profit mono" class:green={t.profit >= 0} class:red={t.profit < 0}>
                    {t.profit >= 0 ? '+' : ''}{t.profit.toFixed(2)}u
                  </span>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="empty-inline">
            <Target size={32} strokeWidth={1} />
            <p>Necesitas 2+ picks por equipo para ver rankings</p>
          </div>
        {/if}
      </div>
    </div>

    <!-- CLV Tip -->
    {#if avgCLV === null}
      <div class="tip">
        <Info size={16} />
        <div>
          <strong>¿Qué es CLV?</strong> El Closing Line Value mide si apostaste antes de que la línea se moviera a tu favor. CLV positivo indica que piensas como un sharp. Se calcula automáticamente cuando el cron de odds captura las líneas de cierre.
        </div>
      </div>
    {/if}
  </UpgradeGate>
  {/if}
</div>

<style>
  .page { max-width: 1000px; margin: 0 auto; padding: 60px 24px 120px; }
  @media (max-width: 768px) { .page { padding: 32px 16px 100px; } }

  .page__header { margin-bottom: 32px; }
  .page__label { font-size: 0.8rem; font-weight: 700; color: #6366F1; text-transform: uppercase; letter-spacing: 0.15em; }
  .page__title { font-family: 'Inter', sans-serif; font-size: clamp(1.8rem, 4vw, 2.5rem); font-weight: 900; letter-spacing: -0.03em; margin: 8px 0 6px; }
  .page__subtitle { font-size: 0.9rem; color: rgba(255,255,255,0.4); }

  /* KPIs */
  .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
  @media (max-width: 768px) { .kpi-row { grid-template-columns: repeat(2, 1fr); } }

  .kpi { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 18px; display: flex; align-items: flex-start; gap: 12px; position: relative; }
  .kpi__icon { color: #6366F1; margin-top: 2px; }
  .kpi__body { display: flex; flex-direction: column; gap: 2px; }
  .kpi__value { font-family: 'DM Mono', monospace; font-size: 1.5rem; font-weight: 700; }
  .kpi__label { font-size: 0.72rem; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.05em; }
  .kpi__badge { position: absolute; top: 12px; right: 14px; font-size: 0.68rem; font-weight: 600; color: rgba(255,255,255,0.35); background: rgba(255,255,255,0.05); padding: 3px 8px; border-radius: 6px; }
  .kpi__spark { position: absolute; bottom: 12px; right: 14px; }

  /* CLV Banner */
  .clv-banner { display: flex; align-items: center; justify-content: space-between; background: rgba(239,68,68,0.06); border: 1px solid rgba(239,68,68,0.15); border-radius: 14px; padding: 14px 18px; margin-bottom: 20px; }
  .clv-pos { background: rgba(16,185,129,0.06); border-color: rgba(16,185,129,0.15); }
  .clv-left { display: flex; align-items: center; gap: 12px; color: rgba(255,255,255,0.6); }
  .clv-title { font-weight: 700; font-size: 0.9rem; display: block; color: rgba(255,255,255,0.8); }
  .clv-sub { font-size: 0.75rem; color: rgba(255,255,255,0.4); }
  .clv-value { font-family: 'DM Mono', monospace; font-size: 1.5rem; font-weight: 800; }

  /* Charts */
  .charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
  @media (max-width: 768px) { .charts-grid { grid-template-columns: 1fr; } }
  .card--wide { grid-column: 1 / -1; }

  .card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 22px 20px; margin-bottom: 16px; }
  .card__title { font-family: 'Inter', sans-serif; font-size: 0.95rem; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }

  /* Two col */
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media (max-width: 640px) { .two-col { grid-template-columns: 1fr; } }

  /* Period stats */
  .period-list { display: flex; flex-direction: column; gap: 8px; }
  .period-row { display: flex; align-items: center; gap: 12px; padding: 10px 12px; background: rgba(255,255,255,0.03); border-radius: 10px; }
  .period-name { font-weight: 800; color: #6366F1; width: 48px; font-size: 0.85rem; }
  .period-wr { font-family: 'DM Mono', monospace; font-weight: 700; width: 48px; }
  .period-record { font-size: 0.78rem; color: rgba(255,255,255,0.4); flex: 1; }
  .period-profit { font-weight: 700; }

  /* Team list */
  .team-list { display: flex; flex-direction: column; gap: 8px; }
  .team-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: rgba(255,255,255,0.03); border-radius: 10px; }
  .team-left { display: flex; align-items: center; gap: 10px; }
  .team-rank { font-family: 'DM Mono', monospace; font-size: 0.75rem; color: rgba(255,255,255,0.3); width: 24px; }
  .team-name { font-weight: 700; font-size: 0.88rem; display: block; }
  .team-picks { font-size: 0.7rem; color: rgba(255,255,255,0.35); }
  .team-right { display: flex; align-items: center; gap: 14px; }
  .team-wr { font-weight: 700; font-size: 0.88rem; }
  .team-profit { font-weight: 800; font-size: 0.9rem; }

  /* Shared */
  .green { color: #10B981; }
  .red { color: #EF4444; }
  .indigo { color: #6366F1; }
  .mono { font-family: 'DM Mono', monospace; }

  .empty { text-align: center; padding: 80px 20px; color: rgba(255,255,255,0.25); display: flex; flex-direction: column; align-items: center; gap: 12px; }
  .empty h2 { font-size: 1.2rem; color: rgba(255,255,255,0.6); }
  .empty a { color: #6366F1; text-decoration: underline; }
  .empty-inline { text-align: center; padding: 24px; color: rgba(255,255,255,0.3); display: flex; flex-direction: column; align-items: center; gap: 8px; font-size: 0.85rem; }

  .loading { display: flex; flex-direction: column; align-items: center; padding: 60px; gap: 16px; color: rgba(255,255,255,0.4); }
  .spinner { width: 32px; height: 32px; border: 3px solid rgba(99,102,241,0.2); border-top-color: #6366F1; border-radius: 50%; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .tip { display: flex; gap: 12px; padding: 14px 18px; background: rgba(99,102,241,0.05); border: 1px solid rgba(99,102,241,0.12); border-radius: 12px; font-size: 0.83rem; color: rgba(255,255,255,0.5); line-height: 1.5; margin-top: 8px; }
  .tip strong { color: #6366F1; }
</style>