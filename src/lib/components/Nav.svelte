<script>
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { theme } from '$lib/stores/ui';
  import { currentUser, authStore } from '$lib/stores/auth';
  import { browser } from '$app/environment';
  import { onMount, onDestroy } from 'svelte';
  import Logo from '$lib/components/Logo.svelte';
  import { Home, BarChart3, Cpu, Wallet, TrendingUp, Trophy, ClipboardList, Sun, Moon, LogOut } from 'lucide-svelte';

  const NAV_LINKS = [
    { href: '/',         label: 'Inicio',      icon: Home },
    { href: '/totales',  label: 'Totales',     icon: BarChart3 },
    { href: '/picks',    label: 'Picks',       icon: Cpu },
    { href: '/bankroll', label: 'Bankroll',    icon: Wallet },
    { href: '/stats',    label: 'Stats',       icon: TrendingUp },
    { href: '/results',  label: 'Resultados',  icon: Trophy },
    { href: '/tracking', label: 'Tracking',    icon: ClipboardList },
  ];

  let scrolled = false;
  let userMenuOpen = false;

  function handleScroll() { scrolled = window.scrollY > 10; }
  function toggleUserMenu() { userMenuOpen = !userMenuOpen; }
  function closeUserMenu() { userMenuOpen = false; }

  function handleKeydown(e) {
    if (e.key === 'Escape' && userMenuOpen) userMenuOpen = false;
  }
  function handleClickOutside(e) {
    if (!e.target.closest('.nav__user')) closeUserMenu();
  }

  onMount(() => {
    if (!browser) return;
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('click', handleClickOutside);
  });
  onDestroy(() => {
    if (!browser) return;
    window.removeEventListener('scroll', handleScroll);
    window.removeEventListener('keydown', handleKeydown);
    window.removeEventListener('click', handleClickOutside);
  });

  async function handleLogout() {
    closeUserMenu();
    await authStore.logout();
    goto('/login');
  }

  $: userName = $currentUser?.displayName ?? $currentUser?.email?.split('@')[0] ?? 'Usuario';
  $: userInitial = (userName[0] ?? 'U').toUpperCase();

  function isActive(href) {
    const path = $page.url.pathname;
    return href === '/' ? path === '/' : path.startsWith(href);
  }
</script>

<a href="#main-content" class="skip-link">Saltar al contenido principal</a>

