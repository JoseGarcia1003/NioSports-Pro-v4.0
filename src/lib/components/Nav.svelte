<!-- src/lib/components/Nav.svelte — FASE 6: WCAG AA completo -->
<!--
  Mejoras de accesibilidad en Fase 6:
    • Skip link "Saltar al contenido" (WCAG 2.4.1 — Bypass Blocks)
    • aria-current="page" en el link activo
    • aria-expanded en el botón de menú móvil
    • role="list" en la lista de navegación
    • Cierre del menú móvil con tecla Escape
    • focus-visible en todos los elementos interactivos
    • aria-label descriptivo en cada ícono de navegación
    • Contraste de colores WCAG AA (>4.5:1 en texto normal)
-->
<script>
  import { page }          from '$app/stores';
  import { goto }          from '$app/navigation';
  import { theme }         from '$lib/stores/ui';
  import { currentUser,
           authStore }     from '$lib/stores/auth';
  import { browser }       from '$app/environment';
  import { onMount,
           onDestroy }     from 'svelte';

  const NAV_LINKS = [
    { href: '/',         label: 'Inicio',   icon: '🏠', ariaLabel: 'Inicio — Dashboard' },
    { href: '/totales',  label: 'Totales',  icon: '📊', ariaLabel: 'Análisis de totales NBA' },
    { href: '/picks',    label: 'Picks IA', icon: '🤖', ariaLabel: 'Picks generados por IA' },
    { href: '/bankroll', label: 'Bankroll', icon: '💰', ariaLabel: 'Gestión de bankroll' },
    { href: '/stats',    label: 'Stats',    icon: '📈', ariaLabel: 'Estadísticas de rendimiento' },
    { href: '/tracking', label: 'Tracking', icon: '📋', ariaLabel: 'Tracking de picks' },
  ];

  let scrolled       = false;
  let mobileOpen     = false;
  let userMenuOpen   = false;

  function handleScroll() {
    scrolled = window.scrollY > 10;
  }

  function toggleMobile()  { mobileOpen   = !mobileOpen;  }
  function closeMobile()   { mobileOpen   = false; }
  function toggleUserMenu(){ userMenuOpen = !userMenuOpen; }
  function closeUserMenu() { userMenuOpen = false; }

  // Cerrar menú móvil con Escape (WCAG 2.1 — Teclado)
  function handleKeydown(e) {
    if (e.key === 'Escape') {
      if (mobileOpen)   { mobileOpen = false; }
      if (userMenuOpen) { userMenuOpen = false; }
    }
  }

  // Cerrar menú de usuario al hacer click fuera
  function handleClickOutside(e) {
    if (!e.target.closest('.nav__user')) closeUserMenu();
  }

  onMount(() => {
    if (!browser) return;
    window.addEventListener('scroll',   handleScroll, { passive: true });
    window.addEventListener('keydown',  handleKeydown);
    window.addEventListener('click',    handleClickOutside);
  });

  onDestroy(() => {
    if (!browser) return;
    window.removeEventListener('scroll',  handleScroll);
    window.removeEventListener('keydown', handleKeydown);
    window.removeEventListener('click',   handleClickOutside);
  });

  async function handleLogout() {
    closeUserMenu();
    await authStore.logout();
    goto('/login');
  }

  $: userName = $currentUser?.displayName ?? $currentUser?.email?.split('@')[0] ?? 'Usuario';
  $: userInitial = (userName[0] ?? 'U').toUpperCase();

  // Verificar si una ruta está activa (exact para /, startsWith para el resto)
  function isActive(href) {
    const path = $page.url.pathname;
    return href === '/' ? path === '/' : path.startsWith(href);
  }
</script>

<!-- Skip link — primer elemento del DOM, solo visible al recibir foco (WCAG 2.4.1) -->
<a href="#main-content" class="skip-link">Saltar al contenido principal</a>

<nav
  class="nav"
  class:nav--scrolled={scrolled}
  aria-label="Navegación principal"
