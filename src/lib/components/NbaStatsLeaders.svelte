<script>
  import { onMount } from 'svelte';
  import { nbaSeason, loadNbaSeason } from '$lib/stores/nba-season.js';
  import { PLAYER_COLUMNS, TEAM_COLUMNS, QUICK_STATS, formatStat } from '$lib/nba/stat-columns.js';
  import { sortBy, withRanks, qualifies, PCT_QUALIFIER, TEAMS } from '$lib/nba/season.js';
  import { teamColor, teamStyle } from '$lib/product/teams.js';

  // Leaders like the official NBA tables: click a column to rank by it.
  let view = 'players';
  let key = 'pts';
  let dir = 'desc';
  let query = '';
  let team = 'all';
  let limit = 50;
  let season = '';

  onMount(() => loadNbaSeason());
  function changeSeason() { limit = 50; loadNbaSeason(season); }
  function setView(v) { view = v; key = v === 'players' ? 'pts' : 'winPct'; dir = 'desc'; limit = 50; }
  function sort(k) { if (k === key) dir = dir === 'desc' ? 'asc' : 'desc'; else { key = k; dir = 'desc'; } limit = 50; }

  const shortDate = d => (d ? new Date(`${d}T12:00:00Z`).toLocaleDateString('es', { day: 'numeric', month: 'long' }) : '—');
  $: data = $nbaSeason.data;
  $: columns = view === 'players' ? PLAYER_COLUMNS : TEAM_COLUMNS;
  $: col = columns.find(c => c.key === key) ?? columns[0];
  $: maxGp = data ? Math.max(0, ...data.players.map(p => p.gp)) : 0;
  $: pool = !data ? [] : view === 'players'
    ? data.players
        .filter(p => team === 'all' || p.team === team)
        .filter(p => !query.trim() || p.name.toLowerCase().includes(query.trim().toLowerCase()))
        .filter(p => qualifies(p, key, maxGp))
    : data.teams.filter(t => !query.trim() || t.name.toLowerCase().includes(query.trim().toLowerCase()) || t.team.toLowerCase() === query.trim().toLowerCase());
  $: ranked = withRanks(sortBy(pool, key, dir), key, col.ratio ? 3 : col.d);
  $: visible = ranked.slice(0, limit);
  $: qualifier = view === 'players' && PCT_QUALIFIER[key];
</script>

