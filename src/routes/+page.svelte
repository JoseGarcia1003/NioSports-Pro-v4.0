<script>
  import { onMount } from 'svelte';
  import { isAuthenticated } from '$lib/stores/auth';
  import { teamStats, picksTotales } from '$lib/stores/data';
  import { MODEL_VERSION } from '$lib/engine/constants.js';
  import { calculateUserKPIs } from '$lib/services/kpi-calculator.js';

  // Dashboard components
  import KPIGrid from '$lib/components/dashboard/KPIGrid.svelte';
  import QuickActions from '$lib/components/dashboard/QuickActions.svelte';
  import TodaysGames from '$lib/components/dashboard/TodaysGames.svelte';

  // Landing components
  import LandingExperience from '$lib/components/landing/LandingExperience.svelte';



  let todaysGames = [];
  let loadingGames = true;
  let gamesError = false;

  let mounted = false;
  let dashboardStarted = false;
  onMount(() => { mounted = true; });
  $: if (mounted && $isAuthenticated && !dashboardStarted) {
    dashboardStarted = true;
    loadDashboardData();
  }
  $: if (!$isAuthenticated) dashboardStarted = false;

  async function loadDashboardData() {
    loadingGames = true;
    try {
      const stats = await fetch('/data/nba-stats.json').then(r => r.json());
      teamStats.set(stats.teams);
      await loadTodaysGames();
    } catch (err) {
      console.error('[Home] Error cargando datos:', err);
      gamesError = true;
      todaysGames = [];
    } finally {
      loadingGames = false;
    }
  }

  async function loadTodaysGames() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`/api/proxy?endpoint=/games&dates[]=${today}`);
      if (!res.ok) throw new Error('Partidos no disponibles');
      const json = await res.json();
      if (!Array.isArray(json.data)) throw new Error('Respuesta inválida');
      todaysGames = json.data || [];
      gamesError = false;
    } catch {
      todaysGames = [];
      gamesError = true;
    }
  }

  $: kpiData = calculateUserKPIs($picksTotales || []);
  $: formattedDate = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
</script>

<svelte:head>
  <title>{$isAuthenticated ? 'Dashboard' : 'Análisis Cuantitativo NBA'} — NioSports Pro</title>
  <meta name="description" content="NioSports Pro — Explora el análisis NBA y el control personal de bank. Capital, exposición y resultados en perspectiva." />
</svelte:head>

{#if $isAuthenticated}
  <div class="dashboard">
    <header class="hero">
      <div>
        <p class="hero__date">{formattedDate}</p>
        <h1 class="hero__title">Panel de Control</h1>
      </div>
      <div class="hero__badge">
        <div class="hero__badge-dot"></div>
        <span>Motor v{MODEL_VERSION.version} · Estimaciones</span>
      </div>
    </header>

    <div data-tour="kpi">
      <KPIGrid {kpiData} />
    </div>
    <div data-tour="actions">
      <QuickActions />
    </div>
    <div data-tour="games">
      <TodaysGames games={todaysGames} loading={loadingGames} unavailable={gamesError} />
    </div>
  </div>
{:else}
  <div class="landing">
    <LandingExperience />


  </div>
{/if}

<style>
  .dashboard { max-width: 1400px; margin: 0 auto; padding: 40px 32px 100px; }
  @media (max-width: 768px) { .dashboard { padding: 24px 16px 80px; } }

  .hero { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; margin-bottom: 48px; flex-wrap: wrap; }
  .hero__title {
    font-family: 'Inter', sans-serif; font-size: clamp(2rem, 5vw, 3rem);
    font-weight: 900; letter-spacing: -0.03em; line-height: 1.1; margin-bottom: 4px;
    color: var(--color-text-primary);
  }
  .hero__date { font-size: 0.95rem; color: var(--color-text-muted); text-transform: capitalize; margin-bottom: 8px; }
  .hero__badge {
    display: flex; align-items: center; gap: 10px; padding: 10px 18px;
    background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2);
    border-radius: 9999px; font-size: 0.85rem; font-weight: 600; color: #10B981;
  }
  .hero__badge-dot { width: 8px; height: 8px; background: #10B981; border-radius: 50%; box-shadow: 0 0 8px rgba(16,185,129,0.6); }

  .landing { background: var(--color-bg-base); min-height: 100vh; }
</style>
