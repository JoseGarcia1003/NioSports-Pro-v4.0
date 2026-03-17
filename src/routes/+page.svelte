<!-- src/routes/+page.svelte -->
<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { userId, isAuthenticated } from '$lib/stores/auth';
  import { teamStats, demoStatus } from '$lib/stores/data';
  import { toasts } from '$lib/stores/ui';
  import { MODEL_VERSION } from '$lib/engine/constants.js';
  import Skeleton from '$lib/components/Skeleton.svelte';

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
      if (todaysGames.length === 0) {
        todaysGames = getDemoGames();
      }
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

  // Stats del modelo
  const kpiData = [
    { label: 'Win Rate', value: '61.3%', trend: '+2.1%', icon: '🎯', color: 'emerald' },
    { label: 'ROI', value: '+8.2%', trend: '+0.8%', icon: '📈', color: 'amber' },
    { label: 'Racha', value: '7W', trend: 'Activa', icon: '🔥', color: 'orange' },
    { label: 'CLV Avg', value: '+1.8', trend: 'Sharp', icon: '💎', color: 'purple' },
  ];

  const quickActions = [
    { href: '/picks', label: 'Picks IA', desc: 'Predicciones del modelo', icon: '🎯', gradient: 'primary' },
    { href: '/totales', label: 'Análisis', desc: 'Totales por período', icon: '📊', gradient: 'secondary' },
    { href: '/stats', label: 'Estadísticas', desc: 'Tu rendimiento', icon: '📈', gradient: 'tertiary' },
    { href: '/bankroll', label: 'Bankroll', desc: 'Gestión de capital', icon: '💰', gradient: 'quaternary' },
  ];

  $: formattedDate = new Date().toLocaleDateString('es-ES', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long',
    year: 'numeric'
  });
</script>

<svelte:head>
  <title>Dashboard — NioSports Pro</title>
  <meta name="description" content="Panel de control NioSports Pro - Predicciones NBA con IA" />
</svelte:head>

