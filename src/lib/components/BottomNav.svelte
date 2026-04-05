<script>
  import { page } from '$app/stores';
</script>

<nav class="bnav">
  <div class="bnav__scroll">
    <a href="/" class="bnav__tab" class:active={$page.url.pathname === '/'}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
      <span>Inicio</span>
    </a>
    <a href="/totales" class="bnav__tab" class:active={$page.url.pathname.startsWith('/totales')}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
      <span>Totales</span>
    </a>
    <a href="/picks" class="bnav__tab" class:active={$page.url.pathname.startsWith('/picks')}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/></svg>
      <span>Picks</span>
    </a>
    <a href="/bankroll" class="bnav__tab" class:active={$page.url.pathname.startsWith('/bankroll')}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 10h20"/></svg>
      <span>Bankroll</span>
    </a>
    <a href="/stats" class="bnav__tab" class:active={$page.url.pathname.startsWith('/stats')}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
      <span>Stats</span>
    </a>
    <a href="/results" class="bnav__tab" class:active={$page.url.pathname.startsWith('/results')}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20V10M18 20V4M6 20v-4"/></svg>
      <span>Resultados</span>
    </a>
    <a href="/pricing" class="bnav__tab" class:active={$page.url.pathname.startsWith('/pricing')}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M8 10h8M8 14h6"/></svg>
      <span>Precios</span>
    </a>
    <a href="/tracking" class="bnav__tab" class:active={$page.url.pathname.startsWith('/tracking')}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
      <span>Tracking</span>
    </a>
  </div>
</nav>

<style>
  .bnav {
    display: none;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 100;
    background: var(--color-bg-base, #060912);
    backdrop-filter: blur(20px);
    border-top: 1px solid var(--color-border);
    padding-bottom: max(4px, env(safe-area-inset-bottom));
  }

  @media (max-width: 768px) {
    .bnav { display: block; }
  }

  .bnav__scroll {
    display: flex;
    overflow-x: auto;
    overflow-y: hidden;
    scroll-snap-type: x proximity;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    padding: 6px 8px;
    gap: 2px;
  }

  .bnav__scroll::-webkit-scrollbar {
    display: none;
  }

  .bnav__tab {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    padding: 6px 10px;
    min-width: 60px;
    min-height: 48px;
    border-radius: 10px;
    text-decoration: none;
    color: var(--color-text-muted);
    transition: all 0.2s ease;
    -webkit-tap-highlight-color: transparent;
    flex-shrink: 0;
    scroll-snap-align: center;
  }

  .bnav__tab:active {
    transform: scale(0.92);
  }

  .bnav__tab.active {
    color: #6366F1;
    background: rgba(99, 102, 241, 0.1);
  }

  .bnav__tab span {
    font-size: 0.6rem;
    font-weight: 600;
    line-height: 1;
    white-space: nowrap;
  }
</style>