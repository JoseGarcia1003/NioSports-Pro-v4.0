<script>
  import { onMount } from 'svelte';
  import { userId } from '$lib/stores/auth';
  import { subscription } from '$lib/stores/subscription';
  import { teamStats, picksStore } from '$lib/stores/data';
  import { toasts } from '$lib/stores/ui';
  import { BarChart3, Home, Plane, Settings, Save, X, TrendingUp, BookOpen, ChevronDown } from 'lucide-svelte';
  import TeamSelector from '$lib/components/TeamSelector.svelte';
  import { MODEL_VERSION } from '$lib/engine/constants.js';

  let statsData = null;
  let loadingStats = true;
  let statsError = false;
  let localTeam = '';
  let awayTeam = '';
  let localB2B = false;
  let awayB2B = false;
  let localInjury = false;
  let awayInjury = false;
  let savingPick = false;
  let saveTarget = null;
  let glossaryOpen = false;

  let dirQ1 = 'OVER';
  let dirHalf = 'OVER';
  let dirFull = 'OVER';

  let lineQ1Over = '', lineQ1Under = '';
  let lineHalfOver = '', lineHalfUnder = '';
  let lineFullOver = '', lineFullUnder = '';

  let oddsQ1 = '1.91', oddsHalf = '1.91', oddsFull = '1.91';

  onMount(async () => {
    try {
      const res = await fetch('/data/nba-stats.json');
      if (!res.ok) throw new Error('No disponible');
      const raw = await res.json();
      statsData = raw.teams || raw;
      teamStats.set(statsData);
    } catch {
      statsError = true;
      statsData = getDemoStats();
      teamStats.set(statsData);
    } finally {
      loadingStats = false;
    }
  });

  $: teams = statsData ? Object.keys(statsData).sort() : [];
  $: localData = localTeam ? statsData?.[localTeam] : null;
  $: awayData = awayTeam ? statsData?.[awayTeam] : null;
  $: bothSelected = !!(localData && awayData);

  let predictions = null;
  let predictionsLoading = false;

  $: if (bothSelected) loadPredictions();

  async function loadPredictions() {
    predictionsLoading = true;
    try { predictions = await generatePredictions(); }
    catch (err) { console.error('[Totales]', err); predictions = null; }
    finally { predictionsLoading = false; }
  }

  function roundToHalf(v) { return Math.round(v * 2) / 2; }

  function suggestLines(projection) {
    const base = roundToHalf(projection);
    return { over: (base - 2).toFixed(1), under: (base + 2).toFixed(1) };
  }

  $: if (predictions?.Q1 && !lineQ1Over) {
    const s = suggestLines(predictions.Q1.projection);
    lineQ1Over = s.over; lineQ1Under = s.under;
  }
  $: if (predictions?.HALF && !lineHalfOver) {
    const s = suggestLines(predictions.HALF.projection);
    lineHalfOver = s.over; lineHalfUnder = s.under;
  }
  $: if (predictions?.FULL && !lineFullOver) {
    const s = suggestLines(predictions.FULL.projection);
    lineFullOver = s.over; lineFullUnder = s.under;
  }

  let analysisQ1 = null, analysisHalf = null, analysisFull = null;
  $: if (predictions?.Q1) analysisQ1 = predictions.Q1;
  $: if (predictions?.HALF) analysisHalf = predictions.HALF;
  $: if (predictions?.FULL) analysisFull = predictions.FULL;

  let recalcTimer = null;
  function scheduleRecalc(period, lineValue) {
    clearTimeout(recalcTimer);
    recalcTimer = setTimeout(async () => {
      const val = parseFloat(lineValue);
      if (!val || isNaN(val)) return;
      const result = await recalcWithLine(val, period);
      if (result) {
        if (period === 'Q1') analysisQ1 = result;
        if (period === 'HALF') analysisHalf = result;
        if (period === 'FULL') analysisFull = result;
      }
    }, 300);
  }

  $: activeLineQ1 = dirQ1 === 'OVER' ? lineQ1Over : lineQ1Under;
  $: activeLineHalf = dirHalf === 'OVER' ? lineHalfOver : lineHalfUnder;
  $: activeLineFull = dirFull === 'OVER' ? lineFullOver : lineFullUnder;

  $: if (activeLineQ1 && predictions?.Q1) scheduleRecalc('Q1', activeLineQ1);
  $: if (activeLineHalf && predictions?.HALF) scheduleRecalc('HALF', activeLineHalf);
  $: if (activeLineFull && predictions?.FULL) scheduleRecalc('FULL', activeLineFull);

  async function generatePredictions() {
    const home = { name: localTeam, stats: localData, restDays: localB2B ? 0 : 2, injuries: localInjury ? [{ name: 'Star', type: 'star' }] : [] };
    const away = { name: awayTeam, stats: awayData, restDays: awayB2B ? 0 : 2, injuries: awayInjury ? [{ name: 'Star', type: 'star' }] : [] };
    const gameInfo = { arena: localTeam.includes('Nuggets') ? 'Denver' : null };
    const results = {};
    for (const [period, defLine] of [['Q1', 55], ['HALF', 110], ['FULL', 220]]) {
      try {
        const res = await fetch('/api/predict', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ homeTeam: home, awayTeam: away, line: defLine, period, gameInfo, source: 'totales', userId: $userId || 'anonymous', plan: $subscription?.plan || 'free' })
        });
        if (res.ok) results[period] = await res.json();
      } catch (err) { console.error(`[Totales] ${period}:`, err); }
    }
    return Object.keys(results).length > 0 ? results : null;
  }

  async function recalcWithLine(newLine, period) {
    try {
      const res = await fetch('/api/predict', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          homeTeam: { name: localTeam, stats: localData, restDays: localB2B ? 0 : 2, injuries: localInjury ? [{ name: 'Star', type: 'star' }] : [] },
          awayTeam: { name: awayTeam, stats: awayData, restDays: awayB2B ? 0 : 2, injuries: awayInjury ? [{ name: 'Star', type: 'star' }] : [] },
          line: newLine, period, gameInfo: { arena: localTeam.includes('Nuggets') ? 'Denver' : null },
          source: 'totales', userId: $userId || 'anonymous', plan: $subscription?.plan || 'free'
        })
      });
      if (res.ok) return await res.json();
    } catch (err) { console.error(`[Totales] Recalc ${period}:`, err); }
    return null;
  }

  function resetAll() {
    lineQ1Over = ''; lineQ1Under = '';
    lineHalfOver = ''; lineHalfUnder = '';
    lineFullOver = ''; lineFullUnder = '';
    dirQ1 = 'OVER'; dirHalf = 'OVER'; dirFull = 'OVER';
  }
  $: if (localTeam || awayTeam) resetAll();

  // ═══ VALUE BET CALCULATION ═══
  function computeValue(analysis, userDir, bookmakerOdds, period) {
    if (!analysis) return null;
    const bookOdds = parseFloat(bookmakerOdds) || 1.91;

    let modelProb = analysis.probability || 0.5;
    if (analysis.direction && analysis.direction !== userDir) {
      modelProb = 1 - modelProb;
    }

    const fairOdds = modelProb > 0 ? (1 / modelProb) : 99;
    const evPct = ((modelProb * bookOdds) - 1) * 100;
    const edgeHouse = ((bookOdds - fairOdds) / fairOdds) * 100;

    const periodStd = { Q1: 8, HALF: 13, FULL: 18.5 };
    const std = periodStd[period] || 10;
    const edgePts = analysis.edge || 0;
    const zScore = edgePts / std;

    let rating = 0;
    if (evPct >= 15) rating = 5;
    else if (evPct >= 10) rating = 4;
    else if (evPct >= 5) rating = 3;
    else if (evPct >= 2) rating = 2;
    else if (evPct >= 0) rating = 1;

    let tier, tierLabel, tierColor, tierEmoji;
    if (evPct >= 15) { tier = 'elite'; tierLabel = 'ELITE VALUE'; tierColor = '#10B981'; tierEmoji = '🔥'; }
    else if (evPct >= 8) { tier = 'strong'; tierLabel = 'STRONG VALUE'; tierColor = '#22C55E'; tierEmoji = '💎'; }
    else if (evPct >= 3) { tier = 'value'; tierLabel = 'VALUE BET'; tierColor = '#84CC16'; tierEmoji = '✨'; }
    else if (evPct >= 0) { tier = 'neutral'; tierLabel = 'NEUTRAL'; tierColor = '#F59E0B'; tierEmoji = '⚖️'; }
    else { tier = 'avoid'; tierLabel = 'NO APOSTAR'; tierColor = '#EF4444'; tierEmoji = '🚫'; }

    return {
      modelProb,
      modelProbPct: (modelProb * 100).toFixed(0),
      fairOdds: fairOdds.toFixed(2),
      bookOdds: bookOdds.toFixed(2),
      evPct: evPct.toFixed(1),
      edgeHousePct: edgeHouse.toFixed(1),
      edgePts: edgePts.toFixed(1),
      zScore: zScore.toFixed(2),
      rating,
      tier, tierLabel, tierColor, tierEmoji,
    };
  }

  $: valueQ1 = analysisQ1 ? computeValue(analysisQ1, dirQ1, oddsQ1, 'Q1') : null;
  $: valueHalf = analysisHalf ? computeValue(analysisHalf, dirHalf, oddsHalf, 'HALF') : null;
  $: valueFull = analysisFull ? computeValue(analysisFull, dirFull, oddsFull, 'FULL') : null;

  function openSave(period, analysis, value, line, dir) {
    if (!analysis || !value) return;
    saveTarget = {
      period, line: parseFloat(line), direction: dir,
      projection: analysis.projection,
      probability: value.modelProb,
      probabilityPercent: value.modelProbPct,
      confidence: value.tierLabel,
      ev: value.evPct, evPercent: value.evPct,
      edge: parseFloat(value.edgePts),
      fairOdds: value.fairOdds, bookOdds: value.bookOdds,
    };
  }

  function closeSave() { saveTarget = null; }

  async function handleSavePick() {
    if (!saveTarget || !$userId) return;
    savingPick = true;
    try {
      await picksStore.save({
        user_id: $userId, home_team: localTeam, away_team: awayTeam,
        period: saveTarget.period, direction: saveTarget.direction,
        line: saveTarget.line, bet_line: saveTarget.line,
        projection: saveTarget.projection, probability: saveTarget.probability,
        confidence: saveTarget.confidence, ev: parseFloat(saveTarget.evPercent),
        edge: saveTarget.edge, model_version: MODEL_VERSION.version,
        odds: parseFloat(saveTarget.bookOdds) || 1.91,
        fair_odds: parseFloat(saveTarget.fairOdds), status: 'pending', source: 'totales',
        created_at: new Date().toISOString(),
      });
      toasts.success(`Pick guardado: ${saveTarget.direction} ${saveTarget.line} (${saveTarget.period})`);
      closeSave();
    } catch { toasts.error('No se pudo guardar el pick.'); }
    finally { savingPick = false; }
  }

  function getDemoStats() {
    const TEAMS = ['Celtics','Nets','Knicks','76ers','Raptors','Bulls','Cavaliers','Pistons','Pacers','Bucks','Hawks','Hornets','Heat','Magic','Wizards','Mavericks','Rockets','Grizzlies','Pelicans','Spurs','Nuggets','Timberwolves','Thunder','Trail Blazers','Jazz','Warriors','Clippers','Lakers','Suns','Kings'];
    const d = {};
    TEAMS.forEach(t => { const b = 25 + Math.random() * 8;
      d[t] = { q1: +b.toFixed(1), q1Home: +(b+0.5).toFixed(1), q1Away: +(b-0.5).toFixed(1), half: +(b*2.1).toFixed(1), halfHome: +(b*2.1+1).toFixed(1), halfAway: +(b*2.1-1).toFixed(1), full: +(b*4.3).toFixed(1), fullHome: +(b*4.3+1.5).toFixed(1), fullAway: +(b*4.3-1.5).toFixed(1) };
    });
    return d;
  }

  function getRank(team, key) {
    if (!statsData) return null;
    const sorted = Object.entries(statsData).map(([t, d]) => ({ t, v: d[key] ?? 0 })).sort((a, b) => b.v - a.v);
    const idx = sorted.findIndex(s => s.t === team);
    if (idx < 0) return null;
    const rank = idx + 1;
    const n = Object.keys(statsData).length;
    return { rank, color: rank <= Math.ceil(n / 3) ? '#10B981' : rank <= Math.ceil(n * 2 / 3) ? '#F59E0B' : '#EF4444' };
  }

  function handleLineInput(e, period, dir) {
    let val = parseFloat(e.target.value);
    if (isNaN(val)) return;
    val = roundToHalf(val);
    const v = val.toFixed(1);
    if (period === 'Q1' && dir === 'OVER') lineQ1Over = v;
    if (period === 'Q1' && dir === 'UNDER') lineQ1Under = v;
    if (period === 'HALF' && dir === 'OVER') lineHalfOver = v;
    if (period === 'HALF' && dir === 'UNDER') lineHalfUnder = v;
    if (period === 'FULL' && dir === 'OVER') lineFullOver = v;
    if (period === 'FULL' && dir === 'UNDER') lineFullUnder = v;
  }
