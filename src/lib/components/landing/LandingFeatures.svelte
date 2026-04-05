<script>
  import { Brain, BarChart3, Wallet, Target, Zap, TrendingUp } from 'lucide-svelte';

  const features = [
    { icon: Brain, title: 'Motor Cuantitativo v2.0', desc: 'Modelo estadístico que analiza 15+ factores contextuales por partido.' },
    { icon: BarChart3, title: 'Análisis por Períodos', desc: 'Predicciones Q1, HALF y FULL con edge diferenciado.' },
    { icon: Wallet, title: 'Gestión de Bankroll', desc: 'Tracking de ROI y evolución del capital.' },
    { icon: Target, title: 'CLV Tracking', desc: 'Mide si encuentras valor antes que el mercado.' },
    { icon: Zap, title: 'Alertas (próximamente)', desc: 'Notificaciones de picks de alta confianza.' },
    { icon: TrendingUp, title: 'Track Record Público', desc: 'Historial completo de predicciones con resultados reales.' },
  ];
</script>

<section class="features">
  <div class="features__header">
    <span class="features__label">Características</span>
    <h2 class="features__title">Herramientas de análisis profesional</h2>
    <p class="features__subtitle">Datos, factores contextuales y tracking de rendimiento real</p>
  </div>
  <div class="features__grid">
    {#each features as feature}
      <div class="feature-card">
        <div class="feature-card__icon">
          <svelte:component this={feature.icon} size={28} strokeWidth={1.8} />
        </div>
        <h3 class="feature-card__title">{feature.title}</h3>
        <p class="feature-card__desc">{feature.desc}</p>
      </div>
    {/each}
  </div>
</section>

<style>
  .features { max-width: 1200px; margin: 0 auto; padding: 100px 32px; }
  .features__header { text-align: center; margin-bottom: 60px; }
  .features__label { display: inline-block; font-size: 0.8rem; font-weight: 700; color: #6366F1; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 16px; }
  .features__title { font-family: 'Inter', sans-serif; font-size: clamp(1.8rem, 4vw, 2.5rem); font-weight: 900; margin-bottom: 16px; letter-spacing: -0.02em; }
  .features__subtitle { font-size: 1.1rem; color: var(--color-text-muted); }

  .features__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
  @media (max-width: 900px) { .features__grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 600px) { .features__grid { grid-template-columns: 1fr; } }

  .feature-card {
    background: var(--color-bg-card); border: 1px solid var(--color-border);
    border-radius: 20px; padding: 32px 28px; transition: all 0.3s ease;
  }
  .feature-card:hover { transform: translateY(-6px); border-color: rgba(99,102,241,0.2); box-shadow: 0 16px 48px rgba(0,0,0,0.2); }
  .feature-card__icon { color: #6366F1; margin-bottom: 20px; }
  .feature-card__title { font-size: 1.15rem; font-weight: 800; margin-bottom: 10px; color: var(--color-text-primary); }
  .feature-card__desc { font-size: 0.95rem; color: var(--color-text-muted); line-height: 1.6; }
</style>