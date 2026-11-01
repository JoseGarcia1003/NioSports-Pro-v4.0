<script>
  import { onMount } from 'svelte';
  import { nbaToday, loadNbaToday } from '$lib/stores/nba-today.js';
  import { gameStatus, totalLineFor, teamColor } from '$lib/product/teams.js';

  // Always-visible ribbon with today's real games. Hidden when there is no data.
  onMount(() => { loadNbaToday(); });
  const timeFormat = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' });
  $: ({ state, games, lines } = $nbaToday);
</script>

{#if state === 'ready'}
  <nav class="strip" aria-label="Partidos NBA de hoy">
    <span class="label"><b>NBA</b><small>Hoy · {games.length}</small></span>
    <ul>
      {#each games as game (game.id)}
        {@const st = gameStatus(game, d => timeFormat.format(d))}
        {@const line = totalLineFor(game, lines)}
        <li>
          <a href="/sports/nba" aria-label={`${game.visitor_team.full_name} en ${game.home_team.full_name}, ${st.label}`}>
            <span class="rows">
              {#each [[game.visitor_team, game.visitor_team_score], [game.home_team, game.home_team_score]] as [team, score]}
                <span class="row"><i style={`--team:${teamColor(team.abbreviation)}`}></i><b>{team.abbreviation}</b>{#if st.score}<em>{score}</em>{/if}</span>
              {/each}
            </span>
            <span class="meta"><span class:live={st.live}>{st.label}</span>{#if line}<small>O/U {line.point.toLocaleString('es')}</small>{/if}</span>
          </a>
        </li>
      {/each}
    </ul>
  </nav>
{/if}

<style>
  .strip { display: flex; align-items: stretch; gap: 10px; padding: 10px max(16px, calc((100vw - 1240px) / 2)); border-bottom: 1px solid var(--nio-border); background: var(--nio-chrome); overflow: hidden; }
  .label { flex: none; display: grid; align-content: center; padding: 0 14px; border-radius: 10px; background: var(--nio-gold-soft); border: 1px solid var(--nio-gold-border); }
  .label b { font-family: var(--font-display); font-weight: 800; font-size: 17px; letter-spacing: .04em; color: var(--nio-accent); line-height: 1; }
  .label small { font-size: 11px; color: var(--nio-muted); white-space: nowrap; }
  ul { display: flex; gap: 8px; list-style: none; margin: 0; padding: 0 0 2px; overflow-x: auto; scroll-snap-type: x proximity; scrollbar-width: none; }
  ul::-webkit-scrollbar { display: none; }
  li { scroll-snap-align: start; }
  a { display: flex; align-items: center; gap: 14px; min-height: 48px; padding: 6px 12px; border: 1px solid var(--nio-border); border-radius: 10px; background: var(--nio-surface); color: var(--nio-ink); text-decoration: none; white-space: nowrap; }
  a:hover { border-color: var(--nio-gold-border); }
  a:focus-visible { outline: 2px solid var(--nio-accent); outline-offset: 2px; }
  .rows { display: grid; gap: 2px; }
  .row { display: flex; align-items: center; gap: 6px; font-size: 13px; }
  .row i { width: 8px; height: 8px; border-radius: 2px; background: var(--team); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .2); }
  .row b { font-weight: 700; letter-spacing: .02em; min-width: 32px; }
  .row em { font-style: normal; font-weight: 700; margin-left: auto; padding-left: 6px; }
  .meta { display: grid; justify-items: end; gap: 2px; font-size: 12px; color: var(--nio-muted); }
  .meta .live { color: var(--nio-hit); font-weight: 600; }
  .meta small { font-size: 11px; color: var(--nio-accent); font-weight: 600; }
  @media (max-width: 640px) { .label { padding: 0 10px; } .strip { padding-inline: 12px; } }
</style>
