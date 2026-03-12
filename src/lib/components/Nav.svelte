<!-- src/lib/components/Nav.svelte -->
<!--
  REEMPLAZA: el bloque <nav class="nav-revolution"> de index.html
             y la función window.navigateTo() de events.js
  
  En SvelteKit la navegación funciona con <a href="..."> estándar.
  El router intercepta esos clicks y hace la transición sin recargar
  la página (SPA navigation), pero la URL cambia normalmente.
  
  Para saber qué ruta está activa usamos $page.url.pathname que
  SvelteKit actualiza automáticamente en cada navegación.
-->

<script>
  import { page }        from '$app/stores';
  import { goto }        from '$app/navigation';
  import { authStore,
           isAuthenticated } from '$lib/stores/auth';
  import { theme,
           mobileNavOpen }   from '$lib/stores/ui';
  import { logout }          from '$lib/firebase';

  // Links de navegación — definidos como datos, no como HTML hardcodeado
  // Añadir una nueva sección = añadir un objeto aquí. Solo eso.
  const NAV_LINKS = [
    { href: '/',         label: 'Inicio',   icon: '🏠' },
    { href: '/totales',  label: 'Totales',  icon: '📊' },
    { href: '/picks',    label: 'Picks IA', icon: '🤖' },
    { href: '/bankroll', label: 'Bankroll', icon: '💰' },
    { href: '/stats',    label: 'Stats',    icon: '📈' },
    { href: '/tracking', label: 'Tracking', icon: '📋' },
  ];

  // Efecto de scroll — el navbar se hace más compacto al hacer scroll
  let scrolled = false;
  function handleScroll() {
    scrolled = window.scrollY > 20;
  }

  // Logout con confirmación
  async function handleLogout() {
    try {
      await logout();
      goto('/login');
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    }
  }

  // Cerrar el menú móvil al navegar
  $: if ($page.url.pathname) {
    mobileNavOpen.set(false);
  }
</script>

<svelte:window on:scroll={handleScroll} />
<!--
  svelte:window es un elemento especial de Svelte para añadir
  event listeners al objeto window. Svelte los limpia automáticamente
  cuando el componente se destruye — sin removeEventListener manual.
-->

<nav
  class="nav"
  class:nav--scrolled={scrolled}
  aria-label="Navegación principal"
