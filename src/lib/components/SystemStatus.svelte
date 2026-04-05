<!-- src/lib/components/SystemStatus.svelte -->
<!--
  Barra de estado del sistema — siempre visible en la parte inferior del nav.
  Muestra en tiempo real el estado de:
    • Firebase RTDB (conectado / desconectado)
    • API de BallDontLie (en vivo / caché / sin datos)
    • Modelo predictivo (versión activa)

  El plan maestro lo describe así:
  "Una barra superior discreta que muestra el estado de todas las
  integraciones: Firebase: ●online, API: ●live, Model: ●v2.1"

  Se actualiza automáticamente cada 60 segundos sin acción del usuario.
  En caso de pérdida de conexión a internet, detecta el evento offline
  del browser y cambia el estado de Firebase instantáneamente.
-->
<script>
  import { onMount, onDestroy } from 'svelte';
  import { firebaseStatus }     from '$lib/stores/ui';
  import { demoStatus }         from '$lib/stores/data';
  import { browser }            from '$app/environment';

  // ── Estado local ─────────────────────────────────────────────────
  let apiStatus    = 'checking'; // 'live' | 'cache' | 'error' | 'checking'
  let modelVersion = 'v2.5';
  let lastApiCheck = null;
  let expanded     = false;     // Tooltip expandido en mobile
  let intervalId   = null;

  // ── Chequeo de la API ────────────────────────────────────────────
  // Llama al proxy con un endpoint ligero (/teams) para saber si
  // BallDontLie responde. Si el proxy devuelve datos → live.
  // Si devuelve error o tarda > 5s → marcamos como caché/error.
  async function checkApiStatus() {
    if (!browser) return;
    try {
      const controller = new AbortController();
      const timeout    = setTimeout(() => controller.abort(), 5000);

      const res = await fetch('/api/proxy?endpoint=/teams&per_page=1', {
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (res.ok) {
        apiStatus    = 'live';
        lastApiCheck = new Date();
      } else {
        apiStatus = 'cache';
      }
    } catch {
      apiStatus = res?.status >= 400 ? 'error' : 'cache';
    }
  }

  // ── Listeners de conectividad del browser ─────────────────────────
  function handleOnline()  { checkApiStatus(); }
  function handleOffline() { apiStatus = 'error'; }

  onMount(() => {
    // Chequeo inicial después de 2s para no bloquear el render
    setTimeout(checkApiStatus, 2000);

    // Chequeo periódico cada 60s
    intervalId = setInterval(checkApiStatus, 60_000);

    if (browser) {
      window.addEventListener('online',  handleOnline);
      window.addEventListener('offline', handleOffline);
    }
  });

  onDestroy(() => {
    clearInterval(intervalId);
    if (browser) {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    }
  });

  // ── Computed ─────────────────────────────────────────────────────
  $: fbStatus = $firebaseStatus; // 'connecting' | 'ready' | 'error'

  $: indicators = [
    {
      key:    'firebase',
      label:  'Firebase',
      status: fbStatus === 'ready'
              ? 'ok'
              : fbStatus === 'error'
              ? 'error'
              : 'loading',
      detail: fbStatus === 'ready'
              ? 'Conectado'
              : fbStatus === 'error'
              ? 'Sin conexión'
              : 'Conectando...',
    },
    {
      key:    'api',
      label:  'API',
      status: apiStatus === 'live'
              ? 'ok'
              : apiStatus === 'checking'
              ? 'loading'
              : apiStatus === 'cache'
              ? 'warn'
              : 'error',
      detail: apiStatus === 'live'    ? 'En vivo'
            : apiStatus === 'cache'   ? 'Usando caché'
            : apiStatus === 'error'   ? 'Sin datos'
            : 'Verificando...',
    },
    {
      key:    'model',
      label:  'Modelo',
      status: $demoStatus.anyDemoActive ? 'warn' : 'ok',
      detail: $demoStatus.anyDemoActive
              ? 'Estimación'
              : `${modelVersion} activo`,
    },
  ];

  $: allOk    = indicators.every(i => i.status === 'ok');
  $: hasError = indicators.some(i => i.status === 'error');
  $: hasWarn  = indicators.some(i => i.status === 'warn');

  $: globalStatus = hasError ? 'error' : hasWarn ? 'warn' : 'ok';

  $: lastCheckLabel = lastApiCheck
    ? lastApiCheck.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    : '—';
</script>

<div
  class="status-bar"
  class:status-bar--ok={globalStatus === 'ok'}
  class:status-bar--warn={globalStatus === 'warn'}
  class:status-bar--error={globalStatus === 'error'}
>
  <!-- Indicadores compactos -->
  <div class="status-bar__indicators">
    {#each indicators as ind}
      <div class="indicator" title="{ind.label}: {ind.detail}">
        <span
          class="indicator__dot"
          class:indicator__dot--ok={ind.status === 'ok'}
          class:indicator__dot--warn={ind.status === 'warn'}
          class:indicator__dot--error={ind.status === 'error'}
          class:indicator__dot--loading={ind.status === 'loading'}
        ></span>
        <span class="indicator__label">{ind.label}</span>
        <span class="indicator__detail">{ind.detail}</span>
      </div>
    {/each}
  </div>

  <!-- Última verificación -->
  <div class="status-bar__meta">
    {#if lastApiCheck}
      <span class="status-bar__time">Verificado {lastCheckLabel}</span>
    {/if}
    <button
      class="status-bar__refresh"
      on:click={checkApiStatus}
      title="Verificar ahora"
      aria-label="Verificar estado del sistema"
    >
      ↺
    </button>
  </div>
</div>

<style>
  .status-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 5px 20px;
    font-size: 0.7rem;
    border-top: 1px solid rgba(255,255,255,0.05);
    background: rgba(0,0,0,0.2);
    transition: background 0.3s;
  }

  .status-bar--warn  { background: rgba(245,158,11,0.06); }
  .status-bar--error { background: rgba(239,68,68,0.08); }

  .status-bar__indicators {
    display: flex;
    align-items: center;
    gap: 18px;
    flex-wrap: wrap;
  }

  .indicator {
    display: flex;
    align-items: center;
    gap: 5px;
    white-space: nowrap;
  }

  .indicator__dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
    background: rgba(255,255,255,0.3);
  }
  .indicator__dot--ok      { background: #34d399; box-shadow: 0 0 4px rgba(52,211,153,0.6); }
  .indicator__dot--warn    { background: #fbbf24; box-shadow: 0 0 4px rgba(251,191,36,0.6); }
  .indicator__dot--error   { background: #f87171; box-shadow: 0 0 4px rgba(248,113,113,0.6); }
  .indicator__dot--loading {
    background: rgba(255,255,255,0.3);
    animation: pulse 1.2s ease-in-out infinite;
  }

  .indicator__label  { color: var(--color-text-muted); font-weight: 600; }
  .indicator__detail { color: var(--color-text-muted); }

  .status-bar__meta {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
  .status-bar__time {
    color: var(--color-text-muted);
    font-size: 0.65rem;
  }
  .status-bar__refresh {
    background: none;
    border: none;
    color: var(--color-text-muted);
    cursor: pointer;
    font-size: 0.85rem;
    padding: 2px 4px;
    border-radius: 4px;
    transition: color 0.15s;
    line-height: 1;
  }
  .status-bar__refresh:hover { color: var(--color-text-secondary); }

  @keyframes pulse {
    0%, 100% { opacity: 0.3; }
    50%       { opacity: 1; }
  }

  /* En móvil solo mostrar los dots, ocultar el texto */
  @media (max-width: 480px) {
    .indicator__detail { display: none; }
    .status-bar__time  { display: none; }
  }
</style>
