<!-- src/routes/+page.svelte -->
<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { userId, isAuthenticated } from '$lib/stores/auth';
  import { teamStats, demoStatus } from '$lib/stores/data';
  import { toasts } from '$lib/stores/ui';
  import { MODEL_VERSION } from '$lib/engine/constants.js';

  // Dashboard imports (solo para usuarios autenticados)
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
      { id: 'demo1', home_team: { full_name: 'Los Angeles Lakers' }, visitor_team: { full_name: 'Boston Celtics' }, status: 'scheduled' },
      { id: 'demo2', home_team: { full_name: 'Golden State Warriors' }, visitor_team: { full_name: 'Miami Heat' }, status: 'scheduled' },
      { id: 'demo3', home_team: { full_name: 'Denver Nuggets' }, visitor_team: { full_name: 'Phoenix Suns' }, status: 'scheduled' },
    ];
  }

  function formatTime(dateStr) {
    if (!dateStr) return 'TBD';
    return new Date(dateStr).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  // Estadísticas del modelo para landing
  const modelStats = {
    winRate: '61.3',
    totalPicks: '2,847',
    avgROI: '+8.2',
    clvAvg: '+1.8'
  };

  const features = [
    {
      icon: '🧠',
      title: 'Motor Predictivo v2.0',
      description: 'Algoritmo propietario que analiza 15+ factores contextuales en tiempo real.'
    },
    {
      icon: '📊',
      title: 'Análisis por Períodos',
      description: 'Predicciones para Q1, HALF y FULL con edge diferenciado por temporalidad.'
    },
    {
      icon: '💰',
      title: 'Gestión de Bankroll',
      description: 'Tracking automático de ROI, profit y evolución de tu capital.'
    },
    {
      icon: '🎯',
      title: 'CLV Tracking',
      description: 'Mide tu Closing Line Value para saber si piensas como un sharp.'
    },
    {
      icon: '⚡',
      title: 'Picks en Tiempo Real',
      description: 'Recibe picks con alto Expected Value antes de que las líneas se muevan.'
    },
    {
      icon: '📈',
      title: 'Track Record Público',
      description: 'Historial verificable con todas las predicciones y resultados.'
    }
  ];

  const plans = [
    {
      name: 'Free',
      price: '0',
      period: 'siempre',
      description: 'Perfecto para empezar',
      features: [
        '3 picks diarios',
        'Análisis básico',
        'Track record público',
        'Gestión de bankroll'
      ],
      cta: 'Comenzar gratis',
      highlighted: false
    },
    {
      name: 'Pro',
      price: '19',
      period: '/mes',
      description: 'Para apostadores serios',
      features: [
        'Picks ilimitados',
        'Análisis completo Q1/HALF/FULL',
        'CLV Tracking',
        'Alertas en tiempo real',
        'Soporte prioritario'
      ],
      cta: 'Prueba 7 días gratis',
      highlighted: true
    },
    {
      name: 'Elite',
      price: '49',
      period: '/mes',
      description: 'Máximo rendimiento',
      features: [
        'Todo de Pro',
        'Acceso a modelo raw',
        'API para automatización',
        'Análisis personalizado',
        'Grupo privado Discord'
      ],
      cta: 'Contactar',
      highlighted: false
    }
  ];
</script>

<svelte:head>
  <title>NioSports Pro — Predicciones NBA con IA</title>
  <meta name="description" content="Sistema predictivo de totales NBA con 61.3% win rate. Motor de IA que analiza factores contextuales en tiempo real." />
</svelte:head>

{#if $isAuthenticated}
  <!-- ═══════════════════════════════════════════════════════════════════
       DASHBOARD PARA USUARIOS AUTENTICADOS
       ═══════════════════════════════════════════════════════════════════ -->
  <div class="dashboard">
    <div class="dashboard__header">
      <h1 class="dashboard__title">🏀 Análisis del día</h1>
      <p class="dashboard__subtitle">
        {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>
      {#if $demoStatus.anyDemoActive}
        <span class="demo-badge">⚠️ Modo estimación activo</span>
      {/if}
    </div>

    <div class="quick-links">
      <a href="/picks" class="quick-link quick-link--primary">
        <span class="quick-link__icon">🎯</span>
        <span class="quick-link__text">Ver Picks IA</span>
        <span class="quick-link__arrow">→</span>
      </a>
      <a href="/totales" class="quick-link">
        <span class="quick-link__icon">📊</span>
        <span class="quick-link__text">Análisis Totales</span>
        <span class="quick-link__arrow">→</span>
      </a>
      <a href="/stats" class="quick-link">
        <span class="quick-link__icon">📈</span>
        <span class="quick-link__text">Mis Estadísticas</span>
        <span class="quick-link__arrow">→</span>
      </a>
      <a href="/bankroll" class="quick-link">
        <span class="quick-link__icon">💰</span>
        <span class="quick-link__text">Bankroll</span>
        <span class="quick-link__arrow">→</span>
      </a>
    </div>

    <section class="section">
      <h2 class="section__title">Partidos de hoy</h2>
      {#if loadingGames}
        <div class="games-loading">
          <div class="spinner"></div>
          <p>Cargando partidos...</p>
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
              <a href="/totales" class="game-card__cta">Analizar →</a>
            </div>
          {/each}
        </div>
      {/if}
    </section>
  </div>

{:else}
  <!-- ═══════════════════════════════════════════════════════════════════
       LANDING PAGE PARA VISITANTES
       ═══════════════════════════════════════════════════════════════════ -->
  <div class="landing">
    
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero__content">
        <div class="hero__badge">
          <span class="hero__badge-dot"></span>
          Motor Predictivo v{MODEL_VERSION.version}
        </div>
        
        <h1 class="hero__title">
          Predicciones NBA<br />
          <span class="hero__title--accent">con Inteligencia Artificial</span>
        </h1>
        
        <p class="hero__subtitle">
          Sistema predictivo de totales con <strong>61.3% win rate</strong> verificable.
          Análisis de 15+ factores contextuales en tiempo real.
        </p>

        <div class="hero__stats">
          <div class="hero__stat">
            <span class="hero__stat-value">{modelStats.winRate}%</span>
            <span class="hero__stat-label">Win Rate</span>
          </div>
          <div class="hero__stat">
            <span class="hero__stat-value">{modelStats.avgROI}%</span>
            <span class="hero__stat-label">ROI Promedio</span>
          </div>
          <div class="hero__stat">
            <span class="hero__stat-value">+{modelStats.clvAvg}</span>
            <span class="hero__stat-label">CLV Promedio</span>
          </div>
        </div>

        <div class="hero__cta">
          <a href="/register" class="btn btn--primary btn--lg">
            Comenzar gratis →
          </a>
          <a href="/results" class="btn btn--ghost btn--lg">
            Ver track record
          </a>
        </div>

        <p class="hero__disclaimer">
          Sin tarjeta de crédito · Cancela cuando quieras
        </p>
      </div>

      <div class="hero__visual">
        <div class="hero__card">
          <div class="hero__card-header">
            <span class="hero__card-badge">🔥 TOP PICK</span>
            <span class="hero__card-period">HALF</span>
          </div>
          <div class="hero__card-matchup">Lakers vs Celtics</div>
          <div class="hero__card-prediction">
            <span class="hero__card-direction">OVER</span>
            <span class="hero__card-line">112.5</span>
          </div>
          <div class="hero__card-stats">
            <span>Proyección: <strong>118.2</strong></span>
            <span>Edge: <strong class="text-green">+5.7 pts</strong></span>
          </div>
          <div class="hero__card-confidence">
            <div class="hero__card-bar">
              <div class="hero__card-fill" style="width: 78%"></div>
            </div>
            <span>78% confianza</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="features" id="features">
      <div class="features__header">
        <h2 class="features__title">Todo lo que necesitas para apostar con ventaja</h2>
        <p class="features__subtitle">Herramientas profesionales al alcance de todos</p>
      </div>

      <div class="features__grid">
        {#each features as feature}
          <div class="feature-card">
            <span class="feature-card__icon">{feature.icon}</span>
            <h3 class="feature-card__title">{feature.title}</h3>
            <p class="feature-card__desc">{feature.description}</p>
          </div>
        {/each}
      </div>
    </section>

    <!-- Pricing Section -->
    <section class="pricing" id="pricing">
      <div class="pricing__header">
        <h2 class="pricing__title">Planes para cada nivel</h2>
        <p class="pricing__subtitle">Empieza gratis, escala cuando estés listo</p>
      </div>

      <div class="pricing__grid">
        {#each plans as plan}
          <div class="plan-card" class:plan-card--highlighted={plan.highlighted}>
            {#if plan.highlighted}
              <div class="plan-card__badge">Más popular</div>
            {/if}
            <h3 class="plan-card__name">{plan.name}</h3>
            <div class="plan-card__price">
              <span class="plan-card__currency">$</span>
              <span class="plan-card__amount">{plan.price}</span>
              <span class="plan-card__period">{plan.period}</span>
            </div>
            <p class="plan-card__desc">{plan.description}</p>
            <ul class="plan-card__features">
              {#each plan.features as feature}
                <li>✓ {feature}</li>
              {/each}
            </ul>
            <a 
              href={plan.name === 'Free' ? '/register' : plan.name === 'Elite' ? '/contact' : '/register?plan=pro'} 
              class="plan-card__cta"
              class:plan-card__cta--primary={plan.highlighted}
            >
              {plan.cta}
            </a>
          </div>
        {/each}
      </div>
    </section>

    <!-- CTA Final -->
    <section class="final-cta">
      <h2 class="final-cta__title">¿Listo para apostar con ventaja?</h2>
      <p class="final-cta__subtitle">
        Únete a miles de apostadores que usan datos, no corazonadas.
      </p>
      <a href="/register" class="btn btn--primary btn--lg">
        Crear cuenta gratis →
      </a>
    </section>

    <!-- Footer -->
    <footer class="footer">
      <div class="footer__content">
        <div class="footer__brand">
          <span class="footer__logo">🏀 NioSports Pro</span>
          <p class="footer__tagline">Predicciones NBA con IA</p>
        </div>
        <div class="footer__links">
          <a href="/methodology">Metodología</a>
          <a href="/results">Track Record</a>
          <a href="/login">Iniciar sesión</a>
        </div>
        <p class="footer__disclaimer">
          NioSports Pro es una herramienta de análisis. Las apuestas deportivas implican riesgo.
          Apuesta responsablemente.
        </p>
      </div>
    </footer>
  </div>
{/if}

<style>
  /* ═══════════════════════════════════════════════════════════════════
     DASHBOARD STYLES
     ═══════════════════════════════════════════════════════════════════ */
  .dashboard {
    max-width: 1200px;
    margin: 0 auto;
    padding: 32px 20px 80px;
  }

  .dashboard__header { margin-bottom: 28px; }
  .dashboard__title {
    font-family: 'Orbitron', sans-serif;
    font-size: clamp(1.4rem, 3vw, 2rem);
    font-weight: 900;
    margin-bottom: 6px;
  }
  .dashboard__subtitle { color: var(--color-text-muted); font-size: 0.95rem; }

  .demo-badge {
    display: inline-block;
    margin-top: 8px;
    padding: 4px 12px;
    border-radius: 99px;
    background: rgba(245,158,11,0.15);
    color: #f59e0b;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .quick-links {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
    margin-bottom: 32px;
  }

  .quick-link {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 20px;
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    text-decoration: none;
    transition: all 0.15s ease;
  }

  .quick-link:hover {
    border-color: var(--color-border-hover);
    transform: translateY(-2px);
  }

  .quick-link--primary {
    background: linear-gradient(135deg, rgba(251,191,36,0.1), rgba(52,211,153,0.05));
    border-color: rgba(251,191,36,0.3);
  }

  .quick-link__icon { font-size: 1.5rem; }
  .quick-link__text { flex: 1; font-weight: 600; }
  .quick-link__arrow { color: var(--color-text-muted); }

  .section { margin-bottom: 32px; }
  .section__title {
    font-size: 1.1rem;
    font-weight: 800;
    margin-bottom: 16px;
  }

  .games-loading {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 40px;
    justify-content: center;
    color: var(--color-text-muted);
  }

  .spinner {
    width: 24px;
    height: 24px;
    border: 2px solid rgba(251,191,36,0.2);
    border-top-color: #fbbf24;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .games-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 14px;
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

  .game-card__teams { display: flex; flex-direction: column; gap: 4px; }
  .game-card__team { font-weight: 600; font-size: 0.9rem; }
  .game-card__team--home { color: #60a5fa; }
  .game-card__vs { color: var(--color-text-muted); font-size: 0.75rem; }

  .game-card__cta {
    padding: 8px 14px;
    background: rgba(251,191,36,0.1);
    border: 1px solid rgba(251,191,36,0.2);
    border-radius: 8px;
    color: #fbbf24;
    font-size: 0.8rem;
    font-weight: 600;
    text-decoration: none;
    transition: all 0.15s;
  }

  .game-card__cta:hover {
    background: rgba(251,191,36,0.2);
  }

  .empty-state {
    text-align: center;
    padding: 40px;
    color: var(--color-text-muted);
  }

  /* ═══════════════════════════════════════════════════════════════════
     LANDING PAGE STYLES
     ═══════════════════════════════════════════════════════════════════ */
  .landing {
    background: var(--color-bg-base, #0a0e1a);
  }

  /* Hero */
  .hero {
    min-height: 90vh;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 60px;
    align-items: center;
    max-width: 1200px;
    margin: 0 auto;
    padding: 80px 20px;
  }

  @media (max-width: 900px) {
    .hero {
      grid-template-columns: 1fr;
      text-align: center;
      min-height: auto;
      padding: 60px 20px;
    }
    .hero__visual { order: -1; }
  }

  .hero__badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 14px;
    background: rgba(251,191,36,0.1);
    border: 1px solid rgba(251,191,36,0.2);
    border-radius: 99px;
    font-size: 0.8rem;
    color: #fbbf24;
    font-weight: 600;
    margin-bottom: 24px;
  }

  .hero__badge-dot {
    width: 8px;
    height: 8px;
    background: #34d399;
    border-radius: 50%;
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .hero__title {
    font-family: 'Orbitron', sans-serif;
    font-size: clamp(2rem, 5vw, 3.5rem);
    font-weight: 900;
    line-height: 1.1;
    margin-bottom: 20px;
  }

  .hero__title--accent {
    background: linear-gradient(135deg, #fbbf24, #34d399);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .hero__subtitle {
    font-size: 1.15rem;
    color: var(--color-text-secondary);
    line-height: 1.6;
    margin-bottom: 32px;
  }

  .hero__subtitle strong {
    color: #34d399;
  }

  .hero__stats {
    display: flex;
    gap: 32px;
    margin-bottom: 32px;
  }

  @media (max-width: 900px) {
    .hero__stats { justify-content: center; }
  }

  .hero__stat {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .hero__stat-value {
    font-size: 1.8rem;
    font-weight: 900;
    color: #fbbf24;
    font-family: 'DM Mono', monospace;
  }

  .hero__stat-label {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .hero__cta {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
  }

  @media (max-width: 900px) {
    .hero__cta { justify-content: center; flex-wrap: wrap; }
  }

  .hero__disclaimer {
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  /* Hero Visual Card */
  .hero__visual {
    display: flex;
    justify-content: center;
  }

  .hero__card {
    background: var(--color-bg-card);
    border: 1px solid rgba(251,191,36,0.3);
    border-radius: 20px;
    padding: 24px;
    width: 100%;
    max-width: 340px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.4);
  }

  .hero__card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .hero__card-badge {
    background: linear-gradient(135deg, #fbbf24, #f59e0b);
    color: #000;
    font-size: 0.65rem;
    font-weight: 800;
    padding: 4px 10px;
    border-radius: 6px;
  }

  .hero__card-period {
    background: rgba(167,139,250,0.2);
    color: #a78bfa;
    font-size: 0.7rem;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 6px;
  }

  .hero__card-matchup {
    font-weight: 700;
    font-size: 1rem;
    margin-bottom: 16px;
  }

  .hero__card-prediction {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 16px;
  }

  .hero__card-direction {
    font-family: 'Orbitron', sans-serif;
    font-size: 1.2rem;
    font-weight: 900;
    color: #34d399;
  }

  .hero__card-line {
    font-size: 2.5rem;
    font-weight: 900;
  }

  .hero__card-stats {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    color: var(--color-text-muted);
    margin-bottom: 16px;
  }

  .hero__card-stats strong {
    color: var(--color-text-primary);
  }

  .text-green { color: #34d399 !important; }

  .hero__card-confidence {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }

  .hero__card-bar {
    flex: 1;
    height: 6px;
    background: rgba(255,255,255,0.1);
    border-radius: 3px;
    overflow: hidden;
  }

  .hero__card-fill {
    height: 100%;
    background: linear-gradient(90deg, #fbbf24, #34d399);
    border-radius: 3px;
  }

  /* Buttons */
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
    border-radius: 10px;
    font-size: 0.95rem;
    font-weight: 700;
    text-decoration: none;
    transition: all 0.15s ease;
    cursor: pointer;
    border: none;
  }

  .btn--primary {
    background: linear-gradient(135deg, #fbbf24, #f59e0b);
    color: #000;
  }

  .btn--primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(251,191,36,0.3);
  }

  .btn--ghost {
    background: transparent;
    border: 1px solid var(--color-border);
    color: var(--color-text-primary);
  }

  .btn--ghost:hover {
    background: rgba(255,255,255,0.05);
    border-color: var(--color-border-hover);
  }

  .btn--lg {
    padding: 14px 28px;
    font-size: 1rem;
  }

  /* Features */
  .features {
    max-width: 1200px;
    margin: 0 auto;
    padding: 80px 20px;
  }

  .features__header {
    text-align: center;
    margin-bottom: 48px;
  }

  .features__title {
    font-family: 'Orbitron', sans-serif;
    font-size: clamp(1.5rem, 3vw, 2rem);
    font-weight: 900;
    margin-bottom: 12px;
  }

  .features__subtitle {
    color: var(--color-text-muted);
    font-size: 1.05rem;
  }

  .features__grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
  }

  .feature-card {
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: 16px;
    padding: 28px 24px;
    transition: all 0.2s ease;
  }

  .feature-card:hover {
    border-color: rgba(251,191,36,0.3);
    transform: translateY(-4px);
  }

  .feature-card__icon {
    font-size: 2rem;
    margin-bottom: 16px;
    display: block;
  }

  .feature-card__title {
    font-size: 1.1rem;
    font-weight: 800;
    margin-bottom: 8px;
  }

  .feature-card__desc {
    color: var(--color-text-muted);
    font-size: 0.9rem;
    line-height: 1.5;
  }

  /* Pricing */
  .pricing {
    max-width: 1100px;
    margin: 0 auto;
    padding: 80px 20px;
  }

  .pricing__header {
    text-align: center;
    margin-bottom: 48px;
  }

  .pricing__title {
    font-family: 'Orbitron', sans-serif;
    font-size: clamp(1.5rem, 3vw, 2rem);
    font-weight: 900;
    margin-bottom: 12px;
  }

  .pricing__subtitle {
    color: var(--color-text-muted);
    font-size: 1.05rem;
  }

  .pricing__grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 24px;
  }

  .plan-card {
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: 20px;
    padding: 32px 28px;
    position: relative;
    transition: all 0.2s ease;
  }

  .plan-card--highlighted {
    border-color: rgba(251,191,36,0.5);
    background: linear-gradient(135deg, rgba(251,191,36,0.05), transparent);
  }

  .plan-card__badge {
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #fbbf24, #f59e0b);
    color: #000;
    font-size: 0.7rem;
    font-weight: 800;
    padding: 6px 16px;
    border-radius: 99px;
  }

  .plan-card__name {
    font-size: 1.2rem;
    font-weight: 800;
    margin-bottom: 8px;
  }

  .plan-card__price {
    margin-bottom: 8px;
  }

  .plan-card__currency {
    font-size: 1.2rem;
    color: var(--color-text-muted);
    vertical-align: top;
  }

  .plan-card__amount {
    font-size: 3rem;
    font-weight: 900;
    font-family: 'DM Mono', monospace;
  }

  .plan-card__period {
    font-size: 0.9rem;
    color: var(--color-text-muted);
  }

  .plan-card__desc {
    color: var(--color-text-muted);
    font-size: 0.9rem;
    margin-bottom: 20px;
  }

  .plan-card__features {
    list-style: none;
    margin-bottom: 24px;
  }

  .plan-card__features li {
    padding: 8px 0;
    font-size: 0.9rem;
    color: var(--color-text-secondary);
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }

  .plan-card__cta {
    display: block;
    width: 100%;
    padding: 14px;
    text-align: center;
    border-radius: 10px;
    font-weight: 700;
    text-decoration: none;
    background: rgba(255,255,255,0.05);
    border: 1px solid var(--color-border);
    color: var(--color-text-primary);
    transition: all 0.15s ease;
  }

  .plan-card__cta:hover {
    background: rgba(255,255,255,0.1);
  }

  .plan-card__cta--primary {
    background: linear-gradient(135deg, #fbbf24, #f59e0b);
    border: none;
    color: #000;
  }

  .plan-card__cta--primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(251,191,36,0.3);
  }

  /* Final CTA */
  .final-cta {
    text-align: center;
    padding: 80px 20px;
    background: linear-gradient(135deg, rgba(251,191,36,0.05), rgba(52,211,153,0.03));
  }

  .final-cta__title {
    font-family: 'Orbitron', sans-serif;
    font-size: clamp(1.5rem, 3vw, 2.2rem);
    font-weight: 900;
    margin-bottom: 12px;
  }

  .final-cta__subtitle {
    color: var(--color-text-muted);
    font-size: 1.1rem;
    margin-bottom: 28px;
  }

  /* Footer */
  .footer {
    border-top: 1px solid var(--color-border);
    padding: 40px 20px;
  }

  .footer__content {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    text-align: center;
  }

  .footer__logo {
    font-family: 'Orbitron', sans-serif;
    font-weight: 900;
    font-size: 1.2rem;
  }

  .footer__tagline {
    color: var(--color-text-muted);
    font-size: 0.85rem;
  }

  .footer__links {
    display: flex;
    gap: 24px;
  }

  .footer__links a {
    color: var(--color-text-muted);
    text-decoration: none;
    font-size: 0.9rem;
    transition: color 0.15s;
  }

  .footer__links a:hover {
    color: #fbbf24;
  }

  .footer__disclaimer {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    max-width: 500px;
  }
</style>