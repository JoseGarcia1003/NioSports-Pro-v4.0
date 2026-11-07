<script>
  import '$lib/styles/premium.css';
  import '$lib/styles/product.css';
  import { onMount } from 'svelte';
  import { onNavigate } from '$app/navigation';
  import '$lib/styles/tokens.css';
  import '$lib/styles/fonts.css';
  import '$lib/styles/brand.css';
  import '$lib/styles/animations.css';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  import Nav from '$lib/components/Nav.svelte';
  import BottomNav from '$lib/components/BottomNav.svelte';
  import DemoBanner from '$lib/components/DemoBanner.svelte';
  import { safeNext } from '$lib/product/navigation.js';
  import ToastContainer from '$lib/components/ToastContainer.svelte';
  import UpdateNotice from '$lib/components/UpdateNotice.svelte';


  import { authStore, isAuthenticated, authLoading } from '$lib/stores/auth';
  import { loadSubscription, resetSubscription } from '$lib/stores/subscription';
  import { theme } from '$lib/stores/ui';
  import { browser } from '$app/environment';

  const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password'];
  // Open to visitors (with navigation): anyone must be able to audit the record.
  const OPEN_ROUTES = ['/verificar', '/transparencia', '/deportes', '/deportes/futbol', '/deportes/mlb'];
  let subscriptionUser = null;

  onMount(async () => {
  // Anonymous real-user Web Vitals and error reporting (route pattern only).
  import('$lib/telemetry.js').then(m => m.startTelemetry(() => $page.route?.id)).catch(() => {});
  // Firebase (auth + database, ~300 KB) loads after first paint, not in the entry bundle.
  try { const { initFirebase } = await import('$lib/firebase'); await initFirebase(); } catch { authStore.setUser(null); authStore.setError('No se pudo iniciar la autenticación'); }
  document.documentElement.setAttribute('data-theme', $theme);
  });

  onNavigate((navigation) => {
    if (!document.startViewTransition) return;
    return new Promise((resolve) => {
      document.startViewTransition(async () => {
        resolve();
        await navigation.complete;
      });
    });
  });

  // Remember only that this browser had a session, so the landing can render from
  // the server for visitors while members see the loader until auth resolves.
  $: if (browser && !$authLoading) {
    try {
      if ($isAuthenticated) localStorage.setItem('nio:session', '1');
      else { localStorage.removeItem('nio:session'); document.documentElement.removeAttribute('data-session'); }
    } catch { /* storage unavailable: nothing to remember */ }
  }

$: if (browser && !$authLoading) {
    // Visitors only see the landing, the access screens and the legal pages;
    // every product screen requires a session (the APIs enforce it too).
    const path = $page.url.pathname;
    const isPublic = path === '/' || path.startsWith('/legal/') || OPEN_ROUTES.includes(path) || PUBLIC_ROUTES.some(r => path.startsWith(r));
    if (!$isAuthenticated && !isPublic) goto(`/login?next=${encodeURIComponent(path + $page.url.search)}`, { replaceState: true });
    if ($isAuthenticated && path === '/') goto('/today');
    if ($isAuthenticated && path === '/login') goto(safeNext($page.url.searchParams.get('next')), { replaceState: true });
    if ($isAuthenticated && $authStore.userId !== subscriptionUser) {
      subscriptionUser = $authStore.userId;
      loadSubscription();
    } else if (!$isAuthenticated && subscriptionUser) {
      subscriptionUser = null;
      resetSubscription();
    }
  }

  // Pages that render fully on the server without waiting for the session.
  $: isServerPublic = $page.url.pathname === '/' || $page.url.pathname.startsWith('/legal/') || OPEN_ROUTES.includes($page.url.pathname) || PUBLIC_ROUTES.some(r => $page.url.pathname.startsWith(r));
  $: isPublicPage = PUBLIC_ROUTES.some(r => $page.url.pathname.startsWith(r));
  $: isLandingPage = !$isAuthenticated && $page.url.pathname === '/';
  $: showNav = !isPublicPage && !isLandingPage;
</script>

