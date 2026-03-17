<!-- src/routes/+layout.svelte -->
<script>
  import { onMount }         from 'svelte';
  
  // Design System - Tokens y Animaciones
  import '$lib/styles/tokens.css';
  import '$lib/styles/animations.css';
  import { goto }            from '$app/navigation';
  import { page }            from '$app/stores';

  import Nav                 from '$lib/components/Nav.svelte';
  import DemoBanner          from '$lib/components/DemoBanner.svelte';
  import ToastContainer      from '$lib/components/ToastContainer.svelte';
  import DataSourceBadge     from '$lib/components/DataSourceBadge.svelte';
  import SystemStatus        from '$lib/components/SystemStatus.svelte';;

  import { initFirebase }    from '$lib/firebase';
  import { authStore,
           isAuthenticated,
           authLoading }     from '$lib/stores/auth';
  import { theme }           from '$lib/stores/ui';
  import { browser }         from '$app/environment';

  const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password'];

  onMount(async () => {
    await initFirebase();
    document.documentElement.setAttribute('data-theme', $theme);
  });

  $: if (browser && !$authLoading) {
    const isPublic = PUBLIC_ROUTES.some(r => $page.url.pathname.startsWith(r));
    if (!$isAuthenticated && !isPublic) goto('/login');
    if ($isAuthenticated && $page.url.pathname === '/login') goto('/');
  }

  $: isPublicPage = PUBLIC_ROUTES.some(r => $page.url.pathname.startsWith(r));
</script>

<div data-theme={$theme} class="app-shell">

  {#if $authLoading}
    <div class="app-loading" role="status" aria-label="Cargando NioSports">
      <div class="app-loading__spinner"></div>
      <p class="app-loading__text">Iniciando NioSports Pro...</p>
    </div>

  {:else}
    {#if !isPublicPage}
      <Nav />
      <SystemStatus />
      <DemoBanner />

      <!-- Badge de fuente de datos — esquina inferior derecha -->
      <div class="datasource-corner">
        <DataSourceBadge />
      </div>
    {/if}

    <main
      id="main-content"
      class="app-main"
      class:app-main--with-nav={!isPublicPage}
    >
      <slot />
    </main>
  {/if}

  <ToastContainer />
</div>

<style>
  :global([data-theme="dark"]) {
    --color-bg:          #0a0f1c;
    --color-bg-card:     rgba(255,255,255,0.05);
    --color-border:      rgba(255,255,255,0.1);
    --color-text:        #ffffff;
    --color-text-muted:  rgba(255,255,255,0.6);
    --color-accent:      #fbbf24;
    --color-accent-dark: #f59e0b;
  }

  :global([data-theme="light"]) {
    --color-bg:          #f8fafc;
    --color-bg-card:     #ffffff;
    --color-border:      rgba(0,0,0,0.1);
    --color-text:        #111827;
    --color-text-muted:  #6b7280;
    --color-accent:      #d97706;
    --color-accent-dark: #b45309;
  }

  :global(*, *::before, *::after) { box-sizing: border-box; margin: 0; padding: 0; }
  :global(body) {
    font-family: 'DM Sans', system-ui, sans-serif;
    background: var(--color-bg);
    color: var(--color-text);
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
  }
  :global(a) { color: inherit; }

  .app-shell { min-height: 100vh; }
  .app-main  { width: 100%; }
  .app-main--with-nav { padding-top: 64px; }

  /* Badge flotante — esquina inferior derecha, encima del nav móvil */
  .datasource-corner {
    position: fixed;
    bottom: 20px;
    right: 16px;
    z-index: 40;
    pointer-events: none; /* No interfiere con clicks */
  }
  /* En móvil lo subimos para no tapar la barra de navegación del sistema */
  @media (max-width: 768px) {
    .datasource-corner { bottom: 72px; }
  }

  .app-loading {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 20px;
    background: var(--color-bg, #0a0f1c);
  }
  .app-loading__spinner {
    width: 40px; height: 40px;
    border: 3px solid rgba(251,191,36,0.2);
    border-top-color: #fbbf24;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .app-loading__text { color: rgba(255,255,255,0.6); font-size: 0.95rem; }
</style>