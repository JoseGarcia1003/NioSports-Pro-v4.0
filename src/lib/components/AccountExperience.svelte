<script>
  import ArrowUpRight from 'lucide-svelte/icons/arrow-up-right';
  import ArrowRight from 'lucide-svelte/icons/arrow-right';
  import Wallet from 'lucide-svelte/icons/wallet';
  import ChartNoAxesCombined from 'lucide-svelte/icons/chart-no-axes-combined';
  import History from 'lucide-svelte/icons/history';
  import ShieldCheck from 'lucide-svelte/icons/shield-check';
  import Sun from 'lucide-svelte/icons/sun';
  import Moon from 'lucide-svelte/icons/moon';
  import Check from 'lucide-svelte/icons/check';
  import ChevronRight from 'lucide-svelte/icons/chevron-right';
  import UserRound from 'lucide-svelte/icons/user-round';
  import CircleHelp from 'lucide-svelte/icons/circle-help';
  import Fingerprint from 'lucide-svelte/icons/fingerprint';
  import { currentUser, isAuthenticated } from '$lib/stores/auth.js';
  import { subscription } from '$lib/stores/subscription.js';
  import { theme } from '$lib/stores/ui.js';
  import { planLabel } from '$lib/product/navigation.js';
  import { authenticatedFetch } from '$lib/services/authenticated-fetch.js';
  import '$lib/styles/account.css';
  let busy = false, failure = '';
  $: firstName = $currentUser?.displayName?.trim().split(/\s+/)[0];
  $: accessLabel = $isAuthenticated ? planLabel($subscription) : 'Modo visitante';
  const tools = [
    { title: 'Mis estadísticas', description: 'La perspectiva de tu propio historial.', href: '/stats', icon: ChartNoAxesCombined, tag: 'RENDIMIENTO' },
    { title: 'Resultados', description: 'Vuelve a tus selecciones resueltas.', href: '/results', icon: History, tag: 'SEGUIMIENTO' },
    { title: 'Validación del modelo', description: 'Pronósticos y resultados bajo revisión.', href: '/tracking', icon: ShieldCheck, tag: 'TRANSPARENCIA' }
  ];
  async function portal() {
    if (busy) return;
    busy = true; failure = '';
    try {
      const res = await authenticatedFetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'No se pudo abrir la gestión de suscripción.');
      window.location.href = data.url;
    } catch (e) { failure = e.message; }
    finally { busy = false; }
  }
</script>

