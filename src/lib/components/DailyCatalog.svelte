<script>
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { userId } from '$lib/stores/auth.js';
  import { authenticatedFetch } from '$lib/services/authenticated-fetch.js';
  import { SPORTS } from '$lib/product/navigation.js';

  let mounted = false, signature = '', catalog = null, loading = true, failure = '';
  let controller, generation = 0, sport = 'all';
  $: demo = $page.url.searchParams.get('demo') === '1';
  $: if (mounted && signature !== `${$userId}:${demo}`) {
    signature = `${$userId}:${demo}`;
    load();
  }
  $: visible = (catalog?.entries || []).filter(entry => sport === 'all' || entry.sport === sport);
  onMount(() => mounted = true);
  onDestroy(() => { generation++; controller?.abort(); });

  async function load() {
    const run = ++generation;
    controller?.abort();
    controller = new AbortController();
    loading = true;
    catalog = null;
    failure = '';
    try {
      const url = demo ? '/api/catalog?demo=1' : '/api/catalog';
      const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]);
      const response = await ($userId && !demo
        ? authenticatedFetch(url, { signal })
        : fetch(url, { signal, cache: 'no-store' }));
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || body.message || 'Catálogo no disponible.');
      if (run === generation) catalog = body;
    } catch (error) {
      if (run === generation && error.name !== 'AbortError') failure = error.message;
    } finally {
      if (run === generation) loading = false;
    }
  }

  const hour = value => new Intl.DateTimeFormat('es', {
    timeZone: 'America/Guayaquil', hour: '2-digit', minute: '2-digit'
  }).format(new Date(value));
  const editionDate = value => new Intl.DateTimeFormat('es', {
    timeZone: 'America/Guayaquil', day: 'numeric', month: 'long'
  }).format(new Date(`${value}T12:00:00-05:00`));
  const sportName = id => SPORTS.find(item => item.id === id)?.name || id;
</script>

