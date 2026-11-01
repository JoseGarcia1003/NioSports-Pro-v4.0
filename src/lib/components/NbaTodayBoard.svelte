<script>
  import { onMount } from 'svelte';
  import { ArrowUpRight } from 'lucide-svelte';
  import { nbaCalendarUrl, nbaCalendarRows } from '$lib/product/calendar.js';
  import { sameTeam } from '$lib/product/teams.js';

  // Today's real NBA slate: the first thing a visitor sees is live product, not a slogan.
  let games = [];
  let state = 'loading';
  let fetchedAt = null;
  let controller;
  let lines = null; // { fetchedAt, source, events } from /api/odds/nba-totals, or null when unavailable

  async function loadLines(signal) {
    try {
      const res = await fetch('/api/odds/nba-totals', { signal });
      const body = await res.json();
      lines = res.ok && Array.isArray(body.events) ? body : null;
    } catch { lines = null; }
  }

  // Pair a provider game with its betting event: same nicknames, start within 12 h.
  function lineFor(game, data) {
    if (!data) return null;
    const start = Date.parse(game.datetime);
    const hit = data.events.find(e => sameTeam(e.home, game.home_team.name) && sameTeam(e.away, game.visitor_team.name) && Math.abs(Date.parse(e.commenceTime) - start) < 12 * 3600000);
    return hit && Number.isFinite(hit.consensus) ? { point: hit.consensus, books: hit.books.length } : null;
  }

  async function load() {
    controller?.abort();
    controller = new AbortController();
    state = 'loading';
    try {
      loadLines(controller.signal);
      const res = await fetch(nbaCalendarUrl(Date.now(), 0), { signal: controller.signal });
      const body = await res.json().catch(() => ({}));
      games = [...nbaCalendarRows(res, body)].sort((a, b) => String(a.datetime).localeCompare(String(b.datetime)));
      fetchedAt = new Date();
      state = games.length ? 'ready' : 'empty';
    } catch (err) {
      if (err?.name !== 'AbortError') state = 'unavailable';
    }
  }

  onMount(() => { load(); return () => controller?.abort(); });

  const timeFormat = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' });
  function gameState(game) {
    const s = String(game.status_state || '').toLowerCase();
    if (s === 'final' || /final/i.test(game.status)) return { label: 'Final', score: true };
    if (s === 'in_progress' || s === 'live' || (game.period > 0 && s !== 'scheduled')) return { label: game.period ? `En juego · C${game.period}` : 'En juego', score: true };
    const start = new Date(game.datetime);
    return { label: Number.isNaN(start.getTime()) ? 'Por confirmar' : timeFormat.format(start), score: false };
  }