<svelte:head><title>Tu espacio · NioSports Pro</title><meta name="description" content="Tu espacio de análisis deportivo: acceso, seguimiento, bankroll y preferencias en NioSports Pro." /></svelte:head>
<div class="account-stage"><div class="account-shell">
  <div class="page-context"><span>MI CUENTA <ChevronRight size={13} /> Tu espacio</span><span class="context-note">Análisis. Criterio. Control.</span></div>
  <header class="account-hero">
    <img class="hero-photo" src="/images/court-night.jpg" alt="" width="1536" height="1024" fetchpriority="high" />
    <div class="hero-shade"></div>
    <div class="hero-content"><span class="account-eyebrow hero-eyebrow"><i></i> NIOSPORTS / TU ESPACIO PERSONAL</span>
      <h1>{#if firstName}Hola, {firstName}.<br /><span>Vuelve a tu juego.</span>{:else}Cada decisión,<br /><span>con perspectiva.</span>{/if}</h1>
      <p>Analiza el partido. Entiende el riesgo.<br /> Lleva el control de tu capital, desde un solo lugar.</p>
      <div class="hero-actions"><a class="account-button button-ivory" href="/predictions">Explorar pronósticos <ArrowUpRight size={18} /></a><a class="hero-secondary" href="/methodology">Conoce el método <ArrowRight size={16} /></a></div>
    </div>
    <div class="hero-signature" aria-hidden="true"><span>LA PASIÓN ES TUYA.</span><strong>El criterio, también.</strong><i></i></div>
    <div class="hero-bottom"><span>NBA <i></i> TENIS</span><span>Una mirada más allá del marcador <ArrowUpRight size={14} /></span></div>
  </header>
  <div class="workspace-grid"><div class="workspace-main">
    <div class="account-section-title"><div><span class="account-eyebrow">VISTA GENERAL</span><h2>Tu centro de control</h2></div><span class="section-caption">Todo en su sitio.</span></div>
    <section class="account-bank" aria-labelledby="bank-title"><div class="bank-copy"><span class="account-icon"><Wallet size={23} strokeWidth={1.6} /></span><h3 id="bank-title">Tu capital.<br />Tus decisiones.</h3><p>Registra movimientos, revisa la exposición y entiende cómo evoluciona tu bankroll.</p><a class="account-link" href="/bankroll">Abrir mi bankroll <ArrowUpRight size={18} /></a></div>
      <div class="capital-map" aria-label="El bankroll separa capital, disponible y reservado"><div class="map-top"><span>ASÍ SE ORGANIZA TU CAPITAL</span><span>N / B</span></div><div class="capital-orbit" aria-hidden="true"><div><Wallet size={27} strokeWidth={1.3} /></div><i></i></div><div class="map-labels"><span><i></i>Disponible</span><span><i></i>Reservado</span></div><p>Una vista clara de cada movimiento.</p></div>
    </section>
    <div class="account-tools">{#each tools as tool}<a class="account-tool" href={tool.href}><div class="tool-top"><svelte:component this={tool.icon} size={22} strokeWidth={1.6} /><ArrowUpRight size={17} /></div><span class="account-eyebrow">{tool.tag}</span><h3>{tool.title}</h3><p>{tool.description}</p></a>{/each}</div>
    <section class="account-sports" aria-labelledby="sport-title"><div class="account-section-title"><h2 id="sport-title">Vuelve a la cancha</h2><a class="account-link" href="/sports">Ver deportes <ArrowRight size={15} /></a></div><div class="sport-links"><a class="sport-tile" href="/tennis"><span class="sport-art tennis-art" aria-hidden="true"></span><div><span class="account-eyebrow">EL DETALLE CAMBIA EL PARTIDO</span><h3>Tenis</h3><p>Jugadores, superficies y enfrentamientos.</p></div><ArrowUpRight size={22} /></a><a class="sport-tile" href="/sports/nba"><span class="sport-art nba-art" aria-hidden="true"></span><div><span class="account-eyebrow">OTRA LECTURA DEL JUEGO</span><h3>NBA</h3><p>Partidos, equipos y contexto.</p></div><ArrowUpRight size={22} /></a></div></section>
  </div><aside class="workspace-aside" aria-label="Acceso y preferencias">
    <section class="membership-card"><div class="membership-top"><span class="account-eyebrow">TU ACCESO</span><span class="access-badge">{accessLabel}</span></div><div class="member-symbol" aria-hidden="true"><Fingerprint size={32} strokeWidth={1.2} /></div><h2>{$isAuthenticated ? 'Un espacio a tu medida.' : 'El siguiente paso es tuyo.'}</h2><p>{$isAuthenticated ? 'Tu cuenta reúne el acceso a tus herramientas y a la gestión de tu suscripción.' : 'Entra a tu cuenta para guardar tu actividad y construir tu propio historial.'}</p>{#if $currentUser?.email}<span class="member-email">{$currentUser.email}</span>{/if}<div class="membership-benefits"><span><Check size={15} /> Tu registro personal de bankroll</span><span><Check size={15} /> Seguimiento de tus decisiones</span></div>
      {#if !$isAuthenticated}<a class="account-button button-lime" href="/login">Entrar o crear cuenta <ArrowRight size={17} /></a>{:else if ['pro', 'elite'].includes($subscription.plan)}<button class="account-button button-lime" disabled={busy} on:click={portal}>{busy ? 'Abriendo…' : 'Gestionar suscripción'}<ArrowUpRight size={17} /></button>{:else}<a class="account-button button-lime" href="/pricing">Conocer Premium <ArrowUpRight size={17} /></a>{/if}<a class="membership-link" href="/pricing">Comparar todos los planes <ChevronRight size={14} /></a>{#if failure}<p class="portal-error" role="alert">{failure}</p>{/if}<div class="member-footer"><UserRound size={13} /><span>{$isAuthenticated ? 'Acceso asociado a tu cuenta' : 'Explora antes de registrarte'}</span></div>
    </section>
    <section class="preference-card"><div class="preference-title"><Sun size={18} /><div><h3>Tu forma de verlo</h3><p>Elige el ambiente de tu espacio.</p></div></div><div class="theme-choices" role="group" aria-label="Apariencia"><button class:chosen={$theme === 'light'} aria-pressed={$theme === 'light'} on:click={() => theme.set('light')}><Sun size={16} /> Claro {#if $theme === 'light'}<Check size={14} />{/if}</button><button class:chosen={$theme === 'dark'} aria-pressed={$theme === 'dark'} on:click={() => theme.set('dark')}><Moon size={16} /> Oscuro {#if $theme === 'dark'}<Check size={14} />{/if}</button></div></section>
    <details class="account-help"><summary><CircleHelp size={19} /><span>¿Por dónde empiezo?</span><ChevronRight size={16} /></summary><ol><li>Elige un deporte y abre un partido.</li><li>Revisa las fuentes, el contexto y las limitaciones del análisis.</li><li>Registra tus decisiones en Bankroll para seguir tu actividad.</li></ol><a class="account-link" href="/methodology">Leer la metodología <ArrowUpRight size={15} /></a></details>
  </aside></div>
  <footer class="account-footer"><span>NIOSPORTS <strong>PRO</strong><small>El deporte, con perspectiva.</small></span><div><a href="/methodology">Metodología</a><a href="/legal/privacy">Privacidad</a><a href="/legal/responsible-gambling">Juego responsable</a></div></footer>
</div></div>
