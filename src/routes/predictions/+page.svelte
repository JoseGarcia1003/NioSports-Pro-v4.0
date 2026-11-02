<script>
  import NbaSignals from '$lib/components/NbaSignals.svelte';
</script>

<svelte:head><title>Señales del día · NioSports Pro</title></svelte:head>

<div class="product-page">
  <header class="product-heading">
    <div>
      <span class="product-eyebrow">NBA · Señales selladas</span>
      <h1>Señales del día</h1>
      <p>Props de puntos con lectura claramente favorable frente a la línea real de las casas: al menos 3 señales a favor y 2 más que en contra. Se sellan antes del partido, no se editan y se liquidan con el box score oficial.</p>
    </div>
  </header>

  <NbaSignals heading={false} />

  <nav class="product-section resources" aria-label="Más herramientas">
    <a href="/sports/nba/props"><strong>Props de jugadores</strong><span>Todas las líneas del día <span aria-hidden="true">↗</span></span></a>
    <a href="/sports/nba/puntos"><strong>Mercado de puntos</strong><span>Equipos y totales <span aria-hidden="true">↗</span></span></a>
    <a href="/methodology"><strong>Metodología</strong><span>Cómo se construye una señal <span aria-hidden="true">↗</span></span></a>
  </nav>
</div>

<style>
  .resources { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; border-top: 1px solid var(--product-border); padding-top: 24px; }
  .resources > a { display: flex; flex-direction: column; gap: 7px; color: inherit; text-decoration: none; }
  .resources strong { font-size: 14px; font-weight: 600; }
  .resources a > span { display: flex; align-items: center; justify-content: space-between; gap: 10px; color: var(--color-text-muted); font-size: 13px; }
  .resources a:hover strong { text-decoration: underline; text-underline-offset: 5px; }
  .resources a:focus-visible { outline: 2px solid var(--nio-accent); outline-offset: 4px; border-radius: 4px; }
  @media (max-width: 700px) { .resources { grid-template-columns: 1fr; gap: 18px; } }
</style>