>
  <div class="nav__inner">
    <!-- Brand / Logo -->
    <a href="/" class="nav__brand" aria-label="NioSports Pro — Ir al inicio">
      <img src="/icons/icon-192.png" alt="NioSports" class="nav__logo" />
      <div class="nav__brand-text">
        <span class="nav__brand-name">NioSports</span>
        <span class="nav__brand-tag">PRO</span>
      </div>
    </a>

    <!-- Links de navegación — generados desde el array NAV_LINKS -->
    <!--
      {#each} en Svelte es el equivalente de .map() en JSX.
      La diferencia: Svelte hace diff del DOM y solo actualiza
      los nodos que cambiaron, sin re-renderizar la lista entera.
      
      La clase 'nav__link--active' se añade solo cuando la ruta
      activa coincide con el href del link. $page.url.pathname
      es reactivo — se actualiza en cada navegación.
      
      aria-current="page" es el atributo de accesibilidad correcto
      para indicar la página actual — lectores de pantalla lo anuncian.
    -->
    <ul class="nav__links" role="list">
      {#each NAV_LINKS as link}
        <li>
          <a
            href={link.href}
            class="nav__link"
            class:nav__link--active={$page.url.pathname === link.href}
            aria-current={$page.url.pathname === link.href ? 'page' : undefined}
          >
            {link.label}
          </a>
        </li>
      {/each}
    </ul>

    <!-- Controles de la derecha -->
    <div class="nav__controls">
      <!-- Toggle de tema -->
      <button
        class="nav__theme-btn"
        on:click={theme.toggle}
        aria-label={$theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
        title="Cambiar tema"
      >
        {$theme === 'dark' ? '🌙' : '☀️'}
      </button>

      <!-- Botón de usuario / logout -->
      {#if $isAuthenticated}
        <button class="nav__cta" on:click={handleLogout}>
          Salir
        </button>
      {:else}
        <a href="/login" class="nav__cta">
          Entrar
        </a>
      {/if}

      <!-- Hamburguesa para móvil -->
      <button
        class="nav__mobile-toggle"
        on:click={() => mobileNavOpen.update(v => !v)}
        aria-label={$mobileNavOpen ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={$mobileNavOpen}
      >
        {$mobileNavOpen ? '✕' : '☰'}
      </button>
    </div>
  </div>

  <!-- Menú móvil expandible -->
  {#if $mobileNavOpen}
    <ul class="nav__mobile-menu" role="list">
      {#each NAV_LINKS as link}
        <li>
          <a
            href={link.href}
            class="nav__mobile-link"
            class:nav__mobile-link--active={$page.url.pathname === link.href}
            aria-current={$page.url.pathname === link.href ? 'page' : undefined}
          >
            <span>{link.icon}</span>
            <span>{link.label}</span>
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</nav>

<style>
  .nav {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    background: rgba(10, 15, 28, 0.85);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(255, 215, 0, 0.1);
    transition: all 0.3s ease;
  }

  .nav--scrolled {
    background: rgba(10, 15, 28, 0.98);
    border-bottom-color: rgba(255, 215, 0, 0.3);
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
  }

  .nav__inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 0 20px;
    height: 64px;
    max-width: 1400px;
    margin: 0 auto;
  }

  .nav__brand {
    display: flex;
    align-items: center;
    gap: 10px;
    text-decoration: none;
  }

  .nav__logo {
    width: 36px;
    height: 36px;
    border-radius: 8px;
  }

  .nav__brand-name {
    font-family: 'Orbitron', sans-serif;
    font-weight: 700;
    font-size: 1.1rem;
    color: #fbbf24;
  }

  .nav__brand-tag {
    font-size: 0.6rem;
    background: linear-gradient(135deg, #fbbf24, #f59e0b);
    color: #000;
    padding: 1px 5px;
    border-radius: 4px;
    font-weight: 900;
    letter-spacing: 1px;
  }

  .nav__links {
    display: flex;
    align-items: center;
    gap: 4px;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .nav__link {
    display: block;
    padding: 6px 14px;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 500;
    color: rgba(255,255,255,0.7);
    text-decoration: none;
    transition: all 0.2s;
  }

  .nav__link:hover,
  .nav__link--active {
    color: #fbbf24;
    background: rgba(251,191,36,0.1);
  }

  .nav__controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .nav__theme-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 18px;
    padding: 6px;
    border-radius: 8px;
    transition: background 0.2s;
  }

  .nav__theme-btn:hover {
    background: rgba(255,255,255,0.1);
  }

  .nav__cta {
    padding: 7px 16px;
    border-radius: 8px;
    background: linear-gradient(135deg, #fbbf24, #f59e0b);
    color: #000;
    font-weight: 700;
    font-size: 0.85rem;
    text-decoration: none;
    border: none;
    cursor: pointer;
    transition: opacity 0.2s;
  }

  .nav__cta:hover { opacity: 0.85; }

  .nav__mobile-toggle {
    display: none;
    background: none;
    border: none;
    cursor: pointer;
    color: #fff;
    font-size: 20px;
    padding: 4px 8px;
  }

  .nav__mobile-menu {
    list-style: none;
    margin: 0;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    border-top: 1px solid rgba(255,255,255,0.1);
  }

  .nav__mobile-link {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 10px;
    text-decoration: none;
    color: rgba(255,255,255,0.8);
    font-size: 1rem;
    transition: all 0.2s;
  }

  .nav__mobile-link:hover,
  .nav__mobile-link--active {
    background: rgba(251,191,36,0.15);
    color: #fbbf24;
  }

  @media (max-width: 768px) {
    .nav__links        { display: none; }
    .nav__mobile-toggle { display: block; }
  }
</style>
