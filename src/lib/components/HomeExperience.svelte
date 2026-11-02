<script>
  import { ArrowUpRight } from 'lucide-svelte';
  import { currentUser } from '$lib/stores/auth.js';
  import NbaTodayBoard from './NbaTodayBoard.svelte';

  $: name = $currentUser?.displayName?.split(' ')[0];
  const today = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  const shortcuts = [
    { href: '/sports/nba/props', title: 'Props de jugadores', text: 'Cada jugador de hoy frente a la línea: L5, L10, L20 y temporada.' },
    { href: '/sports/nba/puntos', title: 'Mercado de puntos', text: 'Puntos por equipo y total del partido frente a la línea de las casas.' },
    { href: '/predictions', title: 'Señales del día', text: 'Props con lectura claramente favorable, selladas antes del partido.' },
    { href: '/sports/nba/estadisticas', title: 'Estadísticas NBA', text: 'Líderes de jugadores y equipos, ordenables por cualquier columna.' },
    { href: '/sports/nba/clasificacion', title: 'Clasificación NBA', text: 'Conferencias Este y Oeste con local, visitante, últimos 10 y racha.' },
    { href: '/tennis', title: 'Tenis', text: 'Orden de juego, superficies, saque y resto.', status: 'Según cobertura', live: false },
    { href: '/bankroll', title: 'Bankroll', text: 'Capital disponible, comprometido y beneficio separados.' }
  ];
</script>

<div class="product-page home">
  <header class="product-heading">
    <div>
      <span class="product-eyebrow">Hoy · {today}</span>
      <h1>{name ? `Hola, ${name}.` : 'Tu jornada deportiva.'}</h1>
      <p>Lo que se juega hoy, con fuente y hora. Desde aquí llegas a cada herramienta en un toque.</p>
    </div>
  </header>

  <div class="layout">
    <NbaTodayBoard />
    <nav class="shortcuts" aria-label="Herramientas">
      {#each shortcuts as item}
        <a href={item.href}>
          <span class="top"><strong>{item.title}</strong>{#if item.status}<span class="chip">{item.status}</span>{/if}</span>
          <span class="text">{item.text}</span>
          <ArrowUpRight size={16} aria-hidden="true" />
        </a>
      {/each}
    </nav>
  </div>

  <p class="product-note foot">¿Cómo se construye cada análisis? <a class="product-link" href="/methodology">Metodología ↗</a></p>
</div>

<style>
  .home .product-heading h1 { font-size: clamp(30px, 3.4vw, 44px); }
  .layout { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, .85fr); gap: 22px; align-items: start; }
  .shortcuts { display: grid; gap: 10px; }
  .shortcuts a { position: relative; display: grid; gap: 6px; padding: 16px 44px 16px 18px; border: 1px solid var(--nio-border); border-radius: 14px; background: var(--nio-surface); color: var(--nio-ink); text-decoration: none; }
  .shortcuts a:hover { border-color: var(--nio-gold-border); }
  .shortcuts a:focus-visible { outline: 2px solid var(--nio-accent); outline-offset: 3px; }
  .shortcuts a > :global(svg) { position: absolute; right: 16px; top: 18px; color: var(--nio-accent); }
  .top { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px; }
  .top strong { font-size: 16px; }
  .text { font-size: 13.5px; line-height: 1.55; color: var(--nio-muted); }
  .chip { font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 999px; background: var(--nio-raised); color: var(--nio-muted); }
  .foot { margin-top: 28px; display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: center; }
  @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } }
  @media (max-width: 640px) { .home.product-page { padding: 24px 16px 100px; } .home .product-heading { flex-direction: column; gap: 14px; } }
</style>