</script>

    <section class="board" aria-labelledby="board-title" aria-busy={state === 'loading'}>
      <div class="board-head">
        <div><p class="eyebrow">En directo del proveedor</p><h2 id="board-title">Hoy en la NBA</h2></div>
        {#if state === 'ready'}<span class="count">{games.length} {games.length === 1 ? 'partido' : 'partidos'}</span>{/if}
      </div>

      {#if state === 'loading'}
        <ul class="games" aria-label="Cargando partidos">{#each [0, 1, 2] as i}<li class="skeleton" aria-hidden="true"><span></span><span></span></li>{/each}</ul>
      {:else if state === 'ready'}
        <ul class="games">
          {#each games as game (game.id)}
            {@const st = gameState(game)}
            {@const line = lineFor(game, lines)}
            <li>
              <div class="teams">
                <span><b>{game.visitor_team.abbreviation}</b> {game.visitor_team.full_name}{#if st.score}<em>{game.visitor_team_score}</em>{/if}</span>
                <span><b>{game.home_team.abbreviation}</b> {game.home_team.full_name}{#if st.score}<em>{game.home_team_score}</em>{/if}</span>
              </div>
              <span class="side">
                <span class="when" class:live={st.score}>{st.label}</span>
                {#if line}<span class="line" title={`Mediana de ${line.books} casas`}>Total {line.point.toLocaleString('es')}</span>{/if}
              </span>
            </li>
          {/each}
        </ul>
      {:else if state === 'empty'}
        <p class="state">No hay partidos programados hoy según el proveedor.</p>
      {:else}
        <div class="state"><p>No pudimos confirmar los partidos ahora mismo. No mostramos datos sin fuente.</p><button type="button" on:click={load}>Reintentar</button></div>
      {/if}

      <p class="source">
        {#if fetchedAt && state !== 'unavailable'}Partidos: balldontlie · consultado {timeFormat.format(fetchedAt)} · hora local{:else}Partidos: balldontlie{/if}
        {#if state === 'ready'}<br />{#if lines}Líneas de total: {lines.source} · mediana entre casas · actualizadas {timeFormat.format(new Date(lines.fetchedAt))}{:else}Líneas de total no disponibles ahora mismo.{/if}{/if}
      </p>
      <a class="board-link" href="/sports/nba">Abrir el centro NBA <ArrowUpRight size={16} /></a>
    </section>

<style>
  .eyebrow { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; font-weight: 600; color: var(--nio-muted); margin: 0 0 10px; }
  .board a:focus-visible, button:focus-visible { outline: 2px solid var(--nio-accent); outline-offset: 3px; }
  .board { border: 1px solid var(--nio-border); border-top: 3px solid var(--nio-gold); border-radius: 18px; background: var(--nio-surface); padding: 24px; box-shadow: 0 18px 50px var(--nio-shadow); }
  .board-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; margin-bottom: 14px; }
  .board h2 { font-size: 22px; letter-spacing: -.02em; margin: 0; }
  .count { font-size: 13px; color: var(--nio-muted); white-space: nowrap; }
  .games { list-style: none; margin: 0; padding: 0; }
  .games li { display: flex; justify-content: space-between; align-items: center; gap: 14px; padding: 14px 0; border-top: 1px solid var(--nio-border); }
  .teams { display: grid; gap: 6px; min-width: 0; font-size: 14px; color: var(--nio-muted); }
  .teams span { display: flex; align-items: baseline; gap: 8px; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .teams b { color: var(--nio-ink); font-weight: 700; min-width: 38px; }
  .teams em { font-style: normal; font-weight: 700; color: var(--nio-ink); margin-left: auto; padding-left: 8px; }
  .side { display: grid; justify-items: end; gap: 4px; }
  .line { font-size: 12px; font-weight: 600; color: var(--nio-accent); background: var(--nio-gold-soft); border: 1px solid var(--nio-gold-border); border-radius: 999px; padding: 2px 8px; white-space: nowrap; }
  .when { font-size: 14px; font-weight: 600; color: var(--nio-ink); white-space: nowrap; }
  .when.live { color: var(--nio-accent); }
  .skeleton span { display: block; height: 12px; border-radius: 6px; background: var(--nio-raised); width: 70%; }
  .skeleton span + span { width: 18%; }
  .state { border-top: 1px solid var(--nio-border); padding: 18px 0; color: var(--nio-muted); font-size: 14px; margin: 0; }
  .state p { margin: 0 0 12px; }
  .state button { min-height: 40px; padding: 0 16px; border-radius: 10px; border: 1px solid var(--nio-border); background: var(--nio-raised); color: var(--nio-ink); font: inherit; font-weight: 600; cursor: pointer; }
  .source { font-size: 12px; color: var(--nio-muted); margin: 6px 0 14px; padding-top: 12px; border-top: 1px solid var(--nio-border); }

  .board-link { display: inline-flex; align-items: center; gap: 6px; color: var(--nio-accent); text-decoration: none; font-weight: 600; font-size: 14px; min-height: 32px; }
  @media (max-width: 640px) { .board { padding: 18px; } .teams span { font-size: 13px; } }
</style>
