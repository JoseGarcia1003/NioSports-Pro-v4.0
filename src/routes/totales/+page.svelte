<!-- src/routes/totales/+page.svelte -->
<!--
  REEMPLAZA: renderTendencia() / renderTotales() de renders.js
  
  Herramienta de análisis de partido: seleccionas local y visitante,
  el modelo calcula la tendencia de totales por periodo (1Q, 1H, FULL)
  con los datos de nba-stats.json y los factores contextuales.
  
  También permite guardar un pick directamente a Firebase desde aquí.
-->
<script>
  import { onMount }       from 'svelte';
  import { userId }        from '$lib/stores/auth';
  import { teamStats }     from '$lib/stores/data';
  import { toasts }        from '$lib/stores/ui';
  import { dbPush, userPath } from '$lib/firebase';

  // ── Estado ───────────────────────────────────────────────────────
  let statsData    = null;   // nba-stats.json
  let loadingStats = true;
  let statsError   = false;

  let localTeam    = '';
  let awayTeam     = '';

  // Factores contextuales
  let localB2B     = false;
  let awayB2B      = false;
  let localInjury  = false;
  let awayInjury   = false;

  // Estado del guardado de pick
  let savingPick   = false;
  let saveTarget   = null;   // { period, line, betType, trend }

  // ── Cargar nba-stats.json ────────────────────────────────────────
  onMount(async () => {
    try {
      const res = await fetch('/data/nba-stats.json');
      if (!res.ok) throw new Error('No disponible');
      const raw = await res.json();
      statsData = raw;
      teamStats.set(raw);
      loadingStats = false;
    } catch {
      statsError   = true;
      loadingStats = false;
      // Datos demo para que la herramienta funcione sin la API
      statsData = getDemoStats();
      teamStats.set(statsData);
    }
  });

  // ── Teams list ───────────────────────────────────────────────────
  $: teams = statsData ? Object.keys(statsData).sort() : [];

  // ── Stats de cada equipo ─────────────────────────────────────────
  $: localData = localTeam  ? statsData?.[localTeam]  : null;
  $: awayData  = awayTeam   ? statsData?.[awayTeam]   : null;
  $: bothSelected = !!(localData && awayData);

  // ── Modelo de tendencias ─────────────────────────────────────────
  // Cálculo: (home stat local) + (away stat visitante) + ajustes contextuales
  $: trends = bothSelected ? calcTrends() : null;

  function calcTrends() {
    const l = localData;
    const a = awayData;

    let q1   = (l.q1Home   ?? l.q1)   + (a.q1Away   ?? a.q1);
    let half = (l.halfHome  ?? l.half) + (a.halfAway  ?? a.half);
    let full = (l.fullHome  ?? l.full) + (a.fullAway  ?? a.full);

    // Factor B2B: -1.25 pts por equipo
    if (localB2B)   { q1 -= 0.3; half -= 0.6; full -= 1.25; }
    if (awayB2B)    { q1 -= 0.3; half -= 0.6; full -= 1.25; }

    // Factor lesión estrella: -3.5 pts por equipo
    if (localInjury) { q1 -= 0.9; half -= 1.75; full -= 3.5; }
    if (awayInjury)  { q1 -= 0.9; half -= 1.75; full -= 3.5; }

    return {
      q1:   parseFloat(q1.toFixed(1)),
      half: parseFloat(half.toFixed(1)),
      full: parseFloat(full.toFixed(1)),
      // Línea sugerida (redondeada a .5)
      sugQ1:   roundHalf(q1),
      sugHalf: roundHalf(half),
      sugFull: roundHalf(full),
    };
  }

  function roundHalf(n) {
    return (Math.round(n * 2) / 2).toFixed(1);
  }

  // Probabilidad simple de OVER/UNDER dado tendencia vs línea
  function calcProb(trend, line, type) {
    if (!trend || !line) return null;
    const diff = type === 'OVER'
      ? parseFloat(trend) - parseFloat(line)
      : parseFloat(line)  - parseFloat(trend);
    // Escala sigmoidea aproximada
    const prob = 50 + Math.min(Math.max(diff * 3.5, -25), 25);
    return Math.round(prob);
  }

  // ── Guardar pick ─────────────────────────────────────────────────
  function openSave(period, line, betType, trend) {
    saveTarget = { period, line, betType, trend };
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
          period:    saveTarget.period,
          betType:   saveTarget.betType,
          line:      parseFloat(saveTarget.line),
          trend:     saveTarget.trend,
          odds:      1.91,
          ev:        null,
          status:    'pending',
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

  // ── Datos demo (fallback si no hay nba-stats.json) ───────────────
  function getDemoStats() {
    const BASE_TEAMS = [
      'Boston Celtics','Brooklyn Nets','New York Knicks','Philadelphia 76ers','Toronto Raptors',
      'Chicago Bulls','Cleveland Cavaliers','Detroit Pistons','Indiana Pacers','Milwaukee Bucks',
      'Atlanta Hawks','Charlotte Hornets','Miami Heat','Orlando Magic','Washington Wizards',
      'Dallas Mavericks','Houston Rockets','Memphis Grizzlies','New Orleans Pelicans','San Antonio Spurs',
      'Denver Nuggets','Minnesota Timberwolves','Oklahoma City Thunder','Portland Trail Blazers','Utah Jazz',
      'Golden State Warriors','Los Angeles Clippers','Los Angeles Lakers','Phoenix Suns','Sacramento Kings',
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

  // ── Getters de ranking informal ──────────────────────────────────
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
</script>

<svelte:head>
  <title>Totales — NioSports Pro</title>
</svelte:head>

<div class="page">

  <!-- ── Header ────────────────────────────────────────── -->
  <div class="page__header">
    <h1 class="page__title">📈 Análisis de Totales</h1>
    <p class="page__subtitle">
      Modelo predictivo NBA — Temporada 2025–26
      {#if statsError}
        <span class="badge badge--warn">⚠️ Usando datos demo</span>
      {/if}
    </p>
  </div>

  {#if loadingStats}
    <div class="skeleton-selectors"></div>

  {:else}

    <!-- ── Selección de equipos ──────────────────────── -->
    <div class="selectors">
      <div class="selector selector--home">
        <div class="selector__label">🏠 Equipo local</div>
        <select class="selector__select" bind:value={localTeam}>
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
        <select class="selector__select" bind:value={awayTeam}>
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

    <!-- ── Factores contextuales ─────────────────────── -->
    {#if bothSelected}
      <div class="factors">
        <div class="factors__title">⚙️ Factores contextuales</div>
        <div class="factors__grid">
          <label class="factor-toggle">
            <input type="checkbox" bind:checked={localB2B} />
            <span>🔴 {localTeam} B2B <small>(-1.25 pts)</small></span>
          </label>
          <label class="factor-toggle">
            <input type="checkbox" bind:checked={awayB2B} />
            <span>🔴 {awayTeam} B2B <small>(-1.25 pts)</small></span>
          </label>
          <label class="factor-toggle">
            <input type="checkbox" bind:checked={localInjury} />
            <span>🏥 {localTeam} sin estrella <small>(-3.5 pts)</small></span>
          </label>
          <label class="factor-toggle">
            <input type="checkbox" bind:checked={awayInjury} />
            <span>🏥 {awayTeam} sin estrella <small>(-3.5 pts)</small></span>
          </label>
        </div>
      </div>

      <!-- ── Predicción del modelo ─────────────────── -->
      {#if trends}
        <div class="prediction">
          <div class="prediction__header">
            <h2 class="prediction__title">📊 Predicción del modelo</h2>
            <p class="prediction__sub">{localTeam} (HOME) vs {awayTeam} (AWAY)</p>
          </div>

          <div class="prediction__grid">
            {#each [
              { period: '1Q',  trend: trends.q1,   sug: trends.sugQ1   },
              { period: '1H',  trend: trends.half, sug: trends.sugHalf },
              { period: 'FULL', trend: trends.full, sug: trends.sugFull },
            ] as row}
              {@const pOver  = calcProb(row.trend, row.sug, 'OVER')}
              {@const pUnder = calcProb(row.trend, row.sug, 'UNDER')}
              <div class="pred-card">
                <div class="pred-card__period">{row.period}</div>
                <div class="pred-card__trend">{row.trend}</div>
                <div class="pred-card__sug-label">Línea sugerida</div>
                <div class="pred-card__sug">{row.sug}</div>

                <div class="pred-card__probs">
                  <div class="prob" class:prob--strong={pOver >= 60}>
                    <span class="prob__label">OVER</span>
                    <span class="prob__val">{pOver}%</span>
                  </div>
                  <div class="prob" class:prob--strong={pUnder >= 60}>
                    <span class="prob__label">UNDER</span>
                    <span class="prob__val">{pUnder}%</span>
                  </div>
                </div>

                <div class="pred-card__actions">
                  <button class="save-btn save-btn--over"
                    on:click={() => openSave(row.period, row.sug, 'OVER', row.trend)}>
                    + OVER {row.sug}
                  </button>
                  <button class="save-btn save-btn--under"
                    on:click={() => openSave(row.period, row.sug, 'UNDER', row.trend)}>
                    + UNDER {row.sug}
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

<!-- ── Modal guardar pick ────────────────────────────────── -->
{#if saveTarget}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="modal-overlay" on:click|self={closeSave} role="dialog" aria-modal="true">
    <div class="modal">
      <div class="modal__header">
        <h3 class="modal__title">Guardar pick</h3>
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
            <span class="pick-summary__label">Tendencia</span>
            <span class="pick-summary__val">{saveTarget.trend}</span>
          </div>
        </div>
      </div>
      <div class="modal__actions">
        <button class="btn btn--ghost" on:click={closeSave} disabled={savingPick}>
          Cancelar
        </button>
        <button class="btn btn--save" on:click={handleSavePick} disabled={savingPick}>
          {savingPick ? 'Guardando...' : '✅ Guardar en Mis Picks'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .page {
    max-width: 900px;
    margin: 0 auto;
    padding: 32px 20px 80px;
  }
  .page__header  { margin-bottom: 28px; }
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

  /* Selectors */
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
  .team-preview__row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
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
  .team-preview__val  { font-size: 1.1rem; font-weight: 800; }
  .team-preview__lbl  { font-size: .65rem; color: var(--color-text-muted); text-align: center; }
  .team-preview__rank { font-size: .7rem; font-weight: 700; margin-top: 2px; }

  /* Factors */
  .factors {
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: 14px;
    padding: 16px 18px;
    margin-bottom: 22px;
  }
  .factors__title {
    font-size: .85rem;
    font-weight: 700;
    margin-bottom: 12px;
    color: var(--color-text-muted);
  }
  .factors__grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  @media (max-width: 500px) { .factors__grid { grid-template-columns: 1fr; } }

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
  .factor-toggle small  { color: var(--color-text-muted); }

  /* Prediction */
  .prediction {
    background: linear-gradient(135deg, rgba(30,50,100,.5), rgba(10,15,28,.8));
    border: 1px solid rgba(251,191,36,.2);
    border-radius: 18px;
    padding: 24px 20px;
  }
  .prediction__header  { text-align: center; margin-bottom: 20px; }
  .prediction__title   { font-family: 'Orbitron', sans-serif; font-size: 1.1rem; font-weight: 900; color: #fbbf24; }
  .prediction__sub     { font-size: .83rem; color: var(--color-text-muted); margin-top: 4px; }

  .prediction__grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
  }
  @media (max-width: 600px) { .prediction__grid { grid-template-columns: 1fr; } }

  .pred-card {
    background: rgba(255,255,255,.04);
    border: 1px solid rgba(255,255,255,.08);
    border-radius: 14px;
    padding: 18px 14px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    text-align: center;
  }
  .pred-card__period   { font-family: 'Orbitron', sans-serif; font-size: .75rem; font-weight: 700; color: var(--color-text-muted); letter-spacing: .08em; }
  .pred-card__trend    { font-size: 2rem; font-weight: 900; color: #fff; line-height: 1; }
  .pred-card__sug-label { font-size: .68rem; color: var(--color-text-muted); text-transform: uppercase; }
  .pred-card__sug      { font-size: 1.2rem; font-weight: 800; color: #fbbf24; }

  .pred-card__probs {
    display: flex;
    gap: 8px;
    width: 100%;
    margin-top: 4px;
  }
  .prob {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 6px 4px;
    border-radius: 8px;
    background: rgba(255,255,255,.04);
    border: 1px solid rgba(255,255,255,.06);
  }
  .prob--strong { background: rgba(52,211,153,.1); border-color: rgba(52,211,153,.2); }
  .prob--strong .prob__val { color: #34d399; }
  .prob__label { font-size: .65rem; color: var(--color-text-muted); text-transform: uppercase; }
  .prob__val   { font-size: .9rem; font-weight: 800; }

  .pred-card__actions {
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 100%;
    margin-top: 4px;
  }
  .save-btn {
    width: 100%;
    padding: 7px 10px;
    border-radius: 8px;
    border: none;
    font-size: .78rem;
    font-weight: 700;
    cursor: pointer;
    transition: opacity .15s, transform .1s;
  }
  .save-btn:active { transform: scale(0.96); }
  .save-btn--over  { background: rgba(52,211,153,.15); color: #34d399; border: 1px solid rgba(52,211,153,.3); }
  .save-btn--under { background: rgba(248,113,113,.15); color: #f87171; border: 1px solid rgba(248,113,113,.3); }

  /* Prompt */
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
  .prompt p    { font-size: .95rem; }

  /* Skeleton */
  .skeleton-selectors {
    height: 160px;
    border-radius: 16px;
    margin-bottom: 22px;
    background: linear-gradient(90deg, rgba(255,255,255,.04) 25%, rgba(255,255,255,.07) 50%, rgba(255,255,255,.04) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.4s infinite;
  }
  @keyframes shimmer { to { background-position: -200% 0; } }

  /* Modal */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,.65);
    backdrop-filter: blur(4px);
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }
  .modal {
    background: #0f1729;
    border: 1px solid rgba(255,255,255,.12);
    border-radius: 18px;
    padding: 26px 22px;
    width: 100%;
    max-width: 420px;
  }
  .modal__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 18px;
  }
  .modal__title { font-size: 1rem; font-weight: 800; }
  .modal__close { background: none; border: none; color: var(--color-text-muted); font-size: 1rem; cursor: pointer; padding: 4px 8px; }
  .modal__body  { margin-bottom: 18px; }
  .modal__actions { display: flex; gap: 10px; justify-content: flex-end; }

  .pick-summary { display: flex; flex-direction: column; gap: 10px; }
  .pick-summary__row { display: flex; justify-content: space-between; align-items: center; font-size: .88rem; }
  .pick-summary__label { color: var(--color-text-muted); }
  .pick-summary__val   { font-weight: 700; }
  .pick-summary__val--accent { color: #fbbf24; font-size: 1rem; }

  .btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px; border-radius: 10px; border: none; font-size: .85rem; font-weight: 700; cursor: pointer; transition: opacity .15s; }
  .btn:disabled { opacity: .4; cursor: not-allowed; }
  .btn--ghost { background: transparent; border: 1px solid var(--color-border); color: var(--color-text-muted); }
  .btn--save  { background: #059669; color: #fff; }
</style>