>
  <div class="nav__inner">

    <!-- Brand -->
    <a
      href="/"
      class="nav__brand"
      aria-label="NioSports Pro — Ir al inicio"
    >
      <img src="/icons/icon-192.png" alt="" class="nav__logo" aria-hidden="true" />
      <div class="nav__brand-text" aria-hidden="true">
        <span class="nav__brand-name">NioSports</span>
        <span class="nav__brand-tag">PRO</span>
      </div>
    </a>

    <!-- Links de escritorio -->
    <ul class="nav__links" role="list">
      {#each NAV_LINKS as link}
        {@const active = isActive(link.href)}
        <li role="none">
          <a
            href={link.href}
            class="nav__link"
            class:nav__link--active={active}
            aria-current={active ? 'page' : undefined}
            aria-label={link.ariaLabel}
          >
            <span class="nav__link-icon" aria-hidden="true">{link.icon}</span>
            <span class="nav__link-label">{link.label}</span>
          </a>
        </li>
      {/each}
    </ul>

    <!-- Controles del lado derecho -->
    <div class="nav__controls">

      <!-- Toggle de tema -->
      <button
        class="nav__icon-btn"
        on:click={theme.toggle}
        aria-label="Cambiar a tema {$theme === 'dark' ? 'claro' : 'oscuro'}"
        title="Tema {$theme === 'dark' ? 'claro' : 'oscuro'}"
      >
        {$theme === 'dark' ? '☀️' : '🌙'}
      </button>

      <!-- Menú de usuario -->
      <div class="nav__user">
        <button
          class="nav__avatar"
          on:click|stopPropagation={toggleUserMenu}
          aria-expanded={userMenuOpen}
          aria-haspopup="menu"
          aria-label="Menú de usuario — {userName}"
        >
          {userInitial}
        </button>

        {#if userMenuOpen}
          <div
            class="nav__user-menu"
            role="menu"
            aria-label="Opciones de usuario"
          >
            <div class="nav__user-info" role="none">
              <span class="nav__user-name">{userName}</span>
              {#if $currentUser?.email}
                <span class="nav__user-email">{$currentUser.email}</span>
              {/if}
            </div>
            <hr class="nav__user-divider" role="none" />
            <button
              class="nav__user-item"
              role="menuitem"
              on:click={handleLogout}
            >
              🚪 Cerrar sesión
            </button>
          </div>
        {/if}
      </div>

      <!-- Botón menú móvil -->
      <button
        class="nav__mobile-toggle"
        on:click={toggleMobile}
        aria-expanded={mobileOpen}
        aria-controls="mobile-menu"
        aria-label="{mobileOpen ? 'Cerrar' : 'Abrir'} menú de navegación"
      >
        <span class="hamburger" class:hamburger--open={mobileOpen} aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </span>
      </button>
    </div>
  </div>

  <!-- Menú móvil -->
  {#if mobileOpen}
    <div
      id="mobile-menu"
      class="nav__mobile"
      role="dialog"
      aria-label="Menú de navegación"
      aria-modal="false"
    >
      <ul role="list" class="nav__mobile-list">
        {#each NAV_LINKS as link}
          {@const active = isActive(link.href)}
          <li role="none">
            <a
              href={link.href}
              class="nav__mobile-link"
              class:nav__mobile-link--active={active}
              aria-current={active ? 'page' : undefined}
              aria-label={link.ariaLabel}
              on:click={closeMobile}
            >
              <span aria-hidden="true">{link.icon}</span>
              {link.label}
            </a>
          </li>
        {/each}
        <li role="none">
          <button
            class="nav__mobile-link nav__mobile-logout"
            on:click={handleLogout}
            aria-label="Cerrar sesión"
          >
            🚪 Cerrar sesión
          </button>
        </li>
      </ul>
    </div>
  {/if}
</nav>

<style>
  /* ── Skip link (WCAG 2.4.1) ───────────────────────────────────── */
  .skip-link {
    position: absolute;
    top: -100%;
    left: 12px;
    z-index: 99999;
    padding: 8px 16px;
    background: #fbbf24;
    color: #000;
    font-weight: 700;
    font-size: 0.875rem;
    border-radius: 0 0 8px 8px;
    text-decoration: none;
    transition: top 0.1s;
  }
  /* Visible al recibir foco por teclado */
  .skip-link:focus { top: 0; }

  /* ── Navbar ───────────────────────────────────────────────────── */
  .nav {
    background: rgba(10,15,28,0.9);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-bottom: 1px solid rgba(255,255,255,0.06);
    height: 64px;
    transition: box-shadow 0.3s;
    /* position: fixed viene del layout — el nav está en .app-header fijo */
  }

  .nav--scrolled {
    box-shadow: 0 4px 24px rgba(0,0,0,0.4);
  }

  .nav__inner {
    max-width: 1200px;
    margin: 0 auto;
    height: 100%;
    padding: 0 20px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* Brand */
  .nav__brand {
    display: flex;
    align-items: center;
    gap: 10px;
    text-decoration: none;
    flex-shrink: 0;
    margin-right: 12px;
  }
  .nav__brand:focus-visible {
    outline: 2px solid #fbbf24;
    outline-offset: 3px;
    border-radius: 6px;
  }

  .nav__logo {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    object-fit: cover;
  }

  .nav__brand-text  { display: flex; flex-direction: column; line-height: 1; }
  .nav__brand-name  { font-family: 'Orbitron', monospace; font-size: 0.9rem; font-weight: 800; color: #fff; }
  .nav__brand-tag   { font-size: 0.55rem; font-weight: 900; color: #fbbf24; letter-spacing: 0.15em; }

  /* Links desktop */
  .nav__links {
    display: flex;
    align-items: center;
    gap: 2px;
    flex: 1;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .nav__link {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 12px;
    border-radius: 8px;
    text-decoration: none;
    font-size: 0.82rem;
    font-weight: 600;
    color: rgba(255,255,255,0.55);
    transition: color 0.15s, background 0.15s;
    white-space: nowrap;
  }
  .nav__link:hover         { color: #fff; background: rgba(255,255,255,0.06); }
  .nav__link--active       { color: #fbbf24; background: rgba(251,191,36,0.1); }
  .nav__link:focus-visible  {
    outline: 2px solid #fbbf24;
    outline-offset: 2px;
    color: #fff;
  }

  .nav__link-icon  { font-size: 0.95rem; }
  .nav__link-label { }

  /* Controles */
  .nav__controls {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-left: auto;
    flex-shrink: 0;
  }

  .nav__icon-btn {
    background: none;
    border: none;
    cursor: pointer;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    color: rgba(255,255,255,0.6);
    transition: background 0.15s, color 0.15s;
  }
  .nav__icon-btn:hover        { background: rgba(255,255,255,0.08); color: #fff; }
  .nav__icon-btn:focus-visible { outline: 2px solid #fbbf24; outline-offset: 2px; }

  /* Avatar / menú usuario */
  .nav__user { position: relative; }

  .nav__avatar {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: linear-gradient(135deg, #fbbf24, #f59e0b);
    color: #000;
    font-weight: 800;
    font-size: 0.85rem;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .nav__avatar:hover        { transform: scale(1.08); box-shadow: 0 0 0 2px rgba(251,191,36,0.4); }
  .nav__avatar:focus-visible { outline: 2px solid #fbbf24; outline-offset: 3px; }

  .nav__user-menu {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    min-width: 200px;
    background: #0f1729;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 12px;
    padding: 8px;
    box-shadow: 0 16px 40px rgba(0,0,0,0.5);
    z-index: 1000;
    animation: menuIn 0.15s ease;
  }
  @keyframes menuIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }

  .nav__user-info   { padding: 8px 10px 6px; }
  .nav__user-name   { display: block; font-weight: 700; font-size: 0.875rem; color: #fff; }
  .nav__user-email  { display: block; font-size: 0.72rem; color: rgba(255,255,255,0.45); margin-top: 2px; word-break: break-all; }
  .nav__user-divider { border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 6px 0; }

  .nav__user-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 10px;
    background: none;
    border: none;
    border-radius: 8px;
    color: rgba(255,255,255,0.7);
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    text-align: left;
    transition: background 0.15s, color 0.15s;
    font-family: 'DM Sans', sans-serif;
  }
  .nav__user-item:hover        { background: rgba(255,255,255,0.07); color: #fff; }
  .nav__user-item:focus-visible { outline: 2px solid #fbbf24; outline-offset: 1px; }

  /* Hamburger */
  .nav__mobile-toggle {
    display: none;
    background: none;
    border: none;
    cursor: pointer;
    padding: 6px;
    border-radius: 8px;
    color: rgba(255,255,255,0.7);
  }
  .nav__mobile-toggle:focus-visible { outline: 2px solid #fbbf24; outline-offset: 2px; }

  .hamburger { display: flex; flex-direction: column; gap: 4px; width: 20px; }
  .hamburger span {
    display: block;
    height: 2px;
    background: currentColor;
    border-radius: 2px;
    transition: transform 0.2s, opacity 0.2s;
  }
  .hamburger--open span:nth-child(1) { transform: translateY(6px) rotate(45deg); }
  .hamburger--open span:nth-child(2) { opacity: 0; }
  .hamburger--open span:nth-child(3) { transform: translateY(-6px) rotate(-45deg); }

  /* Menú móvil */
  .nav__mobile {
    background: rgba(10,15,28,0.98);
    border-top: 1px solid rgba(255,255,255,0.08);
    padding: 12px;
    animation: slideDown 0.2s ease;
  }
  @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }

  .nav__mobile-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }

  .nav__mobile-link {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 11px 14px;
    border-radius: 10px;
    text-decoration: none;
    font-size: 0.9rem;
    font-weight: 600;
    color: rgba(255,255,255,0.65);
    transition: background 0.15s, color 0.15s;
    width: 100%;
    background: none;
    border: none;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    text-align: left;
  }
  .nav__mobile-link:hover         { background: rgba(255,255,255,0.06); color: #fff; }
  .nav__mobile-link--active        { background: rgba(251,191,36,0.1); color: #fbbf24; }
  .nav__mobile-link:focus-visible  { outline: 2px solid #fbbf24; outline-offset: 2px; }
  .nav__mobile-logout              { color: rgba(248,113,113,0.8); margin-top: 4px; }
  .nav__mobile-logout:hover        { background: rgba(248,113,113,0.08); color: #f87171; }

  /* Responsive */
  @media (max-width: 768px) {
    .nav__links         { display: none; }
    .nav__mobile-toggle { display: block; }
  }

  @media (max-width: 400px) {
    .nav__brand-text { display: none; }
  }
</style>