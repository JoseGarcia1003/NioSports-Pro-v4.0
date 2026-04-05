<script>
  import { page } from '$app/stores';
</script>

<nav class="bnav">
  <a href="/" class="bnav__tab" class:active={$page.url.pathname === '/'}>
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
    <span>Inicio</span>
  </a>
  <a href="/totales" class="bnav__tab" class:active={$page.url.pathname.startsWith('/totales')}>
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
    <span>Totales</span>
  </a>
  <a href="/picks" class="bnav__tab" class:active={$page.url.pathname.startsWith('/picks')}>
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/></svg>
    <span>Picks</span>
  </a>
  <a href="/stats" class="bnav__tab" class:active={$page.url.pathname.startsWith('/stats')}>
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
    <span>Stats</span>
  </a>
  <a href="/tracking" class="bnav__tab" class:active={$page.url.pathname.startsWith('/tracking')}>
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    <span>Perfil</span>
  </a>
</nav>

<style>
  .bnav {
    display: none;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 100;
    background: rgba(10, 15, 28, 0.95);
    backdrop-filter: blur(20px);
    border-top: 1px solid var(--color-border);
    padding: 6px 8px;
    padding-bottom: max(6px, env(safe-area-inset-bottom));
    justify-content: space-around;
    align-items: center;
  }
  @media (max-width: 768px) {
    .bnav { display: flex; }
  }
  .bnav__tab {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    padding: 8px 12px;
    min-width: 56px;
    min-height: 48px;
    border-radius: 12px;
    text-decoration: none;
    color: var(--color-text-muted);
    transition: all 0.2s ease;
    -webkit-tap-highlight-color: transparent;
  }
  .bnav__tab:active { transform: scale(0.92); }
  .bnav__tab.active {
    color: #6366F1;
    background: rgba(99, 102, 241, 0.1);
  }
  .bnav__tab span {
    font-size: 0.65rem;
    font-weight: 600;
    line-height: 1;
  }
</style>