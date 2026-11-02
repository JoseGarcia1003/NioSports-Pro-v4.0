<script>
  import { onMount } from 'svelte';
  import { ArrowUpRight } from 'lucide-svelte';
  import { authenticatedFetch } from '$lib/services/authenticated-fetch.js';
  import { teamColor, teamStyle } from '$lib/product/teams.js';

  // Sealed daily signals and their settled history. Every figure comes from the
  // server; nothing is computed or filled in on the client.
  /** false when the page already provides the heading (Señales page). */
  export let heading = true;
  let state = 'loading';
  let data = null;

  async function load() {
    state = 'loading';
    try {
      const res = await authenticatedFetch('/api/nba/signals');
      if (!res.ok) throw new Error();
      data = await res.json();
      state = 'ready';
    } catch { state = 'unavailable'; }
  }
  onMount(load);

  const fmt = n => n.toLocaleString('es', { maximumFractionDigits: 1 });
  const time = iso => new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  const date = d => new Date(`${d}T12:00:00Z`).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' });
  const REASONS = {
    lines_unavailable: 'Todavía no hay líneas de las casas para los partidos de hoy. La edición se sella cuando existan.',
    no_upcoming_games: 'Los partidos de hoy ya empezaron sin edición sellada. Las señales solo se publican antes del inicio.',
    unavailable: 'No pudimos preparar la edición ahora mismo. No publicamos señales sin fuente.'
  };
  const STATUS = { hit: ['✓', 'Acertó'], miss: ['✗', 'Falló'], push: ['=', 'Empate'], void: ['—', 'No jugó'], pending: ['…', 'Pendiente'] };
  $: summary = data?.history?.summary;
</script>

