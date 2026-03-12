<!-- src/routes/+page.svelte -->
<!--
  REEMPLAZA: renderHome() y la lógica de la vista principal en renders.js

  Esta es la página raíz (/) — el dashboard de totales NBA.
  Demuestra el patrón de carga de datos en SvelteKit: la función load()
  en +page.js corre en el servidor (o en el cliente en modo SPA) y
  sus datos llegan al componente como la prop `data`.
-->
<script>
  import { onMount }        from 'svelte';
  import { userId }         from '$lib/stores/auth';
  import { teamStats,
           aiPicksStore,
           demoStatus }     from '$lib/stores/data';
  import { toasts }         from '$lib/stores/ui';
  import PickCard           from '$lib/components/PickCard.svelte';
  import { dbRead,
           dbWrite,
           dbRemove,
           userPath }       from '$lib/firebase';

  // Props del servidor/load function (vacías por ahora — cargamos datos en onMount)
  export let data;

  // Estado local de esta vista
  let teamStatsData   = {};
  let todaysGames     = [];
  let generatingPicks = false;
  let loadingGames    = true;

  onMount(async () => {
    await loadData();
  });

  async function loadData() {
    loadingGames = true;
    try {
      // Cargar estadísticas de equipos desde el JSON estático
      const stats = await fetch('/data/nba-stats.json').then(r => r.json());
      teamStats.set(stats.teams);
      teamStatsData = stats.teams;

      // Cargar partidos de hoy desde el proxy
      await loadTodaysGames();

    } catch (err) {
      console.error('[Home] Error cargando datos:', err);
      toasts.error('No se pudieron cargar los datos. Usando modo offline.');
      teamStats.setDemoMode(true);
    } finally {
      loadingGames = false;
    }
  }

  async function loadTodaysGames() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res   = await fetch(`/api/proxy?endpoint=/games&dates[]=${today}`);
      const json  = await res.json();
      todaysGames = json.data || [];

      if (todaysGames.length === 0) {
        aiPicksStore.setDemoMode(true);
        // Cargar partidos demo para mostrar algo útil
        todaysGames = getDemoGames();
      }
    } catch {
      aiPicksStore.setDemoMode(true);
      todaysGames = getDemoGames();
    }
  }

  function getDemoGames() {
    return [
      { id: 'demo1', home_team: { full_name: 'Los Angeles Lakers' }, visitor_team: { full_name: 'Boston Celtics' },   status: 'scheduled', date: new Date().toISOString() },
      { id: 'demo2', home_team: { full_name: 'Golden State Warriors' }, visitor_team: { full_name: 'Miami Heat' },   status: 'scheduled', date: new Date().toISOString() },
      { id: 'demo3', home_team: { full_name: 'Denver Nuggets' }, visitor_team: { full_name: 'Phoenix Suns' },        status: 'scheduled', date: new Date().toISOString() },
    ];
  }

  // Acción de borrar un pick — manejada aquí en el padre, no en PickCard
  // PickCard solo emite el evento 'delete', la lógica vive aquí.
  async function handleDeletePick(event) {
    const pickId = event.detail;
    if (!$userId) return;
    try {
      await dbRemove(userPath($userId, 'picks', 'totales', pickId));
      toasts.success('Pick eliminado.');
    } catch (err) {
      toasts.error('No se pudo eliminar el pick.');
      console.error(err);
    }
  }

  // Helpers de formato
  function formatTime(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }
</script>

<svelte:head>
  <title>Dashboard — NioSports Pro</title>
</svelte:head>

<div class="page">
  <div class="page__header">
    <h1 class="page__title">
      🏀 Análisis del día
    </h1>
    <p class="page__subtitle">
      {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
    </p>

    {#if $demoStatus.anyDemoActive}
      <span class="demo-badge">⚠️ Modo estimación activo</span>
    {/if}
  </div>

  <!-- Grid de partidos del día -->
  <section class="section" aria-labelledby="games-heading">
    <h2 id="games-heading" class="section__title">Partidos de hoy</h2>

    {#if loadingGames}
      <div class="loading-grid">
        {#each Array(3) as _}
          <div class="skeleton-card"></div>
        {/each}
      </div>

    {:else if todaysGames.length === 0}
      <div class="empty-state">
        <p>No hay partidos programados para hoy.</p>
      </div>

    {:else}
      <div class="games-grid">
        {#each todaysGames as game (game.id)}
          <div class="game-card">
            <div class="game-card__teams">
              <span class="game-card__team">{game.visitor_team.full_name}</span>
              <span class="game-card__vs">@</span>
              <span class="game-card__team game-card__team--home">{game.home_team.full_name}</span>
            </div>
            <span class="game-card__time">{formatTime(game.status)}</span>
          </div>
        {/each}
      </div>
    {/if}
  </section>
</div>

<style>
  .page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 32px 20px 80px;
  }

  .page__header  { margin-bottom: 32px; }
  .page__title   {
    font-family: 'Orbitron', sans-serif;
    font-size: clamp(1.4rem, 3vw, 2rem);
    font-weight: 900;
    color: var(--color-text);
    margin-bottom: 6px;
  }
  .page__subtitle { color: var(--color-text-muted); font-size: 0.95rem; }

  .demo-badge {
    display: inline-block;
    margin-top: 8px;
    padding: 4px 12px;
    border-radius: 99px;
    background: rgba(245,158,11,0.2);
    border: 1px solid rgba(245,158,11,0.4);
    color: #fbbf24;
    font-size: 0.8rem;
    font-weight: 600;
  }

  .section        { margin-bottom: 40px; }
  .section__title {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--color-text);
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--color-border);
  }

  .games-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 12px;
  }

  .game-card {
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .game-card__teams { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .game-card__team  { font-size: 0.85rem; font-weight: 600; }
  .game-card__team--home { color: var(--color-accent); }
  .game-card__vs    { color: var(--color-text-muted); font-size: 0.75rem; }
  .game-card__time  { font-size: 0.8rem; color: var(--color-text-muted); flex-shrink: 0; }

  .loading-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 12px;
  }
  .skeleton-card {
    height: 72px;
    border-radius: 12px;
    background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.05) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.4s infinite;
  }
  @keyframes shimmer { to { background-position: -200% 0; } }

  .empty-state {
    text-align: center;
    padding: 40px;
    color: var(--color-text-muted);
  }
</style>