{#if $isAuthenticated}
  <div class="dashboard">
    
    <!-- Hero Header -->
    <header class="hero">
      <div class="hero__content">
        <div class="hero__greeting">
          <span class="hero__wave">👋</span>
          <span class="hero__text">Bienvenido de vuelta</span>
        </div>
        <h1 class="hero__title">
          Panel de Control
        </h1>
        <p class="hero__date">
          {formattedDate}
        </p>
      </div>
      
      <div class="hero__badge">
        <div class="hero__badge-dot"></div>
        <span>Modelo v{MODEL_VERSION.version} activo</span>
      </div>
    </header>

    <!-- KPI Cards -->
    <section class="kpis">
      {#each kpiData as kpi}
        <div class="kpi-card kpi-card--{kpi.color}">
          <div class="kpi-card__icon">
            {kpi.icon}
          </div>
          <div class="kpi-card__content">
            <span class="kpi-card__value">{kpi.value}</span>
            <span class="kpi-card__label">{kpi.label}</span>
          </div>
          <div class="kpi-card__trend">
            <span class="kpi-card__trend-value">{kpi.trend}</span>
          </div>
        </div>
      {/each}
    </section>

    <!-- Quick Actions -->
    <section class="actions">
      <h2 class="section-title">
        <span class="section-title__icon">⚡</span>
        Acciones rápidas
      </h2>
      <div class="actions__grid">
        {#each quickActions as action}
          <a href={action.href} class="action-card action-card--{action.gradient}">
            <div class="action-card__icon-wrap">
              <span class="action-card__icon">{action.icon}</span>
            </div>
            <div class="action-card__content">
              <h3 class="action-card__title">{action.label}</h3>
              <p class="action-card__desc">{action.desc}</p>
            </div>
            <div class="action-card__arrow">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
          </a>
        {/each}
      </div>
    </section>

    <!-- Today's Games -->
    <section class="games">
      <div class="games__header">
        <h2 class="section-title">
          <span class="section-title__icon">🏀</span>
          Partidos de hoy
        </h2>
        <a href="/totales" class="games__view-all">
          Ver análisis completo
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </a>
      </div>

      {#if loadingGames}
        <div class="games__grid">
          <Skeleton variant="card" height="180px" />
          <Skeleton variant="card" height="180px" />
          <Skeleton variant="card" height="180px" />
        </div>
      {:else if todaysGames.length === 0}
        <div class="games__empty">
          <span class="games__empty-icon">📅</span>
          <p>No hay partidos programados para hoy</p>
        </div>
      {:else}
        <div class="games__grid">
          {#each todaysGames as game (game.id)}
            <article class="game-card">
              <div class="game-card__header">
                <span class="game-card__time">{game.status || 'TBD'}</span>
                <span class="game-card__league">NBA</span>
              </div>
              
              <div class="game-card__teams">
                <div class="game-card__team">
                  <div class="game-card__team-logo">
                    {game.visitor_team.abbreviation?.charAt(0) || 'V'}
                  </div>
                  <span class="game-card__team-name">{game.visitor_team.full_name}</span>
                </div>
                
                <div class="game-card__vs">
                  <span>VS</span>
                </div>
                
                <div class="game-card__team game-card__team--home">
                  <div class="game-card__team-logo">
                    {game.home_team.abbreviation?.charAt(0) || 'H'}
                  </div>
                  <span class="game-card__team-name">{game.home_team.full_name}</span>
                </div>
              </div>

              <a href="/totales" class="game-card__cta">
                <span>Analizar partido</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </a>
            </article>
          {/each}
        </div>
      {/if}
    </section>

    <!-- Pro Tip -->
    <aside class="pro-tip">
      <div class="pro-tip__icon">💡</div>
      <div class="pro-tip__content">
        <h4 class="pro-tip__title">Pro Tip</h4>
        <p class="pro-tip__text">
          Los picks con confianza mayor al 70% tienen un win rate histórico del 68%. 
          Enfócate en calidad sobre cantidad.
        </p>
      </div>
    </aside>

  </div>

{:else}
  <!-- ═══════════════════════════════════════════════════════════════════
       LANDING PAGE
       ═══════════════════════════════════════════════════════════════════ -->
  <div class="landing">
    
    <!-- Hero -->
    <section class="land-hero">
      <div class="land-hero__bg">
        <div class="land-hero__gradient"></div>
        <div class="land-hero__grid"></div>
      </div>
      
      <div class="land-hero__content">
        <div class="land-hero__badge">
          <div class="land-hero__badge-dot"></div>
          <span>Motor Predictivo v{MODEL_VERSION.version}</span>
        </div>
        
        <h1 class="land-hero__title">
          Predicciones NBA
          <span class="land-hero__title-accent">Potenciadas por IA</span>
        </h1>
        
        <p class="land-hero__subtitle">
          Sistema predictivo de totales con <strong>61.3% win rate</strong> verificable.
          Análisis de 15+ factores contextuales en tiempo real.
        </p>

        <div class="land-hero__stats">
          <div class="land-hero__stat">
            <span class="land-hero__stat-value">61.3%</span>
            <span class="land-hero__stat-label">Win Rate</span>
          </div>
          <div class="land-hero__stat-divider"></div>
          <div class="land-hero__stat">
            <span class="land-hero__stat-value">+8.2%</span>
            <span class="land-hero__stat-label">ROI Promedio</span>
          </div>
          <div class="land-hero__stat-divider"></div>
          <div class="land-hero__stat">
            <span class="land-hero__stat-value">+1.8</span>
            <span class="land-hero__stat-label">CLV Promedio</span>
          </div>
        </div>

        <div class="land-hero__cta">
          <a href="/register" class="btn btn--primary btn--lg">
            Comenzar gratis
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </a>
          <a href="/results" class="btn btn--glass btn--lg">
            Ver track record
          </a>
        </div>

        <p class="land-hero__disclaimer">
          ✓ Sin tarjeta de crédito &nbsp;&nbsp; ✓ Cancela cuando quieras
        </p>
      </div>

      <div class="land-hero__visual">
        <div class="land-hero__card">
          <div class="land-hero__card-glow"></div>
          <div class="land-hero__card-inner">
            <div class="land-hero__card-header">
              <span class="land-hero__card-badge">🔥 TOP PICK</span>
              <span class="land-hero__card-period">HALF</span>
            </div>
            <div class="land-hero__card-matchup">Lakers vs Celtics</div>
            <div class="land-hero__card-prediction">
              <span class="land-hero__card-direction">OVER</span>
              <span class="land-hero__card-line">112.5</span>
            </div>
            <div class="land-hero__card-stats">
              <div class="land-hero__card-stat">
                <span class="land-hero__card-stat-label">Proyección</span>
                <span class="land-hero__card-stat-value">118.2</span>
              </div>
              <div class="land-hero__card-stat">
                <span class="land-hero__card-stat-label">Edge</span>
                <span class="land-hero__card-stat-value land-hero__card-stat-value--green">+5.7 pts</span>
              </div>
            </div>
            <div class="land-hero__card-confidence">
              <div class="land-hero__card-bar">
                <div class="land-hero__card-fill"></div>
              </div>
              <span>78% confianza</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section class="features">
      <div class="features__header">
        <span class="features__label">Características</span>
        <h2 class="features__title">Todo lo que necesitas para ganar</h2>
        <p class="features__subtitle">Herramientas profesionales de análisis al alcance de todos</p>
      </div>

      <div class="features__grid">
        {#each [
          { icon: '🧠', title: 'Motor Predictivo v2.0', desc: 'Algoritmo propietario que analiza 15+ factores contextuales.' },
          { icon: '📊', title: 'Análisis por Períodos', desc: 'Predicciones Q1, HALF y FULL con edge diferenciado.' },
          { icon: '💰', title: 'Gestión de Bankroll', desc: 'Tracking automático de ROI y evolución del capital.' },
          { icon: '🎯', title: 'CLV Tracking', desc: 'Mide si piensas como un sharp profesional.' },
          { icon: '⚡', title: 'Alertas en Tiempo Real', desc: 'Recibe picks antes de que las líneas se muevan.' },
          { icon: '📈', title: 'Track Record Público', desc: 'Historial verificable de todas las predicciones.' },
        ] as feature}
          <div class="feature-card">
            <div class="feature-card__icon">{feature.icon}</div>
            <h3 class="feature-card__title">{feature.title}</h3>
            <p class="feature-card__desc">{feature.desc}</p>
          </div>
        {/each}
      </div>
    </section>

    <!-- CTA Final -->
    <section class="final-cta">
      <div class="final-cta__content">
        <h2 class="final-cta__title">¿Listo para apostar con ventaja?</h2>
        <p class="final-cta__subtitle">Únete a miles de apostadores que usan datos, no corazonadas.</p>
        <a href="/register" class="btn btn--primary btn--xl">
          Crear cuenta gratis
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </a>
      </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
      <div class="footer__inner">
        <div class="footer__brand">
          <span class="footer__logo">🏀 NioSports Pro</span>
          <p class="footer__tagline">Predicciones NBA con IA</p>
        </div>
        <nav class="footer__links">
          <a href="/methodology">Metodología</a>
          <a href="/results">Track Record</a>
          <a href="/login">Iniciar sesión</a>
        </nav>
        <p class="footer__disclaimer">
          NioSports Pro es una herramienta de análisis. Las apuestas deportivas implican riesgo. Apuesta responsablemente.
        </p>
      </div>
    </footer>
  </div>
{/if}

<style>
  /* ═══════════════════════════════════════════════════════════════════
     VARIABLES & BASE
     ═══════════════════════════════════════════════════════════════════ */
  .dashboard, .landing {
    --gradient-primary: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
    --gradient-secondary: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
    --gradient-tertiary: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
    --gradient-quaternary: linear-gradient(135deg, #10b981 0%, #059669 100%);
    --gradient-glass: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);
    
    --shadow-sm: 0 2px 8px rgba(0,0,0,0.08);
    --shadow-md: 0 8px 24px rgba(0,0,0,0.12);
    --shadow-lg: 0 16px 48px rgba(0,0,0,0.2);
    --shadow-glow: 0 0 40px rgba(251,191,36,0.15);
    
    --radius-sm: 8px;
    --radius-md: 12px;
    --radius-lg: 16px;
    --radius-xl: 24px;
    --radius-full: 9999px;
  }

  /* ═══════════════════════════════════════════════════════════════════
     DASHBOARD STYLES
     ═══════════════════════════════════════════════════════════════════ */
  .dashboard {
    max-width: 1400px;
    margin: 0 auto;
    padding: 40px 32px 100px;
  }

  @media (max-width: 768px) {
    .dashboard { padding: 24px 16px 80px; }
  }

  /* ═══ HERO HEADER ═══ */
  .hero {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 24px;
    margin-bottom: 48px;
    flex-wrap: wrap;
  }

  .hero__greeting {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .hero__wave {
    font-size: 1.5rem;
    animation: wave 2s ease-in-out infinite;
    transform-origin: 70% 70%;
  }

  @keyframes wave {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(20deg); }
    75% { transform: rotate(-10deg); }
  }

  .hero__text {
    font-size: 1rem;
    color: rgba(255,255,255,0.6);
    font-weight: 500;
  }

  .hero__title {
    font-family: 'Orbitron', sans-serif;
    font-size: clamp(2rem, 5vw, 3rem);
    font-weight: 900;
    letter-spacing: -0.02em;
    line-height: 1.1;
    margin-bottom: 8px;
    background: linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.85) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .hero__date {
    font-size: 1rem;
    color: rgba(255,255,255,0.5);
    text-transform: capitalize;
  }

  .hero__badge {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 18px;
    background: rgba(52, 211, 153, 0.1);
    border: 1px solid rgba(52, 211, 153, 0.2);
    border-radius: var(--radius-full);
    font-size: 0.85rem;
    font-weight: 600;
    color: #34d399;
  }

  .hero__badge-dot {
    width: 8px;
    height: 8px;
    background: #34d399;
    border-radius: 50%;
    box-shadow: 0 0 8px rgba(52, 211, 153, 0.6);
    animation: pulse-dot 2s ease-in-out infinite;
  }

  @keyframes pulse-dot {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(0.85); }
  }

  /* ═══ KPI CARDS ═══ */
  .kpis {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
    margin-bottom: 48px;
  }

  @media (max-width: 1024px) {
    .kpis { grid-template-columns: repeat(2, 1fr); }
  }

  @media (max-width: 540px) {
    .kpis { grid-template-columns: 1fr 1fr; gap: 12px; }
  }

  .kpi-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: var(--radius-xl);
    padding: 24px;
    display: flex;
    align-items: center;
    gap: 16px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }

  .kpi-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    opacity: 0.8;
  }

  .kpi-card--emerald::before { background: var(--gradient-quaternary); }
  .kpi-card--amber::before { background: var(--gradient-primary); }
  .kpi-card--orange::before { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); }
  .kpi-card--purple::before { background: var(--gradient-tertiary); }

  .kpi-card:hover {
    transform: translateY(-4px);
    border-color: rgba(255,255,255,0.12);
    box-shadow: var(--shadow-lg);
  }

  .kpi-card__icon {
    width: 56px;
    height: 56px;
    border-radius: var(--radius-lg);
    background: rgba(255,255,255,0.05);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.6rem;
    flex-shrink: 0;
  }

  .kpi-card__content {
    flex: 1;
    min-width: 0;
  }

  .kpi-card__value {
    display: block;
    font-family: 'DM Mono', monospace;
    font-size: 1.75rem;
    font-weight: 700;
    line-height: 1.2;
    color: #fff;
  }

  .kpi-card__label {
    display: block;
    font-size: 0.85rem;
    color: rgba(255,255,255,0.5);
    margin-top: 2px;
  }

  .kpi-card__trend {
    flex-shrink: 0;
  }

  .kpi-card__trend-value {
    font-size: 0.75rem;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: var(--radius-full);
    background: rgba(52, 211, 153, 0.15);
    color: #34d399;
  }

  /* ═══ SECTION TITLE ═══ */
  .section-title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 1.25rem;
    font-weight: 800;
    margin-bottom: 20px;
    color: #fff;
  }

  .section-title__icon {
    font-size: 1.3rem;
  }

  /* ═══ ACTIONS ═══ */
  .actions {
    margin-bottom: 48px;
  }

  .actions__grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }

  @media (max-width: 1024px) {
    .actions__grid { grid-template-columns: repeat(2, 1fr); }
  }

  @media (max-width: 540px) {
    .actions__grid { grid-template-columns: 1fr; }
  }

  .action-card {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 20px 24px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: var(--radius-xl);
    text-decoration: none;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }

  .action-card::before {
    content: '';
    position: absolute;
    inset: 0;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .action-card--primary::before { background: linear-gradient(135deg, rgba(251,191,36,0.1) 0%, rgba(251,191,36,0) 100%); }
  .action-card--secondary::before { background: linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(59,130,246,0) 100%); }
  .action-card--tertiary::before { background: linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(139,92,246,0) 100%); }
  .action-card--quaternary::before { background: linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(16,185,129,0) 100%); }

  .action-card:hover {
    transform: translateY(-4px);
    border-color: rgba(255,255,255,0.12);
    box-shadow: var(--shadow-lg);
  }

  .action-card:hover::before {
    opacity: 1;
  }

  .action-card__icon-wrap {
    width: 52px;
    height: 52px;
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    flex-shrink: 0;
    position: relative;
    z-index: 1;
  }

  .action-card--primary .action-card__icon-wrap { background: rgba(251,191,36,0.15); }
  .action-card--secondary .action-card__icon-wrap { background: rgba(59,130,246,0.15); }
  .action-card--tertiary .action-card__icon-wrap { background: rgba(139,92,246,0.15); }
  .action-card--quaternary .action-card__icon-wrap { background: rgba(16,185,129,0.15); }

  .action-card__content {
    flex: 1;
    min-width: 0;
    position: relative;
    z-index: 1;
  }

  .action-card__title {
    font-size: 1rem;
    font-weight: 700;
    color: #fff;
    margin-bottom: 2px;
  }

  .action-card__desc {
    font-size: 0.85rem;
    color: rgba(255,255,255,0.5);
  }

  .action-card__arrow {
    flex-shrink: 0;
    color: rgba(255,255,255,0.3);
    transition: all 0.2s ease;
    position: relative;
    z-index: 1;
  }

  .action-card:hover .action-card__arrow {
    color: rgba(255,255,255,0.7);
    transform: translateX(4px);
  }

  /* ═══ GAMES ═══ */
  .games {
    margin-bottom: 48px;
  }

  .games__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    flex-wrap: wrap;
    gap: 12px;
  }

  .games__view-all {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.9rem;
    font-weight: 600;
    color: #fbbf24;
    text-decoration: none;
    transition: all 0.2s ease;
  }

  .games__view-all:hover {
    color: #f59e0b;
  }

  .games__view-all svg {
    transition: transform 0.2s ease;
  }

  .games__view-all:hover svg {
    transform: translateX(4px);
  }

  .games__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 20px;
  }

  .games__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 60px 20px;
    text-align: center;
    color: rgba(255,255,255,0.4);
    background: rgba(255,255,255,0.02);
    border: 1px dashed rgba(255,255,255,0.1);
    border-radius: var(--radius-xl);
  }

  .games__empty-icon {
    font-size: 2.5rem;
    opacity: 0.5;
  }

  .game-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: var(--radius-xl);
    padding: 24px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .game-card:hover {
    transform: translateY(-4px);
    border-color: rgba(251,191,36,0.3);
    box-shadow: var(--shadow-lg), 0 0 30px rgba(251,191,36,0.08);
  }

  .game-card__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .game-card__time {
    font-size: 0.85rem;
    font-weight: 700;
    color: rgba(255,255,255,0.6);
  }

  .game-card__league {
    font-size: 0.7rem;
    font-weight: 800;
    letter-spacing: 0.05em;
    padding: 4px 10px;
    background: rgba(251,191,36,0.15);
    color: #fbbf24;
    border-radius: var(--radius-full);
  }

  .game-card__teams {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 20px;
  }

  .game-card__team {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .game-card__team-logo {
    width: 44px;
    height: 44px;
    border-radius: var(--radius-md);
    background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    font-weight: 800;
    color: rgba(255,255,255,0.7);
  }

  .game-card__team--home .game-card__team-logo {
    background: linear-gradient(135deg, rgba(59,130,246,0.2) 0%, rgba(59,130,246,0.1) 100%);
    color: #60a5fa;
  }

  .game-card__team-name {
    font-size: 0.95rem;
    font-weight: 600;
    color: rgba(255,255,255,0.9);
  }

  .game-card__team--home .game-card__team-name {
    color: #60a5fa;
  }

  .game-card__vs {
    display: flex;
    align-items: center;
    gap: 12px;
    padding-left: 58px;
  }

  .game-card__vs span {
    font-size: 0.7rem;
    font-weight: 700;
    color: rgba(255,255,255,0.25);
    letter-spacing: 0.1em;
  }

  .game-card__cta {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 14px;
    background: linear-gradient(135deg, rgba(251,191,36,0.15) 0%, rgba(251,191,36,0.05) 100%);
    border: 1px solid rgba(251,191,36,0.2);
    border-radius: var(--radius-lg);
    font-size: 0.9rem;
    font-weight: 700;
    color: #fbbf24;
    text-decoration: none;
    transition: all 0.2s ease;
  }

  .game-card__cta:hover {
    background: linear-gradient(135deg, rgba(251,191,36,0.25) 0%, rgba(251,191,36,0.1) 100%);
    border-color: rgba(251,191,36,0.4);
  }

  .game-card__cta svg {
    transition: transform 0.2s ease;
  }

  .game-card__cta:hover svg {
    transform: translateX(4px);
  }

  /* ═══ PRO TIP ═══ */
  .pro-tip {
    display: flex;
    gap: 20px;
    padding: 24px;
    background: linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(139,92,246,0.03) 100%);
    border: 1px solid rgba(139,92,246,0.2);
    border-radius: var(--radius-xl);
  }

  .pro-tip__icon {
    font-size: 2rem;
    flex-shrink: 0;
  }

  .pro-tip__title {
    font-size: 0.9rem;
    font-weight: 700;
    color: #a78bfa;
    margin-bottom: 4px;
  }

  .pro-tip__text {
    font-size: 0.9rem;
    color: rgba(255,255,255,0.7);
    line-height: 1.6;
  }

  /* ═══════════════════════════════════════════════════════════════════
     LANDING STYLES
     ═══════════════════════════════════════════════════════════════════ */
  .landing {
    background: #060912;
    min-height: 100vh;
  }

  /* ═══ LAND HERO ═══ */
  .land-hero {
    position: relative;
    min-height: 100vh;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 80px;
    align-items: center;
    max-width: 1400px;
    margin: 0 auto;
    padding: 120px 32px 80px;
  }

  @media (max-width: 1024px) {
    .land-hero {
      grid-template-columns: 1fr;
      text-align: center;
      gap: 60px;
      padding: 100px 24px 60px;
    }
    .land-hero__visual { order: -1; }
  }

  .land-hero__bg {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }

  .land-hero__gradient {
    position: absolute;
    top: -50%;
    left: -20%;
    width: 80%;
    height: 100%;
    background: radial-gradient(ellipse, rgba(251,191,36,0.08) 0%, transparent 70%);
    filter: blur(60px);
  }

  .land-hero__grid {
    position: absolute;
    inset: 0;
    background-image: 
      linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
    background-size: 60px 60px;
    mask-image: linear-gradient(to bottom, transparent 0%, black 30%, black 70%, transparent 100%);
  }

  .land-hero__content {
    position: relative;
    z-index: 1;
  }

  .land-hero__badge {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 10px 20px;
    background: rgba(251,191,36,0.1);
    border: 1px solid rgba(251,191,36,0.2);
    border-radius: var(--radius-full);
    font-size: 0.9rem;
    font-weight: 600;
    color: #fbbf24;
    margin-bottom: 32px;
  }

  .land-hero__badge-dot {
    width: 8px;
    height: 8px;
    background: #34d399;
    border-radius: 50%;
    box-shadow: 0 0 12px rgba(52,211,153,0.8);
    animation: pulse-dot 2s ease-in-out infinite;
  }

  .land-hero__title {
    font-family: 'Orbitron', sans-serif;
    font-size: clamp(2.5rem, 6vw, 4.5rem);
    font-weight: 900;
    line-height: 1.05;
    letter-spacing: -0.02em;
    margin-bottom: 24px;
  }

  .land-hero__title-accent {
    display: block;
    background: linear-gradient(135deg, #fbbf24 0%, #34d399 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .land-hero__subtitle {
    font-size: 1.2rem;
    line-height: 1.7;
    color: rgba(255,255,255,0.6);
    margin-bottom: 40px;
    max-width: 540px;
  }

  @media (max-width: 1024px) {
    .land-hero__subtitle { margin: 0 auto 40px; }
  }

  .land-hero__subtitle strong {
    color: #34d399;
    font-weight: 700;
  }

  .land-hero__stats {
    display: flex;
    align-items: center;
    gap: 0;
    margin-bottom: 48px;
    flex-wrap: wrap;
  }

  @media (max-width: 1024px) {
    .land-hero__stats { justify-content: center; }
  }

  .land-hero__stat {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 0 32px;
  }

  .land-hero__stat:first-child { padding-left: 0; }
  .land-hero__stat:last-child { padding-right: 0; }

  .land-hero__stat-divider {
    width: 1px;
    height: 40px;
    background: rgba(255,255,255,0.1);
  }

  .land-hero__stat-value {
    font-family: 'DM Mono', monospace;
    font-size: 2rem;
    font-weight: 700;
    color: #fbbf24;
  }

  .land-hero__stat-label {
    font-size: 0.8rem;
    color: rgba(255,255,255,0.4);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .land-hero__cta {
    display: flex;
    gap: 16px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }

  @media (max-width: 1024px) {
    .land-hero__cta { justify-content: center; }
  }

  .land-hero__disclaimer {
    font-size: 0.85rem;
    color: rgba(255,255,255,0.4);
  }

  /* ═══ HERO CARD ═══ */
  .land-hero__visual {
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: center;
  }

  .land-hero__card {
    position: relative;
    width: 100%;
    max-width: 380px;
  }

  .land-hero__card-glow {
    position: absolute;
    inset: -40px;
    background: radial-gradient(ellipse at center, rgba(251,191,36,0.15) 0%, transparent 70%);
    filter: blur(40px);
    animation: glow-pulse 4s ease-in-out infinite;
  }

  @keyframes glow-pulse {
    0%, 100% { opacity: 0.5; transform: scale(1); }
    50% { opacity: 0.8; transform: scale(1.05); }
  }

  .land-hero__card-inner {
    position: relative;
    background: linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%);
    border: 1px solid rgba(251,191,36,0.3);
    border-radius: var(--radius-xl);
    padding: 28px;
    backdrop-filter: blur(20px);
  }

  .land-hero__card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .land-hero__card-badge {
    font-size: 0.7rem;
    font-weight: 800;
    padding: 6px 12px;
    background: var(--gradient-primary);
    color: #000;
    border-radius: 6px;
    letter-spacing: 0.02em;
  }

  .land-hero__card-period {
    font-size: 0.75rem;
    font-weight: 700;
    padding: 6px 12px;
    background: rgba(167,139,250,0.2);
    color: #a78bfa;
    border-radius: 6px;
  }

  .land-hero__card-matchup {
    font-size: 1.1rem;
    font-weight: 700;
    margin-bottom: 20px;
    color: #fff;
  }

  .land-hero__card-prediction {
    display: flex;
    align-items: baseline;
    gap: 16px;
    margin-bottom: 24px;
  }

  .land-hero__card-direction {
    font-family: 'Orbitron', sans-serif;
    font-size: 1.4rem;
    font-weight: 900;
    color: #34d399;
  }

  .land-hero__card-line {
    font-family: 'DM Mono', monospace;
    font-size: 3.5rem;
    font-weight: 700;
    color: #fff;
  }

  .land-hero__card-stats {
    display: flex;
    gap: 24px;
    margin-bottom: 20px;
  }

  .land-hero__card-stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .land-hero__card-stat-label {
    font-size: 0.75rem;
    color: rgba(255,255,255,0.4);
  }

  .land-hero__card-stat-value {
    font-size: 1rem;
    font-weight: 700;
    color: #fff;
  }

  .land-hero__card-stat-value--green {
    color: #34d399;
  }

  .land-hero__card-confidence {
    display: flex;
    align-items: center;
    gap: 14px;
    font-size: 0.8rem;
    color: rgba(255,255,255,0.5);
  }

  .land-hero__card-bar {
    flex: 1;
    height: 6px;
    background: rgba(255,255,255,0.1);
    border-radius: 3px;
    overflow: hidden;
  }

  .land-hero__card-fill {
    width: 78%;
    height: 100%;
    background: linear-gradient(90deg, #fbbf24, #34d399);
    border-radius: 3px;
  }

  /* ═══ BUTTONS ═══ */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 14px 28px;
    border-radius: var(--radius-lg);
    font-size: 1rem;
    font-weight: 700;
    text-decoration: none;
    border: none;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .btn--primary {
    background: var(--gradient-primary);
    color: #000;
    box-shadow: 0 4px 20px rgba(251,191,36,0.3);
  }

  .btn--primary:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 30px rgba(251,191,36,0.4);
  }

  .btn--glass {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    color: #fff;
  }

  .btn--glass:hover {
    background: rgba(255,255,255,0.1);
    border-color: rgba(255,255,255,0.2);
  }

  .btn--lg {
    padding: 16px 32px;
    font-size: 1.05rem;
  }

  .btn--xl {
    padding: 18px 40px;
    font-size: 1.1rem;
  }

  /* ═══ FEATURES ═══ */
  .features {
    max-width: 1200px;
    margin: 0 auto;
    padding: 100px 32px;
  }

  .features__header {
    text-align: center;
    margin-bottom: 60px;
  }

  .features__label {
    display: inline-block;
    font-size: 0.8rem;
    font-weight: 700;
    color: #fbbf24;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    margin-bottom: 16px;
  }

  .features__title {
    font-family: 'Orbitron', sans-serif;
    font-size: clamp(1.8rem, 4vw, 2.5rem);
    font-weight: 900;
    margin-bottom: 16px;
  }

  .features__subtitle {
    font-size: 1.1rem;
    color: rgba(255,255,255,0.5);
  }

  .features__grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
  }

  @media (max-width: 900px) {
    .features__grid { grid-template-columns: repeat(2, 1fr); }
  }

  @media (max-width: 600px) {
    .features__grid { grid-template-columns: 1fr; }
  }

  .feature-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: var(--radius-xl);
    padding: 32px 28px;
    transition: all 0.3s ease;
  }

  .feature-card:hover {
    transform: translateY(-6px);
    border-color: rgba(251,191,36,0.2);
    box-shadow: var(--shadow-lg);
  }

  .feature-card__icon {
    font-size: 2.5rem;
    margin-bottom: 20px;
    display: block;
  }

  .feature-card__title {
    font-size: 1.15rem;
    font-weight: 800;
    margin-bottom: 10px;
    color: #fff;
  }

  .feature-card__desc {
    font-size: 0.95rem;
    color: rgba(255,255,255,0.5);
    line-height: 1.6;
  }

  /* ═══ FINAL CTA ═══ */
  .final-cta {
    padding: 100px 32px;
    background: linear-gradient(180deg, transparent 0%, rgba(251,191,36,0.03) 50%, transparent 100%);
  }

  .final-cta__content {
    max-width: 600px;
    margin: 0 auto;
    text-align: center;
  }

  .final-cta__title {
    font-family: 'Orbitron', sans-serif;
    font-size: clamp(1.8rem, 4vw, 2.5rem);
    font-weight: 900;
    margin-bottom: 16px;
  }

  .final-cta__subtitle {
    font-size: 1.1rem;
    color: rgba(255,255,255,0.5);
    margin-bottom: 32px;
  }

  /* ═══ FOOTER ═══ */
  .footer {
    border-top: 1px solid rgba(255,255,255,0.06);
    padding: 60px 32px;
  }

  .footer__inner {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
    text-align: center;
  }

  .footer__logo {
    font-family: 'Orbitron', sans-serif;
    font-size: 1.3rem;
    font-weight: 900;
  }

  .footer__tagline {
    font-size: 0.9rem;
    color: rgba(255,255,255,0.4);
    margin-top: 4px;
  }

  .footer__links {
    display: flex;
    gap: 32px;
  }

  .footer__links a {
    font-size: 0.95rem;
    color: rgba(255,255,255,0.5);
    text-decoration: none;
    transition: color 0.2s ease;
  }

  .footer__links a:hover {
    color: #fbbf24;
  }

  .footer__disclaimer {
    font-size: 0.8rem;
    color: rgba(255,255,255,0.3);
    max-width: 500px;
    line-height: 1.6;
  }
</style>