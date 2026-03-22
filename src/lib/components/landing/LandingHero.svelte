<script>
  import { MODEL_VERSION } from '$lib/engine/constants.js';
</script>

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
      Análisis NBA
      <span class="land-hero__title-accent">Cuantitativo y Transparente</span>
    </h1>

    <p class="land-hero__subtitle">
      Motor cuantitativo de totales NBA con <strong>15+ factores contextuales</strong>.
      Resultados publicados con total transparencia.
    </p>

    <div class="land-hero__stats">
      <div class="land-hero__stat">
        <span class="land-hero__stat-value">15+</span>
        <span class="land-hero__stat-label">Factores Contextuales</span>
      </div>
      <div class="land-hero__stat-divider"></div>
      <div class="land-hero__stat">
        <span class="land-hero__stat-value">Q1·H·F</span>
        <span class="land-hero__stat-label">Análisis por Período</span>
      </div>
      <div class="land-hero__stat-divider"></div>
      <div class="land-hero__stat">
        <span class="land-hero__stat-value">CLV</span>
        <span class="land-hero__stat-label">Tracking Integrado</span>
      </div>
    </div>

    <div class="land-hero__cta">
      <a href="/login" class="btn btn--primary btn--lg">
        Comenzar gratis
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </a>
      <a href="/results" class="btn btn--glass btn--lg">Ver track record</a>
    </div>

    <p class="land-hero__disclaimer">Sin tarjeta de crédito · Cancela cuando quieras</p>
  </div>

  <div class="land-hero__visual">
    <div class="land-hero__card">
      <div class="land-hero__card-glow"></div>
      <div class="land-hero__card-inner">
        <div class="land-hero__card-header">
          <span class="land-hero__card-badge">TOP PICK</span>
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
          <div class="land-hero__card-bar"><div class="land-hero__card-fill"></div></div>
          <span>78% confianza</span>
        </div>
      </div>
    </div>
  </div>
</section>

