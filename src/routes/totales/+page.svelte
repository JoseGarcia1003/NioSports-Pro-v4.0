<!-- src/routes/totales/+page.svelte -->
<script>
  import { onMount } from 'svelte';
  import { userId } from '$lib/stores/auth';
  import { teamStats } from '$lib/stores/data';
  import { toasts } from '$lib/stores/ui';
  import { dbPush, userPath } from '$lib/firebase';
  import { savePick } from '$lib/supabase/client.js';
  import SkeletonCard from '$lib/components/SkeletonCard.svelte';
  
  // Motor ejecuta server-side — llamamos al API
  import { MODEL_VERSION } from '$lib/engine/constants.js';

  // ── Estado ───────────────────────────────────────────────────────
  let statsData = null;
  let loadingStats = true;
  let statsError = false;

  let localTeam = '';
  let awayTeam = '';

  let localB2B = false;
  let awayB2B = false;
  let localInjury = false;
  let awayInjury = false;

  // Líneas editables por período
  let lineQ1 = '';
  let lineHalf = '';
  let lineFull = '';

  let savingPick = false;
  let saveTarget = null;

  // ── Cargar nba-stats.json ────────────────────────────────────────
  onMount(async () => {
    try {
      const res = await fetch('/data/nba-stats.json');
      if (!res.ok) throw new Error('No disponible');
      const raw = await res.json();
      statsData = raw.teams || raw;
      teamStats.set(statsData);
      loadingStats = false;
    } catch {
      statsError = true;
      loadingStats = false;
      statsData = getDemoStats();
      teamStats.set(statsData);
    }
  });

  $: teams = statsData ? Object.keys(statsData).sort() : [];
  $: localData = localTeam ? statsData?.[localTeam] : null;
  $: awayData = awayTeam ? statsData?.[awayTeam] : null;
  $: bothSelected = !!(localData && awayData);

  // Predicciones usando el API server-side
  let predictions = null;
  let predictionsLoading = false;

  $: if (bothSelected) {
    loadPredictions();
  }

  async function loadPredictions() {
    predictionsLoading = true;
    try {
      predictions = await generatePredictions();
    } catch (err) {
      console.error('[Totales] Error generating predictions:', err);
      predictions = null;
    } finally {
      predictionsLoading = false;
    }
  }

  // Auto-rellenar líneas sugeridas cuando se generan predicciones
  $: if (predictions && !lineQ1) lineQ1 = predictions.Q1?.projection?.toFixed(1) || '';
  $: if (predictions && !lineHalf) lineHalf = predictions.HALF?.projection?.toFixed(1) || '';
  $: if (predictions && !lineFull) lineFull = predictions.FULL?.projection?.toFixed(1) || '';

  // Análisis recalculados cuando cambian las líneas
  let analysisQ1 = null;
  let analysisHalf = null;
  let analysisFull = null;

  // Actualizar análisis cuando cambian predicciones
  $: if (predictions?.Q1) analysisQ1 = predictions.Q1;
  $: if (predictions?.HALF) analysisHalf = predictions.HALF;
  $: if (predictions?.FULL) analysisFull = predictions.FULL;

  // Recalcular con líneas personalizadas (debounced)
  let recalcTimer = null;
  function scheduleRecalc(period, lineValue) {
    clearTimeout(recalcTimer);
    recalcTimer = setTimeout(async () => {
      const val = parseFloat(lineValue);
      if (!val || isNaN(val)) return;
      const base = predictions?.[period];
      if (!base) return;
      const result = await recalcWithLine(base, val, period);
      if (period === 'Q1') analysisQ1 = result;
      if (period === 'HALF') analysisHalf = result;
      if (period === 'FULL') analysisFull = result;
    }, 400);
  }

  $: if (lineQ1 && predictions?.Q1) scheduleRecalc('Q1', lineQ1);
  $: if (lineHalf && predictions?.HALF) scheduleRecalc('HALF', lineHalf);
  $: if (lineFull && predictions?.FULL) scheduleRecalc('FULL', lineFull);

  /**
   * Genera predicciones llamando al API server-side
   */
  async function generatePredictions() {
    const homeTeamData = {
      name: localTeam,
      stats: localData,
      restDays: localB2B ? 0 : 2,
      injuries: localInjury ? [{ name: 'Star Player', type: 'star' }] : []
    };

    const awayTeamData = {
      name: awayTeam,
      stats: awayData,
      restDays: awayB2B ? 0 : 2,
      injuries: awayInjury ? [{ name: 'Star Player', type: 'star' }] : []
    };

    const gameInfo = {
      arena: localTeam.includes('Nuggets') ? 'Denver' : null
    };

    const periods = ['Q1', 'HALF', 'FULL'];
    const results = {};

    for (const period of periods) {
      const defaultLine = period === 'Q1' ? 55 : period === 'HALF' ? 110 : 220;
      
      try {
        const res = await fetch('/api/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            homeTeam: homeTeamData,
            awayTeam: awayTeamData,
            line: defaultLine,
            period,
            gameInfo
          })
        });
        if (res.ok) {
          results[period] = await res.json();
        }
      } catch (err) {
        console.error(`[Totales] Error predicting ${period}:`, err);
      }
    }

    return Object.keys(results).length > 0 ? results : null;
  }

  /**
   * Recalcula análisis con línea específica (server-side)
   */
  async function recalcWithLine(basePrediction, newLine, period) {
    if (!newLine || isNaN(newLine)) return basePrediction;

    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          homeTeam: {
            name: localTeam,
            stats: localData,
            restDays: localB2B ? 0 : 2,
            injuries: localInjury ? [{ name: 'Star Player', type: 'star' }] : []
          },
          awayTeam: {
            name: awayTeam,
            stats: awayData,
            restDays: awayB2B ? 0 : 2,
            injuries: awayInjury ? [{ name: 'Star Player', type: 'star' }] : []
          },
          line: newLine,
          period,
          gameInfo: { arena: localTeam.includes('Nuggets') ? 'Denver' : null }
        })
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.error(`[Totales] Error recalculating ${period}:`, err);
    }
    return basePrediction;
  }

  /**
   * Reset líneas cuando cambian equipos
   */
  function resetLines() {
    lineQ1 = '';
    lineHalf = '';
    lineFull = '';
  }

  $: if (localTeam || awayTeam) resetLines();

  // Handlers para dropdown con tamaño limitado
  function handleSelectOpen(e) {
    e.target.size = 8;
  }
  function handleSelectClose(e) {
    e.target.size = 1;
  }

  function openSave(period, analysis) {
    saveTarget = { 
      period, 
      line: analysis.line,
      betType: analysis.direction,
      projection: analysis.projection,
      probability: analysis.probability,
      probabilityPercent: analysis.probabilityPercent,
      confidence: analysis.confidence,
      ev: analysis.ev,
      evPercent: analysis.evPercent,
      edge: analysis.edge,
      adjustments: analysis.adjustments,
      totalAdjustment: analysis.totalAdjustment
    };
  }

  function closeSave() { saveTarget = null; }

  async function handleSavePick() {
    if (!saveTarget || !$userId) return;
    savingPick = true;
    try {
      await dbPush(
        userPath($userId, 'picks', 'totales'),
        {
          localTeam,
          awayTeam,
          period: saveTarget.period,
          betType: saveTarget.betType,
          line: saveTarget.line,
          projection: saveTarget.projection,
          probability: saveTarget.probability,
          confidence: saveTarget.confidence,
          ev: saveTarget.ev,
          evPercent: saveTarget.evPercent,
          edge: saveTarget.edge,
          totalAdjustment: saveTarget.totalAdjustment,
          modelVersion: MODEL_VERSION.version,
          odds: -110,
          status: 'pending',
          createdAt: new Date().toISOString(),
        }
      );
      toasts.success(`✅ Pick guardado: ${saveTarget.betType} ${saveTarget.line} (${saveTarget.period})`);
      closeSave();
    } catch {
      toasts.error('No se pudo guardar el pick.');
    } finally {
      savingPick = false;
    }
  }

  function getDemoStats() {
    const BASE_TEAMS = [
      'Celtics','Nets','Knicks','76ers','Raptors',
      'Bulls','Cavaliers','Pistons','Pacers','Bucks',
      'Hawks','Hornets','Heat','Magic','Wizards',
      'Mavericks','Rockets','Grizzlies','Pelicans','Spurs',
      'Nuggets','Timberwolves','Thunder','Trail Blazers','Jazz',
      'Warriors','Clippers','Lakers','Suns','Kings',
    ];
    const demo = {};
    BASE_TEAMS.forEach(team => {
      const base = 25 + Math.random() * 8;
      demo[team] = {
        q1: parseFloat((base).toFixed(1)),
        q1Home: parseFloat((base + 0.5).toFixed(1)),
        q1Away: parseFloat((base - 0.5).toFixed(1)),
        half: parseFloat((base * 2.1).toFixed(1)),
        halfHome: parseFloat((base * 2.1 + 1).toFixed(1)),
        halfAway: parseFloat((base * 2.1 - 1).toFixed(1)),
        full: parseFloat((base * 4.3).toFixed(1)),
        fullHome: parseFloat((base * 4.3 + 1.5).toFixed(1)),
        fullAway: parseFloat((base * 4.3 - 1.5).toFixed(1)),
      };
    });
    return demo;
  }

  function getRank(team, key) {
    if (!statsData) return '';
    const sorted = Object.entries(statsData)
      .map(([t, d]) => ({ t, v: d[key] ?? 0 }))
      .sort((a, b) => b.v - a.v);
    const idx = sorted.findIndex(s => s.t === team);
    if (idx < 0) return '';
    const rank = idx + 1;
    const n = Object.keys(statsData).length;
    const color = rank <= Math.ceil(n / 3) ? '#34d399'
                : rank <= Math.ceil(n * 2 / 3) ? '#fbbf24'
                : '#f87171';
    return { rank, color };
  }

  function getConfidenceStyle(confidence) {
    const styles = {
      HIGH: { bg: 'rgba(52,211,153,.15)', border: 'rgba(52,211,153,.3)', color: '#34d399' },
      MEDIUM: { bg: 'rgba(251,191,36,.15)', border: 'rgba(251,191,36,.3)', color: '#fbbf24' },
      LOW: { bg: 'rgba(156,163,175,.15)', border: 'rgba(156,163,175,.3)', color: '#9ca3af' }
    };
    return styles[confidence] || styles.LOW;
  }
