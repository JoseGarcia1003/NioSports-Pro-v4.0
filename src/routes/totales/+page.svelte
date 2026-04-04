<script>
  import { onMount } from 'svelte';
  import { userId } from '$lib/stores/auth';
  import { teamStats, picksStore } from '$lib/stores/data';
  import { toasts } from '$lib/stores/ui';
  import { BarChart3, Home, Plane, AlertTriangle, Settings, Save, X, TrendingUp } from 'lucide-svelte';
  import ConfidenceGauge from '$lib/components/charts/ConfidenceGauge.svelte';
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
  let lineQ1 = '';
  let lineHalf = '';
  let lineFull = '';
  let savingPick = false;
  let saveTarget = null;

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

  $: if (predictions && !lineQ1) lineQ1 = predictions.Q1?.projection?.toFixed(1) || '';
  $: if (predictions && !lineHalf) lineHalf = predictions.HALF?.projection?.toFixed(1) || '';
  $: if (predictions && !lineFull) lineFull = predictions.FULL?.projection?.toFixed(1) || '';

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
      if (period === 'Q1') analysisQ1 = result;
      if (period === 'HALF') analysisHalf = result;
      if (period === 'FULL') analysisFull = result;
    }, 400);
  }

  $: if (lineQ1 && predictions?.Q1) scheduleRecalc('Q1', lineQ1);
  $: if (lineHalf && predictions?.HALF) scheduleRecalc('HALF', lineHalf);
  $: if (lineFull && predictions?.FULL) scheduleRecalc('FULL', lineFull);

  async function generatePredictions() {
    const home = { name: localTeam, stats: localData, restDays: localB2B ? 0 : 2, injuries: localInjury ? [{ name: 'Star', type: 'star' }] : [] };
    const away = { name: awayTeam, stats: awayData, restDays: awayB2B ? 0 : 2, injuries: awayInjury ? [{ name: 'Star', type: 'star' }] : [] };
    const gameInfo = { arena: localTeam.includes('Nuggets') ? 'Denver' : null };
    const results = {};
    for (const [period, defLine] of [['Q1', 55], ['HALF', 110], ['FULL', 220]]) {
      try {
        const res = await fetch('/api/predict', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ homeTeam: home, awayTeam: away, line: defLine, period, gameInfo })
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
          line: newLine, period, gameInfo: { arena: localTeam.includes('Nuggets') ? 'Denver' : null }
        })
      });
      if (res.ok) return await res.json();
    } catch (err) { console.error(`[Totales] Recalc ${period}:`, err); }
    return null;
  }

  function resetLines() { lineQ1 = ''; lineHalf = ''; lineFull = ''; }
  $: if (localTeam || awayTeam) resetLines();

  function openSave(period, analysis) {
    saveTarget = { period, line: analysis.line, direction: analysis.direction, projection: analysis.projection,
      probability: analysis.probability, probabilityPercent: analysis.probabilityPercent,
      confidence: analysis.confidence, ev: analysis.ev, evPercent: analysis.evPercent, edge: analysis.edge };
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
        confidence: saveTarget.confidence, ev: saveTarget.evPercent,
        edge: saveTarget.edge, model_version: MODEL_VERSION.version,
        odds: -110, status: 'pending', source: 'totales',
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
</script>

<svelte:head><title>Totales — NioSports Pro</title></svelte:head>

<div class="page">
  <header class="page__header">
    <span class="page__label">Análisis por período</span>
    <h1 class="page__title">Totales NBA</h1>
    <p class="page__subtitle">Motor Predictivo v{MODEL_VERSION.version} — Temporada 2025-26
      {#if statsError}<span class="badge-warn">Datos demo</span>{/if}
      {#if predictions?.FULL?.source}<span class="badge-source">{predictions.FULL.source === 'xgboost' ? 'XGBoost ML' : 'Heurístico'}</span>{/if}
    </p>
  </header>

  {#if loadingStats}
    <div class="loading-state"><div class="spinner"></div><p>Cargando estadísticas...</p></div>
  {:else}
    <!-- Team Selectors -->
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
      <!-- Context Factors -->
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
        <!-- Predictions -->
        <div class="pred-section">
          <h2 class="pred-section__title">Predicción del Motor</h2>
          <p class="pred-section__sub">{localTeam} (HOME) vs {awayTeam} (AWAY)</p>

          <div class="pred-grid">
            {#each [
              { period: 'Q1', label: 'Q1', analysis: analysisQ1, line: lineQ1, setLine: (v) => lineQ1 = v },
              { period: 'HALF', label: 'HALF', analysis: analysisHalf, line: lineHalf, setLine: (v) => lineHalf = v },
              { period: 'FULL', label: 'FULL', analysis: analysisFull, line: lineFull, setLine: (v) => lineFull = v },
            ] as row}
              {@const a = row.analysis}
              {#if a}
                <div class="pcard">
                  <div class="pcard__top">
                    <span class="pcard__period">{row.label}</span>
                    <ConfidenceGauge value={a.probabilityPercent || 50} size={56} />
                  </div>

                  <div class="pcard__projection">{a.projection ?? '—'}</div>
                  <span class="pcard__proj-label">Proyección</span>

                  <div class="pcard__line-row">
                    <span class="pcard__line-label">Línea</span>
                    <input type="number" step="0.5" class="pcard__line-input"
                      value={row.line} on:input={(e) => row.setLine(e.target.value)}
                      placeholder={a.projection} />
                  </div>

                  <div class="pcard__edge" class:pos={a.edge > 0} class:neg={a.edge < 0}>
                    Edge: {a.edge > 0 ? '+' : ''}{a.edge?.toFixed?.(1) ?? 0} pts
                  </div>

                  <div class="pcard__rec" class:rec-over={a.direction === 'OVER'} class:rec-under={a.direction === 'UNDER'}>
                    <span class="pcard__dir">{a.direction ?? '—'}</span>
                    <span class="pcard__prob">{a.probabilityPercent ?? 50}%</span>
                    <span class="pcard__conf">{a.confidence ?? 'LOW'}</span>
                  </div>

                  <div class="pcard__ev" class:pos={a.ev > 0}>
                    EV: {a.evPercent > 0 ? '+' : ''}{a.evPercent ?? 0}%
                  </div>

                  <button class="pcard__save" class:save-over={a.direction === 'OVER'} class:save-under={a.direction === 'UNDER'}
                    on:click={() => openSave(row.period, a)}>
                    <Save size={14} /> {a.direction} {a.line}
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

<!-- Save Modal -->
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
        <div class="summary-row"><span>Proyección</span><strong>{saveTarget.projection}</strong></div>
        <div class="summary-row"><span>Probabilidad</span><strong>{saveTarget.probabilityPercent}%</strong></div>
        <div class="summary-row"><span>Confianza</span><strong>{saveTarget.confidence}</strong></div>
        <div class="summary-row"><span>EV</span><strong class:pos={saveTarget.ev > 0} class:neg={saveTarget.ev < 0}>{saveTarget.evPercent > 0 ? '+' : ''}{saveTarget.evPercent}%</strong></div>
        <div class="summary-row"><span>Edge</span><strong>{saveTarget.edge > 0 ? '+' : ''}{saveTarget.edge} pts</strong></div>
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
  .page { max-width: 920px; margin: 0 auto; padding: 60px 24px 120px; }
  @media (max-width: 768px) { .page { padding: 32px 16px 100px; } }

  .page__header { margin-bottom: 32px; }
  .page__label { font-size: 0.8rem; font-weight: 700; color: #6366F1; text-transform: uppercase; letter-spacing: 0.15em; }
  .page__title { font-family: 'Inter', sans-serif; font-size: clamp(1.8rem, 4vw, 2.5rem); font-weight: 900; letter-spacing: -0.03em; margin: 8px 0 6px; }
  .page__subtitle { font-size: 0.9rem; color: rgba(255,255,255,0.4); display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .badge-warn { font-size: 0.7rem; background: rgba(245,158,11,0.12); color: #F59E0B; padding: 2px 8px; border-radius: 6px; font-weight: 700; }
  .badge-source { font-size: 0.7rem; background: rgba(99,102,241,0.12); color: #818CF8; padding: 2px 8px; border-radius: 6px; font-weight: 700; }

  /* Selectors */
  .selectors { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
  .selector { flex: 1; min-width: 240px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 18px; }
  .selector--home { border-color: rgba(99,102,241,0.2); }
  .selector--away { border-color: rgba(239,68,68,0.2); }
  .selector__label { font-size: 0.78rem; font-weight: 700; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }

  .vs { font-family: 'Inter', sans-serif; font-size: 1rem; font-weight: 900; color: #6366F1; background: rgba(99,102,241,0.08); border: 1px solid rgba(99,102,241,0.15); border-radius: 50%; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; margin-top: 32px; flex-shrink: 0; }

  .team-stats { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
  .tstat { display: flex; flex-direction: column; align-items: center; background: rgba(255,255,255,0.04); border-radius: 8px; padding: 8px 12px; flex: 1; min-width: 60px; }
  .tstat__val { font-family: 'DM Mono', monospace; font-size: 1.1rem; font-weight: 800; }
  .tstat__label { font-size: 0.65rem; color: rgba(255,255,255,0.35); }
  .tstat__rank { font-size: 0.68rem; font-weight: 700; margin-top: 2px; }

  /* Factors */
  .factors { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 16px 18px; margin-bottom: 24px; }
  .factors__title { font-size: 0.82rem; font-weight: 700; color: rgba(255,255,255,0.5); margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }
  .factors__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  @media (max-width: 500px) { .factors__grid { grid-template-columns: 1fr; } }
  .ftoggle { display: flex; align-items: center; gap: 8px; font-size: 0.83rem; cursor: pointer; padding: 8px 10px; border-radius: 8px; transition: background 0.15s; color: rgba(255,255,255,0.7); }
  .ftoggle:hover { background: rgba(255,255,255,0.04); }
  .ftoggle input { accent-color: #6366F1; cursor: pointer; }

  /* Predictions */
  .pred-section { background: rgba(99,102,241,0.04); border: 1px solid rgba(99,102,241,0.15); border-radius: 20px; padding: 28px 22px; }
  .pred-section__title { font-family: 'Inter', sans-serif; font-size: 1.1rem; font-weight: 800; text-align: center; color: #fff; }
  .pred-section__sub { font-size: 0.82rem; color: rgba(255,255,255,0.4); text-align: center; margin: 4px 0 20px; }

  .pred-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
  @media (max-width: 640px) { .pred-grid { grid-template-columns: 1fr; } }

  .pcard { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 20px 16px; display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; transition: border-color 0.2s; }
  .pcard:hover { border-color: rgba(99,102,241,0.3); }

  .pcard__top { display: flex; justify-content: space-between; align-items: center; width: 100%; }
  .pcard__period { font-family: 'Inter', sans-serif; font-size: 0.75rem; font-weight: 800; color: #6366F1; letter-spacing: 0.1em; text-transform: uppercase; }

  .pcard__projection { font-family: 'DM Mono', monospace; font-size: 2.2rem; font-weight: 900; line-height: 1; }
  .pcard__proj-label { font-size: 0.65rem; color: rgba(255,255,255,0.35); text-transform: uppercase; margin-top: -4px; }

  .pcard__line-row { display: flex; align-items: center; gap: 8px; }
  .pcard__line-label { font-size: 0.7rem; color: rgba(255,255,255,0.4); }
  .pcard__line-input { width: 80px; padding: 6px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: #6366F1; font-family: 'DM Mono', monospace; font-size: 1rem; font-weight: 700; text-align: center; }
  .pcard__line-input:focus { outline: none; border-color: #6366F1; }

  .pcard__edge { font-size: 0.8rem; font-weight: 700; color: rgba(255,255,255,0.4); }
  .pos { color: #10B981; }
  .neg { color: #EF4444; }

  .pcard__rec { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 8px 12px; border-radius: 10px; width: 100%; }
  .rec-over { background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.25); }
  .rec-under { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25); }
  .pcard__dir { font-size: 1rem; font-weight: 900; }
  .rec-over .pcard__dir { color: #10B981; }
  .rec-under .pcard__dir { color: #EF4444; }
  .pcard__prob { font-family: 'DM Mono', monospace; font-size: 0.9rem; font-weight: 800; }
  .pcard__conf { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; color: rgba(255,255,255,0.5); }

  .pcard__ev { font-size: 0.8rem; font-weight: 700; color: rgba(255,255,255,0.4); }

  .pcard__save { width: 100%; padding: 10px; border-radius: 10px; border: none; font-size: 0.85rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.15s; }
  .pcard__save:active { transform: scale(0.96); }
  .save-over { background: rgba(16,185,129,0.12); color: #10B981; border: 1px solid rgba(16,185,129,0.25); }
  .save-under { background: rgba(239,68,68,0.12); color: #EF4444; border: 1px solid rgba(239,68,68,0.25); }

  .empty { text-align: center; padding: 64px 20px; color: rgba(255,255,255,0.25); display: flex; flex-direction: column; align-items: center; gap: 16px; }
  .empty p { font-size: 0.95rem; color: rgba(255,255,255,0.4); }

  .loading-state { text-align: center; padding: 48px 20px; color: rgba(255,255,255,0.4); display: flex; flex-direction: column; align-items: center; gap: 12px; }
  .spinner { width: 32px; height: 32px; border: 3px solid rgba(99,102,241,0.2); border-top-color: #6366F1; border-radius: 50%; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Modal */
  .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 50; display: flex; align-items: center; justify-content: center; padding: 20px; }
  .modal { background: #111318; border: 1px solid rgba(255,255,255,0.1); border-radius: 18px; padding: 26px 22px; width: 100%; max-width: 400px; }
  .modal__head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
  .modal__head h3 { font-family: 'Inter', sans-serif; font-size: 1.05rem; font-weight: 800; }
  .modal__x { background: none; border: none; color: rgba(255,255,255,0.4); cursor: pointer; padding: 4px; }
  .modal__body { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
  .summary-row { display: flex; justify-content: space-between; font-size: 0.88rem; }
  .summary-row span { color: rgba(255,255,255,0.4); }
  .summary-row strong { font-weight: 700; }
  .indigo { color: #6366F1; }
  .modal__actions { display: flex; gap: 10px; justify-content: flex-end; }
  .mbtn { padding: 10px 20px; border-radius: 10px; border: none; font-size: 0.85rem; font-weight: 700; cursor: pointer; }
  .mbtn:disabled { opacity: 0.4; cursor: not-allowed; }
  .mbtn--ghost { background: transparent; border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.6); }
  .mbtn--save { background: #6366F1; color: #fff; }

  @media (max-width: 640px) { .selectors { flex-direction: column; } .vs { align-self: center; margin-top: 0; } }
</style>