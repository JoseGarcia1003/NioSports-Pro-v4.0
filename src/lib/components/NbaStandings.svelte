<script>
  import { onMount } from 'svelte';
  import { nbaSeason, loadNbaSeason } from '$lib/stores/nba-season.js';
  import { teamColor, teamStyle } from '$lib/product/teams.js';

  // Conference standings computed from official box scores.
  let conf = 'both';
  let season = '';
  onMount(() => loadNbaSeason());

  const shortDate = d => (d ? new Date(`${d}T12:00:00Z`).toLocaleDateString('es', { day: 'numeric', month: 'long' }) : '—');
  const pctText = v => (v >= 1 ? '1.000' : v.toFixed(3).replace(/^0/, ''));
  const gbText = v => (v === 0 ? '—' : v.toLocaleString('es', { maximumFractionDigits: 1 }));
  const num = v => (v == null ? '—' : v.toLocaleString('es', { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
  const signed = v => (v == null ? '—' : `${v > 0 ? '+' : ''}${num(v)}`);
  $: data = $nbaSeason.data;
  $: groups = data ? [['E', 'Conferencia Este'], ['W', 'Conferencia Oeste']].filter(([c]) => conf === 'both' || conf === c) : [];
</script>

<section class="standings" aria-labelledby="standings-title">
  <header class="head">
    <div>
      <p class="eyebrow">NBA · Temporada {data?.season ?? '…'} · Fase regular</p>
      <h1 id="standings-title">Clasificación</h1>
      <p class="lead">Balance de cada equipo por conferencia.{#if data?.through}{' '}Resultados oficiales hasta el {shortDate(data.through)}.{/if}</p>
    </div>
    <div class="tools">
      <div class="segment" role="group" aria-label="Conferencia">
        {#each [['both', 'Ambas'], ['E', 'Este'], ['W', 'Oeste']] as [id, label]}
          <button type="button" class:on={conf === id} aria-pressed={conf === id} on:click={() => (conf = id)}>{label}</button>
        {/each}
      </div>
      {#if data?.seasons}
        <label class="season">Temporada
          <select bind:value={season} on:change={() => loadNbaSeason(season)}>
            {#each data.seasons as s, i}<option value={i === 0 ? '' : s}>{s}</option>{/each}
          </select>
        </label>
      {/if}
    </div>
  </header>

  {#if $nbaSeason.state === 'loading' || $nbaSeason.state === 'idle'}
    <p class="state" role="status">Cargando clasificación…</p>
  {:else if $nbaSeason.state === 'unavailable'}
    <div class="state"><p>No pudimos cargar la clasificación. No mostramos datos sin fuente.</p><button type="button" on:click={() => loadNbaSeason(season)}>Reintentar</button></div>
  {:else}
    <div class="grid" class:single={conf !== 'both'}>
      {#each groups as [c, title]}
        <section class="conf" aria-labelledby={`conf-${c}`}>
          <h2 id={`conf-${c}`}>{title}</h2>
          <!-- Scrollable region must be keyboard-focusable (WCAG 2.1.1; axe scrollable-region-focusable). -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div class="scroller" tabindex="0" role="region" aria-label={`Tabla de la ${title.toLowerCase()}`}>
            <table>
              <thead>
                <tr>
                  <th class="rk" scope="col">#</th><th class="name" scope="col">Equipo</th>
                  <th scope="col" title="Ganados">G</th><th scope="col" title="Perdidos">P</th><th scope="col" title="Porcentaje de victorias">%V</th>
                  <th scope="col" title="Partidos de diferencia con el líder">DIF. P</th><th scope="col" title="Balance contra equipos de la conferencia">CONF</th>
                  <th scope="col" title="Balance como local">LOCAL</th><th scope="col" title="Balance como visitante">VISIT.</th>
                  <th scope="col" title="Últimos 10 partidos">ÚLT. 10</th><th scope="col" title="Racha actual: G ganados, P perdidos">RACHA</th>
                  <th scope="col" title="Puntos anotados por partido">PTS</th><th scope="col" title="Puntos permitidos por partido">RIV</th><th scope="col" title="Diferencia de puntos por partido">DIF</th>
                </tr>
              </thead>
              <tbody>
                {#each data.standings[c] as t (t.team)}
                  <tr class:cut-po={t.rank === 6} class:cut-pi={t.rank === 10}>
                    <td class="rk">{t.rank}</td>
                    <th class="name" scope="row"><span class="team"><i class="badge" style={teamStyle(t.team)}>{t.team}</i><span class="tname">{t.name}</span></span></th>
                    <td>{t.w}</td><td>{t.l}</td><td class="strong">{pctText(t.winPct)}</td><td>{gbText(t.gb)}</td>
                    <td>{t.confRecord}</td><td>{t.home}</td><td>{t.away}</td><td>{t.last10}</td>
                    <td class:win={t.streak.startsWith('G')} class:loss={t.streak.startsWith('P')}>{t.streak || '—'}</td>
                    <td>{num(t.ppg)}</td><td>{num(t.oppPpg)}</td><td class:win={t.diff > 0} class:loss={t.diff < 0}>{signed(t.diff)}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </section>
      {/each}
    </div>
    <p class="legend"><span class="po"></span> Puestos 1–6: playoffs directos · <span class="pi"></span> 7–10: torneo play-in. Orden por % de victorias; empates resueltos por diferencia de puntos (desempate simplificado: los criterios oficiales de la NBA son más amplios).</p>
  {/if}
</section>

<style>
  .standings { max-width: 1320px; margin: auto; padding: 8px 24px 100px; color: var(--nio-ink); font-variant-numeric: tabular-nums; }
  .head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; margin-bottom: 18px; }
  .eyebrow { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; font-weight: 600; color: var(--nio-muted); margin: 0 0 8px; }
  h1 { font-family: var(--font-display); text-transform: uppercase; font-weight: 800; font-size: clamp(34px, 4.2vw, 52px); line-height: .95; margin: 0 0 10px; }
  h2 { font-family: var(--font-display); text-transform: uppercase; font-size: 22px; margin: 0 0 10px; }
  .lead { color: var(--nio-muted); max-width: 640px; margin: 0; line-height: 1.6; }
  .tools { display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-end; }
  .season { display: grid; gap: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .08em; color: var(--nio-muted); }
  select { min-height: var(--tap, 44px); padding: 0 12px; border-radius: 10px; border: 1px solid var(--nio-border); background: var(--nio-surface); color: var(--nio-ink); font: inherit; font-size: 14px; }
  .segment { display: inline-flex; gap: 4px; padding: 4px; border-radius: 12px; border: 1px solid var(--nio-border); background: var(--nio-surface); }
  .segment button { min-height: var(--tap, 44px); padding: 0 14px; border-radius: 9px; border: 0; background: transparent; color: var(--nio-muted); font: inherit; font-weight: 700; font-size: 13px; cursor: pointer; }
  .segment button.on { background: var(--nio-action); color: var(--nio-action-ink); }
  button:focus-visible, select:focus-visible, .scroller:focus-visible { outline: 2px solid var(--nio-accent); outline-offset: 2px; }
  .grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 24px; }
  .conf { min-width: 0; }
  .scroller { overflow-x: auto; border: 1px solid var(--nio-border); border-radius: 14px; background: var(--nio-surface); }
  table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13px; }
  th, td { padding: 10px 8px; text-align: right; white-space: nowrap; border-bottom: 1px solid var(--nio-border); }
  thead th { background: var(--nio-raised); color: var(--nio-muted); font-size: 11px; font-weight: 700; letter-spacing: .04em; }
  .rk { width: 32px; text-align: center; color: var(--nio-muted); }
  .name { text-align: left; font-weight: 600; min-width: 190px; }
  .rk, .name { position: sticky; background: var(--nio-surface); z-index: 1; }
  .rk { left: 0; }
  .name { left: 32px; box-shadow: 1px 0 var(--nio-border); }
  thead .rk, thead .name { background: var(--nio-raised); z-index: 2; }
  .team { display: inline-flex; align-items: center; gap: 8px; }
  .badge { display: inline-grid; place-items: center; width: 38px; height: 22px; border-radius: 5px; background: var(--team); color: var(--team-ink, #fff); font-style: normal; font-family: var(--font-display); font-weight: 700; font-size: 12px; letter-spacing: .04em; box-shadow: inset 0 0 0 1px rgba(255,255,255,.14); flex: none; }
  .name + td, .name + th { padding-left: 14px; }
  .strong { font-weight: 700; }
  .win { color: var(--nio-hit); font-weight: 700; }
  .loss { color: var(--nio-miss); font-weight: 700; }
  tr.cut-po td, tr.cut-po th { border-bottom: 2px solid var(--nio-gold); }
  tr.cut-pi td, tr.cut-pi th { border-bottom: 2px dashed var(--nio-muted); }
  tbody tr:hover td, tbody tr:hover th { background: var(--nio-raised); }
  .legend { margin: 14px 0 0; font-size: 12px; color: var(--nio-muted); line-height: 1.6; }
  .legend span { display: inline-block; width: 18px; height: 0; vertical-align: middle; margin-right: 4px; }
  .legend .po { border-top: 2px solid var(--nio-gold); }
  .legend .pi { border-top: 2px dashed var(--nio-muted); margin-left: 6px; }
  .state { color: var(--nio-muted); margin: 24px 0; }
  .state button { margin-top: 10px; min-height: var(--tap, 44px); padding: 0 16px; border-radius: 10px; border: 1px solid var(--nio-border); background: var(--nio-raised); color: var(--nio-ink); font: inherit; font-weight: 600; cursor: pointer; }
  @media (max-width: 640px) { .standings { padding: 4px 16px 100px; } .name { min-width: 76px; } .tname { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; } th, td { padding: 9px 6px; } }
</style>
