<!-- src/routes/+layout.svelte -->
<!--
  EL LAYOUT RAÍZ — el equivalente del <body> del index.html actual.

  En SvelteKit, el layout raíz es el componente que envuelve TODAS
  las páginas. <slot /> es donde se renderiza el contenido de la
  página activa. Si navegas de /picks a /bankroll, solo el <slot />
  cambia — Nav, DemoBanner y ToastContainer se mantienen montados.

  Esto resuelve uno de los problemas del index.html actual: cada
  "navegación" destruía y reconstruía el DOM completo, lo que causaba
  parpadeos y perdía el estado de scroll.
-->
<script>
  import { onMount }         from 'svelte';
  import { goto }            from '$app/navigation';
  import { page }            from '$app/stores';

  import Nav                 from '$lib/components/Nav.svelte';
  import DemoBanner          from '$lib/components/DemoBanner.svelte';
  import ToastContainer      from '$lib/components/ToastContainer.svelte';

  import { initFirebase }    from '$lib/firebase';
  import { authStore,
           isAuthenticated,
           authLoading }     from '$lib/stores/auth';
  import { theme }           from '$lib/stores/ui';
  import { browser }         from '$app/environment';

  // Rutas que no requieren autenticación
  const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password'];

  onMount(async () => {
    // Inicializar Firebase una sola vez cuando la app monta
    await initFirebase();

    // Aplicar tema guardado al elemento raíz
    document.documentElement.setAttribute('data-theme', $theme);
  });

  // Protección de rutas: si el usuario no está autenticado y la
  // ruta no es pública, redirigir al login.
  // El bloque $: se re-evalúa cada vez que $authLoading, $isAuthenticated
  // o $page.url.pathname cambian — incluyendo después de cada navegación.
  $: if (browser && !$authLoading) {
    const isPublic = PUBLIC_ROUTES.some(r => $page.url.pathname.startsWith(r));
    if (!$isAuthenticated && !isPublic) {
      goto('/login');
    }
    if ($isAuthenticated && $page.url.pathname === '/login') {
      goto('/');
    }
  }

  // Detectar si la página actual es pública para no mostrar el Nav
  $: isPublicPage = PUBLIC_ROUTES.some(r => $page.url.pathname.startsWith(r));
</script>

<!--
  El atributo data-theme en el <div> raíz aplica el tema a toda la app.
  Las variables CSS definidas en app.css reaccionan a este atributo:
    [data-theme="dark"]  { --bg: #0a0f1c; --text: #fff; }
    [data-theme="light"] { --bg: #f8fafc; --text: #111; }
-->
<div data-theme={$theme} class="app-shell">

  <!-- Pantalla de carga inicial mientras Firebase verifica la sesión -->
  {#if $authLoading}
    <div class="app-loading" role="status" aria-label="Cargando NioSports">
      <div class="app-loading__spinner"></div>
      <p class="app-loading__text">Iniciando NioSports Pro...</p>
    </div>

  {:else}
    <!-- Nav solo en rutas protegidas (no en login/register) -->
    {#if !isPublicPage}
      <Nav />
      <DemoBanner />
    {/if}

    <!--
      main tiene padding-top para compensar el navbar fijo de 64px.
      Solo aplica en rutas protegidas — las páginas públicas (login)
      usan su propio layout centrado sin offset.
    -->
    <main
      id="main-content"
      class="app-main"
      class:app-main--with-nav={!isPublicPage}
    >
      <!-- Aquí SvelteKit renderiza la página activa -->
      <slot />
    </main>
  {/if}

  <!-- Los toasts siempre están disponibles, en cualquier ruta -->
  <ToastContainer />
</div>

<style>
  /* Variables globales del tema — la única fuente de verdad para colores */
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

  /* Reset global mínimo */
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

  .app-main { width: 100%; }
  .app-main--with-nav {
    padding-top: 64px; /* Altura del navbar fijo */
  }

  /* Pantalla de carga inicial */
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
    width: 40px;
    height: 40px;
    border: 3px solid rgba(251,191,36,0.2);
    border-top-color: #fbbf24;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .app-loading__text {
    color: rgba(255,255,255,0.6);
    font-size: 0.95rem;
  }
</style>
