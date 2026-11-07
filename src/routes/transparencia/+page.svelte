<script>
  import { onMount } from 'svelte';
  import { MIN_SAMPLE } from '$lib/stats/calibration.js';

  // Public track record from the sealed ledger, plus each model's out-of-sample
  // backtest — always labelled as such and never mixed with published results.
  let state = 'loading', data = null;
  onMount(async () => {
    try { const res = await fetch('/api/public/transparency'); data = await res.json(); state = res.ok ? 'ready' : 'unavailable'; }
    catch { state = 'unavailable'; }
  });
  const pct = v => (v == null ? '—' : `${(v * 100).toLocaleString('es', { maximumFractionDigits: 1 })} %`);
  const num = (v, d = 3) => (v == null ? '—' : v.toLocaleString('es', { minimumFractionDigits: d, maximumFractionDigits: d }));
  const ci = c => (c ? `${pct(c.low)} – ${pct(c.high)}` : '—');
  $: r = data?.record;
  $: m = data?.models?.[0];
  $: bt = m?.backtest;
  // Reliability chart geometry (0..1 on both axes).
  const W = 280, P = 28;
  const x = v => P + v * (W - 2 * P), y = v => W - P - v * (W - 2 * P);
</script>

<svelte:head><title>Transparencia · NioSports Pro</title><meta name="description" content="Rendimiento real y calibración de los pronósticos sellados de NioSports, con tamaños de muestra e intervalos de confianza." /></svelte:head>