</script>

<svelte:head>
  <title>Totales — NioSports Pro</title>
</svelte:head>

<div class="page">

  <div class="page__header">
    <h1 class="page__title">📈 Análisis de Totales</h1>
    <p class="page__subtitle">
      Motor Predictivo v{MODEL_VERSION.version} — Temporada 2025–26
      {#if statsError}
        <span class="badge badge--warn">⚠️ Usando datos demo</span>
      {/if}
    </p>
  </div>

  {#if loadingStats}
    <SkeletonCard type="stat" count={4} />

  {:else}

    <div class="selectors">
      <div class="selector selector--home">
        <div class="selector__label">🏠 Equipo local</div>
        <select 
          class="selector__select" 
          bind:value={localTeam}
          on:mousedown={handleSelectOpen}
          on:change={handleSelectClose}
          on:blur={handleSelectClose}
        >
          <option value="">Seleccionar...</option>
          {#each teams as t}
            <option value={t}>{t}</option>
          {/each}
        </select>
        {#if localData}
          <div class="team-preview">
            <div class="team-preview__row">
              {#each [['1Q', 'q1Home'], ['1H', 'halfHome'], ['FULL', 'fullHome']] as [label, key]}
                {@const r = getRank(localTeam, key)}
                <div class="team-preview__stat">
                  <span class="team-preview__val">{localData[key] ?? localData[key.replace('Home','')]}</span>
                  <span class="team-preview__lbl">{label} HOME</span>
                  {#if r}
                    <span class="team-preview__rank" style="color:{r.color}">#{r.rank}</span>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>

      <div class="vs-badge">VS</div>

      <div class="selector selector--away">
        <div class="selector__label">✈️ Equipo visitante</div>
        <select 
          class="selector__select" 
          bind:value={awayTeam}
          on:mousedown={handleSelectOpen}
          on:change={handleSelectClose}
          on:blur={handleSelectClose}
        >
          <option value="">Seleccionar...</option>
          {#each teams as t}
            <option value={t} disabled={t === localTeam}>{t}</option>
          {/each}
        </select>
        {#if awayData}
          <div class="team-preview">
            <div class="team-preview__row">
              {#each [['1Q', 'q1Away'], ['1H', 'halfAway'], ['FULL', 'fullAway']] as [label, key]}
                {@const r = getRank(awayTeam, key)}
                <div class="team-preview__stat">
                  <span class="team-preview__val">{awayData[key] ?? awayData[key.replace('Away','')]}</span>
                  <span class="team-preview__lbl">{label} AWAY</span>
                  {#if r}
                    <span class="team-preview__rank" style="color:{r.color}">#{r.rank}</span>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </div>

    {#if bothSelected}
      <div class="factors">
        <div class="factors__title">⚙️ Factores contextuales</div>
        <div class="factors__grid">
          <label class="factor-toggle">
            <input type="checkbox" bind:checked={localB2B} />
            <span>🔴 {localTeam} B2B</span>
          </label>
          <label class="factor-toggle">
            <input type="checkbox" bind:checked={awayB2B} />
            <span>🔴 {awayTeam} B2B</span>
          </label>
          <label class="factor-toggle">
            <input type="checkbox" bind:checked={localInjury} />
            <span>🏥 {localTeam} sin estrella</span>
          </label>
          <label class="factor-toggle">
            <input type="checkbox" bind:checked={awayInjury} />
            <span>🏥 {awayTeam} sin estrella</span>
          </label>
        </div>
        
        {#if predictions?.FULL?.adjustments?.length > 0}
          <div class="factors__applied">
            <span class="factors__applied-label">Ajustes aplicados:</span>
            {#each predictions.FULL.adjustments as adj}
              <span class="factors__tag" class:factors__tag--negative={adj.adjustment < 0}>
                {adj.description} ({adj.adjustment > 0 ? '+' : ''}{adj.adjustment.toFixed(1)})
              </span>
            {/each}
          </div>
        {/if}
      </div>

      {#if predictions}
        <div class="prediction">
          <div class="prediction__header">
            <h2 class="prediction__title">📊 Predicción del Motor</h2>
            <p class="prediction__sub">{localTeam} (HOME) vs {awayTeam} (AWAY)</p>
          </div>

          <div class="prediction__grid">
            {#each [
              { period: 'Q1', label: '1Q', analysis: analysisQ1, lineValue: lineQ1, setLine: (v) => lineQ1 = v },
              { period: 'HALF', label: '1H', analysis: analysisHalf, lineValue: lineHalf, setLine: (v) => lineHalf = v },
              { period: 'FULL', label: 'FULL', analysis: analysisFull, lineValue: lineFull, setLine: (v) => lineFull = v },
            ] as row}
              {@const conf = getConfidenceStyle(row.analysis?.confidence)}
              <div class="pred-card">
                <div class="pred-card__period">{row.label}</div>
                <div class="pred-card__projection">{row.analysis?.projection ?? '-'}</div>
                <div class="pred-card__projection-label">Proyección</div>

                <div class="pred-card__line-input">
                  <label class="line-label">Línea casa</label>
                  <input 
                    type="number" 
                    step="0.5"
                    class="line-input"
                    value={row.lineValue}
                    on:input={(e) => row.setLine(e.target.value)}
                    placeholder={row.analysis?.projection}
                  />
                </div>

                <div class="pred-card__edge" class:edge--positive={row.analysis?.edge > 0} class:edge--negative={row.analysis?.edge < 0}>
                  Edge: {row.analysis?.edge > 0 ? '+' : ''}{row.analysis?.edge ?? 0} pts
                </div>

                <div class="pred-card__recommendation" style="background:{conf.bg}; border-color:{conf.border}">
                  <span class="rec__direction" style="color:{conf.color}">{row.analysis?.direction ?? '-'}</span>
                  <span class="rec__prob">{row.analysis?.probabilityPercent ?? 50}%</span>
                  <span class="rec__confidence" style="color:{conf.color}">{row.analysis?.confidence ?? 'LOW'}</span>
                </div>

                <div class="pred-card__ev" class:ev--positive={row.analysis?.ev > 0}>
                  EV: {row.analysis?.ev > 0 ? '+' : ''}{row.analysis?.evPercent ?? 0}%
                </div>

                <div class="pred-card__actions">
                  <button 
                    class="save-btn" 
                    class:save-btn--over={row.analysis?.direction === 'OVER'}
                    class:save-btn--under={row.analysis?.direction === 'UNDER'}
                    on:click={() => openSave(row.period, row.analysis)}>
                    + {row.analysis?.direction ?? 'OVER'} {row.analysis?.line ?? '-'}
                  </button>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {:else}
      <div class="prompt">
        <span>🏀</span>
        <p>Selecciona ambos equipos para ver la predicción del modelo.</p>
      </div>
    {/if}
  {/if}
</div>

{#if saveTarget}
  <div class="modal-overlay" on:click|self={closeSave} role="dialog" aria-modal="true">
    <div class="modal">
      <div class="modal__header">
        <h3 class="modal__title">Guardar Pick</h3>
        <button class="modal__close" on:click={closeSave} aria-label="Cerrar">✕</button>
      </div>
      <div class="modal__body">
        <div class="pick-summary">
          <div class="pick-summary__row">
            <span class="pick-summary__label">Partido</span>
            <span class="pick-summary__val">{localTeam} vs {awayTeam}</span>
          </div>
          <div class="pick-summary__row">
            <span class="pick-summary__label">Periodo</span>
            <span class="pick-summary__val pick-summary__val--accent">{saveTarget.period}</span>
          </div>
          <div class="pick-summary__row">
            <span class="pick-summary__label">Apuesta</span>
            <span class="pick-summary__val pick-summary__val--accent">
              {saveTarget.betType} {saveTarget.line}
            </span>
          </div>
          <div class="pick-summary__row">
            <span class="pick-summary__label">Proyección</span>
            <span class="pick-summary__val">{saveTarget.projection}</span>
          </div>
          <div class="pick-summary__row">
            <span class="pick-summary__label">Probabilidad</span>
            <span class="pick-summary__val">{saveTarget.probabilityPercent}%</span>
          </div>
          <div class="pick-summary__row">
            <span class="pick-summary__label">Confianza</span>
            <span class="pick-summary__val" style="color:{getConfidenceStyle(saveTarget.confidence).color}">
              {saveTarget.confidence}
            </span>
          </div>
          <div class="pick-summary__row">
            <span class="pick-summary__label">Expected Value</span>
            <span class="pick-summary__val" class:ev-positive={saveTarget.ev > 0} class:ev-negative={saveTarget.ev < 0}>
              {saveTarget.ev > 0 ? '+' : ''}{saveTarget.evPercent}%
            </span>
          </div>
          <div class="pick-summary__row">
            <span class="pick-summary__label">Edge</span>
            <span class="pick-summary__val">{saveTarget.edge > 0 ? '+' : ''}{saveTarget.edge} pts</span>
          </div>
        </div>
      </div>
      <div class="modal__actions">
        <button class="btn btn--ghost" on:click={closeSave} disabled={savingPick}>Cancelar</button>
        <button class="btn btn--save" on:click={handleSavePick} disabled={savingPick}>
          {savingPick ? 'Guardando...' : '✅ Guardar Pick'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .page { max-width: 900px; margin: 0 auto; padding: 32px 20px 80px; }
  .page__header { margin-bottom: 28px; }
  .page__title {
    font-family: 'Orbitron', sans-serif;
    font-size: clamp(1.3rem, 3vw, 1.8rem);
    font-weight: 900;
    margin-bottom: 4px;
  }
  .page__subtitle {
    color: var(--color-text-muted);
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .badge--warn {
    font-size: .72rem;
    background: rgba(245,158,11,.15);
    color: #f59e0b;
    border-radius: 6px;
    padding: 2px 8px;
    font-weight: 700;
  }

  .selectors {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 22px;
    flex-wrap: wrap;
  }
  .selector {
    flex: 1;
    min-width: 240px;
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: 16px;
    padding: 18px;
    position: relative;
  }
  .selector--home { border-color: rgba(96,165,250,.25); }
  .selector--away { border-color: rgba(251,146,60,.25); }

  .selector__label {
    font-size: .8rem;
    font-weight: 700;
    margin-bottom: 8px;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: .05em;
  }
  .selector__select {
    width: 100%;
    background: rgba(255,255,255,.05);
    border: 1px solid var(--color-border);
    border-radius: 10px;
    padding: 10px 12px;
    color: var(--color-text);
    font-size: .9rem;
    cursor: pointer;
    transition: border-color .15s;
  }
  .selector__select:focus { outline: none; border-color: #fbbf24; }
  
  .selector__select[size]:not([size="1"]) {
    position: absolute;
    z-index: 100;
    width: calc(100% - 36px);
  }

  .selector__select option {
    background: #1a1f2e;
    color: #fff;
    padding: 10px;
  }
  .selector__select option:hover,
  .selector__select option:checked {
    background: #fbbf24;
    color: #000;
  }

  .vs-badge {
    font-family: 'Orbitron', sans-serif;
    font-size: 1.1rem;
    font-weight: 900;
    color: #fbbf24;
    background: rgba(251,191,36,.1);
    border: 1px solid rgba(251,191,36,.2);
    border-radius: 50%;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 32px;
    flex-shrink: 0;
  }

  .team-preview { margin-top: 12px; }
  .team-preview__row { display: flex; gap: 8px; flex-wrap: wrap; }
  .team-preview__stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: rgba(255,255,255,.04);
    border-radius: 8px;
    padding: 8px 12px;
    flex: 1;
    min-width: 60px;
  }
  .team-preview__val { font-size: 1.1rem; font-weight: 800; }
  .team-preview__lbl { font-size: .65rem; color: var(--color-text-muted); text-align: center; }
  .team-preview__rank { font-size: .7rem; font-weight: 700; margin-top: 2px; }

  .factors {
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: 14px;
    padding: 16px 18px;
    margin-bottom: 22px;
  }
  .factors__title { font-size: .85rem; font-weight: 700; margin-bottom: 12px; color: var(--color-text-muted); }
  .factors__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  @media (max-width: 500px) { .factors__grid { grid-template-columns: 1fr; } }

  .factors__applied {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--color-border);
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }
  .factors__applied-label {
    font-size: .75rem;
    color: var(--color-text-muted);
  }
  .factors__tag {
    font-size: .7rem;
    padding: 3px 8px;
    border-radius: 6px;
    background: rgba(251,191,36,.1);
    color: #fbbf24;
    font-weight: 600;
  }
  .factors__tag--negative {
    background: rgba(248,113,113,.1);
    color: #f87171;
  }

  .factor-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: .83rem;
    cursor: pointer;
    padding: 8px 10px;
    border-radius: 8px;
    border: 1px solid transparent;
    transition: background .15s;
  }
  .factor-toggle:hover { background: rgba(255,255,255,.04); }
  .factor-toggle input { accent-color: #fbbf24; cursor: pointer; }

  .prediction {
    background: linear-gradient(135deg, rgba(30,50,100,.5), rgba(10,15,28,.8));
    border: 1px solid rgba(251,191,36,.2);
    border-radius: 18px;
    padding: 24px 20px;
  }
  .prediction__header { text-align: center; margin-bottom: 20px; }
  .prediction__title { font-family: 'Orbitron', sans-serif; font-size: 1.1rem; font-weight: 900; color: #fbbf24; }
  .prediction__sub { font-size: .83rem; color: var(--color-text-muted); margin-top: 4px; }

  .prediction__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
  @media (max-width: 600px) { .prediction__grid { grid-template-columns: 1fr; } }

  .pred-card {
    background: rgba(255,255,255,.04);
    border: 1px solid rgba(255,255,255,.08);
    border-radius: 14px;
    padding: 18px 14px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    text-align: center;
  }
  .pred-card__period {
    font-family: 'Orbitron', sans-serif;
    font-size: .75rem;
    font-weight: 700;
    color: var(--color-text-muted);
    letter-spacing: .08em;
  }
  .pred-card__projection {
    font-size: 2.2rem;
    font-weight: 900;
    color: #fff;
    line-height: 1;
  }
  .pred-card__projection-label {
    font-size: .65rem;
    color: var(--color-text-muted);
    text-transform: uppercase;
    margin-top: -4px;
  }

  .pred-card__line-input {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    width: 100%;
  }
  .line-label {
    font-size: .65rem;
    color: var(--color-text-muted);
    text-transform: uppercase;
  }
  .line-input {
    width: 80px;
    padding: 6px 10px;
    border-radius: 8px;
    border: 1px solid var(--color-border);
    background: rgba(255,255,255,.05);
    color: #fbbf24;
    font-size: 1rem;
    font-weight: 700;
    text-align: center;
  }
  .line-input:focus {
    outline: none;
    border-color: #fbbf24;
  }

  .pred-card__edge {
    font-size: .8rem;
    font-weight: 700;
    color: var(--color-text-muted);
  }
  .edge--positive { color: #34d399; }
  .edge--negative { color: #f87171; }

  .pred-card__recommendation {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 10px;
    border: 1px solid;
    width: 100%;
  }
  .rec__direction {
    font-size: 1rem;
    font-weight: 900;
  }
  .rec__prob {
    font-size: .9rem;
    font-weight: 800;
    color: #fff;
  }
  .rec__confidence {
    font-size: .7rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  .pred-card__ev {
    font-size: .8rem;
    font-weight: 700;
    color: var(--color-text-muted);
  }
  .ev--positive { color: #34d399; }

  .pred-card__actions { width: 100%; margin-top: 4px; }
  .save-btn {
    width: 100%;
    padding: 10px 12px;
    border-radius: 10px;
    border: none;
    font-size: .85rem;
    font-weight: 700;
    cursor: pointer;
    transition: opacity .15s, transform .1s;
  }
  .save-btn:active { transform: scale(0.96); }
  .save-btn--over { background: rgba(52,211,153,.15); color: #34d399; border: 1px solid rgba(52,211,153,.3); }
  .save-btn--under { background: rgba(248,113,113,.15); color: #f87171; border: 1px solid rgba(248,113,113,.3); }

  .prompt {
    text-align: center;
    padding: 64px 20px;
    color: var(--color-text-muted);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }
  .prompt span { font-size: 3.5rem; }
  .prompt p { font-size: .95rem; }

  /* Modal */
  .modal-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,.65);
    backdrop-filter: blur(4px);
    z-index: 50;
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
  }
  .modal {
    background: #0f1729;
    border: 1px solid rgba(255,255,255,.12);
    border-radius: 18px;
    padding: 26px 22px;
    width: 100%; max-width: 420px;
  }
  .modal__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
  .modal__title { font-size: 1rem; font-weight: 800; }
  .modal__close { background: none; border: none; color: var(--color-text-muted); font-size: 1rem; cursor: pointer; padding: 4px 8px; }
  .modal__body { margin-bottom: 18px; }
  .modal__actions { display: flex; gap: 10px; justify-content: flex-end; }

  .pick-summary { display: flex; flex-direction: column; gap: 10px; }
  .pick-summary__row { display: flex; justify-content: space-between; align-items: center; font-size: .88rem; }
  .pick-summary__label { color: var(--color-text-muted); }
  .pick-summary__val { font-weight: 700; }
  .pick-summary__val--accent { color: #fbbf24; font-size: 1rem; }

  .ev-positive { color: #34d399; }
  .ev-negative { color: #f87171; }

  .btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px; border-radius: 10px; border: none; font-size: .85rem; font-weight: 700; cursor: pointer; transition: opacity .15s; }
  .btn:disabled { opacity: .4; cursor: not-allowed; }
  .btn--ghost { background: transparent; border: 1px solid var(--color-border); color: var(--color-text-muted); }
  .btn--save { background: #059669; color: #fff; }
</style>