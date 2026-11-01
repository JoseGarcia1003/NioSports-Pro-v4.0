<script>
  import { onMount } from 'svelte';
  import { ArrowUpRight, ArrowRight, Check, ChevronDown } from 'lucide-svelte';
  import Logo from '$lib/components/Logo.svelte';
  import { nbaCalendarUrl, nbaCalendarRows } from '$lib/product/calendar.js';

  // Today's real NBA slate: the first thing a visitor sees is live product, not a slogan.
  let games = [];
  let state = 'loading';
  let fetchedAt = null;
  let controller;

  async function load() {
    controller?.abort();
    controller = new AbortController();
    state = 'loading';
    try {
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

  const offer = [
    { title: 'Calendario NBA', status: 'Disponible', live: true, text: 'Partidos de hoy y mañana con datos del proveedor, hora local y estado del encuentro.', href: '/sports/nba' },
    { title: 'Props de jugadores', status: 'En construcción', live: false, text: 'Línea, tasa de acierto L5/L10/L20, rival, defensa por posición y minutos esperados.' },
    { title: 'Props de equipo y totales', status: 'En construcción', live: false, text: 'Ritmo, eficiencia, descanso y periodos por separado: partido, mitad y primer cuarto.' },
    { title: 'Tenis por superficie', status: 'Demostración', live: false, text: 'Rendimiento de la temporada en cada pista, saque y resto. Hoy con ejemplos identificados.', href: '/tennis?demo=1' },
    { title: 'Tu bankroll', status: 'Disponible', live: true, text: 'Capital disponible, comprometido y beneficio separados. Un registro, no una casa de apuestas.', href: '/bankroll?demo=1' }
  ];
</script>

<div class="landing">
  <header class="masthead">
    <a href="/" class="brand" aria-label="NioSports Pro, inicio"><Logo size={34} /></a>
    <nav aria-label="Secciones">
      <a href="/sports/nba">NBA</a>
      <a href="/tennis">Tenis</a>
      <a href="/methodology">Metodología</a>
    </nav>
    <a class="sign-in" href="/login">Entrar</a>
  </header>

  <section class="hero" aria-labelledby="landing-title">
    <div class="copy">
      <p class="eyebrow">NBA · Tenis · Bankroll</p>
      <h1 id="landing-title">El partido, explicado <span>con datos.</span></h1>
      <p class="intro">Calendario real, contexto de cada encuentro y control de tu bankroll. Cada cifra indica su fuente y su hora; si un dato falta, lo verás como ausencia, nunca inventado.</p>
      <div class="actions">
        <a class="primary" href="/sports/nba">Ver la NBA de hoy <ArrowUpRight size={18} /></a>
        <a class="secondary" href="/methodology">Cómo analizamos <ArrowRight size={16} /></a>
      </div>
    </div>

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
            <li>
              <div class="teams">
                <span><b>{game.visitor_team.abbreviation}</b> {game.visitor_team.full_name}{#if st.score}<em>{game.visitor_team_score}</em>{/if}</span>
                <span><b>{game.home_team.abbreviation}</b> {game.home_team.full_name}{#if st.score}<em>{game.home_team_score}</em>{/if}</span>
              </div>
              <span class="when" class:live={st.score}>{st.label}</span>
            </li>
          {/each}
        </ul>
      {:else if state === 'empty'}
        <p class="state">No hay partidos programados hoy según el proveedor.</p>
      {:else}
        <div class="state"><p>No pudimos confirmar los partidos ahora mismo. No mostramos datos sin fuente.</p><button type="button" on:click={load}>Reintentar</button></div>
      {/if}

      <p class="source">
        {#if fetchedAt && state !== 'unavailable'}Fuente: balldontlie · consultado {timeFormat.format(fetchedAt)} · hora local{:else}Fuente: balldontlie{/if}
      </p>
      <a class="board-link" href="/sports/nba">Abrir el centro NBA <ArrowUpRight size={16} /></a>
    </section>
  </section>

  <section class="offer" aria-labelledby="offer-title">
    <div class="section-head"><p class="eyebrow">Qué encontrarás</p><h2 id="offer-title">Lo que ya funciona y lo que estamos construyendo.</h2></div>
    <div class="cards">
      {#each offer as item}
        <article>
          <span class="chip" class:on={item.live}>{item.status}</span>
          <h3>{item.title}</h3>
          <p>{item.text}</p>
          {#if item.href}<a href={item.href}>Abrir <ArrowUpRight size={15} /></a>{/if}
        </article>
      {/each}
    </div>
  </section>

  <section class="principles" aria-label="Principios">
    <p><Check size={17} /> Datos con fuente y hora de corte</p>
    <p><Check size={17} /> Sin pronóstico si la evidencia no alcanza</p>
    <p><Check size={17} /> Ejemplos siempre rotulados</p>
    <p><Check size={17} /> Sin promesas de ganancias</p>
  </section>

  <section class="questions" aria-labelledby="questions-title">
    <h2 id="questions-title">Preguntas claras.</h2>
    <div>
      <details><summary>¿Los pronósticos garantizan ganancias?<ChevronDown size={18} /></summary><p>No. Son estimaciones con incertidumbre. Todavía no publicamos una tasa de acierto: cuando exista, mostrará su muestra y su periodo.</p></details>
      <details><summary>¿De dónde salen los datos?<ChevronDown size={18} /></summary><p>De proveedores deportivos externos, citados en cada pantalla junto con la hora de consulta. Si un proveedor falla, la pantalla lo indica.</p></details>
      <details><summary>¿NioSports guarda o mueve mi dinero?<ChevronDown size={18} /></summary><p>No. El bankroll es un registro personal. No custodia fondos, no hace transferencias ni envía apuestas.</p></details>
    </div>
  </section>

  <footer>
    <span>NioSports Pro · Versión en desarrollo</span>
    <nav aria-label="Legal"><a href="/legal/terms">Términos</a><a href="/legal/privacy">Privacidad</a><a href="/legal/responsible-gambling">Juego responsable</a></nav>
  </footer>
</div>

<style>
  .landing { min-height: 100vh; background: var(--nio-page); color: var(--nio-ink); font-family: var(--font-sans); font-variant-numeric: lining-nums tabular-nums; }
  .landing > * { max-width: 1200px; margin-inline: auto; padding-inline: 28px; }
  .eyebrow { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; font-weight: 600; color: var(--nio-muted); margin: 0 0 10px; }

  .masthead { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding-block: 18px; }
  .brand { text-decoration: none; color: inherit; }
  .masthead nav { display: flex; gap: 26px; }
  .masthead nav a, footer a { color: var(--nio-muted); text-decoration: none; font-size: 14px; font-weight: 500; }
  .masthead nav a:hover, footer a:hover { color: var(--nio-ink); }
  .sign-in { min-height: 40px; display: inline-flex; align-items: center; padding: 0 16px; border: 1px solid var(--nio-border); border-radius: 10px; background: var(--nio-surface); color: var(--nio-ink); text-decoration: none; font-size: 14px; font-weight: 600; }

  .hero { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, .95fr); gap: 56px; align-items: center; padding-block: 56px 72px; }
  h1 { font-size: clamp(38px, 5.2vw, 64px); line-height: 1.04; letter-spacing: -.045em; font-weight: 700; margin: 0 0 22px; color: var(--nio-ink); text-wrap: balance; }
  h1 span { color: var(--nio-accent); }
  .intro { font-size: 17px; line-height: 1.7; color: var(--nio-muted); max-width: 540px; margin: 0 0 30px; }
  .actions { display: flex; flex-wrap: wrap; gap: 12px 22px; align-items: center; }
  .primary { min-height: 48px; display: inline-flex; align-items: center; gap: 10px; padding: 0 22px; border-radius: 12px; background: var(--nio-action); color: var(--nio-action-ink); text-decoration: none; font-weight: 600; font-size: 15px; }
  .primary :global(svg) { color: var(--nio-action-icon); }
  .secondary { display: inline-flex; align-items: center; gap: 8px; color: var(--nio-ink); text-decoration: none; font-weight: 600; font-size: 15px; min-height: 44px; }
  .primary:focus-visible, .secondary:focus-visible, .sign-in:focus-visible, .board a:focus-visible, .cards a:focus-visible, button:focus-visible, summary:focus-visible { outline: 2px solid var(--nio-accent); outline-offset: 3px; }

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
  .when { font-size: 14px; font-weight: 600; color: var(--nio-ink); white-space: nowrap; }
  .when.live { color: var(--nio-accent); }
  .skeleton span { display: block; height: 12px; border-radius: 6px; background: var(--nio-raised); width: 70%; }
  .skeleton span + span { width: 18%; }
  .state { border-top: 1px solid var(--nio-border); padding: 18px 0; color: var(--nio-muted); font-size: 14px; margin: 0; }
  .state p { margin: 0 0 12px; }
  .state button { min-height: 40px; padding: 0 16px; border-radius: 10px; border: 1px solid var(--nio-border); background: var(--nio-raised); color: var(--nio-ink); font: inherit; font-weight: 600; cursor: pointer; }
  .source { font-size: 12px; color: var(--nio-muted); margin: 6px 0 14px; padding-top: 12px; border-top: 1px solid var(--nio-border); }
  .board-link, .cards a { display: inline-flex; align-items: center; gap: 6px; color: var(--nio-accent); text-decoration: none; font-weight: 600; font-size: 14px; min-height: 32px; }

  .offer { padding-block: 24px 56px; }
  .section-head h2, .questions h2 { font-size: clamp(26px, 3vw, 36px); letter-spacing: -.035em; margin: 0 0 26px; max-width: 640px; line-height: 1.15; }
  .cards { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 14px; }
  .cards article { display: flex; flex-direction: column; gap: 10px; padding: 20px; border: 1px solid var(--nio-border); border-radius: 14px; background: var(--nio-surface); }
  .cards h3 { font-size: 17px; margin: 0; letter-spacing: -.01em; }
  .cards p { font-size: 13.5px; line-height: 1.6; color: var(--nio-muted); margin: 0; flex: 1; }
  .chip { align-self: flex-start; font-size: 11px; font-weight: 600; padding: 4px 9px; border-radius: 999px; background: var(--nio-raised); color: var(--nio-muted); }
  .chip.on { background: var(--nio-gold-soft); color: var(--nio-accent); border: 1px solid var(--nio-gold-border); }

  .principles { display: flex; flex-wrap: wrap; gap: 12px 30px; padding-block: 26px; border-block: 1px solid var(--nio-border); }
  .principles p { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 14px; font-weight: 500; }
  .principles :global(svg) { color: var(--nio-accent); }

  .questions { display: grid; grid-template-columns: minmax(0, .8fr) minmax(0, 1.2fr); gap: 40px; padding-block: 64px; }
  details { border-bottom: 1px solid var(--nio-border); }
  summary { list-style: none; display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 18px 0; cursor: pointer; font-weight: 600; font-size: 16px; }
  summary::-webkit-details-marker { display: none; }
  details[open] summary :global(svg) { transform: rotate(180deg); }
  details p { margin: 0 0 18px; color: var(--nio-muted); line-height: 1.7; font-size: 15px; }

  footer { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 14px; padding-block: 28px 40px; border-top: 1px solid var(--nio-border); font-size: 13px; color: var(--nio-muted); }
  footer nav { display: flex; flex-wrap: wrap; gap: 18px; }

  @media (max-width: 1100px) { .cards { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 900px) { .hero { grid-template-columns: 1fr; gap: 36px; padding-block: 32px 48px; } .questions { grid-template-columns: 1fr; gap: 8px; } }
  @media (max-width: 640px) {
    .landing > * { padding-inline: 16px; }
    .masthead nav { display: none; }
    .cards { grid-template-columns: 1fr; }
    .board { padding: 18px; }
    .teams span { font-size: 13px; }
  }
  @media (prefers-reduced-motion: reduce) { details[open] summary :global(svg) { transform: none; } }
</style>
