<!-- src/routes/picks/+page.svelte -->
<!--
  REEMPLAZA: renderMisPicks() y renderBestPicks() en renders.js

  Este archivo es la demostración más concreta del valor de la migración:
  en renders.js, los picks se renderizan con innerHTML y onclick="...".
  Aquí se renderizan con {#each} y on:click — sin un solo string evaluado
  como código, sin DOMPurify explícito, sin 'unsafe-inline' necesario.
-->
<script>
  import { onMount, onDestroy } from 'svelte';
  import { userId }             from '$lib/stores/auth';
  import { picksStore,
           picksTotales }       from '$lib/stores/data';
  import { toasts }             from '$lib/stores/ui';
  import PickCard               from '$lib/components/PickCard.svelte';
  import { dbRead, dbWrite,
           dbRemove, dbSubscribe,
           userPath }           from '$lib/firebase';

  let loading    = true;
  let activeTab  = 'totales'; // 'totales' | 'ai' | 'tracking'
  let cleanupFn  = null;      // Función para cancelar la suscripción RTDB

  onMount(async () => {
    if (!$userId) return;

    // Suscribirse a los picks en tiempo real
    // Cuando cambian en Firebase (desde otro dispositivo o esta sesión),
    // el store se actualiza automáticamente y los componentes se re-renderizan.
    cleanupFn = dbSubscribe(
      userPath($userId, 'picks', 'totales'),
      (data) => {
        picksStore.setByType('totales', data ?? {});
        loading = false;
      }
    );
  });

  // onDestroy es el equivalente de componentWillUnmount de React.
  // Svelte lo llama automáticamente cuando el usuario navega a otra ruta.
  // Cancelar la suscripción aquí evita leaks de memoria y listeners huérfanos.
  onDestroy(() => {
    cleanupFn?.();
  });

  async function handleDelete(event) {
    const pickId = event.detail;
    if (!$userId) return;
    try {
      await dbRemove(userPath($userId, 'picks', 'totales', pickId));
      toasts.success('Pick eliminado.');
    } catch {
      toasts.error('No se pudo eliminar el pick.');
    }
  }

  async function handleResult(event) {
    const { id, result } = event.detail;
    if (!$userId) return;
    try {
      await dbWrite(
        userPath($userId, 'picks', 'totales', id, 'status'),
        result
      );
      toasts.success(`Pick marcado como ${result === 'win' ? '✅ ganado' : result === 'loss' ? '❌ perdido' : '↔️ push'}.`);
    } catch {
      toasts.error('No se pudo actualizar el resultado.');
    }
  }

  // Estadísticas derivadas — se recalculan reactivamente cada vez que
  // $picksTotales cambia, sin ningún listener manual.
  $: picks      = $picksTotales;
  $: total      = picks.length;
  $: wins       = picks.filter(p => p.status === 'win').length;
  $: losses     = picks.filter(p => p.status === 'loss').length;
  $: pending    = picks.filter(p => p.status === 'pending').length;
  $: winRate    = total > 0 ? ((wins / (wins + losses || 1)) * 100).toFixed(1) : '—';
</script>

<svelte:head>
  <title>Mis Picks — NioSports Pro</title>
</svelte:head>

<div class="page">
  <div class="page__header">
    <h1 class="page__title">📋 Mis Picks</h1>

    <!-- Stats resumen -->
    {#if !loading && total > 0}
      <div class="stats-row">
        <div class="stat">
          <span class="stat__value">{total}</span>
          <span class="stat__label">Total</span>
        </div>
        <div class="stat stat--win">
          <span class="stat__value">{wins}</span>
          <span class="stat__label">Ganados</span>
        </div>
        <div class="stat stat--loss">
          <span class="stat__value">{losses}</span>
          <span class="stat__label">Perdidos</span>
        </div>
        <div class="stat stat--pending">
          <span class="stat__value">{pending}</span>
          <span class="stat__label">Pendientes</span>
        </div>
        <div class="stat stat--rate">
          <span class="stat__value">{winRate}%</span>
          <span class="stat__label">Win rate</span>
        </div>
      </div>
    {/if}
  </div>

  <!-- Lista de picks -->
  {#if loading}
    <div class="loading-list">
      {#each Array(4) as _}
        <div class="skeleton-pick"></div>
      {/each}
    </div>

  {:else if picks.length === 0}
    <div class="empty-state">
      <p>🎯</p>
      <p>Aún no tienes picks guardados.</p>
      <p>Ve a <a href="/">Análisis del día</a> para generar tus primeros picks.</p>
    </div>

  {:else}
    <div class="picks-list">
      <!--
        on:delete={handleDelete} → cuando PickCard emite el evento 'delete',
        se llama handleDelete() con el ID del pick en event.detail.
        
        on:result={handleResult} → mismo patrón para resultados.
        
        Esto es el patrón "datos hacia abajo, eventos hacia arriba" (DETA):
        el padre pasa datos al hijo como props, el hijo notifica al padre
        con eventos. El flujo es unidireccional y predecible.
      -->
      {#each picks as pick (pick.id ?? pick)}
        <PickCard
          {pick}
          on:delete={handleDelete}
          on:result={handleResult}
        />
      {/each}
    </div>
  {/if}
</div>

<style>
  .page {
    max-width: 800px;
    margin: 0 auto;
    padding: 32px 20px 80px;
  }

  .page__header  { margin-bottom: 28px; }
  .page__title   {
    font-family: 'Orbitron', sans-serif;
    font-size: clamp(1.3rem, 3vw, 1.8rem);
    font-weight: 900;
    margin-bottom: 16px;
  }

  .stats-row {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: 10px;
    padding: 10px 16px;
    min-width: 70px;
  }
  .stat__value { font-size: 1.4rem; font-weight: 800; }
  .stat__label { font-size: 0.7rem; color: var(--color-text-muted); }
  .stat--win  .stat__value { color: #34d399; }
  .stat--loss .stat__value { color: #f87171; }
  .stat--rate .stat__value { color: #fbbf24; }

  .picks-list { display: flex; flex-direction: column; }

  .loading-list { display: flex; flex-direction: column; gap: 12px; }
  .skeleton-pick {
    height: 100px;
    border-radius: 12px;
    background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.05) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.4s infinite;
  }
  @keyframes shimmer { to { background-position: -200% 0; } }

  .empty-state {
    text-align: center;
    padding: 60px 20px;
    color: var(--color-text-muted);
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .empty-state p:first-child { font-size: 3rem; }
  .empty-state a { color: var(--color-accent); }
</style>
