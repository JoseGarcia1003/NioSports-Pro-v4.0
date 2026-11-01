<script>
  import { onMount, tick } from 'svelte';
  import { STATS, toGame, hitRate, average, referenceLine, seasonGames, statValue, defenseFor, splitRate } from '$lib/nba/props.js';
  import { teamColor } from '$lib/product/teams.js';
  import { authenticatedFetch } from '$lib/services/authenticated-fetch.js';

  let state = 'loading';
  let payload = null;
  let stat = 'pts';
  let gameFilter = 'all';
  let query = '';
  let lines = {};
  let selected = null;
  let controller;
  let day = 0;
  let detailEl;

  async function load(nextDay = day) {
    day = nextDay;
    selected = null;
    gameFilter = 'all';
    controller?.abort();
    controller = new AbortController();
    state = 'loading';
    try {
      const res = await authenticatedFetch(`/api/nba/props${day ? '?day=1' : ''}`, { signal: controller.signal });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      payload = { ...body, players: body.players.map(p => ({ ...p, games: p.games.map(toGame) })) };
      state = payload.players.length ? 'ready' : 'empty';
    } catch (err) {
      if (err?.name !== 'AbortError') state = 'unavailable';
    }
  }
  onMount(() => { load(); return () => controller?.abort(); });

  let history = {};
  async function loadHistory(id) {
    if (history[id]) return;
    history = { ...history, [id]: 'loading' };
    try {
      const res = await authenticatedFetch(`/api/nba/player?id=${id}`);
      const body = await res.json();
      if (!res.ok) throw new Error();
      history = { ...history, [id]: body.games.map(toGame) };
    } catch { history = { ...history, [id]: 'error' }; }
  }

  async function select(id) {
    selected = selected === id ? null : id;
    if (selected) loadHistory(selected);
    if (selected && typeof window !== 'undefined' && window.innerWidth < 1100) {
      await tick();
      detailEl?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }
  }

  const key = (p, s) => `${p.id}:${s}`;
  function lineOf(p, s, overrides) { return overrides[key(p, s)] ?? referenceLine(p.games, s); }
  function nudge(p, delta) {
    const current = lineOf(p, stat, lines);
    lines = { ...lines, [key(p, stat)]: Math.max(0.5, Math.round((current + delta) * 2) / 2) };
  }
  function reset(p) { const { [key(p, stat)]: _, ...rest } = lines; lines = rest; }

  const pct = r => (r.rate == null ? '—' : `${Math.round(r.rate * 100)}%`);
  const tone = r => (r.rate == null ? '' : r.rate >= 0.6 ? 'hit' : r.rate <= 0.4 ? 'miss' : '');
  const fmt = n => (n == null ? '—' : n.toLocaleString('es', { maximumFractionDigits: 1 }));
  const shortDate = d => new Date(`${d}T12:00:00Z`).toLocaleDateString('es', { day: 'numeric', month: 'short' });
  const timeFormat = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' });

  $: rows = (payload?.players || [])
    .filter(p => gameFilter === 'all' || String(p.gameId) === gameFilter)
    .filter(p => !query.trim() || p.name.toLowerCase().includes(query.trim().toLowerCase()) || p.team.toLowerCase() === query.trim().toLowerCase())
    .map(p => {
      const line = lineOf(p, stat, lines);
      return { p, line, custom: key(p, stat) in lines, l5: hitRate(p.games, stat, line, 5), l10: hitRate(p.games, stat, line, 10), l20: hitRate(p.games, stat, line, 20), season: hitRate(seasonGames(p.games), stat, line), avg: average(p.games, stat, 10), spark: p.games.slice(0, 10).reverse(), def: defenseFor(payload?.defense, p.opp, stat) };
    });
  $: if (selected && !rows.some(r => r.p.id === selected)) selected = null;
  $: detail = rows.find(r => r.p.id === selected);
</script>

