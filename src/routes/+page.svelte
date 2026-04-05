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
  import LandingHero from '$lib/components/landing/LandingHero.svelte';
  import LandingFeatures from '$lib/components/landing/LandingFeatures.svelte';
  import LandingFooter from '$lib/components/landing/LandingFooter.svelte';

  let todaysGames = [];
  let loadingGames = true;

  onMount(async () => {
    if ($isAuthenticated) {
      await loadDashboardData();
    }
  });

  async function loadDashboardData() {
    loadingGames = true;
    try {
      const stats = await fetch('/data/nba-stats.json').then(r => r.json());
      teamStats.set(stats.teams);
      await loadTodaysGames();
    } catch (err) {
      console.error('[Home] Error cargando datos:', err);
    } finally {
      loadingGames = false;
    }
  }

  async function loadTodaysGames() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`/api/proxy?endpoint=/games&dates[]=${today}`);
      const json = await res.json();
      todaysGames = json.data || [];
      if (todaysGames.length === 0) todaysGames = getDemoGames();
    } catch {
      todaysGames = getDemoGames();
    }
  }

  function getDemoGames() {
    return [
      { id: 'demo1', home_team: { full_name: 'Los Angeles Lakers', abbreviation: 'LAL' }, visitor_team: { full_name: 'Boston Celtics', abbreviation: 'BOS' }, status: '19:30' },
      { id: 'demo2', home_team: { full_name: 'Golden State Warriors', abbreviation: 'GSW' }, visitor_team: { full_name: 'Miami Heat', abbreviation: 'MIA' }, status: '21:00' },
      { id: 'demo3', home_team: { full_name: 'Denver Nuggets', abbreviation: 'DEN' }, visitor_team: { full_name: 'Phoenix Suns', abbreviation: 'PHX' }, status: '22:30' },
    ];
  }

  $: kpiData = calculateUserKPIs($picksTotales || []);
  $: formattedDate = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
</script>

<svelte:head>
  <title>{$isAuthenticated ? 'Dashboard' : 'Análisis Cuantitativo NBA'} — NioSports Pro</title>
  <meta name="description" content="NioSports Pro — Análisis cuantitativo de totales NBA con XGBoost y 26 features" />
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
        <span>Modelo v{MODEL_VERSION.version} activo</span>
      </div>
    </header>

    <div data-tour="kpi">
      <KPIGrid {kpiData} />
    </div>
    <div data-tour="actions">
      <QuickActions />
    </div>
    <div data-tour="games">
      <TodaysGames games={todaysGames} loading={loadingGames} />
    </div>
  </div>
{:else}
  <div class="landing">
    <LandingHero />
    <LandingFeatures />
    <LandingFooter />
  </div>
{/if}

<style>
  .dashboard { max-width: 1400px; margin: 0 auto; padding: 40px 32px 100px; }
  @media (max-width: 768px) { .dashboard { padding: 24px 16px 80px; } }

  .hero { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; margin-bottom: 48px; flex-wrap: wrap; }
  .hero__title {
    font-family: 'Inter', sans-serif; font-size: clamp(2rem, 5vw, 3rem);
    font-weight: 900; letter-spacing: -0.03em; line-height: 1.1; margin-bottom: 4px;
    background: linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.85) 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
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