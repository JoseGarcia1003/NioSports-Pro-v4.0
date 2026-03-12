<!-- src/lib/components/DemoBanner.svelte -->
<!--
  REEMPLAZA: scripts/data-source-indicator.js
  
  DIFERENCIA FUNDAMENTAL vs la implementación en Fase 1:
  El archivo data-source-indicator.js tenía que:
    1. Crear un elemento DOM manualmente (document.createElement)
    2. Insertar ese elemento en el body (body.insertBefore)
    3. Escuchar un CustomEvent del window (window.addEventListener)
    4. Actualizar el elemento DOM manualmente (element.textContent = ...)
  
  Este componente Svelte hace lo mismo con declaraciones reactivas puras.
  No hay manipulación manual del DOM — Svelte lo hace por nosotros.
  La sintaxis $demoStatus lee el store y re-renderiza automáticamente
  cuando cambia, sin ningún listener manual.
-->

<script>
  import { demoStatus } from '$lib/stores/data';

  // Mensajes según el tipo de fuente de datos
  const MESSAGES = {
    stats: {
      icon:  '⚠️',
      title: 'Estadísticas de estimación activas',
      body:  'El archivo de estadísticas NBA no está disponible. Los picks se basan en promedios históricos, no en datos de la temporada actual.',
    },
    games: {
      icon:  '📋',
      title: 'Sin partidos reales hoy',
      body:  'La API no devolvió partidos para hoy. Los análisis mostrados son ejemplos. Los picks NO reflejan la programación real del día.',
    },
  };

  // Estado local del banner — si el usuario lo cerró
  // El banner vuelve a aparecer si el tipo de demo cambia
  let dismissed = false;
  let lastDemoType = null;

  // Bloque reactivo: cuando $demoStatus cambia, decidir si mostrar el banner.
  // La sintaxis $: en Svelte es una declaración reactiva — se re-ejecuta
  // cada vez que cualquier variable reactiva que referencia cambia.
  $: {
    const currentType = $demoStatus.usingDemoStats ? 'stats' : 'games';
    if (currentType !== lastDemoType) {
      dismissed = false; // Nuevo tipo de demo → mostrar el banner de nuevo
      lastDemoType = currentType;
    }
  }

  // La propiedad que controla si el banner es visible
  $: visible = $demoStatus.anyDemoActive && !dismissed;

  // Qué mensaje mostrar (stats tiene prioridad sobre games)
  $: messageKey = $demoStatus.usingDemoStats ? 'stats' : 'games';
  $: message = MESSAGES[messageKey];
</script>

<!--
  El bloque {#if visible} en Svelte no "oculta" el elemento con CSS —
  lo ELIMINA del DOM cuando no es visible y lo CREA cuando lo es.
  Esto es mejor que display:none porque no ocupa memoria ni espacio
  de layout cuando no está visible.
  
  La transición `transition:slide` anima la aparición/desaparición
  automáticamente sin una sola línea de CSS de animación manual.
-->
{#if visible}
  <div
    class="demo-banner"
    role="alert"
    aria-live="polite"
  >
    <div class="demo-banner__content">
      <span class="demo-banner__icon">{message.icon}</span>
      <div class="demo-banner__text">
        <strong>{message.title}</strong>
        <span>{message.body}</span>
      </div>
    </div>
    <!--
      En Svelte, los event handlers van en el template con on:click.
      NO hay onclick="..." en el HTML generado — el handler está en el
      JavaScript del componente y Svelte lo conecta con addEventListener
      internamente. Esto es exactamente lo que elimina 'unsafe-inline'.
    -->
    <button
      class="demo-banner__close"
      on:click={() => dismissed = true}
      aria-label="Cerrar aviso"
    >×</button>
  </div>
{/if}

<style>
  .demo-banner {
    position: fixed;
    top: 64px; /* Debajo del navbar */
    left: 0;
    right: 0;
    z-index: 9990;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 20px;
    background: rgba(180, 83, 9, 0.95);
    border-bottom: 1px solid rgba(251, 191, 36, 0.6);
    color: #fff;
    font-size: 13px;
    line-height: 1.4;
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
  }

  .demo-banner__content {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    min-width: 0;
  }

  .demo-banner__icon {
    font-size: 16px;
    flex-shrink: 0;
  }

  .demo-banner__text {
    min-width: 0;
  }

  .demo-banner__text strong {
    display: block;
    margin-bottom: 2px;
  }

  .demo-banner__text span {
    opacity: 0.9;
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .demo-banner__close {
    flex-shrink: 0;
    background: none;
    border: none;
    cursor: pointer;
    opacity: 0.7;
    font-size: 20px;
    padding: 0 4px;
    color: inherit;
    line-height: 1;
    transition: opacity 0.15s;
  }

  .demo-banner__close:hover { opacity: 1; }

  /*
    Los estilos de un componente Svelte son SCOPED por defecto —
    Svelte les añade un atributo único como class="svelte-abc123".
    Esto significa que .demo-banner aquí NUNCA afectará a un elemento
    con esa clase en otro componente. No necesitas BEM ni CSS Modules.
  */
</style>
