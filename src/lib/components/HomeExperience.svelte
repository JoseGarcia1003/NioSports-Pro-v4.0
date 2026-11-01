<script>
  import { ArrowUpRight } from 'lucide-svelte';
  import { subscription } from '$lib/stores/subscription.js';
  import { currentUser, isAuthenticated } from '$lib/stores/auth.js';
  import { planLabel } from '$lib/product/navigation.js';
  import NbaTodayBoard from './NbaTodayBoard.svelte';

  $: name = $currentUser?.displayName?.split(' ')[0];
  const today = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  const shortcuts = [
    { href: '/sports/nba/props', title: 'Props NBA', text: 'Tasa de acierto de cada jugador frente a la línea: L5, L10, L20 y temporada.', status: 'Datos reales', live: true },
    { href: '/sports/nba', title: 'Centro NBA', text: 'Calendario de hoy y mañana con búsqueda y contexto de cada partido.', status: 'Datos reales', live: true },
    { href: '/sports/nba/analisis', title: 'Match Studio', text: 'Explora ventanas L5/L10/L20 y líneas de referencia.', status: 'Ejemplo', live: false },
    { href: '/tennis', title: 'Tenis', text: 'Orden de juego, superficies, saque y resto. Datos reales con sesión iniciada.', status: 'Según cobertura', live: false },
    { href: '/predictions', title: 'Pronósticos', text: 'Selecciones publicadas con sus argumentos y límites. Sin edición, no hay pick.', status: 'En reconstrucción', live: false },
    { href: '/bankroll', title: 'Bankroll', text: 'Capital disponible, comprometido y beneficio separados.', status: 'Disponible', live: true }
  ];
</script>

<div class="product-page home">
  <header class="product-heading">
    <div>
      <span class="product-eyebrow">Hoy · {today}</span>
      <h1>{name ? `Hola, ${name}.` : 'Tu jornada deportiva.'}</h1>
      <p>Lo que se juega hoy, con fuente y hora. Desde aquí llegas a cada herramienta en un toque.</p>
    </div>
    <a class="product-badge" href="/account">{$isAuthenticated ? planLabel($subscription) : 'Tu espacio'} <span aria-hidden="true">↗</span></a>
  </header>

  <div class="layout">
    <NbaTodayBoard />
    <nav class="shortcuts" aria-label="Herramientas">
      {#each shortcuts as item}
        <a href={item.href}>
          <span class="top"><strong>{item.title}</strong><span class="chip" class:on={item.live}>{item.status}</span></span>
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
  .chip.on { background: var(--nio-gold-soft); color: var(--nio-accent); border: 1px solid var(--nio-gold-border); }
  .foot { margin-top: 28px; display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: center; }
  @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } }
  @media (max-width: 640px) { .home.product-page { padding: 24px 16px 100px; } .home .product-heading { flex-direction: column; gap: 14px; } }
</style>
