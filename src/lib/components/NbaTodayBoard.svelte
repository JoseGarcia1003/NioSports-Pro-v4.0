<script>
  import { onMount } from 'svelte';
  import { ArrowUpRight } from 'lucide-svelte';
  import { nbaToday, loadNbaToday } from '$lib/stores/nba-today.js';
  import { gameStatus, totalLineFor, teamColor, teamStyle } from '$lib/product/teams.js';

  /** Link at the bottom of the board; visitors are sent to sign in instead of the app. */
  export let cta = { href: '/sports/nba', label: 'Ver todos los partidos' };
  /** Max games shown (null = all). The loading rows reserve the same space, so
      the board keeps its height when the slate arrives (no layout shift). */
  export let limit = null;

  // Today's real NBA slate with consensus total lines; never filled with samples.
  onMount(() => { loadNbaToday(); });
  const timeFormat = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' });
  $: ({ state, games, fetchedAt, lines } = $nbaToday);
  $: busy = state === 'loading' || state === 'idle';
</script>

<section class="board" aria-labelledby="board-title" aria-busy={busy}>
  <div class="board-head">
    <div><p class="eyebrow"><span class="pulse" aria-hidden="true"></span>En directo del proveedor</p><h2 id="board-title">Hoy en la NBA</h2></div>
    {#if state === 'ready'}<span class="count">{games.length} {games.length === 1 ? 'partido' : 'partidos'}</span>{/if}
  </div>

  {#if busy}
    <ul class="games" aria-label="Cargando partidos">{#each Array.from({ length: limit ?? 3 }) as _}<li class="skeleton" aria-hidden="true"><span></span><span></span></li>{/each}</ul>
  {:else if state === 'ready'}
    <ul class="games">
      {#each limit ? games.slice(0, limit) : games as game (game.id)}
        {@const st = gameStatus(game, d => timeFormat.format(d))}
        {@const line = st.score ? null : totalLineFor(game, lines)}
        <li>
          <div class="teams">
            {#each [game.visitor_team, game.home_team] as team, i}
              <span class="team">
                <i class="badge" style={teamStyle(team.abbreviation)} aria-hidden="true">{team.abbreviation}</i>
                <span class="name">{team.full_name}</span>
                {#if st.score}<em class="score">{i === 0 ? game.visitor_team_score : game.home_team_score}</em>{/if}
              </span>
            {/each}
          </div>
          <span class="side">
            <span class="when" class:live={st.live}>{st.label}</span>
            {#if line}<span class="line" title={`Mediana de ${line.books} casas`}>O/U {line.point.toLocaleString('es')}</span>{/if}
          </span>
        </li>
      {/each}
    </ul>
    {#if limit && games.length > limit}<p class="more-games">y {games.length - limit} {games.length - limit === 1 ? 'partido' : 'partidos'} más hoy</p>{/if}
  {:else if state === 'empty'}
    <p class="state">No hay partidos programados hoy según el proveedor.</p>
  {:else}
    <div class="state"><p>No pudimos confirmar los partidos ahora mismo. No mostramos datos sin fuente.</p><button type="button" on:click={() => loadNbaToday({ force: true })}>Reintentar</button></div>
  {/if}

  <p class="source">
    {#if fetchedAt && state !== 'unavailable'}Partidos: balldontlie · consultado {timeFormat.format(fetchedAt)} · hora local{:else}Partidos: balldontlie{/if}
    {#if state === 'ready'}<br />{#if lines}Líneas de total: {lines.source} · mediana entre casas · actualizadas {timeFormat.format(new Date(lines.fetchedAt))}{:else}Líneas de total no disponibles ahora mismo.{/if}{/if}
  </p>
  <a class="board-link" href={cta.href}>{cta.label} <ArrowUpRight size={16} /></a>
</section>

<style>
  .more-games { margin: 10px 0 0; font-size: 13px; color: var(--nio-muted); }
  .board { position: relative; border: 1px solid var(--nio-border); border-radius: 18px; background: linear-gradient(180deg, var(--nio-raised), var(--nio-surface) 140px); padding: 24px; box-shadow: 0 24px 60px var(--nio-shadow); overflow: hidden; }
  .board::before { content: ''; position: absolute; inset: 0 0 auto; height: 2px; background: linear-gradient(90deg, transparent, var(--nio-gold), transparent); }
  .eyebrow { display: flex; align-items: center; gap: 8px; font-size: 11px; letter-spacing: .14em; text-transform: uppercase; font-weight: 600; color: var(--nio-muted); margin: 0 0 8px; }
  .pulse { width: 7px; height: 7px; border-radius: 50%; background: var(--nio-hit); box-shadow: 0 0 0 0 color-mix(in srgb, var(--nio-hit) 60%, transparent); animation: pulse 2s infinite; }
  @keyframes pulse { 70% { box-shadow: 0 0 0 7px transparent; } 100% { box-shadow: 0 0 0 0 transparent; } }
  .board-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; margin-bottom: 12px; }
  .board h2 { font-family: var(--font-display); text-transform: uppercase; font-weight: 800; font-size: 30px; line-height: 1; letter-spacing: .005em; margin: 0; }
  .count { font-size: 13px; color: var(--nio-muted); white-space: nowrap; }
  .games { list-style: none; margin: 0; padding: 0; }
  .games li { display: flex; justify-content: space-between; align-items: center; gap: 14px; padding: 13px 0; border-top: 1px solid var(--nio-border); }
  .teams { display: grid; gap: 8px; min-width: 0; flex: 1; }
  .team { display: flex; align-items: center; gap: 10px; min-width: 0; font-size: 14px; }
  .badge { flex: none; display: inline-grid; place-items: center; width: 34px; height: 22px; border-radius: 6px; background: var(--team); color: var(--team-ink, #fff); font-style: normal; font-family: var(--font-display); font-weight: 700; font-size: 13px; letter-spacing: .04em; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .14); }
  .name { min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--nio-ink); font-weight: 500; }
  .score { margin-left: auto; font-style: normal; font-family: var(--font-display); font-weight: 700; font-size: 20px; color: var(--nio-ink); padding-left: 8px; }
  .side { display: grid; justify-items: end; gap: 5px; }
  .when { font-family: var(--font-display); font-size: 19px; font-weight: 700; color: var(--nio-ink); white-space: nowrap; letter-spacing: .02em; }
  .when.live { color: var(--nio-hit); }
  .line { font-size: 12px; font-weight: 700; color: var(--nio-accent); background: var(--nio-gold-soft); border: 1px solid var(--nio-gold-border); border-radius: 999px; padding: 2px 9px; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .skeleton span { display: block; height: 12px; border-radius: 6px; background: var(--nio-raised); width: 70%; }
  .skeleton span + span { width: 18%; }
  .state { border-top: 1px solid var(--nio-border); padding: 18px 0; color: var(--nio-muted); font-size: 14px; margin: 0; }
  .state p { margin: 0 0 12px; }
  .state button { min-height: var(--tap, 44px); padding: 0 16px; border-radius: 10px; border: 1px solid var(--nio-border); background: var(--nio-raised); color: var(--nio-ink); font: inherit; font-weight: 600; cursor: pointer; }
  .source { font-size: 12px; line-height: 1.6; color: var(--nio-muted); margin: 6px 0 12px; padding-top: 12px; border-top: 1px solid var(--nio-border); }
  .board-link { display: inline-flex; align-items: center; gap: 6px; color: var(--nio-accent); text-decoration: none; font-weight: 600; font-size: 14px; min-height: var(--tap, 44px); }
  .board-link:focus-visible, button:focus-visible { outline: 2px solid var(--nio-accent); outline-offset: 3px; }
  @media (max-width: 640px) { .board { padding: 18px; } .team { font-size: 13px; } .board h2 { font-size: 26px; } }
  @media (prefers-reduced-motion: reduce) { .pulse { animation: none; } }
</style>