<section class="stats" aria-labelledby="stats-title">
  <header class="head">
    <div>
      <p class="eyebrow">NBA · Temporada {data?.season ?? '…'} · Fase regular</p>
      <h1 id="stats-title">Estadísticas</h1>
      <p class="lead">Líderes de jugadores y equipos por partido. Pulsa cualquier columna para ordenar.{#if data?.through}{' '}Datos oficiales de box score hasta el {shortDate(data.through)}.{/if}</p>
    </div>
    {#if data?.seasons}
      <label class="season">Temporada
        <select bind:value={season} on:change={changeSeason}>
          {#each data.seasons as s, i}<option value={i === 0 ? '' : s}>{s}</option>{/each}
        </select>
      </label>
    {/if}
  </header>

  <div class="bar">
    <div class="segment" role="tablist" aria-label="Tipo de estadística">
      <button type="button" role="tab" aria-selected={view === 'players'} class:on={view === 'players'} on:click={() => setView('players')}>Jugadores</button>
      <button type="button" role="tab" aria-selected={view === 'teams'} class:on={view === 'teams'} on:click={() => setView('teams')}>Equipos</button>
    </div>
    <input type="search" bind:value={query} placeholder={view === 'players' ? 'Buscar jugador…' : 'Buscar equipo…'} aria-label={view === 'players' ? 'Buscar jugador' : 'Buscar equipo'} />
    {#if view === 'players'}
      <label class="select">Equipo
        <select bind:value={team}>
          <option value="all">Todos</option>
          {#each Object.entries(TEAMS).sort((a, b) => a[1][2].localeCompare(b[1][2])) as [code, t]}<option value={code}>{t[2]}</option>{/each}
        </select>
      </label>
    {/if}
  </div>

  {#if view === 'players'}
    <div class="quick" role="group" aria-label="Líderes por estadística">
      {#each QUICK_STATS as k}
        {@const c = PLAYER_COLUMNS.find(x => x.key === k)}
        <button type="button" class:on={key === k} aria-pressed={key === k} on:click={() => { key = k; dir = 'desc'; limit = 50; }} title={c.title}>{c.label}</button>
      {/each}
    </div>
  {/if}

  {#if $nbaSeason.state === 'loading' || $nbaSeason.state === 'idle'}
    <p class="state" role="status">Cargando estadísticas oficiales…</p>
  {:else if $nbaSeason.state === 'unavailable'}
    <div class="state"><p>No pudimos cargar las estadísticas. No mostramos cifras sin fuente.</p><button type="button" on:click={() => loadNbaSeason(season)}>Reintentar</button></div>
  {:else}
    <p class="meta">
      <span><b>{ranked.length}</b> {view === 'players' ? 'jugadores' : 'equipos'} · ordenado por <b title={col.title}>{col.label}</b> ({col.title.toLowerCase()}), {dir === 'desc' ? 'de mayor a menor' : 'de menor a mayor'}</span>
      {#if qualifier}<span class="qual">Mínimo {qualifier[1].toLocaleString('es')} {qualifier[0] === 'fga' ? 'tiros de campo' : qualifier[0] === 'fg3a' ? 'triples' : 'tiros libres'} intentados por partido y {Math.ceil(maxGp / 2)} partidos jugados.</span>{/if}
    </p>
    <!-- Scrollable region must be keyboard-focusable (WCAG 2.1.1; axe scrollable-region-focusable). -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div class="scroller" tabindex="0" role="region" aria-label="Tabla de estadísticas">
      <table>
        <thead>
          <tr>
            <th class="rk" scope="col">#</th>
            <th class="name" scope="col">{view === 'players' ? 'Jugador' : 'Equipo'}</th>
            {#if view === 'players'}<th scope="col" title="Equipo">EQ</th>{/if}
            {#each columns as c}
              <th scope="col" class:active={c.key === key} aria-sort={c.key === key ? (dir === 'desc' ? 'descending' : 'ascending') : 'none'}>
                <button type="button" title={c.title} on:click={() => sort(c.key)}>{c.label}{#if c.key === key}<span aria-hidden="true">{dir === 'desc' ? '▼' : '▲'}</span>{/if}</button>
              </th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each visible as r (view === 'players' ? r.id : r.team)}
            <tr>
              <td class="rk">{r.rank}</td>
              <th class="name" scope="row">
                {#if view === 'players'}{r.name}{:else}<span class="team"><i class="badge" style={teamStyle(r.team)}>{r.team}</i>{r.name}</span>{/if}
              </th>
              {#if view === 'players'}<td><i class="badge" style={teamStyle(r.team)}>{r.team}</i></td>{/if}
              {#each columns as c}<td class:active={c.key === key} class:pos={c.signed && r[c.key] > 0} class:neg={c.signed && r[c.key] < 0}>{formatStat(c, r[c.key])}</td>{/each}
            </tr>
          {:else}
            <tr><td colspan={columns.length + 3} class="empty">Ningún resultado coincide con la búsqueda.</td></tr>
          {/each}
        </tbody>
      </table>
    </div>
    {#if ranked.length > limit}
      <button type="button" class="more" on:click={() => (limit += 50)}>Mostrar 50 más ({ranked.length - limit} restantes)</button>
    {/if}
    <p class="foot">Promedios por partido calculados con el box score oficial de cada partido (stats.nba.com). Los porcentajes salen de los totales de la temporada, como en las tablas oficiales. Pueden diferir en una décima por redondeo de minutos.</p>
  {/if}
</section>

<style>
  .stats { max-width: 1320px; margin: auto; padding: 8px 24px 100px; color: var(--nio-ink); font-variant-numeric: tabular-nums; }
  .head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; margin-bottom: 18px; }
  .eyebrow { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; font-weight: 600; color: var(--nio-muted); margin: 0 0 8px; }
  h1 { font-family: var(--font-display); text-transform: uppercase; font-weight: 800; font-size: clamp(40px, 5vw, 64px); line-height: .95; margin: 0 0 10px; }
  .lead { color: var(--nio-muted); max-width: 680px; margin: 0; line-height: 1.6; }
  .season, .select { display: grid; gap: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .08em; color: var(--nio-muted); }
  select, input[type='search'] { min-height: 40px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--nio-border); background: var(--nio-surface); color: var(--nio-ink); font: inherit; font-size: 14px; text-transform: none; letter-spacing: 0; }
  .bar { display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-end; margin-bottom: 12px; }
  .bar input[type='search'] { flex: 1 1 220px; max-width: 340px; }
  .segment { display: inline-flex; gap: 4px; padding: 4px; border-radius: 12px; border: 1px solid var(--nio-border); background: var(--nio-surface); }
  .segment button { min-height: 36px; padding: 0 16px; border-radius: 9px; border: 0; background: transparent; color: var(--nio-muted); font: inherit; font-weight: 700; font-size: 14px; cursor: pointer; }
  .segment button.on { background: var(--nio-action); color: var(--nio-action-ink); }
  .quick { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 14px; }
  .quick button { min-height: 34px; padding: 0 12px; border-radius: 999px; border: 1px solid var(--nio-border); background: var(--nio-surface); color: var(--nio-muted); font: inherit; font-weight: 700; font-size: 13px; cursor: pointer; }
  .quick button.on { background: var(--nio-gold-soft); color: var(--nio-accent); border-color: var(--nio-gold-border); }
  button:focus-visible, select:focus-visible, input:focus-visible, .scroller:focus-visible { outline: 2px solid var(--nio-accent); outline-offset: 2px; }
  .meta { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 6px 16px; margin: 0 0 8px; font-size: 13px; color: var(--nio-muted); }
  .meta b { color: var(--nio-ink); }
  .qual { color: var(--nio-accent); }
  .scroller { overflow-x: auto; border: 1px solid var(--nio-border); border-radius: 14px; background: var(--nio-surface); }
  table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13px; }
  th, td { padding: 10px 8px; text-align: right; white-space: nowrap; border-bottom: 1px solid var(--nio-border); }
  thead th { position: sticky; top: 0; background: var(--nio-raised); color: var(--nio-muted); font-size: 11px; font-weight: 700; letter-spacing: .04em; z-index: 1; }
  thead th button { all: unset; cursor: pointer; display: inline-flex; gap: 3px; align-items: center; }
  thead th button:focus-visible { outline: 2px solid var(--nio-accent); outline-offset: 2px; border-radius: 4px; }
  thead th.active { color: var(--nio-ink); box-shadow: inset 0 3px var(--nio-gold); }
  thead th span { font-size: 8px; color: var(--nio-accent); }
  td.active { background: var(--nio-gold-soft); color: var(--nio-ink); font-weight: 700; }
  .rk { width: 36px; text-align: center; color: var(--nio-muted); }
  .name { text-align: left; font-weight: 600; color: var(--nio-ink); }
  tbody th.name { font-weight: 600; }
  /* Rank and name stay visible while scrolling sideways. */
  .rk, .name { position: sticky; background: var(--nio-surface); z-index: 2; }
  .rk { left: 0; }
  .name { left: 36px; min-width: 150px; box-shadow: 1px 0 var(--nio-border); }
  thead .rk, thead .name { background: var(--nio-raised); z-index: 3; }
  tbody tr:hover td, tbody tr:hover th { background: var(--nio-raised); }
  .team { display: inline-flex; align-items: center; gap: 8px; }
  .badge { display: inline-grid; place-items: center; width: 38px; height: 22px; border-radius: 5px; background: var(--team); color: var(--team-ink, #fff); font-style: normal; font-family: var(--font-display); font-weight: 700; font-size: 12px; letter-spacing: .04em; box-shadow: inset 0 0 0 1px rgba(255,255,255,.14); }
  .pos { color: var(--nio-hit); }
  .neg { color: var(--nio-miss); }
  .empty { text-align: center; color: var(--nio-muted); padding: 24px; }
  .more { margin: 14px auto 0; display: block; min-height: 42px; padding: 0 18px; border-radius: 10px; border: 1px solid var(--nio-border); background: var(--nio-raised); color: var(--nio-ink); font: inherit; font-weight: 700; cursor: pointer; }
  .state { color: var(--nio-muted); margin: 24px 0; }
  .state button { margin-top: 10px; min-height: 40px; padding: 0 16px; border-radius: 10px; border: 1px solid var(--nio-border); background: var(--nio-raised); color: var(--nio-ink); font: inherit; font-weight: 600; cursor: pointer; }
  .foot { margin: 14px 0 0; font-size: 12px; color: var(--nio-muted); line-height: 1.55; }
  @media (max-width: 640px) { .stats { padding: 4px 16px 100px; } .name { min-width: 120px; } th, td { padding: 9px 6px; } }
</style>
