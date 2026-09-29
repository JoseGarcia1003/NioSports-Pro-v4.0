<script>
  import { onMount } from 'svelte';
  import { capabilities as initialCapabilities } from '$lib/prediction/capabilities.js';
  let capabilities=initialCapabilities, loading=true, error=false;
  async function refresh() {
    loading=true;error=false;
    try {
      const response=await fetch('/api/predict',{cache:'no-store'});
      if(!response.ok)throw new Error('unavailable');
      const body=await response.json();
      if(body.capabilities?.version!==initialCapabilities.version)throw new Error('incompatible');
      capabilities=body.capabilities;
    }catch{error=true;}finally{loading=false;}
  }
  onMount(refresh);
</script>

<svelte:head><title>Totales NBA · NioSports Pro</title></svelte:head>
<div class="page">
  <a href="/sports/nba">← Volver al centro NBA</a>
  <header><span class="eyebrow">BASKETBALL LAB / ANÁLISIS POR PERIODO</span><h1>Totales NBA</h1>
    <p>Una proyección de puntos, una probabilidad y una recomendación son resultados diferentes.</p></header>
  <section aria-labelledby="availability">
    <h2 id="availability">Análisis predictivo no habilitado</h2>
    <p>Estamos reconstruyendo la cadena del modelo con datos verificables. Todavía no hay un modelo compatible habilitado para calcular nuevos pronósticos NBA.</p>
    <p>El calendario sigue disponible. Tus registros anteriores se conservan; esta pantalla no genera selecciones ni modifica tu bankroll.</p>
    <dl><div><dt>Partido completo, incluidas prórrogas</dt><dd>{capabilities.nba.FULL==='disabled_pending_compatible_artifact'?'Pendiente de modelo compatible':'Consultar disponibilidad'}</dd></div>
      <div><dt>Primer cuarto y primera mitad</dt><dd>Sin modelos propios habilitados</dd></div>
      <div><dt>Probabilidades, EV y combinadas</dt><dd>No disponibles para nuevas recomendaciones</dd></div></dl>
    <div role="status">{#if loading}Comprobando disponibilidad…{:else if error}No pudimos consultar el servicio. No se ha generado ningún pronóstico.{:else}Estado confirmado por el servicio.{/if}</div>
    <button on:click={refresh} disabled={loading}>Volver a comprobar</button>
  </section>
  <nav aria-label="Continuar"><a href="/sports/nba">Consultar calendario NBA ↗</a><a href="/bankroll">Abrir mi bankroll ↗</a></nav>
</div>
<style>
  .page{--text:var(--color-text-primary);--muted:var(--color-text-secondary);--surface:var(--color-bg-card);--border:var(--color-border);--accent:var(--color-brand-primary);--bg:var(--color-text-inverse);max-width:1000px;margin:auto;padding:32px 24px 100px;color:var(--text)}
  a{color:var(--accent)}header{margin:36px 0}.eyebrow{font-size:12px;letter-spacing:.12em;color:var(--muted)}
  h1{font-size:clamp(32px,5vw,52px);margin:12px 0;font-weight:700;letter-spacing:-.04em}h2{font-size:24px}
  p{line-height:1.8;color:var(--muted);max-width:75ch}section{padding:28px;border:1px solid var(--border);border-radius:16px;background:var(--surface)}
  dl{margin:28px 0}dl div{padding:16px 0;border-bottom:1px solid var(--border)}dt{font-weight:600}dd{margin:8px 0 0;color:var(--muted)}
  button{margin-top:20px;padding:12px 20px;border-radius:8px;background:var(--accent);color:var(--bg);font-weight:600}button:disabled{opacity:.6}
  nav{display:flex;gap:24px;flex-wrap:wrap;margin-top:28px}[role=status]{color:var(--muted);line-height:1.6}
  @media(max-width:600px){.page{padding:24px 16px 90px}section{padding:20px}nav{flex-direction:column}}
</style>
