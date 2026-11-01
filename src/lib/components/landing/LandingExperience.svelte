<script>
  import { ArrowUpRight, ArrowRight, Check, ChevronDown } from 'lucide-svelte';
  import Logo from '$lib/components/Logo.svelte';
  import NbaTodayBoard from '$lib/components/NbaTodayBoard.svelte';

  const offer = [
    { title: 'Calendario NBA', status: 'Disponible', live: true, text: 'Partidos de hoy y mañana con datos del proveedor, hora local y estado del encuentro.', href: '/sports/nba' },
    { title: 'Props de jugadores', status: 'Disponible', live: true, text: 'Tasa de acierto L5/L10/L20 y de temporada frente a la línea, con el gráfico partido a partido.', href: '/sports/nba/props' },
    { title: 'Props de equipo y totales', status: 'En construcción', live: false, text: 'Ritmo, eficiencia, descanso y periodos por separado: partido, mitad y primer cuarto.' },
    { title: 'Tenis por superficie', status: 'Demostración', live: false, text: 'Rendimiento de la temporada en cada pista, saque y resto. Hoy con ejemplos identificados.', href: '/tennis?demo=1' },
    { title: 'Tu bankroll', status: 'Disponible', live: true, text: 'Capital disponible, comprometido y beneficio separados. Un registro, no una casa de apuestas.', href: '/bankroll?demo=1' }
  ];
</script>

<div class="landing">
  <header class="masthead">
    <a href="/" class="brand" aria-label="NioSports Pro, inicio"><Logo size={34} /></a>
    <nav aria-label="Secciones">
      <a href="#ofrece">Qué incluye</a>
      <a href="#principios">Cómo trabajamos</a>
      <a href="#preguntas">Preguntas</a>
    </nav>
    <div class="access"><a class="sign-in" href="/login">Entrar</a><a class="join" href="/login?modo=registro">Crear cuenta</a></div>
  </header>

  <section class="hero" aria-labelledby="landing-title">
    <div class="copy">
      <p class="eyebrow">NBA · Tenis · Bankroll</p>
      <h1 id="landing-title">El partido,<br />explicado<br /><span>con datos.</span></h1>
      <p class="intro">Calendario real, contexto de cada encuentro y control de tu bankroll. Cada cifra indica su fuente y su hora; si un dato falta, lo verás como ausencia, nunca inventado.</p>
      <div class="actions">
        <a class="primary" href="/login?modo=registro">Crear cuenta gratis <ArrowUpRight size={18} /></a>
        <a class="secondary" href="#ofrece">Ver qué incluye <ArrowRight size={16} /></a>
      </div>
    </div>

    <NbaTodayBoard cta={{ href: '/login?next=%2Fsports%2Fnba%2Fprops', label: 'Entra para ver las props de hoy' }} />
  </section>

  <section class="offer" id="ofrece" aria-labelledby="offer-title">
    <div class="section-head"><p class="eyebrow">Qué encontrarás</p><h2 id="offer-title">Lo que ya funciona y lo que estamos construyendo.</h2></div>
    <div class="cards">
      {#each offer as item}
        <article>
          <span class="chip" class:on={item.live}>{item.status}</span>
          <h3>{item.title}</h3>
          <p>{item.text}</p>
        </article>
      {/each}
    </div>
  </section>

  <section class="principles" id="principios" aria-label="Principios">
    <p><Check size={17} /> Datos con fuente y hora de corte</p>
    <p><Check size={17} /> Sin pronóstico si la evidencia no alcanza</p>
    <p><Check size={17} /> Ejemplos siempre rotulados</p>
    <p><Check size={17} /> Sin promesas de ganancias</p>
  </section>

  <section class="questions" id="preguntas" aria-labelledby="questions-title">
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
  :global(html) { scroll-behavior: smooth; }
  .landing [id] { scroll-margin-top: 24px; }
  .landing { position: relative; min-height: 100vh; background: radial-gradient(1100px 520px at 78% 8%, color-mix(in srgb, var(--nio-gold) 13%, transparent), transparent 62%), radial-gradient(900px 600px at 0% 0%, color-mix(in srgb, var(--nio-gold) 5%, transparent), transparent 60%), var(--nio-page); color: var(--nio-ink); font-family: var(--font-sans); font-variant-numeric: lining-nums tabular-nums; }
  .landing > * { max-width: 1240px; margin-inline: auto; padding-inline: 28px; }
  .eyebrow { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; font-weight: 600; color: var(--nio-muted); margin: 0 0 10px; }

  .masthead { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 20px; padding-block: 18px; }
  .brand { text-decoration: none; color: inherit; }
  .masthead nav { display: flex; gap: 26px; align-items: center; }
  .masthead nav a { display: inline-flex; align-items: center; min-height: 40px; }
  .masthead nav a, footer a { color: var(--nio-muted); text-decoration: none; font-size: 14px; font-weight: 500; }
  .masthead nav a:hover, footer a:hover { color: var(--nio-ink); }
  .access { display: flex; gap: 8px; align-items: center; }
  .join { min-height: 40px; display: inline-flex; align-items: center; padding: 0 16px; border-radius: 10px; background: var(--nio-action); color: var(--nio-action-ink); text-decoration: none; font-size: 14px; font-weight: 700; }
  .join:focus-visible { outline: 2px solid var(--nio-accent); outline-offset: 3px; }
  .sign-in { min-height: 40px; display: inline-flex; align-items: center; padding: 0 16px; border: 1px solid var(--nio-border); border-radius: 10px; background: var(--nio-surface); color: var(--nio-ink); text-decoration: none; font-size: 14px; font-weight: 600; }

  .hero { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, .95fr); gap: 56px; align-items: center; padding-block: 56px 72px; }
  h1 { font-family: var(--font-display); text-transform: uppercase; font-size: clamp(56px, 8.4vw, 118px); line-height: .9; letter-spacing: -.005em; font-weight: 800; margin: 0 0 26px; color: var(--nio-ink); }
  h1 span { color: var(--nio-accent); }
  .intro { font-size: 17px; line-height: 1.7; color: var(--nio-muted); max-width: 540px; margin: 0 0 30px; }
  .actions { display: flex; flex-wrap: wrap; gap: 12px 22px; align-items: center; }
  .primary { min-height: 52px; box-shadow: 0 10px 30px color-mix(in srgb, var(--nio-gold) 25%, transparent); display: inline-flex; align-items: center; gap: 10px; padding: 0 22px; border-radius: 12px; background: var(--nio-action); color: var(--nio-action-ink); text-decoration: none; font-weight: 600; font-size: 15px; }
  .primary :global(svg) { color: var(--nio-action-icon); }
  .secondary { display: inline-flex; align-items: center; gap: 8px; color: var(--nio-ink); text-decoration: none; font-weight: 600; font-size: 15px; min-height: 44px; }
  .primary:focus-visible, .secondary:focus-visible, .sign-in:focus-visible, summary:focus-visible { outline: 2px solid var(--nio-accent); outline-offset: 3px; }


  .offer { padding-block: 24px 56px; }
  .section-head h2, .questions h2 { font-family: var(--font-display); text-transform: uppercase; font-weight: 800; font-size: clamp(32px, 4vw, 52px); letter-spacing: 0; margin: 0 0 26px; max-width: 640px; line-height: 1.15; }
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
  }
  @media (prefers-reduced-motion: reduce) { details[open] summary :global(svg) { transform: none; } }
</style>
