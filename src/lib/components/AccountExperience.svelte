<script>
  import { goto } from '$app/navigation';
  import { ArrowUpRight, Sun, Moon, Check, LogOut } from 'lucide-svelte';
  import { currentUser, isAuthenticated, authLoading } from '$lib/stores/auth.js';
  import { subscription } from '$lib/stores/subscription.js';
  import { theme } from '$lib/stores/ui.js';
  import { planLabel } from '$lib/product/navigation.js';
  import { authenticatedFetch } from '$lib/services/authenticated-fetch.js';
  import OpsHealth from './OpsHealth.svelte';

  // A real account page: who you are, what you have, your preferences, shortcuts.
  let busy = false, failure = '', leaving = false;
  $: firstName = $currentUser?.displayName?.trim().split(/\s+/)[0];
  $: paid = ['pro', 'elite'].includes($subscription.plan) && ['active', 'trialing', 'past_due'].includes($subscription.status);

  const shortcuts = [
    { href: '/sports/nba/props', title: 'Props de jugadores', text: 'Cada jugador de hoy frente a la línea.' },
    { href: '/sports/nba/puntos', title: 'Mercado de puntos', text: 'Equipos y total del partido.' },
    { href: '/predictions', title: 'Señales e historial', text: 'Selladas antes del partido y su resultado.' },
    { href: '/bankroll', title: 'Mi bankroll', text: 'Capital, tickets y movimientos.' }
  ];

  async function portal() {
    if (busy) return;
    busy = true; failure = '';
    try {
      const res = await authenticatedFetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'No se pudo abrir la gestión de la suscripción.');
      window.location.href = data.url;
    } catch (e) { failure = e.message; }
    finally { busy = false; }
  }

  async function signOut() {
    if (leaving) return;
    leaving = true;
    try { const { logout } = await import('$lib/firebase'); await logout(); goto('/'); }
    finally { leaving = false; }
  }
</script>

<svelte:head><title>Cuenta · NioSports Pro</title><meta name="description" content="Tu cuenta de NioSports Pro: perfil, plan, preferencias y accesos." /></svelte:head>

