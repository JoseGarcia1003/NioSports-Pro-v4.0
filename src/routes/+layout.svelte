<script>
  import { onMount } from 'svelte';
  import '$lib/styles/tokens.css';
  import '$lib/styles/animations.css';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  import Nav from '$lib/components/Nav.svelte';
  import BottomNav from '$lib/components/BottomNav.svelte';
  import DemoBanner from '$lib/components/DemoBanner.svelte';
  import ToastContainer from '$lib/components/ToastContainer.svelte';

  import { initFirebase } from '$lib/firebase';
  import { authStore, isAuthenticated, authLoading } from '$lib/stores/auth';
  import { theme } from '$lib/stores/ui';
  import { browser } from '$app/environment';

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
  $: isLandingPage = !$isAuthenticated && $page.url.pathname === '/';
  $: showNav = !isPublicPage && !isLandingPage;
</script>

<div data-theme={$theme} class="app">
  {#if $authLoading}
    <div class="app-loading">
      <div class="app-loading__content">
        <div class="app-loading__logo">
          <svg width="48" height="48" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="10" fill="#6366F1"/>
            <path d="M12 28V12l8 5.5L28 12v16l-8-5.5L12 28z" fill="white" opacity="0.9"/>
            <path d="M20 17.5l8 5.5V12l-8 5.5z" fill="white" opacity="0.6"/>
          </svg>
        </div>
        <div class="app-loading__spinner"></div>
        <p class="app-loading__text">Cargando NioSports Pro</p>
      </div>
    </div>
  {:else}
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
</div>

<style>
  :global([data-theme="dark"]) {
    --color-bg-base: #060912;
    --color-bg: #0a0f1c;
    --color-bg-card: rgba(255,255,255,0.04);
    --color-bg-elevated: rgba(255,255,255,0.06);
    --color-border: rgba(255,255,255,0.08);
    --color-border-hover: rgba(255,255,255,0.15);
    --color-text-primary: #ededed;
    --color-text-secondary: rgba(255,255,255,0.7);
    --color-text-muted: rgba(255,255,255,0.45);
    --color-accent: #6366F1;
    --color-accent-hover: #4F46E5;
    --color-accent-glow: rgba(99,102,241,0.15);
    --color-cta: #F59E0B;
    --color-cta-hover: #D97706;
    --color-success: #10B981;
    --color-warning: #F59E0B;
    --color-error: #EF4444;
  }

  :global([data-theme="light"]) {
    --color-bg-base: #f8fafc;
    --color-bg: #ffffff;
    --color-bg-card: rgba(0,0,0,0.02);
    --color-bg-elevated: rgba(0,0,0,0.04);
    --color-border: rgba(0,0,0,0.08);
    --color-border-hover: rgba(0,0,0,0.15);
    --color-text-primary: #0f172a;
    --color-text-secondary: #334155;
    --color-text-muted: #64748b;
    --color-accent: #4F46E5;
    --color-accent-hover: #4338CA;
    --color-accent-glow: rgba(79,70,229,0.1);
    --color-cta: #D97706;
    --color-cta-hover: #B45309;
    --color-success: #059669;
    --color-warning: #D97706;
    --color-error: #dc2626;
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
    background: rgba(99, 102, 241, 0.3);
    color: #fff;
  }

  /* Ensure all interactive elements meet 44px touch target */
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
    padding-top: 72px;
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

  /* Loading Screen */
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
    border: 3px solid rgba(99, 102, 241, 0.1);
    border-top-color: #6366F1;
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
</style>