<section class="props" aria-labelledby="props-title">
  <header class="head">
    <div>
      <p class="eyebrow">NBA · Props de jugadores</p>
      <h1 id="props-title">Props del día</h1>
      <p class="lead">Cuántas veces cada jugador superó la línea en sus últimos partidos. Datos oficiales de box score{#if payload?.statsThrough}{' '}hasta el {shortDate(payload.statsThrough)}{/if}.</p>
    </div>
    <div class="days" role="group" aria-label="Día">
      <button type="button" class:on={day === 0} aria-pressed={day === 0} on:click={() => load(0)}>Hoy</button>
      <button type="button" class:on={day === 1} aria-pressed={day === 1} on:click={() => load(1)}>Mañana</button>
    </div>
  </header>

  <p class="notice"><b>Línea de referencia:</b> mediana de sus últimos 10 partidos ajustada a ,5. <b>No es la línea de una casa de apuestas</b>; ajústala con − / + a la que veas en tu casa.</p>

  <div class="controls">
    <div class="chips" role="group" aria-label="Estadística">
      {#each Object.entries(STATS) as [id, s]}
        <button type="button" class:on={stat === id} aria-pressed={stat === id} on:click={() => (stat = id)}>{s.short}</button>
      {/each}
    </div>
    <input type="search" placeholder="Buscar jugador o equipo (MIL)…" aria-label="Buscar jugador o equipo" bind:value={query} />
  </div>

  {#if payload?.games?.length}
    <div class="games" role="group" aria-label="Partido">
      <button type="button" class:on={gameFilter === 'all'} on:click={() => (gameFilter = 'all')}>Todos · {payload.games.length}</button>
      {#each payload.games as g (g.id)}
        <button type="button" class:on={gameFilter === String(g.id)} on:click={() => (gameFilter = String(g.id))}>{g.visitor} @ {g.home}<small>{timeFormat.format(new Date(g.datetime))}</small></button>
      {/each}
    </div>
  {/if}

  {#if state === 'loading'}
    <p class="state" role="status">Cargando jugadores y estadísticas…</p>
  {:else if state === 'unavailable'}
    <div class="state"><p>No pudimos cargar las estadísticas ahora mismo. No mostramos cifras sin fuente.</p><button type="button" on:click={() => load()}>Reintentar</button></div>
  {:else if state === 'empty'}
    <p class="state">No hay partidos o jugadores con datos suficientes para este día.</p>
  {:else}
    <div class="layout" class:with-detail={detail}>
      <div class="table" role="table" aria-label={`Props de ${STATS[stat].label}`}>
        <div class="tr th" role="row">
          <span role="columnheader">Jugador</span><span role="columnheader">Línea</span><span role="columnheader">L5</span><span role="columnheader">L10</span><span role="columnheader">L20</span><span role="columnheader">Temp.</span><span role="columnheader">Prom. L10</span><span role="columnheader">Últimos 10</span>
        </div>
        {#each rows as r (r.p.id)}
          <div class="tr" role="row" class:active={selected === r.p.id}>
            <span role="cell" class="player-cell"><button type="button" class="player" on:click={() => select(r.p.id)} aria-expanded={selected === r.p.id}>
              <i class="badge" style={`--team:${teamColor(r.p.team)}`}>{r.p.team}</i>
              <span><b>{r.p.name}</b><small>{r.p.home ? 'vs' : '@'} {r.p.opp} · {fmt(r.p.minutesL5)} min L5{#if r.def}{' '}<em class="def" class:good={r.def.rank <= 10} class:bad={r.def.rank > r.def.of - 10} title={`${r.p.opp} permite ${fmt(r.def.value)} por partido; puesto ${r.def.rank} de ${r.def.of} (1 = permite más)`}>DEF {r.def.rank}º</em>{/if}</small></span>
            </button></span>
            <span class="line" role="cell">
              <button type="button" aria-label="Bajar línea" on:click={() => nudge(r.p, -0.5)}>−</button>
              <b class:custom={r.custom} title={r.custom ? 'Línea ajustada por ti' : 'Línea de referencia'}>{fmt(r.line)}</b>
              <button type="button" aria-label="Subir línea" on:click={() => nudge(r.p, 0.5)}>+</button>
              {#if r.custom}<button type="button" class="reset" aria-label="Volver a la referencia" on:click={() => reset(r.p)}>↺</button>{/if}
            </span>
            {#each [r.l5, r.l10, r.l20, r.season] as h, i}
              <span role="cell" class={`rate ${tone(h)}`} data-label={['L5', 'L10', 'L20', 'Temp.'][i]}><b>{pct(h)}</b><small title={h.push ? `${h.push} partido(s) exactamente en la línea, no cuentan` : ''}>{h.over}/{h.over + h.under}{h.push ? ` · ${h.push} =` : ''}</small></span>
            {/each}
            <span role="cell" class="avg">{fmt(r.avg)}</span>
            <span role="cell" class="spark" aria-label={`Últimos 10: ${r.spark.map(g => statValue(g, stat)).join(', ')}`}>
              {#each r.spark as g}
                {@const v = statValue(g, stat)}
                {@const max = Math.max(r.line * 2, ...r.spark.map(x => statValue(x, stat)), 1)}
                <i class:over={v > r.line} class:under={v < r.line} style={`height:${Math.max(6, (v / max) * 100)}%`}></i>
              {/each}
              <em style={`bottom:${(r.line / Math.max(r.line * 2, ...r.spark.map(x => statValue(x, stat)), 1)) * 100}%`}></em>
            </span>
          </div>
        {/each}
        {#if !rows.length}<p class="state">Ningún jugador coincide con la búsqueda.</p>{/if}
      </div>

      {#if detail}
        {@const games20 = detail.p.games.slice(0, 20).reverse()}
        {@const hist = Array.isArray(history[detail.p.id]) ? history[detail.p.id] : null}
        {@const max = Math.max(detail.line * 1.6, ...games20.map(g => statValue(g, stat)), 1)}
        <aside class="detail" bind:this={detailEl} aria-label={`Detalle de ${detail.p.name}`}>
          <div class="detail-head">
            <i class="badge big" style={`--team:${teamColor(detail.p.team)}`}>{detail.p.team}</i>
            <div><h2>{detail.p.name}</h2><p>{STATS[stat].label} · línea {fmt(detail.line)} · {detail.p.home ? 'vs' : '@'} {detail.p.opp}</p></div>
            <button type="button" class="close" aria-label="Cerrar detalle" on:click={() => (selected = null)}>✕</button>
          </div>
          <div class="kpis">
            {#each [['L5', detail.l5], ['L10', detail.l10], ['L20', detail.l20], ['Temporada', detail.season]] as [label, h]}
              <div class={tone(h)}><span>{label}</span><b>{pct(h)}</b><small>{h.over} de {h.over + h.under}</small></div>
            {/each}
          </div>
          <div class="context">
            {#if detail.def}
              <p class="def-line"><b>Defensa de {detail.p.opp}:</b> permite {fmt(detail.def.value)} {STATS[stat].label.toLowerCase()} por partido · puesto <b class:good={detail.def.rank <= 10} class:bad={detail.def.rank > detail.def.of - 10}>{detail.def.rank}º de {detail.def.of}</b> (1 = permite más) · {detail.def.games} partidos esta temporada.</p>
            {/if}
            {#if history[detail.p.id] === 'loading'}
              <p class="muted" role="status">Cargando historial completo…</p>
            {:else if history[detail.p.id] === 'error'}
              <p class="muted">No se pudo cargar el historial completo.</p>
            {:else if hist}
              <div class="splits">
                {#each [['Local', g => g.home], ['Visitante', g => !g.home], [`vs ${detail.p.opp}`, g => g.opponent === detail.p.opp], ['30+ min', g => g.minutes >= 30]] as [label, fn]}
                  {@const h = splitRate(hist, stat, detail.line, fn)}
                  <div class={tone(h)}><span>{label}</span><b>{pct(h)}</b><small>{h.n ? `${h.over} de ${h.over + h.under}` : 'sin partidos'}</small></div>
                {/each}
              </div>
              <p class="muted">Divisiones sobre {hist.length} partidos guardados (temporadas {[...new Set(hist.map(g => g.season))].join(' y ')}).</p>
            {/if}
          </div>
          <div class="chart" role="img" aria-label={`Últimos ${games20.length} partidos frente a la línea ${detail.line}`}>
            <em class="ref" style={`bottom:${(detail.line / max) * 100}%`}><span>{fmt(detail.line)}</span></em>
            {#each games20 as g, i}
              {@const v = statValue(g, stat)}
              <div class="bar-col">
                <span class="val">{v}</span>
                <i class:over={v > detail.line} class:under={v < detail.line} style={`height:${Math.max(3, (v / max) * 100)}%`}></i>
                {#if i % 2 === games20.length % 2}<small>{g.home ? '' : '@'}{g.opponent}</small>{/if}
              </div>
            {/each}
          </div>
          <p class="foot">Del más antiguo (izquierda) al más reciente (derecha). Incluye la temporada anterior si hace falta para completar 20 partidos. Fuente: stats.nba.com.</p>
        </aside>
      {/if}
    </div>
  {/if}
</section>

<style>
  .props { max-width: 1320px; margin: auto; padding: 28px 24px 100px; color: var(--nio-ink); font-family: var(--font-sans); font-variant-numeric: tabular-nums; }
  .head { display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; flex-wrap: wrap; }
  .eyebrow { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; font-weight: 600; color: var(--nio-muted); margin: 0 0 8px; }
  h1 { font-family: var(--font-display); text-transform: uppercase; font-weight: 800; font-size: clamp(44px, 6vw, 76px); line-height: .95; margin: 0 0 12px; }
  .lead { color: var(--nio-muted); max-width: 640px; margin: 0; line-height: 1.6; }
  .days, .chips, .games { display: flex; gap: 6px; flex-wrap: wrap; }
  button { font: inherit; cursor: pointer; }
  .days button, .chips button, .games button { min-height: 38px; padding: 0 14px; border-radius: 999px; border: 1px solid var(--nio-border); background: var(--nio-surface); color: var(--nio-muted); font-weight: 600; font-size: 13px; }
  .days button.on, .chips button.on, .games button.on { background: var(--nio-action); color: var(--nio-action-ink); border-color: transparent; }
  .games button { display: inline-flex; align-items: center; gap: 8px; border-radius: 10px; }
  .games small { font-weight: 500; opacity: .75; }
  .notice { margin: 20px 0 16px; padding: 12px 14px; border-radius: 12px; background: var(--nio-gold-soft); border: 1px solid var(--nio-gold-border); color: var(--nio-ink); font-size: 13px; line-height: 1.55; }
  .notice b { color: var(--nio-accent); }
  .controls { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 10px; }
  input[type='search'] { min-height: 40px; min-width: 260px; flex: 0 1 320px; padding: 0 14px; border-radius: 10px; border: 1px solid var(--nio-border); background: var(--nio-surface); color: var(--nio-ink); font: inherit; }
  .games { margin-bottom: 16px; }
  .layout { display: grid; grid-template-columns: minmax(0, 1fr); gap: 18px; align-items: start; }
  .layout.with-detail { grid-template-columns: minmax(0, 1fr) minmax(320px, 420px); }
  .table { border: 1px solid var(--nio-border); border-radius: 16px; background: var(--nio-surface); overflow: hidden; }
  .tr { display: grid; grid-template-columns: minmax(200px, 2.2fr) 128px repeat(4, 64px) 64px minmax(120px, 1.2fr); align-items: center; gap: 8px; padding: 10px 14px; border-top: 1px solid var(--nio-border); }
  .tr.th { border-top: 0; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--nio-muted); font-weight: 600; background: var(--nio-raised); }
  .tr.active { background: var(--nio-selection); }
  .player-cell { min-width: 0; }
  .player { display: flex; width: 100%; align-items: center; gap: 10px; min-width: 0; text-align: left; background: none; border: 0; color: inherit; padding: 4px 0; }
  .player span { display: grid; min-width: 0; }
  .player b { font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .player small { font-size: 12px; color: var(--nio-muted); }
  .badge { flex: none; display: inline-grid; place-items: center; width: 38px; height: 24px; border-radius: 6px; background: var(--team); color: #fff; font-style: normal; font-family: var(--font-display); font-weight: 700; font-size: 13px; letter-spacing: .04em; box-shadow: inset 0 0 0 1px rgba(255,255,255,.14); }
  .badge.big { width: 52px; height: 34px; font-size: 17px; }
  .line { display: inline-flex; align-items: center; gap: 4px; }
  .line button { width: 26px; height: 26px; border-radius: 7px; border: 1px solid var(--nio-border); background: var(--nio-raised); color: var(--nio-ink); line-height: 1; }
  .line b { min-width: 40px; text-align: center; font-family: var(--font-display); font-size: 19px; }
  .line b.custom { color: var(--nio-accent); }
  .line .reset { border: 0; background: none; color: var(--nio-muted); width: 20px; }
  .rate { display: grid; }
  .rate b { font-family: var(--font-display); font-size: 19px; }
  .rate small { font-size: 11px; color: var(--nio-muted); }
  .rate.hit b, .kpis .hit b { color: var(--nio-hit); }
  .rate.miss b, .kpis .miss b { color: var(--nio-miss); }
  .avg { font-family: var(--font-display); font-size: 18px; color: var(--nio-muted); }
  .spark { position: relative; display: flex; align-items: flex-end; gap: 3px; height: 34px; }
  .spark i { flex: 1; border-radius: 2px 2px 0 0; background: var(--nio-border); min-width: 4px; }
  .spark i.over { background: var(--nio-hit); }
  .spark i.under { background: var(--nio-miss); }
  .spark em { position: absolute; left: 0; right: 0; border-top: 1px dashed var(--nio-accent); }
  .state { padding: 22px 14px; color: var(--nio-muted); margin: 0; }
  .state button { margin-top: 10px; min-height: 40px; padding: 0 16px; border-radius: 10px; border: 1px solid var(--nio-border); background: var(--nio-raised); color: var(--nio-ink); font-weight: 600; }
  .detail { position: sticky; top: 84px; scroll-margin-top: 140px; border: 1px solid var(--nio-border); border-radius: 16px; background: linear-gradient(180deg, var(--nio-raised), var(--nio-surface) 160px); padding: 18px; }
  .detail-head { display: flex; align-items: center; gap: 12px; }
  .detail-head h2 { font-family: var(--font-display); text-transform: uppercase; font-size: 28px; line-height: 1; margin: 0; }
  .detail-head p { margin: 4px 0 0; font-size: 13px; color: var(--nio-muted); }
  .close { margin-left: auto; width: 34px; height: 34px; border-radius: 9px; border: 1px solid var(--nio-border); background: var(--nio-surface); color: var(--nio-ink); }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 16px 0; }
  .kpis div { display: grid; padding: 10px; border-radius: 10px; background: var(--nio-page); border: 1px solid var(--nio-border); }
  .kpis span { font-size: 11px; color: var(--nio-muted); text-transform: uppercase; letter-spacing: .06em; }
  .kpis b { font-family: var(--font-display); font-size: 26px; line-height: 1.1; }
  .kpis small { font-size: 11px; color: var(--nio-muted); }
  .chart { position: relative; display: flex; align-items: flex-end; gap: 4px; height: 200px; padding-top: 18px; margin-bottom: 26px; }
  .bar-col { position: relative; flex: 1; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; }
  .bar-col i { width: 100%; border-radius: 3px 3px 0 0; background: var(--nio-border); }
  .bar-col i.over { background: var(--nio-hit); }
  .bar-col i.under { background: var(--nio-miss); }
  .bar-col .val { font-size: 10px; font-weight: 700; margin-bottom: 2px; }
  .bar-col small { position: absolute; bottom: -18px; font-size: 9px; color: var(--nio-muted); white-space: nowrap; }
  .ref { position: absolute; left: 0; right: 0; border-top: 2px dashed var(--nio-accent); z-index: 1; }
  .ref span { position: absolute; right: 0; top: -18px; font-size: 11px; font-weight: 700; color: var(--nio-accent); background: var(--nio-surface); padding: 0 4px; border-radius: 4px; }
  .def { white-space: nowrap; font-style: normal; font-weight: 700; font-size: 10px; letter-spacing: .04em; padding: 1px 6px; border-radius: 999px; border: 1px solid var(--nio-border); color: var(--nio-muted); }
  .def.good { color: var(--nio-hit); border-color: color-mix(in srgb, var(--nio-hit) 45%, transparent); }
  .def.bad { color: var(--nio-miss); border-color: color-mix(in srgb, var(--nio-miss) 45%, transparent); }
  .context { margin: 0 0 16px; display: grid; gap: 10px; }
  .def-line { margin: 0; font-size: 13px; line-height: 1.55; color: var(--nio-muted); }
  .def-line b { color: var(--nio-ink); }
  .def-line b.good { color: var(--nio-hit); }
  .def-line b.bad { color: var(--nio-miss); }
  .splits { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .splits div { display: grid; padding: 8px 10px; border-radius: 10px; border: 1px solid var(--nio-border); }
  .splits span { font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: var(--nio-muted); white-space: nowrap; }
  .splits b { font-family: var(--font-display); font-size: 20px; }
  .splits small { font-size: 11px; color: var(--nio-muted); }
  .splits .hit b { color: var(--nio-hit); }
  .splits .miss b { color: var(--nio-miss); }
  .muted { margin: 0; font-size: 12px; color: var(--nio-muted); }
  .foot { font-size: 12px; color: var(--nio-muted); line-height: 1.55; margin: 0; }
  button:focus-visible, input:focus-visible { outline: 2px solid var(--nio-accent); outline-offset: 2px; }
  @media (max-width: 1100px) { .layout.with-detail { grid-template-columns: 1fr; } .detail { position: static; } }
  @media (max-width: 860px) {
    .props { padding: 20px 14px 110px; }
    .tr { grid-template-columns: repeat(4, minmax(0, 1fr)); row-gap: 10px; padding: 14px; }
    .tr.th { display: none; }
    .player-cell, .line, .spark { grid-column: 1 / -1; }
    .line { justify-content: flex-start; }
    .avg { display: none; }
    .rate { padding: 6px 8px; border-radius: 8px; background: var(--nio-page); }
    .rate::before { content: attr(data-label); font-size: 10px; letter-spacing: .06em; color: var(--nio-muted); text-transform: uppercase; }
    .spark { height: 30px; }
    input[type='search'] { min-width: 0; flex: 1 1 100%; }
    .kpis, .splits { grid-template-columns: repeat(2, 1fr); }
  }
</style>