<div class="account">
  <header class="head">
    <p class="eyebrow">Cuenta</p>
    <h1>{firstName ? `Hola, ${firstName}` : 'Tu cuenta'}</h1>
    <p class="lead">Tu perfil, tu plan y tus preferencias, en un solo lugar.</p>
  </header>

  <div class="grid">
    <section class="card" aria-labelledby="profile-title">
      <h2 id="profile-title">Perfil</h2>
      {#if $isAuthenticated}
        <dl>
          <div><dt>Correo</dt><dd>{$currentUser?.email ?? '—'}</dd></div>
          {#if $currentUser?.displayName}<div><dt>Nombre</dt><dd>{$currentUser.displayName}</dd></div>{/if}
        </dl>
        <button type="button" class="ghost" on:click={signOut} disabled={leaving}><LogOut size={16} aria-hidden="true" /> {leaving ? 'Cerrando…' : 'Cerrar sesión'}</button>
      {:else if $authLoading}
        <p class="muted" role="status">Comprobando tu sesión…</p>
      {:else}
        <p class="muted">No has iniciado sesión.</p>
        <a class="primary" href="/login">Entrar o crear cuenta <ArrowUpRight size={16} aria-hidden="true" /></a>
      {/if}
    </section>

    <section class="card" aria-labelledby="plan-title">
      <h2 id="plan-title">Plan</h2>
      <p class="plan"><span>{$isAuthenticated ? planLabel($subscription) : 'Beta gratuita'}</span></p>
      {#if paid}
        <p class="muted">Durante la beta no hay funciones exclusivas de pago. Puedes revisar o cancelar tu suscripción.</p>
        <button type="button" class="ghost" disabled={busy} on:click={portal}>{busy ? 'Abriendo…' : 'Gestionar suscripción'}</button>
        {#if failure}<p class="error" role="alert">{failure}</p>{/if}
      {:else}
        <p class="muted">Todo lo que ya funciona está incluido. Los planes de pago se abrirán cuando los datos, los pagos y la revisión legal estén validados.</p>
        <a class="link" href="/pricing">Ver planes <ArrowUpRight size={14} aria-hidden="true" /></a>
      {/if}
    </section>

    <section class="card" aria-labelledby="pref-title">
      <h2 id="pref-title">Preferencias</h2>
      <p class="muted">Apariencia de la aplicación en este dispositivo.</p>
      <div class="themes" role="group" aria-label="Apariencia">
        <button type="button" class:chosen={$theme === 'dark'} aria-pressed={$theme === 'dark'} on:click={() => theme.set('dark')}><Moon size={16} aria-hidden="true" /> Oscuro {#if $theme === 'dark'}<Check size={14} aria-hidden="true" />{/if}</button>
        <button type="button" class:chosen={$theme === 'light'} aria-pressed={$theme === 'light'} on:click={() => theme.set('light')}><Sun size={16} aria-hidden="true" /> Claro {#if $theme === 'light'}<Check size={14} aria-hidden="true" />{/if}</button>
      </div>
    </section>
  </div>

  <section class="shortcuts" aria-labelledby="short-title">
    <h2 id="short-title">Accesos directos</h2>
    <div class="links">
      {#each shortcuts as s}
        <a href={s.href}><strong>{s.title}</strong><span>{s.text}</span><ArrowUpRight size={16} aria-hidden="true" /></a>
      {/each}
    </div>
  </section>

  <details class="help">
    <summary>¿Por dónde empiezo?</summary>
    <ol>
      <li>Abre <a href="/sports/nba">NBA → Partidos</a> y elige un partido.</li>
      <li>Consulta sus <a href="/sports/nba/props">props de jugadores</a> o el <a href="/sports/nba/puntos">mercado de puntos</a>: cada cifra indica su fuente.</li>
      <li>Revisa las <a href="/predictions">señales del día</a> y registra tus decisiones en <a href="/bankroll">Bankroll</a>.</li>
    </ol>
  </details>

  {#if $isAuthenticated}<OpsHealth />{/if}

  <footer class="foot">
    <a href="/methodology">Metodología</a><a href="/legal/terms">Términos</a><a href="/legal/privacy">Privacidad</a><a href="/legal/responsible-gambling">Juego responsable</a>
  </footer>
</div>

<style>
  .account { max-width: 1100px; margin: 0 auto; padding: 32px 24px 100px; color: var(--nio-ink); }
  .eyebrow { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; font-weight: 600; color: var(--nio-muted); margin: 0 0 8px; }
  h1 { font-family: var(--font-display); text-transform: uppercase; font-weight: 800; font-size: clamp(34px, 4.2vw, 52px); line-height: .95; margin: 0 0 10px; }
  .lead { color: var(--nio-muted); margin: 0 0 24px; line-height: 1.6; }
  h2 { font-family: var(--font-display); text-transform: uppercase; font-size: 20px; letter-spacing: .02em; margin: 0 0 12px; }
  .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
  .card { border: 1px solid var(--nio-border); border-radius: 16px; background: var(--nio-surface); padding: 20px; display: flex; flex-direction: column; gap: 12px; align-items: flex-start; }
  dl { margin: 0; display: grid; gap: 10px; width: 100%; }
  dt { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: var(--nio-muted); font-weight: 600; }
  dd { margin: 2px 0 0; font-size: 15px; overflow-wrap: anywhere; }
  .muted { margin: 0; color: var(--nio-muted); font-size: 14px; line-height: 1.55; }
  .plan span { display: inline-block; padding: 5px 12px; border-radius: 999px; background: var(--nio-gold-soft); border: 1px solid var(--nio-gold-border); color: var(--nio-accent); font-weight: 700; font-size: 13px; }
  .plan { margin: 0; }
  .primary, .ghost, .themes button { display: inline-flex; align-items: center; gap: 8px; min-height: var(--tap, 44px); padding: 0 16px; border-radius: 10px; font: inherit; font-weight: 700; font-size: 14px; cursor: pointer; text-decoration: none; }
  .primary { background: var(--nio-action); color: var(--nio-action-ink); border: 0; }
  .ghost { background: var(--nio-raised); color: var(--nio-ink); border: 1px solid var(--nio-border); margin-top: auto; }
  .ghost:disabled { opacity: .6; cursor: default; }
  .link { display: inline-flex; align-items: center; gap: 6px; color: var(--nio-accent); font-weight: 700; font-size: 14px; text-decoration: none; margin-top: auto; }
  .error { margin: 0; color: var(--nio-miss); font-size: 13px; }
  .themes { display: flex; gap: 8px; flex-wrap: wrap; }
  .themes button { background: var(--nio-raised); color: var(--nio-muted); border: 1px solid var(--nio-border); }
  .themes button.chosen { background: var(--nio-action); color: var(--nio-action-ink); border-color: transparent; }
  .shortcuts { margin-top: 28px; }
  .links { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
  .links a { position: relative; display: grid; gap: 4px; padding: 16px 40px 16px 16px; border: 1px solid var(--nio-border); border-radius: 14px; background: var(--nio-surface); color: var(--nio-ink); text-decoration: none; }
  .links a:hover { border-color: var(--nio-gold-border); }
  .links strong { font-size: 15px; }
  .links span { font-size: 13px; color: var(--nio-muted); line-height: 1.45; }
  .links a > :global(svg) { position: absolute; right: 14px; top: 16px; color: var(--nio-accent); }
  .help { margin-top: 24px; border: 1px solid var(--nio-border); border-radius: 14px; background: var(--nio-surface); padding: 14px 18px; }
  .help summary { cursor: pointer; font-weight: 700; min-height: var(--tap, 44px); display: flex; align-items: center; }
  .help ol { margin: 12px 0 4px; padding-left: 20px; color: var(--nio-muted); line-height: 1.8; font-size: 14px; }
  .help a, .foot a { color: var(--nio-accent); }
  .foot { display: flex; flex-wrap: wrap; gap: 8px 20px; margin-top: 28px; padding-top: 18px; border-top: 1px solid var(--nio-border); font-size: 13px; }
  a:focus-visible, button:focus-visible, summary:focus-visible { outline: 2px solid var(--nio-accent); outline-offset: 3px; }
  @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } .links { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 560px) { .account { padding: 24px 16px 100px; } .links { grid-template-columns: 1fr; } }
</style>
