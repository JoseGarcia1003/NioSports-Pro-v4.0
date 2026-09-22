<script>
  import DailyCatalog from '$lib/components/DailyCatalog.svelte';
  import { SPORTS, planLabel } from '$lib/product/navigation.js';
  import { subscription } from '$lib/stores/subscription.js';
</script>

<svelte:head><title>Pronósticos · NioSports Pro</title></svelte:head>

<div class="product-page">
  <header class="product-heading">
    <div>
      <span class="product-eyebrow">ANÁLISIS / PRONÓSTICOS</span>
      <h1>Una selección con argumentos.</h1>
      <p>Revisa la selección del día, su fuente y los argumentos del modelo. Cada análisis muestra también sus límites.</p>
    </div>
    <span class="product-badge">{planLabel($subscription)}</span>
  </header>

  <div class="reading-guide" aria-label="Qué encontrarás en los análisis">
    <div><span class="guide-index" aria-hidden="true">01</span><p><strong>Fuente visible</strong><span>Datos y hora de corte</span></p></div>
    <div><span class="guide-index" aria-hidden="true">02</span><p><strong>Lectura explicada</strong><span>Selección y argumentos</span></p></div>
    <div><span class="guide-index" aria-hidden="true">03</span><p><strong>Límites claros</strong><span>La incertidumbre, presente</span></p></div>
  </div>

  <DailyCatalog />

  <section class="product-section sports-section" aria-labelledby="sports-title">
    <span class="product-eyebrow">PROFUNDIZA EN EL PARTIDO</span>
    <h2 id="sports-title">Consulta por deporte</h2>
    <div class="product-grid">
      {#each SPORTS.filter(sport => sport.status === 'available') as sport}
        <article class="product-panel sport-analysis">
          <div class="sport-heading"><span class="sport-symbol" aria-hidden="true">{sport.symbol}</span><span class="product-eyebrow">{sport.name}</span></div>
          <h3>{sport.id === 'nba' ? 'Totales y estimaciones' : 'Partidos y comparaciones'}</h3>
          <p>{sport.id === 'nba' ? 'Abre las selecciones NBA calculadas con la información disponible.' : 'Consulta la evidencia de cada encuentro; el motor puede abstenerse si la muestra no es suficiente.'}</p>
          <a class="product-link" href={sport.id === 'nba' ? '/picks' : sport.href}>Ver análisis {sport.name} <span aria-hidden="true">↗</span></a>
        </article>
      {/each}
    </div>
  </section>

  <nav class="product-section resources" aria-label="Seguimiento y metodología">
    <a href="/results"><strong>Mis resultados</strong><span>Revisa tus selecciones <span aria-hidden="true">↗</span></span></a>
    <a href="/public"><strong>Historial público</strong><span>Consulta el seguimiento <span aria-hidden="true">↗</span></span></a>
    <a href="/methodology"><strong>Metodología</strong><span>Cómo se calcula un análisis <span aria-hidden="true">↗</span></span></a>
    <a href="/pricing"><strong>Qué amplía Premium</strong><span>Compara los planes <span aria-hidden="true">↗</span></span></a>
  </nav>
</div>

<style>
  .reading-guide { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; margin: -6px 0 36px; }
  .reading-guide > div { display: flex; align-items: center; gap: 12px; }
  .guide-index { color: var(--product-accent-text); font-size: 12px; font-weight: 500; padding-right: 12px; border-right: 1px solid var(--product-border); }
  .reading-guide p { display: flex; flex-direction: column; gap: 2px; font-size: 12px; line-height: 1.6; }
  .reading-guide strong { font-size: 13px; font-weight: 600; }
  .reading-guide p > span { color: var(--color-text-muted); }
  .sports-section { border-top: 1px solid var(--product-border); padding-top: 32px; }
  .sport-analysis { display: flex; flex-direction: column; }
  .sport-heading { display: flex; align-items: center; gap: 10px; }
  .sport-symbol { display: inline-flex; justify-content: center; align-items: center; width: 34px; height: 34px; font-size: 19px; border: 1px solid var(--product-border); border-radius: 9px; }
  .sport-analysis h3 { margin: 18px 0 12px; font-size: 23px; line-height: 1.3; letter-spacing: -.025em; }
  .sport-analysis p { font-size: 14px; flex: 1; }
  .sport-analysis .product-link { margin: 20px 0 0; justify-content: space-between; border-top: 1px solid var(--product-border); padding-top: 12px; text-decoration: none; }
  .sport-analysis .product-link:hover { color: var(--product-accent-text); }
  .resources { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 24px; border-top: 1px solid var(--product-border); padding-top: 24px; }
  .resources > a { display: flex; flex-direction: column; gap: 7px; color: inherit; text-decoration: none; }
  .resources strong { font-size: 13px; font-weight: 600; }
  .resources a > span { display: flex; align-items: center; justify-content: space-between; gap: 10px; color: var(--color-text-muted); font-size: 12px; }
  .resources a:hover strong { text-decoration: underline; text-underline-offset: 5px; }
  @media (max-width: 900px) { .resources { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 600px) {
    .reading-guide { grid-template-columns: 1fr; gap: 14px; margin-bottom: 30px; }
    .reading-guide p { flex: 1; flex-direction: row; justify-content: space-between; gap: 14px; }
    .reading-guide p > span { text-align: right; }
    .reading-guide strong { flex-shrink: 0; }
    .resources { gap: 24px 20px; }
  }
  @media (max-width: 380px) { .reading-guide p { flex-direction: column; gap: 0; } .reading-guide p > span { text-align: left; } }
</style>