<nav class="nav" class:nav--scrolled={scrolled} aria-label="Navegación principal">
  <div class="nav__inner">
    <a href="/" class="nav__brand" aria-label="NioSports Pro — Ir al inicio">
      <Logo size={32} showText={true} />
    </a>

    <!-- Desktop nav links - hidden on mobile (BottomNav handles it) -->
    <ul class="nav__links" role="list">
      {#each NAV_LINKS as link}
        {@const active = isActive(link.href)}
        <li role="none">
          <a href={link.href} class="nav__link" class:nav__link--active={active}
             aria-current={active ? 'page' : undefined}>
            <svelte:component this={link.icon} size={16} strokeWidth={2} />
            <span>{link.label}</span>
          </a>
        </li>
      {/each}
    </ul>

    <div class="nav__controls">
      <button class="nav__icon-btn" on:click={theme.toggle}
              aria-label="Cambiar tema">
        {#if $theme === 'dark'}<Sun size={18} />{:else}<Moon size={18} />{/if}
      </button>

      <div class="nav__user">
        <button class="nav__avatar" on:click|stopPropagation={toggleUserMenu}
                aria-expanded={userMenuOpen}>
          {userInitial}
        </button>

        {#if userMenuOpen}
          <div class="nav__user-menu" role="menu">
            <div class="nav__user-info">
              <span class="nav__user-name">{userName}</span>
              {#if $currentUser?.email}
                <span class="nav__user-email">{$currentUser.email}</span>
              {/if}
            </div>
            <hr class="nav__user-divider" />
            <button class="nav__user-item" role="menuitem" on:click={handleLogout}>
              <LogOut size={14} /> Cerrar sesión
            </button>
          </div>
        {/if}
      </div>
    </div>
  </div>
</nav>

<style>
  .skip-link {
    position: absolute; top: -100%; left: 12px; z-index: 99999;
    padding: 8px 16px; background: #6366F1; color: #fff;
    font-weight: 700; font-size: 0.875rem; border-radius: 0 0 8px 8px;
    text-decoration: none; transition: top 0.1s;
  }
  .skip-link:focus { top: 0; }

  .nav {
    background: rgba(10,15,28,0.9);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-bottom: 1px solid rgba(255,255,255,0.06);
    height: 64px;
    transition: box-shadow 0.3s;
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  }
  .nav--scrolled { box-shadow: 0 4px 24px rgba(0,0,0,0.4); }

  .nav__inner {
    max-width: 1200px; margin: 0 auto; height: 100%;
    padding: 0 20px; display: flex; align-items: center; gap: 8px;
  }

  .nav__brand {
    display: flex; align-items: center; text-decoration: none; flex-shrink: 0; margin-right: 12px;
  }
  .nav__brand:focus-visible { outline: 2px solid #6366F1; outline-offset: 3px; border-radius: 6px; }

  /* Desktop links */
  .nav__links {
    display: flex; align-items: center; gap: 2px;
    flex: 1; list-style: none; margin: 0; padding: 0;
  }
  .nav__link {
    display: flex; align-items: center; gap: 6px;
    padding: 7px 12px; border-radius: 8px; text-decoration: none;
    font-size: 0.82rem; font-weight: 600;
    color: rgba(255,255,255,0.55); transition: color 0.15s, background 0.15s; white-space: nowrap;
  }
  .nav__link:hover { color: #fff; background: rgba(255,255,255,0.06); }
  .nav__link--active { color: #6366F1; background: rgba(99,102,241,0.1); }

  /* Controls */
  .nav__controls {
    display: flex; align-items: center; gap: 6px; margin-left: auto; flex-shrink: 0;
  }
  .nav__icon-btn {
    background: none; border: none; cursor: pointer;
    width: 44px; height: 44px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    color: rgba(255,255,255,0.6); transition: background 0.15s, color 0.15s;
  }
  .nav__icon-btn:hover { background: rgba(255,255,255,0.08); color: #fff; }

  /* User menu */
  .nav__user { position: relative; }
  .nav__avatar {
    width: 38px; height: 38px; border-radius: 50%;
    background: linear-gradient(135deg, #6366F1, #4F46E5);
    color: #fff; font-weight: 800; font-size: 0.85rem;
    border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .nav__avatar:hover { transform: scale(1.08); box-shadow: 0 0 0 2px rgba(99,102,241,0.4); }

  .nav__user-menu {
    position: absolute; top: calc(100% + 8px); right: 0;
    min-width: 200px; background: #0f1729;
    border: 1px solid rgba(255,255,255,0.12); border-radius: 12px;
    padding: 8px; box-shadow: 0 16px 40px rgba(0,0,0,0.5); z-index: 1000;
    animation: menuIn 0.15s ease;
  }
  @keyframes menuIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; } }

  .nav__user-info { padding: 8px 10px 6px; }
  .nav__user-name { display: block; font-weight: 700; font-size: 0.875rem; color: #fff; }
  .nav__user-email { display: block; font-size: 0.72rem; color: rgba(255,255,255,0.45); margin-top: 2px; }
  .nav__user-divider { border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 6px 0; }
  .nav__user-item {
    display: flex; align-items: center; gap: 8px; width: 100%;
    padding: 10px; background: none; border: none; border-radius: 8px;
    color: rgba(255,255,255,0.7); font-size: 0.82rem; font-weight: 600;
    cursor: pointer; font-family: 'DM Sans', sans-serif;
    transition: background 0.15s;
  }
  .nav__user-item:hover { background: rgba(255,255,255,0.07); color: #fff; }

  /* Hide desktop links on mobile — BottomNav handles navigation */
  @media (max-width: 768px) {
    .nav__links { display: none; }
  }
  @media (max-width: 400px) {
    :global(.logo__text) { display: none; }
  }
</style>