<div class="page">
  <header class="head">
    <p class="eyebrow">Transparencia · Rendimiento real</p>
    <h1>Lo que de verdad acertamos</h1>
    <p class="lead">Calculado solo con los pronósticos del <a href="/verificar">registro sellado</a>: no se pueden quitar los fallos porque el cálculo recorre la cadena completa. Con menos de {MIN_SAMPLE} pronósticos decididos, ninguna cifra es concluyente.</p>
  </header>

  {#if state === 'loading'}
    <p class="state" role="status">Calculando…</p>
  {:else if state === 'unavailable'}
    <p class="state">No pudimos calcular el historial ahora mismo. No mostramos cifras sin fuente.</p>
  {:else}
    {#if !r.overall.conclusive}
      <p class="warn" role="note"><b>Muestra insuficiente.</b> Hay {r.overall.decided} pronósticos decididos de los {MIN_SAMPLE} mínimos. Las cifras se muestran para que puedas auditarlas, no como prueba de acierto.</p>
    {/if}
    <section class="tiles" aria-label="Resumen">
      <div class="tile"><small>Publicados</small><b>{r.overall.total}</b><em>{r.seals} ediciones · {r.hiddenSeals} aún ocultas</em></div>
      <div class="tile"><small>Acertados</small><b class="hit">{r.overall.hit}</b><em>Fallados {r.overall.miss}</em></div>
      <div class="tile"><small>Anulados / empate</small><b>{r.overall.void + r.overall.push}</b><em>Pendientes {r.overall.pending}</em></div>
      <div class="tile"><small>Tasa de acierto</small><b>{pct(r.overall.hitRate)}</b><em>IC 95 %: {ci(r.overall.hitRateCI)}</em></div>
    </section>

    <section class="block" aria-labelledby="cal-title">
      <h2 id="cal-title">Calibración</h2>
      <p class="muted">Solo cuentan los pronósticos que llevaban una probabilidad del modelo ({r.probabilistic.scored} decididos). Si el modelo dice 60 %, debería acertar cerca del 60 % de esas veces.</p>
      <dl class="metrics">
        <div><dt>Brier (menor es mejor)</dt><dd>{num(r.probabilistic.brier)}</dd></div>
        <div><dt>Log loss</dt><dd>{num(r.probabilistic.logLoss)}</dd></div>
        <div><dt>Prob. media / frecuencia real</dt><dd>{pct(r.probabilistic.meanP)} / {pct(r.probabilistic.scoredHitRate)}</dd></div>
      </dl>
      {#if !r.probabilistic.scored}<p class="state">Aún no hay pronósticos probabilísticos liquidados. Aparecerán cuando terminen los partidos de las ediciones selladas con el modelo {m?.id}@{m?.version}.</p>{/if}
    </section>

    {#if r.byMonth.length}
      <section class="block" aria-labelledby="month-title">
        <h2 id="month-title">Evolución mensual</h2>
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <div class="scroller" tabindex="0" role="region" aria-label="Rendimiento por mes">
          <table>
            <thead><tr><th scope="col">Mes</th><th scope="col">Publicados</th><th scope="col">Decididos</th><th scope="col">Acierto</th><th scope="col">IC 95 %</th><th scope="col">Brier</th></tr></thead>
            <tbody>{#each r.byMonth as g}<tr><th scope="row">{g.key}</th><td>{g.total}</td><td>{g.decided}</td><td>{pct(g.hitRate)}</td><td>{ci(g.hitRateCI)}</td><td>{num(g.brier)}</td></tr>{/each}</tbody>
          </table>
        </div>
      </section>
      <section class="block" aria-labelledby="model-title">
        <h2 id="model-title">Por deporte, mercado y modelo</h2>
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <div class="scroller" tabindex="0" role="region" aria-label="Rendimiento por grupo">
          <table>
            <thead><tr><th scope="col">Grupo</th><th scope="col">Decididos</th><th scope="col">Acierto</th><th scope="col">IC 95 %</th></tr></thead>
            <tbody>{#each [...r.byMarket, ...r.byModel] as g}<tr><th scope="row">{g.key}</th><td>{g.decided}</td><td>{pct(g.hitRate)}</td><td>{ci(g.hitRateCI)}</td></tr>{/each}</tbody>
          </table>
        </div>
        {#if r.retroactive.total}<p class="muted small">{r.retroactive.total} pronósticos proceden de una edición sellada retroactivamente (2/11/2026) y se identifican como tales en el registro.</p>{/if}
      </section>
    {/if}

    {#if m && bt}
      <section class="block model" aria-labelledby="bt-title">
        <h2 id="bt-title">Modelo {m.id} · versión {m.version}</h2>
        <p class="warn" role="note"><b>Esto es una prueba histórica, no resultados publicados.</b> {bt.protocol} {bt.line}</p>
        <dl class="metrics">
          <div><dt>Partidos de prueba</dt><dd>{bt.testGames.toLocaleString('es')}</dd></div>
          <div><dt>Brier modelo</dt><dd>{num(bt.calibrated.brier)}</dd></div>
          <div><dt>Brier regla L10</dt><dd>{num(bt.naiveL10.brier)}</dd></div>
          <div><dt>Mejora sobre tasa base</dt><dd>{pct(bt.calibrated.skillVsBaseRate)}</dd></div>
          <div><dt>Cobertura intervalo 80 %</dt><dd>{pct(bt.interval80.coverage)}</dd></div>
        </dl>
        <figure class="chart">
          <svg viewBox={`0 0 ${W} ${W}`} role="img" aria-labelledby="rel-cap">
            <line x1={x(0)} y1={y(0)} x2={x(1)} y2={y(1)} class="diag" />
            <line x1={x(0)} y1={y(0)} x2={x(1)} y2={y(0)} class="axis" /><line x1={x(0)} y1={y(0)} x2={x(0)} y2={y(1)} class="axis" />
            {#each [0, 0.5, 1] as t}<text x={x(t)} y={W - 8} text-anchor="middle">{t * 100}%</text><text x={8} y={y(t) + 4}>{t * 100}</text>{/each}
            <polyline class="curve" points={bt.calibrated.reliability.map(b => `${x(b.meanP)},${y(b.observed)}`).join(' ')} />
            {#each bt.calibrated.reliability as b}<circle cx={x(b.meanP)} cy={y(b.observed)} r={Math.max(2.5, Math.min(7, Math.sqrt(b.n) / 3))}><title>{b.bin}: prob. media {pct(b.meanP)}, real {pct(b.observed)} (n={b.n})</title></circle>{/each}
          </svg>
          <figcaption id="rel-cap">Curva de calibración (prueba histórica): eje horizontal, probabilidad estimada; vertical, frecuencia observada. La diagonal es la calibración perfecta; el tamaño del punto refleja el número de casos.</figcaption>
        </figure>
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <div class="scroller" tabindex="0" role="region" aria-label="Tabla de calibración">
          <table>
            <thead><tr><th scope="col">Tramo</th><th scope="col">Casos</th><th scope="col">Prob. media</th><th scope="col">Frecuencia real</th></tr></thead>
            <tbody>{#each bt.calibrated.reliability as b}<tr><th scope="row">{b.bin}</th><td>{b.n}</td><td>{pct(b.meanP)}</td><td>{pct(b.observed)}</td></tr>{/each}</tbody>
          </table>
        </div>
        <h3>Limitaciones</h3>
        <ul>{#each bt.limitations as l}<li>{l}</li>{/each}<li>{bt.rejected}</li></ul>
        <h3>Registro de cambios</h3>
        <ul>{#each m.changelog as c}<li>{c}</li>{/each}</ul>
      </section>
    {/if}
  {/if}
</div>

<style>
  .page { max-width: 1000px; margin: 0 auto; padding: 32px 24px 100px; color: var(--nio-ink); font-variant-numeric: tabular-nums; }
  .eyebrow { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; font-weight: 600; color: var(--nio-muted); margin: 0 0 8px; }
  h1 { font-family: var(--font-display); text-transform: uppercase; font-weight: 800; font-size: clamp(34px, 4.2vw, 52px); line-height: .95; margin: 0 0 12px; }
  h2 { font-family: var(--font-display); text-transform: uppercase; font-size: 22px; margin: 0 0 10px; }
  h3 { font-size: 15px; margin: 14px 0 6px; }
  .lead { color: var(--nio-muted); line-height: 1.6; max-width: 760px; margin: 0 0 20px; }
  .lead a { color: var(--nio-accent); }
  .state, .muted { color: var(--nio-muted); line-height: 1.55; }
  .small { font-size: 12px; }
  .warn { padding: 12px 14px; border-radius: 12px; background: var(--nio-gold-soft); border: 1px solid var(--nio-gold-border); font-size: 13px; line-height: 1.55; margin: 0 0 16px; }
  .tiles { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 20px; }
  .tile { border: 1px solid var(--nio-border); border-radius: 14px; background: var(--nio-surface); padding: 14px; display: grid; gap: 2px; }
  .tile small { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: var(--nio-muted); font-weight: 600; }
  .tile b { font-family: var(--font-display); font-size: 34px; line-height: 1.05; }
  .tile b.hit { color: var(--nio-hit); }
  .tile em { font-style: normal; font-size: 12px; color: var(--nio-muted); }
  .block { border-top: 1px solid var(--nio-border); padding-top: 18px; margin-top: 18px; }
  .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; margin: 0 0 14px; }
  .metrics div { border: 1px solid var(--nio-border); border-radius: 12px; padding: 10px 12px; background: var(--nio-surface); }
  dt { font-size: 11px; color: var(--nio-muted); font-weight: 600; }
  dd { margin: 4px 0 0; font-family: var(--font-display); font-size: 22px; }
  .scroller { overflow-x: auto; border: 1px solid var(--nio-border); border-radius: 12px; background: var(--nio-surface); }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { padding: 9px 10px; text-align: right; border-bottom: 1px solid var(--nio-border); white-space: nowrap; }
  th[scope='row'], thead th:first-child { text-align: left; }
  thead th { background: var(--nio-raised); color: var(--nio-muted); font-size: 11px; }
  .chart { margin: 0 0 14px; display: grid; gap: 8px; max-width: 360px; }
  .chart svg { width: 100%; height: auto; }
  .chart text { font-size: 10px; fill: var(--nio-muted); }
  .diag { stroke: var(--nio-muted); stroke-dasharray: 4 4; }
  .axis { stroke: var(--nio-border); }
  .curve { fill: none; stroke: var(--nio-accent); stroke-width: 2; }
  circle { fill: var(--nio-accent); }
  figcaption { font-size: 12px; color: var(--nio-muted); line-height: 1.5; }
  ul { margin: 0; padding-left: 20px; color: var(--nio-muted); line-height: 1.7; font-size: 14px; }
  a:focus-visible, .scroller:focus-visible { outline: 2px solid var(--nio-accent); outline-offset: 2px; }
  @media (max-width: 720px) { .page { padding: 24px 16px 100px; } .tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