<section aria-labelledby="catalog-title" class="catalog">
  <div class="catalog-bar">
    <div>
      <span class="product-eyebrow">{demo ? 'LABORATORIO VISUAL' : 'EDICIÓN DEL DÍA'}</span>
      <h2 id="catalog-title">{demo ? 'Explora el acceso FREE.' : 'Los análisis, en un solo lugar.'}</h2>
    </div>
    <div class="catalog-controls">
      <button on:click={() => goto(demo ? '/predictions' : '/predictions?demo=1')}>
        {demo ? 'Volver a datos reales' : 'Ver ejemplo visual'}
      </button>
      <button on:click={load} disabled={loading} aria-label="Actualizar catálogo">
        <svg class:refreshing={loading} aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1"/></svg>
        Actualizar
      </button>
    </div>
  </div>

  {#if demo}
    <div class="demo-note">
      <span class="demo-label">Demostración</span>
      <p>Jugadores, partidos y porcentajes ficticios. Una selección Premium abierta, otra bloqueada y un análisis gratuito para explorar la interfaz.</p>
    </div>
  {/if}

  {#if loading}
    <div class="product-panel catalog-status" role="status">
      <span class="status-symbol" aria-hidden="true">◌</span>
      <div><h3>Preparando la edición</h3><p>Consultando los análisis disponibles y tus permisos de acceso…</p></div>
    </div>
  {:else if failure}
    <div class="product-panel catalog-status" role="alert">
      <div><h3>No se pudo cargar el catálogo</h3><p>{failure}</p></div>
      <button class="product-action" on:click={load}>Reintentar</button>
    </div>
  {:else if !catalog?.published}
    <div class="product-panel empty-catalog">
      <div class="empty-copy">
        <span class="empty-label"><span aria-hidden="true"></span>Pendiente de publicación</span>
        <h3>Aún no hay una edición publicada hoy.</h3>
        <p>Publicaremos análisis cuando dispongamos de datos suficientes. Mientras tanto, puedes consultar calendarios y perfiles.</p>
        <a class="product-action" href="/sports">Explorar deportes <span aria-hidden="true">↗</span></a>
      </div>
      <div class="empty-guide">
        <span class="product-eyebrow">EN CADA ANÁLISIS</span>
        <div><strong>Datos con procedencia</strong><p>Fuente y hora de corte para situar la lectura.</p></div>
        <div><strong>Una decisión con contexto</strong><p>Selección, argumentos y límites del modelo.</p></div>
      </div>
    </div>
  {:else}
    <div class="edition-line">
      <div><strong>Edición del <time datetime={catalog.day}>{editionDate(catalog.day)}</time></strong><span>Día y horarios de Guayaquil</span></div>
      <label>Deporte
        <select bind:value={sport}>
          <option value="all">Todos los deportes</option>
          {#each SPORTS.filter(item => item.status === 'available') as item}<option value={item.id}>{item.name}</option>{/each}
        </select>
      </label>
    </div>
    <div class="entry-list">
      {#each visible as entry}
        <article class="catalog-entry" class:reward={entry.isDailyReward}>
          <div class="entry-meta">
            <span class="sport-time">{sportName(entry.sport)} <span aria-hidden="true">·</span> <time datetime={entry.startsAt}>{hour(entry.startsAt)}</time></span>
            <span class="access-label">{entry.isDailyReward ? 'TU PREMIUM GRATUITO' : entry.tier === 'free' ? 'FREE' : 'PREMIUM'}</span>
          </div>
          <h3>{entry.event}</h3>
          <p class="source">{entry.source.name} <span aria-hidden="true">·</span> Corte <time datetime={entry.source.asOf}>{hour(entry.source.asOf)}</time> <span aria-hidden="true">·</span> {entry.modelVersion}</p>
          {#if entry.status === 'withdrawn'}
            <p class="withdrawn" role="status"><strong>Análisis retirado</strong><br />{entry.withdrawnReason}</p>
          {:else if entry.locked}
            <div class="locked">
              <div class="lock-heading">
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></svg>
                <strong>{entry.isDailyReward ? 'Incluido con tu cuenta FREE' : 'Análisis reservado a Premium'}</strong>
              </div>
              <p>{entry.isDailyReward ? 'Inicia sesión para abrir la selección gratuita de hoy.' : 'Puedes explorar los deportes y la selección diaria con FREE.'}</p>
              {#if !demo}
                <a class="product-link" href={entry.isDailyReward ? '/login' : '/pricing'}>{entry.isDailyReward ? 'Iniciar sesión' : 'Conocer Premium'} <span aria-hidden="true">↗</span></a>
              {:else}<small>Bloqueo de ejemplo. No requiere pago.</small>{/if}
            </div>
          {:else if entry.analysis}
            <div class="analysis-content">
              <div class="reading">
                <div class="selection"><span class="reading-label">Selección del modelo</span><h4>{entry.analysis.selection}</h4></div>
                <div class="probability"><strong>{Math.round(entry.analysis.probability * 100)}<small>%</small></strong><span>Probabilidad<br />estimada</span></div>
              </div>
              <div class="evidence">
                <p>{entry.analysis.explanation}</p>
                <details>
                  <summary>Revisar datos y límites <span aria-hidden="true">+</span></summary>
                  <ul>{#each entry.analysis.factors as factor}<li>{factor}</li>{/each}</ul>
                  <p class="model-limit">Estimación experimental, sin calibración ni rentabilidad demostradas.</p>
                </details>
              </div>
            </div>
          {/if}
          {#if entry.status === 'started'}<p class="started">El partido ya comenzó. Esta es la lectura previa archivada.</p>{/if}
        </article>
      {:else}
        <div class="product-panel filter-empty" role="status"><h3>Esta edición no incluye {sportName(sport)}.</h3><p>Puedes consultar los análisis de los otros deportes publicados.</p><button on:click={() => sport = 'all'}>Ver todos los deportes</button></div>
      {/each}
    </div>
    <p class="product-note catalog-footnote">La selección Premium gratuita queda fijada para esta fecha. Recargar, cambiar de dispositivo o filtrar deportes no abre otra selección. Si se retira un análisis, su explicación deja de mostrarse.</p>
  {/if}
</section>

<style>
  .catalog { margin: 34px 0 0; }
  .catalog-bar { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 22px; }
  .catalog-bar > div:first-child { min-width: 0; }
  .catalog h2 { font-size: clamp(23px, 2.4vw, 29px); line-height: 1.25; letter-spacing: -.03em; margin: 8px 0 0; }
  .catalog-controls { display: flex; gap: 8px; flex-shrink: 0; }
  .catalog button, .catalog select { background: var(--product-surface); border: 1px solid var(--product-border); color: var(--color-text-primary); border-radius: 9px; padding: 10px 13px; min-height: 44px; cursor: pointer; font-size: 13px; font-weight: 500; transition: border-color .15s ease, background-color .15s ease; }
  .catalog button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
  .catalog button:hover:not(:disabled), .catalog select:hover { border-color: var(--color-text-muted); }
  .catalog button.product-action { background: var(--product-accent); color: #15251d; border-color: transparent; }
  .catalog button.product-action:hover { background: #c7eab5; }
  .refreshing { animation: refresh 1.2s linear infinite; }
  @keyframes refresh { to { transform: rotate(360deg); } }
  .demo-note { display: flex; align-items: flex-start; gap: 16px; background: var(--product-accent-soft); border: 1px solid var(--product-accent-border); padding: 16px 18px; border-radius: 12px; margin-bottom: 24px; }
  .demo-label { flex-shrink: 0; font-size: 12px; font-weight: 700; color: var(--product-accent-text); }
  .demo-note p { font-size: 13px; line-height: 1.65; color: var(--color-text-muted); }
  .catalog-status { display: flex; align-items: center; gap: 20px; justify-content: space-between; }
  .catalog-status h3 { font-size: 20px; margin: 0 0 6px; }
  .catalog-status p { font-size: 14px; }
  .status-symbol { font-size: 36px; color: var(--product-accent-text); }
  .catalog-status .status-symbol + div { flex: 1; }
  .empty-catalog { display: grid; grid-template-columns: 1.25fr 1fr; gap: 42px; padding: 32px; }
  .empty-label { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 500; color: var(--color-text-muted); }
  .empty-label > span { width: 6px; height: 6px; border: 1px solid currentColor; border-radius: 50%; }
  .empty-catalog h3 { font-size: clamp(24px, 2.6vw, 30px); line-height: 1.3; letter-spacing: -.025em; margin: 14px 0 12px; }
  .empty-catalog p { font-size: 14px; }
  .empty-copy .product-action { margin-top: 22px; }
  .empty-guide { border-left: 1px solid var(--product-border); padding-left: 32px; align-self: center; }
  .empty-guide > div { margin-top: 18px; }
  .empty-guide strong { font-size: 14px; }
  .empty-guide p { margin-top: 4px; font-size: 13px; }
  .edition-line { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 20px; font-size: 13px; }
  .edition-line > div { display: flex; flex-direction: column; gap: 2px; }
  .edition-line strong { font-size: 14px; font-weight: 600; }
  .edition-line > div > span { font-size: 12px; color: var(--color-text-muted); }
  .edition-line label { display: flex; align-items: center; gap: 10px; color: var(--color-text-muted); }
  .entry-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; align-items: start; }
  .catalog-entry { min-width: 0; padding: 26px; border: 1px solid var(--product-border); background: var(--product-surface); border-radius: 18px; box-shadow: var(--product-shadow); }
  .catalog-entry.reward { grid-column: 1 / -1; border-color: var(--product-accent-border); border-top: 3px solid var(--product-accent); }
  .entry-meta { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
  .sport-time { display: flex; gap: 9px; font-size: 12px; font-weight: 500; color: var(--color-text-muted); }
  .access-label { padding: 4px 8px; border: 1px solid var(--product-border); border-radius: 5px; font-size: 10px; line-height: 1.5; letter-spacing: .065em; font-weight: 600; color: var(--color-text-secondary); }
  .reward .access-label { background: var(--product-accent-soft); border-color: var(--product-accent-border); color: var(--product-accent-text); }
  .catalog-entry h3 { font-size: 23px; line-height: 1.3; letter-spacing: -.025em; margin: 18px 0 8px; text-wrap: pretty; }
  .reward h3 { font-size: clamp(24px, 2.8vw, 30px); }
  .source { font-size: 12px; color: var(--color-text-muted); line-height: 1.8; }
  .source > span { padding: 0 3px; }
  .analysis-content { margin-top: 24px; }
  .reading { display: flex; justify-content: space-between; gap: 22px; align-items: center; padding: 20px 0; border-top: 1px solid var(--product-border); border-bottom: 1px solid var(--product-border); }
  .selection { min-width: 0; }
  .reading-label { font-size: 11px; font-weight: 500; color: var(--color-text-muted); }
  .reading h4 { font-size: 18px; line-height: 1.4; margin: 6px 0 0; letter-spacing: -.02em; }
  .probability { flex-shrink: 0; text-align: right; }
  .probability strong { font-size: 42px; line-height: 1.1; letter-spacing: -.055em; font-weight: 600; }
  .probability strong small { font-size: 20px; margin-left: 2px; }
  .probability > span { display: block; font-size: 11px; line-height: 1.45; color: var(--color-text-muted); margin-top: 6px; }
  .evidence > p { margin: 18px 0; font-size: 14px; line-height: 1.8; color: var(--color-text-muted); }
  .reward .analysis-content { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
  .reward .reading { border-bottom: 0; align-self: start; }
  .reward .evidence { border-top: 1px solid var(--product-border); }
  .locked { margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--product-border); }
  .lock-heading { display: flex; align-items: center; gap: 9px; }
  .lock-heading svg { flex-shrink: 0; color: var(--color-text-muted); }
  .lock-heading strong { font-size: 15px; font-weight: 600; }
  .locked p { font-size: 14px; margin: 10px 0 14px; line-height: 1.8; color: var(--color-text-muted); }
  .locked small { font-size: 12px; color: var(--color-text-muted); }
  .locked .product-link { gap: 8px; margin: 0; }
  details { font-size: 13px; line-height: 1.8; border-top: 1px solid var(--product-border); }
  summary { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 46px; padding: 10px 0; cursor: pointer; list-style: none; font-weight: 500; }
  summary::-webkit-details-marker { display: none; }
  summary > span { font-size: 20px; font-weight: 400; color: var(--color-text-muted); }
  details[open] summary > span { transform: rotate(45deg); }
  details ul { padding-left: 18px; margin: 8px 0 14px; color: var(--color-text-muted); }
  details li + li { margin-top: 6px; }
  .model-limit { padding: 12px 14px; background: var(--color-bg-card); border-radius: 8px; color: var(--color-text-muted); font-size: 12px; }
  .started, .withdrawn { border-top: 1px solid var(--product-border); margin-top: 18px; padding-top: 16px; color: var(--color-text-muted); font-size: 13px; line-height: 1.8; }
  .filter-empty { grid-column: 1 / -1; }
  .filter-empty h3 { margin: 0 0 8px; font-size: 22px; }
  .filter-empty button { margin-top: 18px; }
  .catalog-footnote { max-width: 880px; margin-top: 20px; }
  @media (max-width: 900px) { .catalog-bar { align-items: flex-start; flex-direction: column; } }
  @media (max-width: 760px) {
    .entry-list, .empty-catalog, .reward .analysis-content { grid-template-columns: 1fr; }
    .empty-catalog { padding: 24px; gap: 26px; }
    .empty-guide { border-left: 0; border-top: 1px solid var(--product-border); padding: 22px 0 0; }
    .empty-guide > div { margin-top: 14px; }
    .catalog-entry { padding: 22px; }
    .reward .analysis-content { gap: 0; }
    .reward .reading { padding-top: 18px; }
    .reward .evidence { border-top: 1px solid var(--product-border); }
  }
  @media (max-width: 480px) {
    .catalog-controls { width: 100%; flex-wrap: wrap; }
    .catalog-controls button:first-child { flex: 1; }
    .demo-note { flex-direction: column; gap: 6px; }
    .edition-line { align-items: stretch; flex-direction: column; }
    .edition-line label { justify-content: space-between; }
    .edition-line select { flex: 1; max-width: 230px; }
    .catalog-entry { padding: 20px; }
    .catalog-entry h3 { font-size: 23px; }
    .probability strong { font-size: 38px; }
    .catalog-status { align-items: flex-start; flex-wrap: wrap; }
  }
  @media (prefers-reduced-motion: reduce) { .refreshing { animation: none; } }
</style>