<section class="signals" aria-labelledby="signals-title">
  {#if heading}
  <header class="head">
    <div>
      <p class="eyebrow">NBA · Señales del día</p>
      <h2 id="signals-title">Lo que más dicen los datos hoy</h2>
      <p class="lead">Props de puntos con lectura claramente favorable frente a la línea real de las casas: al menos 3 señales a favor y 2 más que en contra. Se sellan antes del partido y no se editan después.</p>
    </div>
  </header>
  {/if}

  {#if state === 'loading'}
    <p class="state" role="status">Preparando la edición del día…</p>
  {:else if state === 'unavailable'}
    <div class="state"><p>No pudimos cargar las señales. No mostramos datos sin fuente.</p><button type="button" on:click={load}>Reintentar</button></div>
  {:else}
    {#if data.edition}
      <p class="sealed">Edición sellada a las {time(data.edition.sealedAt)} · método {data.edition.method} · {data.edition.entries.length} {data.edition.entries.length === 1 ? 'señal' : 'señales'}</p>
      {#if data.edition.entries.length}
        <ul class="cards">
          {#each data.edition.entries as s}
            <li class="card">
              <div class="top">
                <i class="badge" style={teamStyle(s.team)}>{s.team}</i>
                <div class="who"><b>{s.name}</b><small>{s.home ? 'vs' : '@'} {s.opponent} · {time(s.tipoff)}</small></div>
                <span class="tally">{s.favour}▲ {s.against}▼</span>
              </div>
              <p class="pick"><span>{s.side === 'over' ? 'Más de' : 'Menos de'}</span> <b>{fmt(s.line)}</b> puntos <small>línea de mercado · {s.books} {s.books === 1 ? 'casa' : 'casas'}</small></p>
              <ul class="why">
                {#each s.findings.slice(0, 3) as f}
                  <li class:pro={f.weight > 0} class:con={f.weight < 0}><span aria-hidden="true">{f.weight > 0 ? '▲' : '▼'}</span>{f.text}</li>
                {/each}
              </ul>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="state">Hoy ninguna prop alcanza el umbral. Abstenerse también es una decisión del método.</p>
      {/if}
    {:else}
      <p class="state">{REASONS[data.reason] ?? REASONS.unavailable}</p>
    {/if}

    <section class="history" aria-labelledby="history-title">
      <div class="history-head">
        <h3 id="history-title">Historial verificable</h3>
        {#if summary?.decided}
          <p class="score"><b>{summary.hits} de {summary.decided}</b> ({Math.round(summary.rate * 100)} %) acertadas{#if summary.decided < 50}{' · '}<em>muestra pequeña: aún no es evidencia de acierto</em>{/if}{#if summary.pending}{' · '}{summary.pending} {summary.pending === 1 ? 'pendiente' : 'pendientes'}{/if}</p>
        {:else}
          <p class="score">Sin señales liquidadas todavía.</p>
        {/if}
      </div>
      {#if data.history?.days?.length}
        <div class="days">
          {#each data.history.days as d}
            <div class="day">
              <span class="day-label">{date(d.day)} · sellada {time(d.sealedAt)}</span>
              {#each d.entries as s}
                {@const st = STATUS[s.result.status]}
                <div class={`row ${s.result.status}`}>
                  <span class="mark" aria-label={st[1]}>{st[0]}</span>
                  <span class="desc"><b>{s.name}</b> {s.side === 'over' ? 'más de' : 'menos de'} {fmt(s.line)} pts</span>
                  <span class="actual">{s.result.actual != null ? `${s.result.actual} pts` : st[1]}</span>
                </div>
              {:else}
                <p class="muted">Sin señales ese día.</p>
              {/each}
            </div>
          {/each}
        </div>
      {/if}
      <p class="muted">Se incluyen todas las señales selladas, también las falladas. Una señal queda pendiente hasta que se cargan las estadísticas oficiales del partido. Ninguna cifra garantiza resultados futuros.</p>
    </section>
  {/if}

  {#if heading}<a class="more" href="/sports/nba/props">Explorar todas las props <ArrowUpRight size={16} /></a>{/if}
</section>

<style>
  .signals { margin: 0 0 40px; font-variant-numeric: tabular-nums; }
  .eyebrow { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; font-weight: 600; color: var(--nio-muted); margin: 0 0 8px; }
  h2 { font-family: var(--font-display); text-transform: uppercase; font-weight: 800; font-size: clamp(30px, 3.6vw, 46px); line-height: .98; margin: 0 0 10px; }
  .lead { color: var(--nio-muted); max-width: 720px; margin: 0; line-height: 1.6; font-size: 15px; }
  .sealed { margin: 18px 0 12px; font-size: 12px; color: var(--nio-accent); font-weight: 600; }
  .cards { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }
  .card { border: 1px solid var(--nio-border); border-radius: 16px; background: linear-gradient(180deg, var(--nio-raised), var(--nio-surface) 120px); padding: 16px; display: grid; gap: 10px; }
  .top { display: flex; align-items: center; gap: 10px; }
  .badge { flex: none; display: inline-grid; place-items: center; width: 40px; height: 26px; border-radius: 6px; background: var(--team); color: var(--team-ink, #fff); font-style: normal; font-family: var(--font-display); font-weight: 700; font-size: 14px; letter-spacing: .04em; box-shadow: inset 0 0 0 1px rgba(255,255,255,.14); }
  .who { display: grid; min-width: 0; }
  .who b { font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .who small { font-size: 12px; color: var(--nio-muted); }
  .tally { margin-left: auto; font-size: 12px; font-weight: 700; color: var(--nio-muted); white-space: nowrap; }
  .pick { margin: 0; font-size: 15px; }
  .pick span { color: var(--nio-accent); font-weight: 700; }
  .pick b { font-family: var(--font-display); font-size: 26px; }
  .pick small { display: block; font-size: 11px; color: var(--nio-muted); }
  .why { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
  .why li { display: grid; grid-template-columns: 16px 1fr; gap: 4px; font-size: 13px; line-height: 1.5; color: var(--nio-muted); }
  .why li span { font-size: 10px; line-height: 2; }
  .why li.pro span { color: var(--nio-hit); }
  .why li.con span { color: var(--nio-miss); }
  .state { color: var(--nio-muted); margin: 16px 0; }
  .state button { margin-top: 10px; min-height: 40px; padding: 0 16px; border-radius: 10px; border: 1px solid var(--nio-border); background: var(--nio-raised); color: var(--nio-ink); font: inherit; font-weight: 600; cursor: pointer; }
  .history { margin-top: 26px; padding: 18px; border: 1px solid var(--nio-border); border-radius: 16px; background: var(--nio-surface); }
  .history-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: 8px 16px; }
  .history h3 { font-family: var(--font-display); text-transform: uppercase; font-size: 22px; margin: 0; }
  .score { margin: 0; font-size: 13px; color: var(--nio-muted); }
  .score b { color: var(--nio-ink); }
  .score em { font-style: normal; color: var(--nio-accent); }
  .days { display: grid; gap: 14px; margin: 14px 0; }
  .day-label { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: var(--nio-muted); margin-bottom: 6px; }
  .row { display: grid; grid-template-columns: 22px 1fr auto; gap: 8px; align-items: center; padding: 7px 0; border-top: 1px solid var(--nio-border); font-size: 13px; }
  .mark { font-weight: 800; text-align: center; color: var(--nio-muted); }
  .row.hit .mark { color: var(--nio-hit); }
  .row.miss .mark { color: var(--nio-miss); }
  .actual { color: var(--nio-muted); white-space: nowrap; }
  .muted { margin: 8px 0 0; font-size: 12px; color: var(--nio-muted); line-height: 1.55; }
  .more { display: inline-flex; align-items: center; gap: 6px; margin-top: 16px; color: var(--nio-accent); text-decoration: none; font-weight: 600; font-size: 14px; min-height: 36px; }
  .more:focus-visible, button:focus-visible { outline: 2px solid var(--nio-accent); outline-offset: 3px; }
  @media (max-width: 640px) { .cards { grid-template-columns: 1fr; } .history { padding: 14px; } }
</style>
