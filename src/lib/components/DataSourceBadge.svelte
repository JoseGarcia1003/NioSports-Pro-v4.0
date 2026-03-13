<!-- src/lib/components/DataSourceBadge.svelte -->
<!--
  Badge compacto que muestra siempre la fuente de datos activa.
  
  Diferencia con DemoBanner:
  - DemoBanner: alerta grande cuando demo está activo (se puede cerrar)
  - DataSourceBadge: indicador compacto siempre presente en cada vista

  Uso:
    <DataSourceBadge />                          → usa el store global
    <DataSourceBadge source="live" />            → override manual
    <DataSourceBadge source="cache" lastUpdated={new Date()} />
-->
<script>
  import { demoStatus } from '$lib/stores/data';

  export let source      = null;  // 'live' | 'cache' | 'demo' | null
  export let lastUpdated = null;  // Date para calcular edad del caché

  $: cacheAgeLabel = (() => {
    if (!lastUpdated) return '';
    const mins = Math.floor((Date.now() - new Date(lastUpdated)) / 60000);
    return mins < 1 ? ' · ahora' : ` · hace ${mins}m`;
  })();

  $: activeSource = source ?? (
    $demoStatus.anyDemoActive ? 'demo' :
    lastUpdated               ? 'cache' :
    'live'
  );

  const BADGES = {
    live:  { dot: '#34d399', label: 'API en vivo',   bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.25)'  },
    cache: { dot: '#60a5fa', label: 'Caché',         bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.25)'  },
    demo:  { dot: '#fbbf24', label: 'Estimación',    bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)'  },
  };

  $: b = BADGES[activeSource] ?? BADGES.live;
  $: label = activeSource === 'cache' ? `Caché${cacheAgeLabel}` : b.label;
</script>

<div
  class="ds-badge"
  style:background={b.bg}
  style:border-color={b.border}
  style:color={b.dot}
  title="Fuente de datos: {label}"
  role="status"
  aria-label="Fuente de datos: {label}"
>
  <span class="ds-badge__dot" style:background={b.dot}></span>
  <span class="ds-badge__label">{label}</span>
</div>

<style>
  .ds-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 9px;
    border-radius: 99px;
    border: 1px solid transparent;
    font-size: 0.68rem;
    font-weight: 600;
    white-space: nowrap;
    letter-spacing: 0.02em;
    cursor: default;
  }

  .ds-badge__dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    flex-shrink: 0;
    animation: pulse-dot 2.5s ease-in-out infinite;
  }
  @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.35} }

  .ds-badge__label { line-height: 1; }
</style>