<style>
  .land-hero {
    position: relative; min-height: 100vh;
    display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center;
    max-width: 1400px; margin: 0 auto; padding: 120px 32px 80px;
  }
  @media (max-width: 1024px) {
    .land-hero { grid-template-columns: 1fr; text-align: center; gap: 60px; padding: 100px 24px 60px; }
    .land-hero__visual { order: -1; }
    .land-hero__subtitle { margin: 0 auto 40px; }
    .land-hero__stats { justify-content: center; }
    .land-hero__cta { justify-content: center; }
  }

  .land-hero__bg { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
  .land-hero__gradient { position: absolute; top: -50%; left: -20%; width: 80%; height: 100%; background: radial-gradient(ellipse, rgba(99,102,241,0.08) 0%, transparent 70%); filter: blur(60px); }
  .land-hero__grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px); background-size: 60px 60px; mask-image: linear-gradient(to bottom, transparent 0%, black 30%, black 70%, transparent 100%); }

  .land-hero__content { position: relative; z-index: 1; }
  .land-hero__badge {
    display: inline-flex; align-items: center; gap: 10px; padding: 10px 20px;
    background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.2);
    border-radius: 9999px; font-size: 0.9rem; font-weight: 600; color: #6366F1; margin-bottom: 32px;
  }
  .land-hero__badge-dot { width: 8px; height: 8px; background: #10B981; border-radius: 50%; box-shadow: 0 0 12px rgba(16,185,129,0.8); animation: pulse-dot 2s ease-in-out infinite; }
  @keyframes pulse-dot { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(0.85); } }

  .land-hero__title { font-family: 'Inter', sans-serif; font-size: clamp(2.5rem, 6vw, 4.5rem); font-weight: 900; line-height: 1.05; letter-spacing: -0.03em; margin-bottom: 24px; }
  .land-hero__title-accent { display: block; background: linear-gradient(135deg, #6366F1 0%, #10B981 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }

  .land-hero__subtitle { font-size: 1.2rem; line-height: 1.7; color: rgba(255,255,255,0.6); margin-bottom: 40px; max-width: 540px; }
  .land-hero__subtitle strong { color: #10B981; font-weight: 700; }

  .land-hero__stats { display: flex; align-items: center; margin-bottom: 48px; flex-wrap: wrap; }
  .land-hero__stat { display: flex; flex-direction: column; gap: 4px; padding: 0 32px; }
  .land-hero__stat:first-child { padding-left: 0; }
  .land-hero__stat:last-child { padding-right: 0; }
  .land-hero__stat-divider { width: 1px; height: 40px; background: rgba(255,255,255,0.1); }
  .land-hero__stat-value { font-family: 'DM Mono', monospace; font-size: 2rem; font-weight: 700; color: #6366F1; }
  .land-hero__stat-label { font-size: 0.8rem; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.1em; }

  .land-hero__cta { display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
  .land-hero__disclaimer { font-size: 0.85rem; color: rgba(255,255,255,0.4); }

  /* Hero Card */
  .land-hero__visual { position: relative; z-index: 1; display: flex; justify-content: center; }
  .land-hero__card { position: relative; width: 100%; max-width: 380px; }
  .land-hero__card-glow { position: absolute; inset: -40px; background: radial-gradient(ellipse at center, rgba(99,102,241,0.15) 0%, transparent 70%); filter: blur(40px); animation: glow-pulse 4s ease-in-out infinite; }
  @keyframes glow-pulse { 0%, 100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 0.8; transform: scale(1.05); } }

  .land-hero__card-inner { position: relative; background: linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02)); border: 1px solid rgba(99,102,241,0.3); border-radius: 20px; padding: 28px; backdrop-filter: blur(20px); }
  .land-hero__card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
  .land-hero__card-badge { font-size: 0.7rem; font-weight: 800; padding: 6px 12px; background: linear-gradient(135deg, #6366F1, #4F46E5); color: #fff; border-radius: 6px; }
  .land-hero__card-period { font-size: 0.75rem; font-weight: 700; padding: 6px 12px; background: rgba(99,102,241,0.2); color: #818cf8; border-radius: 6px; }
  .land-hero__card-matchup { font-size: 1.1rem; font-weight: 700; margin-bottom: 20px; color: #fff; }
  .land-hero__card-prediction { display: flex; align-items: baseline; gap: 16px; margin-bottom: 24px; }
  .land-hero__card-direction { font-family: 'Inter', sans-serif; font-size: 1.4rem; font-weight: 900; color: #10B981; }
  .land-hero__card-line { font-family: 'DM Mono', monospace; font-size: 3.5rem; font-weight: 700; color: #fff; }
  .land-hero__card-stats { display: flex; gap: 24px; margin-bottom: 20px; }
  .land-hero__card-stat { display: flex; flex-direction: column; gap: 2px; }
  .land-hero__card-stat-label { font-size: 0.75rem; color: rgba(255,255,255,0.4); }
  .land-hero__card-stat-value { font-size: 1rem; font-weight: 700; color: #fff; }
  .land-hero__card-stat-value--green { color: #10B981; }
  .land-hero__card-confidence { display: flex; align-items: center; gap: 14px; font-size: 0.8rem; color: rgba(255,255,255,0.5); }
  .land-hero__card-bar { flex: 1; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; }
  .land-hero__card-fill { width: 78%; height: 100%; background: linear-gradient(90deg, #6366F1, #10B981); border-radius: 3px; }

  /* Buttons */
  :global(.btn) {
    display: inline-flex; align-items: center; justify-content: center; gap: 10px;
    padding: 14px 28px; border-radius: 14px; font-size: 1rem; font-weight: 700;
    text-decoration: none; border: none; cursor: pointer; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }
  :global(.btn--primary) { background: linear-gradient(135deg, #6366F1, #4F46E5); color: #fff; box-shadow: 0 4px 20px rgba(99,102,241,0.3); }
  :global(.btn--primary:hover) { transform: translateY(-3px); box-shadow: 0 8px 30px rgba(99,102,241,0.4); }
  :global(.btn--glass) { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: #fff; }
  :global(.btn--glass:hover) { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.2); }
  :global(.btn--lg) { padding: 16px 32px; font-size: 1.05rem; }
</style>