</script>

<svelte:head><title>Totales — NioSports Pro</title></svelte:head>

<div class="page">
  <header class="page__header">
    <span class="page__label">CALCULADORA PRO — EXPECTED VALUE</span>
    <h1 class="page__title">Totales NBA</h1>
    <p class="page__subtitle">
      Motor Predictivo v{MODEL_VERSION.version} — Temporada 2025-26
      {#if statsError}<span class="badge-warn">Datos demo</span>{/if}
      {#if predictions?.FULL?.source}<span class="badge-source">{predictions.FULL.source === 'ensemble-v4' ? 'Ensemble ML' : predictions.FULL.source === 'xgboost' ? 'XGBoost' : 'Heurístico'}</span>{/if}
    </p>
  </header>

  <button class="glossary-toggle" on:click={() => glossaryOpen = !glossaryOpen} class:open={glossaryOpen}>
    <BookOpen size={16} />
    <span>Glosario de términos</span>
    <ChevronDown size={16} class={glossaryOpen ? 'rot' : ''} />
  </button>

  {#if glossaryOpen}
    <div class="glossary">
      <div class="glossary__grid">
        <div class="g-item"><h4>Proyección</h4><p>Total estimado por el modelo ML (XGBoost + LightGBM + Ridge + MLP). Combina promedios L5/L10/L20, descanso, back-to-back, altitude y factores contextuales.</p></div>
        <div class="g-item"><h4>Línea</h4><p>El total que ofrece la casa de apuestas. Siempre se mueve en saltos de 0.5 (ej: 215.5, 216, 216.5).</p></div>
        <div class="g-item"><h4>Cuota (Decimal)</h4><p>Pago que ofrece la casa. Ej: 1.91 = ganas $0.91 por cada $1 apostado. 2.00 = duplicas tu apuesta.</p></div>
        <div class="g-item"><h4>Cuota Justa</h4><p>La cuota que <strong>debería</strong> tener según nuestro modelo. Si la casa paga MÁS que la cuota justa → VALUE BET.</p></div>
        <div class="g-item"><h4>Diferencia (pts)</h4><p>Distancia entre proyección y línea. Ej: Proyección 220, línea 215 → +5 pts (favor OVER).</p></div>
        <div class="g-item"><h4>Edge vs Casa (%)</h4><p>Cuánto mejor es la cuota real vs la justa. Ej: cuota real 2.05 vs justa 1.85 → +10.8% edge.</p></div>
        <div class="g-item"><h4>Expected Value (EV)</h4><p>Ganancia esperada por unidad apostada a largo plazo. <strong>+EV = apuesta ganadora</strong> en el largo plazo.</p></div>
        <div class="g-item"><h4>Z-Score</h4><p>Cuántas desviaciones estándar separan la proyección de la línea. |Z| &gt; 1 = señal fuerte.</p></div>
        <div class="g-item"><h4>Rating (estrellas)</h4><p>⭐ 0-2% EV · ⭐⭐ 2-5% · ⭐⭐⭐ 5-8% · ⭐⭐⭐⭐ 8-15% · ⭐⭐⭐⭐⭐ +15%</p></div>
        <div class="g-item"><h4>Clasificación</h4><p>🔥 ELITE (+15% EV) · 💎 STRONG (+8%) · ✨ VALUE (+3%) · ⚖️ NEUTRAL (0-3%) · 🚫 NO APOSTAR (-EV)</p></div>
      </div>
    </div>
  {/if}

  {#if loadingStats}
    <div class="loading-state"><div class="spinner"></div><p>Cargando estadísticas...</p></div>
  {:else}
    <div class="selectors">
      <div class="selector selector--home">
        <div class="selector__label"><Home size={14} /> Local</div>
        <TeamSelector {teams} bind:value={localTeam} placeholder="Seleccionar equipo..." disabled={awayTeam ? [awayTeam] : []} accent="#6366f1" />
        {#if localData}
          <div class="team-stats">
            {#each [['Q1', 'q1Home'], ['HALF', 'halfHome'], ['FULL', 'fullHome']] as [label, key]}
              {@const r = getRank(localTeam, key)}
              <div class="tstat">
                <span class="tstat__val">{localData[key] ?? localData[key.replace('Home','')]}</span>
                <span class="tstat__label">{label}</span>
                {#if r}<span class="tstat__rank" style="color:{r.color}">#{r.rank}</span>{/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
      <div class="vs">VS</div>
      <div class="selector selector--away">
        <div class="selector__label"><Plane size={14} /> Visitante</div>
        <TeamSelector {teams} bind:value={awayTeam} placeholder="Seleccionar equipo..." disabled={localTeam ? [localTeam] : []} accent="#ef4444" />
        {#if awayData}
          <div class="team-stats">
            {#each [['Q1', 'q1Away'], ['HALF', 'halfAway'], ['FULL', 'fullAway']] as [label, key]}
              {@const r = getRank(awayTeam, key)}
              <div class="tstat">
                <span class="tstat__val">{awayData[key] ?? awayData[key.replace('Away','')]}</span>
                <span class="tstat__label">{label}</span>
                {#if r}<span class="tstat__rank" style="color:{r.color}">#{r.rank}</span>{/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>

    {#if bothSelected}
      <div class="factors">
        <div class="factors__title"><Settings size={14} /> Factores contextuales</div>
        <div class="factors__grid">
          <label class="ftoggle"><input type="checkbox" bind:checked={localB2B} /><span>{localTeam} Back-to-Back</span></label>
          <label class="ftoggle"><input type="checkbox" bind:checked={awayB2B} /><span>{awayTeam} Back-to-Back</span></label>
          <label class="ftoggle"><input type="checkbox" bind:checked={localInjury} /><span>{localTeam} sin estrella</span></label>
          <label class="ftoggle"><input type="checkbox" bind:checked={awayInjury} /><span>{awayTeam} sin estrella</span></label>
        </div>
      </div>

      {#if predictionsLoading}
        <div class="loading-state"><div class="spinner"></div><p>Calculando predicciones...</p></div>
      {:else if predictions}
        <div class="pred-section">
          <h2 class="pred-section__title">
            <TrendingUp size={18} />
            Calculadora PRO — Expected Value
          </h2>
          <p class="pred-section__sub">{localTeam} (HOME) vs {awayTeam} (AWAY)</p>

          <div class="calc-grid">
            {#each [
              { period: 'Q1', label: 'Q1', analysis: analysisQ1, value: valueQ1, dir: dirQ1, setDir: (v) => dirQ1 = v, lineOver: lineQ1Over, lineUnder: lineQ1Under, odds: oddsQ1, setOdds: (v) => oddsQ1 = v, std: '8.0' },
              { period: 'HALF', label: '1H', analysis: analysisHalf, value: valueHalf, dir: dirHalf, setDir: (v) => dirHalf = v, lineOver: lineHalfOver, lineUnder: lineHalfUnder, odds: oddsHalf, setOdds: (v) => oddsHalf = v, std: '13.0' },
              { period: 'FULL', label: 'FULL', analysis: analysisFull, value: valueFull, dir: dirFull, setDir: (v) => dirFull = v, lineOver: lineFullOver, lineUnder: lineFullUnder, odds: oddsFull, setOdds: (v) => oddsFull = v, std: '18.5' },
            ] as row}
              {@const a = row.analysis}
              {@const v = row.value}
              {#if a && v}
                <div class="calc-card">
                  <div class="calc-card__header">
                    <span class="calc-card__period">{row.label}:</span>
                    <span class="calc-card__proj">{a.projection?.toFixed(1) ?? '—'}</span>
                  </div>

                  <div class="dir-toggle">
                    <button class="dir-btn" class:active={row.dir === 'OVER'} class:over={row.dir === 'OVER'} on:click={() => row.setDir('OVER')}>OVER</button>
                    <button class="dir-btn" class:active={row.dir === 'UNDER'} class:under={row.dir === 'UNDER'} on:click={() => row.setDir('UNDER')}>UNDER</button>
                  </div>

                  <div class="input-block">
                    <label class="input-label">🎯 Línea</label>
                    <input type="number" step="0.5" min="0"
                      value={row.dir === 'OVER' ? row.lineOver : row.lineUnder}
                      on:change={(e) => handleLineInput(e, row.period, row.dir)}
                      class="input-field" />
                  </div>

                  <div class="input-block input-block--odds">
                    <label class="input-label">💰 Cuota (decimal)</label>
                    <input type="number" step="0.01" min="1"
                      value={row.odds}
                      on:input={(e) => row.setOdds(e.target.value)}
                      class="input-field input-field--odds" />
                  </div>

                  <div class="metrics">
                    <div class="metric-row">
                      <span class="metric-label">Diferencia</span>
                      <span class="metric-val" class:pos={parseFloat(v.edgePts) > 0} class:neg={parseFloat(v.edgePts) < 0}>
                        {parseFloat(v.edgePts) > 0 ? '+' : ''}{v.edgePts} pts
                      </span>
                    </div>
                    <div class="metric-row">
                      <span class="metric-label">SD (±variación)</span>
                      <span class="metric-val">±{row.std} pts</span>
                    </div>
                    <div class="metric-row">
                      <span class="metric-label">Z-Score</span>
                      <span class="metric-val" class:pos={parseFloat(v.zScore) > 0} class:neg={parseFloat(v.zScore) < 0}>
                        {parseFloat(v.zScore) > 0 ? '+' : ''}{v.zScore}
                      </span>
                    </div>
                  </div>

                  <div class="prob-row">
                    <span class="prob-label">Prob. Ganar</span>
                    <span class="prob-val" style="color: {v.tierColor}">{v.modelProbPct}%</span>
                  </div>

                  <div class="fair-odds-row">
                    <span class="fair-label">Cuota Justa</span>
                    <span class="fair-val">{v.fairOdds}</span>
                  </div>

                  <div class="ev-row">
                    <span class="ev-label">Expected Value</span>
                    <span class="ev-val" class:pos={parseFloat(v.evPct) > 0} class:neg={parseFloat(v.evPct) < 0}>
                      {parseFloat(v.evPct) > 0 ? '+' : ''}{v.evPct}%
                    </span>
                  </div>

                  <div class="edge-house-row">
                    <span class="edge-label">Edge vs Casa</span>
                    <span class="edge-val" class:pos={parseFloat(v.edgeHousePct) > 0} class:neg={parseFloat(v.edgeHousePct) < 0}>
                      {parseFloat(v.edgeHousePct) > 0 ? '+' : ''}{v.edgeHousePct}%
                    </span>
                  </div>

                  <div class="tier-banner" style="background: {v.tierColor}; --glow: {v.tierColor}">
                    <div class="tier-banner__emoji">{v.tierEmoji}</div>
                    <div class="tier-banner__label">{v.tierLabel}</div>
                    <div class="tier-banner__stars">
                      {#each Array(5) as _, i}
                        <span class="star" class:filled={i < v.rating}>★</span>
                      {/each}
                    </div>
                  </div>

                  <button class="save-btn"
                    class:save-btn--over={row.dir === 'OVER'}
                    class:save-btn--under={row.dir === 'UNDER'}
                    disabled={parseFloat(v.evPct) < 0}
                    on:click={() => openSave(row.period, a, v, row.dir === 'OVER' ? row.lineOver : row.lineUnder, row.dir)}>
                    <Save size={14} />
                    Guardar {row.dir} {row.dir === 'OVER' ? row.lineOver : row.lineUnder}
                  </button>
                </div>
              {/if}
            {/each}
          </div>
        </div>
      {/if}
    {:else}
      <div class="empty">
        <BarChart3 size={48} strokeWidth={1} />
        <p>Selecciona ambos equipos para ver la predicción del modelo</p>
      </div>
    {/if}
  {/if}
</div>

{#if saveTarget}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="overlay" on:click|self={closeSave}>
    <div class="modal" role="dialog" aria-modal="true" tabindex="-1">
      <div class="modal__head">
        <h3>Guardar Pick</h3>
        <button class="modal__x" on:click={closeSave} aria-label="Cerrar"><X size={18} /></button>
      </div>
      <div class="modal__body">
        <div class="summary-row"><span>Partido</span><strong>{localTeam} vs {awayTeam}</strong></div>
        <div class="summary-row"><span>Período</span><strong class="indigo">{saveTarget.period}</strong></div>
        <div class="summary-row"><span>Apuesta</span><strong class="indigo">{saveTarget.direction} {saveTarget.line}</strong></div>
        <div class="summary-row"><span>Cuota</span><strong>{saveTarget.bookOdds} (justa: {saveTarget.fairOdds})</strong></div>
        <div class="summary-row"><span>Probabilidad</span><strong>{saveTarget.probabilityPercent}%</strong></div>
        <div class="summary-row"><span>Rating</span><strong>{saveTarget.confidence}</strong></div>
        <div class="summary-row"><span>EV</span><strong class:pos={parseFloat(saveTarget.evPercent) > 0} class:neg={parseFloat(saveTarget.evPercent) < 0}>{parseFloat(saveTarget.evPercent) > 0 ? '+' : ''}{saveTarget.evPercent}%</strong></div>
      </div>
      <div class="modal__actions">
        <button class="mbtn mbtn--ghost" on:click={closeSave} disabled={savingPick}>Cancelar</button>
        <button class="mbtn mbtn--save" on:click={handleSavePick} disabled={savingPick}>
          {savingPick ? 'Guardando...' : 'Guardar Pick'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .page { max-width: 1200px; margin: 0 auto; padding: 60px 24px 120px; position: relative; z-index: 1; }
  @media (max-width: 768px) { .page { padding: 32px 16px 100px; } }

  .page__header { margin-bottom: 24px; }
  .page__label { font-size: 0.75rem; font-weight: 800; color: var(--color-accent, #6366F1); text-transform: uppercase; letter-spacing: 0.15em; }
  .page__title { font-family: 'Inter', sans-serif; font-size: clamp(1.8rem, 4vw, 2.5rem); font-weight: 900; letter-spacing: -0.03em; margin: 8px 0 6px; color: var(--color-text-primary); }
  .page__subtitle { font-size: 0.9rem; color: var(--color-text-muted); display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .badge-warn { font-size: 0.7rem; background: rgba(245,158,11,0.12); color: #F59E0B; padding: 2px 8px; border-radius: 6px; font-weight: 700; }
  .badge-source { font-size: 0.7rem; background: rgba(99,102,241,0.12); color: #818CF8; padding: 2px 8px; border-radius: 6px; font-weight: 700; }

  .glossary-toggle { display: flex; align-items: center; gap: 10px; width: 100%; padding: 14px 18px; background: var(--glass-bg, var(--color-bg-card)); backdrop-filter: var(--glass-blur, blur(12px)); border: 1px solid var(--glass-border, var(--color-border)); border-radius: 12px; color: var(--color-text-primary); font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.2s; margin-bottom: 12px; }
  .glossary-toggle:hover { border-color: var(--color-accent, #6366F1); background: var(--color-accent-glow, rgba(99,102,241,0.08)); }
  .glossary-toggle span { flex: 1; text-align: left; }
  :global(.glossary-toggle svg.rot) { transform: rotate(180deg); transition: transform 0.3s; }
  .glossary { background: var(--glass-bg, var(--color-bg-card)); backdrop-filter: var(--glass-blur, blur(12px)); border: 1px solid var(--color-accent, #6366F1); border-radius: 14px; padding: 20px; margin-bottom: 20px; animation: slideDown 0.3s ease; }
  @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
  .glossary__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
  .g-item h4 { font-size: 0.85rem; font-weight: 800; color: var(--color-accent, #6366F1); margin-bottom: 4px; }
  .g-item p { font-size: 0.78rem; color: var(--color-text-secondary); line-height: 1.5; }

  .selectors { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
  .selector { flex: 1; min-width: 240px; background: var(--glass-bg, var(--color-bg-card)); backdrop-filter: var(--glass-blur, blur(12px)); border: 1px solid var(--glass-border, var(--color-border)); border-radius: 16px; padding: 18px; box-shadow: var(--shadow-card); }
  .selector--home { border-color: rgba(99,102,241,0.25); }
  .selector--away { border-color: rgba(239,68,68,0.25); }
  .selector__label { font-size: 0.78rem; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
  .vs { font-family: 'Inter', sans-serif; font-size: 1rem; font-weight: 900; color: var(--color-accent, #6366F1); background: var(--color-accent-glow, rgba(99,102,241,0.1)); border: 1px solid rgba(99,102,241,0.2); border-radius: 50%; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; margin-top: 32px; flex-shrink: 0; }
  .team-stats { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
  .tstat { display: flex; flex-direction: column; align-items: center; background: var(--color-bg-card); border-radius: 8px; padding: 8px 12px; flex: 1; min-width: 60px; }
  .tstat__val { font-family: 'DM Mono', monospace; font-size: 1.1rem; font-weight: 800; color: var(--color-text-primary); }
  .tstat__label { font-size: 0.65rem; color: var(--color-text-muted); }
  .tstat__rank { font-size: 0.68rem; font-weight: 700; margin-top: 2px; }

  .factors { background: var(--glass-bg, var(--color-bg-card)); backdrop-filter: var(--glass-blur, blur(12px)); border: 1px solid var(--glass-border, var(--color-border)); border-radius: 14px; padding: 16px 18px; margin-bottom: 24px; }
  .factors__title { font-size: 0.82rem; font-weight: 700; color: var(--color-text-muted); margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }
  .factors__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  @media (max-width: 500px) { .factors__grid { grid-template-columns: 1fr; } }
  .ftoggle { display: flex; align-items: center; gap: 8px; font-size: 0.83rem; cursor: pointer; padding: 8px 10px; border-radius: 8px; transition: background 0.15s; color: var(--color-text-secondary); }
  .ftoggle:hover { background: var(--color-bg-elevated); }
  .ftoggle input { accent-color: var(--color-accent, #6366F1); cursor: pointer; }

  .pred-section { background: linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.05) 100%); backdrop-filter: var(--glass-blur, blur(12px)); border: 1px solid rgba(99,102,241,0.2); border-radius: 20px; padding: 28px 22px; box-shadow: var(--shadow-elevated); }
  .pred-section__title { display: flex; align-items: center; justify-content: center; gap: 10px; font-family: 'Inter', sans-serif; font-size: 1.1rem; font-weight: 800; text-align: center; color: var(--color-text-primary); }
  .pred-section__sub { font-size: 0.82rem; color: var(--color-text-muted); text-align: center; margin: 4px 0 24px; }

  .calc-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  @media (max-width: 900px) { .calc-grid { grid-template-columns: 1fr; } }

  .calc-card { background: var(--color-bg, #fff); border: 1px solid var(--color-border); border-radius: 16px; padding: 18px 16px; display: flex; flex-direction: column; gap: 10px; box-shadow: var(--shadow-card); transition: transform 0.2s, box-shadow 0.3s; }
  .calc-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-elevated); }

  :global([data-theme="dark"]) .calc-card { background: rgba(255,255,255,0.02); }

  .calc-card__header { text-align: center; padding-bottom: 8px; border-bottom: 1px solid var(--color-border); }
  .calc-card__period { font-family: 'Inter', sans-serif; font-size: 0.95rem; font-weight: 800; color: var(--color-text-primary); }
  .calc-card__proj { font-family: 'DM Mono', monospace; font-size: 1rem; font-weight: 800; color: var(--color-accent, #6366F1); margin-left: 6px; }

  .dir-toggle { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .dir-btn { padding: 10px; border-radius: 8px; border: 2px solid var(--color-border); background: var(--color-bg-elevated); color: var(--color-text-muted); font-size: 0.85rem; font-weight: 800; cursor: pointer; transition: all 0.2s; letter-spacing: 0.05em; }
  .dir-btn:hover { border-color: var(--color-border-hover); }
  .dir-btn.active.over { background: linear-gradient(135deg, #10B981, #059669); border-color: #10B981; color: white; box-shadow: 0 4px 14px rgba(16,185,129,0.3); }
  .dir-btn.active.under { background: linear-gradient(135deg, #EF4444, #DC2626); border-color: #EF4444; color: white; box-shadow: 0 4px 14px rgba(239,68,68,0.3); }

  .input-block { display: flex; flex-direction: column; gap: 4px; }
  .input-label { font-size: 0.72rem; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
  .input-field { padding: 10px 12px; border-radius: 8px; border: 1px solid var(--color-border-hover); background: var(--color-bg-elevated); color: var(--color-text-primary); font-family: 'DM Mono', monospace; font-size: 1.05rem; font-weight: 700; text-align: center; width: 100%; }
  .input-field:focus { outline: none; border-color: var(--color-accent, #6366F1); box-shadow: 0 0 0 3px var(--color-accent-glow, rgba(99,102,241,0.15)); }
  .input-block--odds .input-field--odds, .input-block--odds .input-field { color: #F59E0B; border-color: rgba(245,158,11,0.3); background: rgba(245,158,11,0.04); }
  .input-block--odds .input-field:focus { border-color: #F59E0B; box-shadow: 0 0 0 3px rgba(245,158,11,0.15); }

  .metrics { background: var(--color-bg-elevated); border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; gap: 4px; }
  .metric-row { display: flex; justify-content: space-between; align-items: center; font-size: 0.78rem; }
  .metric-label { color: var(--color-text-muted); }
  .metric-val { font-family: 'DM Mono', monospace; font-weight: 700; color: var(--color-text-primary); }

  .prob-row, .fair-odds-row, .ev-row, .edge-house-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-radius: 8px; font-size: 0.82rem; }
  .prob-row { background: rgba(99,102,241,0.06); }
  .fair-odds-row { background: var(--color-bg-elevated); }
  .ev-row { background: rgba(16,185,129,0.06); }
  .edge-house-row { background: rgba(99,102,241,0.04); }

  .prob-label, .fair-label, .ev-label, .edge-label { color: var(--color-text-secondary); font-weight: 600; }
  .prob-val, .fair-val, .ev-val, .edge-val { font-family: 'DM Mono', monospace; font-weight: 800; font-size: 0.95rem; }
  .fair-val { color: var(--color-text-primary); }

  .pos { color: #10B981 !important; }
  .neg { color: #EF4444 !important; }

  .tier-banner { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 16px 12px; border-radius: 12px; color: white; box-shadow: 0 4px 16px var(--glow); position: relative; overflow: hidden; }
  .tier-banner::before { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(255,255,255,0.15), transparent 60%); pointer-events: none; }
  .tier-banner__emoji { font-size: 1.8rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); }
  .tier-banner__label { font-size: 0.85rem; font-weight: 900; letter-spacing: 0.08em; text-shadow: 0 1px 2px rgba(0,0,0,0.2); }
  .tier-banner__stars { display: flex; gap: 2px; }
  .star { color: rgba(255,255,255,0.35); font-size: 0.85rem; }
  .star.filled { color: #FCD34D; text-shadow: 0 0 4px rgba(252,211,77,0.6); }

  .save-btn { padding: 12px; border-radius: 10px; border: none; font-size: 0.85rem; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s; }
  .save-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .save-btn:not(:disabled):hover { transform: translateY(-1px); }
  .save-btn:active { transform: scale(0.97); }
  .save-btn--over { background: linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.08)); color: #10B981; border: 1px solid rgba(16,185,129,0.3); }
  .save-btn--under { background: linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.08)); color: #EF4444; border: 1px solid rgba(239,68,68,0.3); }
  .save-btn--over:not(:disabled):hover { box-shadow: 0 4px 14px rgba(16,185,129,0.25); }
  .save-btn--under:not(:disabled):hover { box-shadow: 0 4px 14px rgba(239,68,68,0.25); }

  .empty { text-align: center; padding: 64px 20px; color: var(--color-text-muted); display: flex; flex-direction: column; align-items: center; gap: 16px; }
  .empty p { font-size: 0.95rem; color: var(--color-text-muted); }
  .loading-state { text-align: center; padding: 48px 20px; color: var(--color-text-muted); display: flex; flex-direction: column; align-items: center; gap: 12px; }
  .spinner { width: 32px; height: 32px; border: 3px solid var(--color-accent-glow, rgba(99,102,241,0.2)); border-top-color: var(--color-accent, #6366F1); border-radius: 50%; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(6px); z-index: 50; display: flex; align-items: center; justify-content: center; padding: 20px; }
  .modal { background: var(--color-bg-elevated); border: 1px solid var(--color-border-hover); border-radius: 18px; padding: 26px 22px; width: 100%; max-width: 440px; box-shadow: var(--shadow-elevated); }
  .modal__head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
  .modal__head h3 { font-family: 'Inter', sans-serif; font-size: 1.05rem; font-weight: 800; color: var(--color-text-primary); }
  .modal__x { background: none; border: none; color: var(--color-text-muted); cursor: pointer; padding: 4px; }
  .modal__body { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
  .summary-row { display: flex; justify-content: space-between; font-size: 0.88rem; }
  .summary-row span { color: var(--color-text-muted); }
  .summary-row strong { font-weight: 700; color: var(--color-text-primary); }
  .indigo { color: var(--color-accent, #6366F1) !important; }
  .modal__actions { display: flex; gap: 10px; justify-content: flex-end; }
  .mbtn { padding: 10px 20px; border-radius: 10px; border: none; font-size: 0.85rem; font-weight: 700; cursor: pointer; }
  .mbtn:disabled { opacity: 0.4; cursor: not-allowed; }
  .mbtn--ghost { background: transparent; border: 1px solid var(--color-border-hover); color: var(--color-text-secondary); }
  .mbtn--save { background: var(--color-accent, #6366F1); color: #fff; }

  @media (max-width: 640px) {
    .selectors { flex-direction: column; align-items: stretch; gap: 12px; }
    .selector { min-width: 100%; }
    .vs { align-self: center; margin: -4px 0; }
    .calc-grid { grid-template-columns: 1fr; }
  }
</style>