<div data-theme={$theme} class="app">
  
  {#if $authLoading && !isServerPublic}
    <div class="app-loading">
      <div class="app-loading__content">
        <div class="app-loading__logo">
          <svg width="48" height="48" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="10" fill="var(--nio-navy)"/>
            <path d="M12 28V12l8 5.5L28 12v16l-8-5.5L12 28z" fill="var(--nio-gold)"/>
            <path d="M20 17.5l8 5.5V12l-8 5.5z" fill="white" opacity="0.6"/>
          </svg>
        </div>
        <div class="app-loading__spinner"></div>
        <p class="app-loading__text">Cargando NioSports Pro</p>
      </div>
    </div>
  {:else}
    {#if $authLoading}
      <div class="app-loading session-loader" aria-hidden="true"><div class="app-loading__spinner"></div></div>
    {/if}
    {#if showNav}
      <Nav />
      <DemoBanner />
    {/if}

    <main id="main-content" class="app-main" class:app-main--with-nav={showNav} class:app-main--with-bottom={showNav}>
      <slot />
    </main>

    {#if showNav}
      <BottomNav />

    {/if}
  {/if}

  <ToastContainer />
  <UpdateNotice />
</div>

<style>
:global([data-theme="dark"]) {
    --color-bg-base: var(--nio-page);
    --color-bg: var(--nio-surface);
    --color-bg-card: rgba(255,255,255,0.04);
    --color-bg-elevated: rgba(255,255,255,0.07);
    --color-border: rgba(255,255,255,0.08);
    --color-border-hover: rgba(255,255,255,0.16);
    --color-text-primary: #f1f5f9;
    --color-text-secondary: rgba(255,255,255,0.7);
    --color-text-muted: var(--nio-muted);
    --color-accent: var(--nio-accent);
    --color-accent-hover: var(--nio-accent-hover);
    --color-accent-glow: rgba(213,180,107,0.16);
    --color-accent-gradient: var(--nio-gold-gradient);
    --color-cta: var(--nio-gold);
    --color-cta-hover: var(--nio-accent-hover);
    --color-cta-gradient: var(--nio-gold-gradient);
    --color-success: var(--nio-hit);
    --color-warning: var(--nio-gold);
    --color-error: var(--nio-miss);
    --color-gold: var(--nio-gold);
    --color-gold-glow: rgba(213,180,107,0.15);
    --shadow-card: 0 2px 12px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05);
    --shadow-elevated: 0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06);
    --glass-bg: rgba(17,24,39,0.8);
    --glass-border: rgba(255,255,255,0.1);
    --glass-blur: blur(20px);
  }

  :global([data-theme="light"]) {
    --color-bg-base: var(--nio-page);
    --color-bg: #ffffff;
    --color-bg-card: rgba(7,22,43,0.03);
    --color-bg-elevated: rgba(7,22,43,0.05);
    --color-border: rgba(7,22,43,0.1);
    --color-border-hover: rgba(7,22,43,0.2);
    --color-text-primary: #0f172a;
    --color-text-secondary: #334155;
    --color-text-muted: var(--nio-muted);
    --color-accent: var(--nio-accent);
    --color-accent-hover: var(--nio-accent-hover);
    --color-accent-glow: rgba(137,98,25,0.12);
    --color-accent-gradient: var(--nio-gold-gradient);
    --color-cta: var(--nio-accent);
    --color-cta-hover: var(--nio-gold);
    --color-cta-gradient: var(--nio-gold-gradient);
    --color-success: var(--nio-hit);
    --color-warning: var(--nio-accent);
    --color-error: var(--nio-miss);
    --color-gold: var(--nio-accent);
    --color-gold-glow: rgba(137,98,25,0.1);
    --shadow-card: 0 2px 12px rgba(7,22,43,0.06), 0 0 0 1px rgba(7,22,43,0.08);
    --shadow-elevated: 0 8px 32px rgba(7,22,43,0.1), 0 0 0 1px rgba(7,22,43,0.1);
    --glass-bg: rgba(255,255,255,0.85);
    --glass-border: rgba(7,22,43,0.12);
    --glass-blur: blur(20px);
  }

  :global(*, *::before, *::after) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  :global(html) {
    scroll-behavior: smooth;
  }

  :global(body) {
    font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: var(--color-bg-base);
    color: var(--color-text-primary);
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    line-height: 1.5;
    overscroll-behavior-y: contain;
  }

  :global(a) {
    color: inherit;
  }

  :global(::selection) {
    background: var(--nio-selection);
    color: var(--nio-ink);
  }

  :global(button, a, input, select, textarea) {
    min-height: 44px;
  }

  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .app-main {
    flex: 1;
    width: 100%;
  }

  .app-main--with-nav {
    padding-top: 64px;
  }

  .app-main--with-bottom {
    padding-bottom: 0;
  }

  @media (max-width: 768px) {
    .app-main--with-bottom {
      padding-bottom: 72px;
    }
  }

  @media (max-width: 480px) {
    .app-main--with-nav {
      padding-top: 64px;
    }
  }

  .app-loading.session-loader { display: none; }
  :global(html[data-session]) .app-loading.session-loader { display: flex; position: fixed; inset: 0; z-index: 1000; background: var(--nio-page); }
  .app-loading {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg-base);
  }

  .app-loading__content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
  }

  .app-loading__logo {
    animation: float 2s ease-in-out infinite;
    filter: drop-shadow(0 0 20px rgba(99, 102, 241, 0.4));
  }

  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }

  .app-loading__spinner {
    width: 48px;
    height: 48px;
    border: 3px solid var(--nio-gold-soft);
    border-top-color: var(--nio-accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .app-loading__text {
    font-size: 1rem;
    color: var(--color-text-muted);
    font-weight: 500;
  }

  @keyframes fade-in {
  from { opacity: 0; }
  }
  @keyframes fade-out {
    to { opacity: 0; }
  }
  :global(::view-transition-old(root)) {
    animation: 150ms ease-out fade-out;
  }
  :global(::view-transition-new(root)) {
    animation: 200ms ease-in fade-in;
  }
  @media (prefers-reduced-motion: reduce) {
    :global(::view-transition-old(root)),
    :global(::view-transition-new(root)) {
      animation: none !important;
    }
  }
</style>
