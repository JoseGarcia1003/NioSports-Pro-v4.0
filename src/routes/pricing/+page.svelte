<script>
  import { authenticatedFetch } from '$lib/services/authenticated-fetch.js';
  import { page } from '$app/stores';
  import { userId } from '$lib/stores/auth';
  import { subscription } from '$lib/stores/subscription';
  import { toasts } from '$lib/stores/ui';
  import { Check, Clock, ArrowUpRight } from 'lucide-svelte';

  // Open beta: everything that exists is free with an account. Paid plans stay
  // closed (the checkout endpoint refuses too) until the conditions below are met.
  let loading = false;

  $: returned = $page?.url?.searchParams?.get('success') === 'true';
  $: paidPlan = $userId && ['active', 'trialing', 'past_due'].includes($subscription.status) && $subscription.plan !== 'free' ? $subscription.plan : null;

  const included = [
    ['Props de jugadores NBA', 'L5, L10, L20 y temporada; local o visitante; con y sin un compañero; defensa del rival.'],
    ['Props de equipo y totales', 'Puntos de cada equipo y total del partido frente a la línea real de las casas.'],
    ['Señales del día', 'Selladas antes del partido y liquidadas con el box score oficial, en un historial que no se edita.'],
    ['Bankroll personal', 'Capital disponible, comprometido y beneficio separados.'],
    ['Calendario NBA y tenis', 'Con fuente y hora de cada dato; el tenis, según cobertura.']
  ];

  const conditions = [
    'Datos actualizados automáticamente cada día',
    'Historial de señales con una muestra suficiente para medir acierto',
    'Pagos probados de principio a fin',
    'Revisión legal del servicio en Ecuador'
  ];

  async function manage() {
    if (!$userId || loading) return;
    loading = true;
    try {
      const res = await authenticatedFetch('/api/stripe/portal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: $userId }) });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else toasts.error('No se pudo abrir la gestión de tu suscripción.');
    } catch { toasts.error('Error de conexión.'); }
    finally { loading = false; }
  }
</script>

<svelte:head><title>Planes · NioSports Pro</title></svelte:head>

<div class="page">
  <header class="head">
    <p class="eyebrow">Planes · Beta abierta</p>
    <h1>Gratis mientras lo construimos.</h1>
    <p class="lead">Durante la beta, todo lo que ya funciona es gratuito con tu cuenta. No cobraremos hasta que los datos, los pagos y la revisión legal estén validados.</p>
  </header>

  {#if paidPlan}
    <div class="banner" role="status">
      <p>Tienes una suscripción {paidPlan === 'elite' ? 'Elite' : 'Pro'} activa. Durante la beta no hay funciones exclusivas de pago; puedes revisarla o cancelarla cuando quieras.</p>
      <button type="button" on:click={manage} disabled={loading}>{loading ? 'Abriendo…' : 'Gestionar suscripción'}</button>
    </div>
  {:else if returned}
    <div class="banner" role="status"><p>Has vuelto del proceso de pago. El acceso se actualiza cuando el servidor confirma la suscripción.</p></div>
  {/if}

  <div class="grid">
    <section class="card main" aria-labelledby="beta-title">
      <div class="card-head">
        <h2 id="beta-title">Beta gratuita</h2>
        <span class="price">$0</span>
      </div>
      <p class="note">Incluye todo lo disponible hoy:</p>
      <ul class="list">
        {#each included as [title, text]}
          <li><Check size={16} aria-hidden="true" /><span><b>{title}.</b> {text}</span></li>
        {/each}
      </ul>
      {#if $userId}
        <a class="cta" href="/sports/nba/props">Ir a las props del día <ArrowUpRight size={16} aria-hidden="true" /></a>
      {:else}
        <a class="cta" href="/login?modo=registro">Crear cuenta gratis <ArrowUpRight size={16} aria-hidden="true" /></a>
      {/if}
    </section>

    <section class="card" aria-labelledby="paid-title">
      <div class="card-head">
        <h2 id="paid-title">Planes de pago</h2>
        <span class="soon">Próximamente</span>
      </div>
      <p class="note">Se abrirán solo cuando se cumpla todo esto:</p>
      <ul class="list pending">
        {#each conditions as text}
          <li><Clock size={16} aria-hidden="true" /><span>{text}</span></li>
        {/each}
      </ul>
      <p class="fine">No anunciamos precios ni funciones de pago antes de que existan. Cuando se abran, cada función indicará qué incluye y con qué datos.</p>
    </section>
  </div>

  <p class="footer-note">El bankroll es un registro personal: NioSports no custodia dinero ni envía apuestas. Juega con responsabilidad. <a href="/legal/responsible-gambling">Juego responsable</a></p>
</div>

<style>
  .page { max-width: 1000px; margin: 0 auto; padding: 40px 24px 96px; color: var(--nio-ink); }
  .head { text-align: center; margin-bottom: 36px; }
  .eyebrow { font-size: 12px; font-weight: 700; color: var(--nio-accent); text-transform: uppercase; letter-spacing: .15em; margin: 0; }
  h1 { font-family: var(--font-display); text-transform: uppercase; font-size: clamp(2.6rem, 5.4vw, 4.2rem); line-height: .98; font-weight: 800; margin: 12px 0 14px; }
  .lead { color: var(--nio-muted); max-width: 640px; margin: 0 auto; line-height: 1.6; }
  .banner { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 18px; border-radius: 12px; margin-bottom: 24px; background: var(--nio-gold-soft); border: 1px solid var(--nio-gold-border); font-size: 14px; }
  .banner p { margin: 0; flex: 1 1 320px; line-height: 1.5; }
  .banner button { min-height: var(--tap, 44px); padding: 0 16px; border-radius: 10px; border: 0; background: var(--nio-action); color: var(--nio-action-ink); font: inherit; font-weight: 700; cursor: pointer; }
  .grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 20px; }
  .card { background: var(--nio-surface); border: 1px solid var(--nio-border); border-radius: 20px; padding: 28px 24px; display: flex; flex-direction: column; gap: 14px; }
  .card.main { border-color: var(--nio-gold-border); background: linear-gradient(180deg, var(--nio-gold-soft), var(--nio-surface) 45%); }
  .card-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
  h2 { font-family: var(--font-display); text-transform: uppercase; font-size: 28px; font-weight: 800; margin: 0; }
  .price { font-family: var(--font-display); font-size: 44px; font-weight: 800; line-height: 1; }
  .soon { font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 999px; border: 1px solid var(--nio-border); color: var(--nio-muted); }
  .note { margin: 0; color: var(--nio-muted); font-size: 14px; }
  .list { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; flex: 1; align-content: start; }
  .list li { display: grid; grid-template-columns: 18px 1fr; gap: 10px; font-size: 14px; line-height: 1.5; color: var(--nio-muted); }
  .list li b { color: var(--nio-ink); }
  .list :global(svg) { margin-top: 3px; color: var(--nio-accent); }
  .list.pending :global(svg) { color: var(--nio-muted); }
  .cta { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 48px; border-radius: 12px; background: var(--nio-action); color: var(--nio-action-ink); font-weight: 700; text-decoration: none; }
  .cta:focus-visible, .banner button:focus-visible, .footer-note a:focus-visible { outline: 2px solid var(--nio-accent); outline-offset: 3px; }
  .fine { margin: 0; font-size: 13px; color: var(--nio-muted); line-height: 1.55; }
  .footer-note { text-align: center; margin: 28px 0 0; font-size: 13px; color: var(--nio-muted); }
  .footer-note a { color: var(--nio-accent); }
  @media (max-width: 768px) { .page { padding: 24px 16px 96px; } .grid { grid-template-columns: 1fr; } }
</style>
