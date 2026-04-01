<script>
  import { onMount } from 'svelte';
  
  let activeSection = 'overview';
  
  const sections = [
    { id: 'overview', label: 'Visión General' },
    { id: 'model', label: 'El Modelo' },
    { id: 'factors', label: 'Factores' },
    { id: 'probability', label: 'Probabilidad' },
    { id: 'validation', label: 'Validación' },
    { id: 'limitations', label: 'Limitaciones' },
  ];

  function scrollToSection(id) {
    activeSection = id;
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  onMount(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            activeSection = entry.target.id;
          }
        });
      },
      { threshold: 0.3, rootMargin: '-80px 0px -50% 0px' }
    );

    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  });
</script>

<svelte:head>
  <title>Metodología — NioSports Pro</title>
  <meta name="description" content="Explicación transparente de cómo funciona el Motor Predictivo v3.0 de NioSports Pro. XGBoost, 26 features, calibración Platt." />
</svelte:head>

<div class="page">
  
  <!-- Sidebar Navigation -->
  <nav class="sidebar">
    <div class="sidebar__title">Contenido</div>
    {#each sections as section}
      <button 
        class="sidebar__link" 
        class:active={activeSection === section.id}
        on:click={() => scrollToSection(section.id)}
      >
        <span>{section.label}</span>
      </button>
    {/each}
  </nav>

  <!-- Main Content -->
  <main class="content">
    
    <div class="page__header">
      <span class="page__label">Transparencia total</span>
      <h1 class="page__title">Metodología</h1>
      <p class="page__subtitle">Cómo funciona el Motor Predictivo v3.0 — XGBoost con 26 features y calibración Platt</p>
      <div class="version-badge">Motor Predictivo v3.0 — XGBoost</div>
    </div>

    <!-- Section: Overview -->
    <section id="overview" class="section">
      <h2 class="section__title">Visión General</h2>
      
      <div class="intro-card">
        <p>
          NioSports Pro utiliza un <strong>modelo XGBoost con 26 features y calibración Platt</strong> para 
          predecir el total de puntos en partidos NBA. A diferencia de sistemas que usan fórmulas arbitrarias, 
          nuestro motor está fundamentado en machine learning real, entrenado con 5,999 partidos históricos,
          y validado con walk-forward temporal para evitar cualquier forma de data leakage.
        </p>
      </div>

      <div class="principles-grid">
        <div class="principle-card">
          <h3>Precisión Estadística</h3>
          <p>Probabilidades calibradas con Platt scaling sobre predicciones XGBoost. ECE (Expected Calibration Error) verificado en cada bin.</p>
        </div>
        
        <div class="principle-card">
          <h3>26 Features</h3>
          <p>Rolling totals (L5, L10, L20), home/away splits, rest days, B2B, altitude, momentum, matchup volatility, y más.</p>
        </div>
        
        <div class="principle-card">
          <h3>Transparencia Total</h3>
          <p>Cada pick muestra los factores principales que influyeron en la predicción, permitiendo al usuario evaluar el análisis.</p>
        </div>
        
        <div class="principle-card">
          <h3>Validación Continua</h3>
          <p>Walk-forward backtesting con datos históricos reales y tracking de Closing Line Value para medir el edge real del modelo.</p>
        </div>
      </div>
    </section>

    <!-- Section: Model -->
    <section id="model" class="section">
      <h2 class="section__title">El Modelo Predictivo</h2>
      
      <p class="section__intro">
        El motor predictivo opera en tres capas claramente definidas:
      </p>

      <div class="layer-stack">
        <div class="layer">
          <div class="layer__number">1</div>
          <div class="layer__content">
            <h3>Capa de Datos</h3>
            <p>Recopilación de estadísticas actualizadas de cada equipo: puntos por período (Q1, HALF, FULL), 
            pace, eficiencia ofensiva/defensiva, splits home/away, y calendario (back-to-back, viajes).
            5,999 partidos de 5 temporadas NBA (2020-2025).</p>
            <div class="layer__tags">
              <span class="tag">BallDontLie API</span>
              <span class="tag">nba_api Advanced</span>
              <span class="tag">Home/Away splits</span>
            </div>
          </div>
        </div>

        <div class="layer">
          <div class="layer__number">2</div>
          <div class="layer__content">
            <h3>Capa de Features (26 variables)</h3>
            <p>Transformación de datos crudos en features predictivos: rolling totals (L5, L10, L20), 
            momentum (L5 vs L10), matchup volatility, venue split diff, rest days, B2B flags, altitude, 
            y days into season.</p>
            <div class="layer__tags">
              <span class="tag">Rolling windows</span>
              <span class="tag">Momentum signals</span>
              <span class="tag">Context factors</span>
            </div>
          </div>
        </div>

        <div class="layer">
          <div class="layer__number">3</div>
          <div class="layer__content">
            <h3>Capa de Predicción</h3>
            <p>XGBoost genera la proyección de puntos totales. Calibración Platt convierte la diferencia 
            proyección-línea en probabilidad calibrada. Expected Value calcula el edge sobre el mercado.</p>
            <div class="layer__tags">
              <span class="tag">XGBoost Booster</span>
              <span class="tag">Platt Scaling</span>
              <span class="tag">Expected Value</span>
            </div>
          </div>
        </div>
      </div>

      <div class="formula-card">
        <h3>Arquitectura del Modelo</h3>
        <div class="formula">
          <code>XGBoost(300 trees, depth=4, lr=0.05) → Platt(A, B) → P(OVER) = 1/(1+exp(A*score+B))</code>
        </div>
        <p class="formula-note">
          El modelo fue optimizado con Optuna (50 trials) y validado con walk-forward temporal. 
          Nunca usa datos futuros para entrenar.
        </p>
      </div>
    </section>

    <!-- Section: Factors -->
    <section id="factors" class="section">
      <h2 class="section__title">Factores Contextuales</h2>
      
      <p class="section__intro">
        Cada ajuste tiene fundamento empírico basado en análisis de datos históricos NBA 2019-2025:
      </p>

      <div class="factors-table-wrap">
        <table class="factors-table">
          <thead>
            <tr>
              <th>Factor</th>
              <th>Ajuste (FULL)</th>
              <th>Rango</th>
              <th>Descripción</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><span class="factor-name">Back-to-Back</span></td>
              <td class="cell--negative">-2.8 pts</td>
              <td>±0.8</td>
              <td>Fatiga por jugar dos noches consecutivas</td>
            </tr>
            <tr>
              <td><span class="factor-name">3rd in 4 Nights</span></td>
              <td class="cell--negative">-4.0 pts</td>
              <td>±1.0</td>
              <td>Tercer partido en cuatro noches</td>
            </tr>
            <tr>
              <td><span class="factor-name">Viaje Largo</span></td>
              <td class="cell--negative">-1.5 pts</td>
              <td>±0.5</td>
              <td>Viaje &gt;2000 millas antes del partido</td>
            </tr>
            <tr>
              <td><span class="factor-name">Altitud (Denver)</span></td>
              <td class="cell--positive">+1.2 pts</td>
              <td>±0.4</td>
              <td>Ventaja de altitud para equipos locales</td>
            </tr>
            <tr>
              <td><span class="factor-name">Estrella Ausente</span></td>
              <td class="cell--negative">-4.5 pts</td>
              <td>-3.5 a -6.0</td>
              <td>Jugador top-10 en usage rate ausente</td>
            </tr>
            <tr>
              <td><span class="factor-name">Playoffs</span></td>
              <td class="cell--negative">-2.0 pts</td>
              <td>±0.6</td>
              <td>Juego más defensivo en postemporada</td>
            </tr>
            <tr>
              <td><span class="factor-name">Pace Matching</span></td>
              <td>Variable</td>
              <td>±3.0</td>
              <td>Ajuste basado en ritmo combinado de ambos equipos</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="info-callout">
        <div>
          <strong>Calibración continua:</strong> Los ajustes se recalibran con datos nuevos cada temporada. 
          El rango indica la incertidumbre del factor basada en varianza histórica. El modelo XGBoost aprende 
          automáticamente la importancia relativa de cada factor.
        </div>
      </div>
    </section>

    <!-- Section: Probability -->
    <section id="probability" class="section">
      <h2 class="section__title">Cálculo de Probabilidad</h2>
      
      <p class="section__intro">
        La probabilidad de OVER/UNDER se calcula usando <strong>calibración Platt</strong> sobre 
        las predicciones del modelo XGBoost:
      </p>

      <div class="math-card">
        <div class="math-step">
          <div class="math-step__number">1</div>
          <div class="math-step__content">
            <h4>Proyección = XGBoost(26 features)</h4>
            <p>El modelo predice el total de puntos esperado para el partido.</p>
          </div>
        </div>

        <div class="math-step">
          <div class="math-step__number">2</div>
          <div class="math-step__content">
            <h4>Score = Proyección - Línea</h4>
            <p>La diferencia entre nuestra proyección y la línea del mercado. Positivo = señal OVER.</p>
          </div>
        </div>

        <div class="math-step">
          <div class="math-step__number">3</div>
          <div class="math-step__content">
            <h4>P(OVER) = 1 / (1 + exp(A × Score + B))</h4>
            <p>Calibración Platt con parámetros A y B ajustados en datos out-of-sample. Produce probabilidades 
            calibradas donde "60% predicho" corresponde a ~60% de aciertos reales.</p>
            <div class="std-values">
              <span class="std-item"><strong>A:</strong> -0.163</span>
              <span class="std-item"><strong>B:</strong> 0.256</span>
            </div>
          </div>
        </div>

        <div class="math-step">
          <div class="math-step__number">4</div>
          <div class="math-step__content">
            <h4>EV = P × (DecimalOdds - 1) - (1 - P)</h4>
            <p>Expected Value positivo indica que la apuesta tiene valor matemático a largo plazo.</p>
          </div>
        </div>
      </div>

      <div class="example-card">
        <h3>Ejemplo Práctico</h3>
        <div class="example-content">
          <p><strong>Partido:</strong> Lakers vs Celtics | <strong>Línea:</strong> 228.5 | <strong>Período:</strong> FULL</p>
          <p><strong>Proyección XGBoost:</strong> 235.2 puntos</p>
          <div class="example-calc">
            <p>Score = 235.2 - 228.5 = <strong>6.7</strong></p>
            <p>P(OVER) = 1/(1+exp(-0.163×6.7+0.256)) = <strong>68.4%</strong></p>
            <p>EV = 0.684×0.909 - 0.316 = <strong>+30.6%</strong></p>
          </div>
          <p class="example-result">
            El modelo recomienda <span class="highlight-over">OVER 228.5</span> con 68.4% de confianza y EV +30.6%
          </p>
        </div>
      </div>
    </section>

    <!-- Section: Validation -->
    <section id="validation" class="section">
      <h2 class="section__title">Validación y Métricas</h2>
      
      <p class="section__intro">
        Un modelo sin validación es solo una opinión. Estas son las métricas que usamos para evaluar el rendimiento:
      </p>

      <div class="metrics-grid">
        <div class="metric-card">
          <h3>Win Rate</h3>
          <p>Porcentaje de picks ganadores. El break-even en apuestas con odds -110 es <strong>52.4%</strong>.</p>
          <div class="metric-target">Objetivo: &gt;52.4%</div>
        </div>

        <div class="metric-card metric-card--highlight">
          <h3>CLV (Closing Line Value)</h3>
          <p>La diferencia entre la línea cuando hicimos el pick y la línea de cierre. <strong>Esta es la métrica más importante</strong> porque mide si estamos venciendo al mercado.</p>
          <div class="metric-target">Objetivo: &gt;0.0 pts</div>
        </div>

        <div class="metric-card">
          <h3>ROI</h3>
          <p>Return on Investment asumiendo apuestas flat (misma cantidad en cada pick).</p>
          <div class="metric-target">Objetivo: &gt;3%</div>
        </div>

        <div class="metric-card">
          <h3>Calibración (ECE)</h3>
          <p>Expected Calibration Error. Mide qué tan bien las probabilidades predichas corresponden a los resultados reales.</p>
          <div class="metric-target">Objetivo: &lt;0.03</div>
        </div>
      </div>

      <div class="validation-note">
        <h3>Metodología de Backtesting</h3>
        <ul>
          <li><strong>Walk-forward:</strong> Solo usamos datos disponibles ANTES del partido (sin look-ahead bias)</li>
          <li><strong>Fold 1:</strong> Train 2020-2022 → Test 2023 (MAE: 14.95)</li>
          <li><strong>Fold 2:</strong> Train 2020-2023 → Test 2024 (MAE: 15.31)</li>
          <li><strong>Out-of-sample:</strong> Testeamos en datos que el modelo nunca vio durante entrenamiento</li>
          <li><strong>Significancia:</strong> Mínimo 400+ picks para conclusiones estadísticamente válidas</li>
        </ul>
      </div>
    </section>

    <!-- Section: Limitations -->
    <section id="limitations" class="section">
      <h2 class="section__title">Limitaciones Conocidas</h2>
      
      <p class="section__intro">
        Ningún modelo es perfecto. Ser honestos sobre las limitaciones es parte de nuestra filosofía de transparencia:
      </p>

      <div class="limitations-list">
        <div class="limitation-item">
          <div>
            <h3>Naturaleza Probabilística</h3>
            <p>Las predicciones son probabilidades, no certezas. Un pick con 70% de probabilidad perderá ~30% de las veces por definición.</p>
          </div>
        </div>

        <div class="limitation-item">
          <div>
            <h3>Información No Capturada</h3>
            <p>El modelo no captura noticias de último minuto, lesiones no reportadas, problemas personales de jugadores, o factores motivacionales.</p>
          </div>
        </div>

        <div class="limitation-item">
          <div>
            <h3>Sample Size</h3>
            <p>Al inicio de temporada, las estadísticas tienen mayor varianza porque hay menos datos. Las predicciones son más confiables después de ~20 juegos por equipo.</p>
          </div>
        </div>

        <div class="limitation-item">
          <div>
            <h3>Cambios de Roster</h3>
            <p>Trades y fichajes pueden alterar significativamente el rendimiento de un equipo. El modelo necesita ~5-10 juegos para ajustarse.</p>
          </div>
        </div>

        <div class="limitation-item">
          <div>
            <h3>Latencia de Datos</h3>
            <p>Las estadísticas se actualizan periódicamente. Puede haber un retraso de hasta 24 horas en reflejar los últimos partidos.</p>
          </div>
        </div>
      </div>

      <div class="disclaimer-card">
        <h3>Aviso Legal</h3>
        <p>
          NioSports Pro es una herramienta de <strong>análisis estadístico</strong>, no un servicio de asesoría financiera. 
          Los resultados históricos no garantizan rendimiento futuro. Las apuestas deportivas conllevan riesgo de pérdida. 
          Apuesta responsablemente y nunca más de lo que puedas permitirte perder.
        </p>
      </div>
    </section>

    <!-- CTA -->
    <div class="cta-section">
      <h2>¿Listo para ver el modelo en acción?</h2>
      <div class="cta-buttons">
        <a href="/results" class="btn btn--primary">Ver Track Record</a>
        <a href="/picks" class="btn btn--secondary">Ver Picks de Hoy</a>
      </div>
    </div>

  </main>
</div>

<style>
  .page {
    display: grid;
    grid-template-columns: 220px 1fr;
    gap: 40px;
    max-width: 1200px;
    margin: 0 auto;
    padding: 32px 20px 80px;
  }

  .sidebar {
    position: sticky;
    top: 100px;
    height: fit-content;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 16px;
    padding: 20px 16px;
  }

  .sidebar__title {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: rgba(255,255,255,0.4);
    margin-bottom: 12px;
    padding-left: 8px;
  }

  .sidebar__link {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 10px 12px;
    border: none;
    background: transparent;
    color: rgba(255,255,255,0.45);
    font-size: 0.85rem;
    font-weight: 500;
    text-align: left;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .sidebar__link:hover {
    background: rgba(255,255,255,0.05);
    color: rgba(255,255,255,0.8);
  }

  .sidebar__link.active {
    background: rgba(99,102,241,0.1);
    color: #6366F1;
    font-weight: 600;
  }

  .content { min-width: 0; }

  .page__header { margin-bottom: 40px; }

  .page__label {
    font-size: 0.8rem;
    font-weight: 700;
    color: #6366F1;
    text-transform: uppercase;
    letter-spacing: 0.15em;
  }

  .page__title {
    font-family: 'Inter', sans-serif;
    font-size: clamp(1.8rem, 3vw, 2.5rem);
    font-weight: 900;
    letter-spacing: -0.03em;
    margin: 8px 0;
  }

  .page__subtitle {
    color: rgba(255,255,255,0.45);
    font-size: 1rem;
    margin-bottom: 16px;
  }

  .version-badge {
    display: inline-block;
    background: rgba(99,102,241,0.1);
    border: 1px solid rgba(99,102,241,0.25);
    color: #6366F1;
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 0.78rem;
    font-weight: 700;
  }

  .section {
    margin-bottom: 60px;
    scroll-margin-top: 100px;
  }

  .section__title {
    font-family: 'Inter', sans-serif;
    font-size: 1.4rem;
    font-weight: 800;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 2px solid rgba(99,102,241,0.25);
    letter-spacing: -0.01em;
  }

  .section__intro {
    font-size: 1rem;
    color: rgba(255,255,255,0.5);
    line-height: 1.7;
    margin-bottom: 24px;
  }

  .intro-card {
    background: rgba(99,102,241,0.05);
    border: 1px solid rgba(99,102,241,0.15);
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 28px;
  }

  .intro-card p {
    font-size: 1.05rem;
    line-height: 1.7;
    margin: 0;
  }

  .principles-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 16px;
  }

  .principle-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 14px;
    padding: 20px;
  }

  .principle-card h3 {
    font-size: 0.95rem;
    font-weight: 700;
    margin-bottom: 8px;
  }

  .principle-card p {
    font-size: 0.85rem;
    color: rgba(255,255,255,0.5);
    line-height: 1.5;
    margin: 0;
  }

  .layer-stack {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 28px;
  }

  .layer {
    display: flex;
    gap: 20px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 14px;
    padding: 20px;
  }

  .layer__number {
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, #6366F1, #4F46E5);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 1.1rem;
    color: #fff;
    flex-shrink: 0;
  }

  .layer__content h3 { font-size: 1rem; font-weight: 700; margin-bottom: 8px; }
  .layer__content p { font-size: 0.88rem; color: rgba(255,255,255,0.5); line-height: 1.5; margin-bottom: 12px; }

  .layer__tags { display: flex; flex-wrap: wrap; gap: 8px; }
  .tag { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 4px 10px; border-radius: 6px; font-size: 0.72rem; color: rgba(255,255,255,0.5); }

  .formula-card { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 24px; }
  .formula-card h3 { font-size: 0.95rem; font-weight: 700; margin-bottom: 16px; }
  .formula { background: rgba(0,0,0,0.4); border-radius: 8px; padding: 16px; overflow-x: auto; }
  .formula code { font-family: 'DM Mono', monospace; font-size: 0.85rem; color: #818CF8; }
  .formula-note { font-size: 0.82rem; color: rgba(255,255,255,0.4); margin-top: 12px; margin-bottom: 0; }

  .factors-table-wrap { overflow-x: auto; margin-bottom: 20px; }
  .factors-table { width: 100%; border-collapse: collapse; }
  .factors-table th, .factors-table td { padding: 14px 12px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.05); }
  .factors-table th { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; color: rgba(255,255,255,0.4); font-weight: 600; background: rgba(0,0,0,0.2); }
  .factor-name { font-weight: 600; white-space: nowrap; }
  .cell--positive { color: #10B981; font-weight: 600; font-family: 'DM Mono', monospace; }
  .cell--negative { color: #EF4444; font-weight: 600; font-family: 'DM Mono', monospace; }

  .info-callout { display: flex; gap: 14px; background: rgba(99,102,241,0.06); border: 1px solid rgba(99,102,241,0.15); border-radius: 12px; padding: 16px 20px; }
  .info-callout div { margin: 0; font-size: 0.88rem; line-height: 1.5; color: rgba(255,255,255,0.6); }
  .info-callout strong { color: #6366F1; }

  .math-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 24px; margin-bottom: 24px; }
  .math-step { display: flex; gap: 16px; padding: 16px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
  .math-step:last-child { border-bottom: none; }
  .math-step__number { width: 32px; height: 32px; background: rgba(99,102,241,0.15); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.9rem; color: #6366F1; flex-shrink: 0; }
  .math-step__content h4 { font-size: 0.95rem; font-weight: 700; margin-bottom: 6px; font-family: 'DM Mono', monospace; }
  .math-step__content p { font-size: 0.85rem; color: rgba(255,255,255,0.5); margin: 0; }

  .std-values { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 10px; }
  .std-item { background: rgba(255,255,255,0.05); padding: 6px 12px; border-radius: 6px; font-size: 0.82rem; font-family: 'DM Mono', monospace; }

  .example-card { background: rgba(16,185,129,0.05); border: 1px solid rgba(16,185,129,0.15); border-radius: 16px; padding: 24px; }
  .example-card h3 { font-size: 1rem; font-weight: 700; margin-bottom: 16px; }
  .example-content p { font-size: 0.9rem; margin-bottom: 8px; }
  .example-calc { background: rgba(0,0,0,0.3); border-radius: 8px; padding: 14px 18px; margin: 16px 0; font-family: 'DM Mono', monospace; font-size: 0.9rem; }
  .example-calc p { margin: 6px 0; }
  .example-result { font-weight: 600; margin-top: 16px !important; margin-bottom: 0 !important; }
  .highlight-over { background: rgba(16,185,129,0.2); padding: 2px 8px; border-radius: 4px; color: #10B981; }

  .metrics-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; margin-bottom: 28px; }
  .metric-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 20px; }
  .metric-card--highlight { border-color: rgba(99,102,241,0.25); background: rgba(99,102,241,0.04); }
  .metric-card h3 { font-size: 0.95rem; font-weight: 700; margin-bottom: 10px; }
  .metric-card p { font-size: 0.85rem; color: rgba(255,255,255,0.5); line-height: 1.5; margin-bottom: 12px; }
  .metric-target { font-size: 0.78rem; font-weight: 700; color: #10B981; background: rgba(16,185,129,0.1); padding: 6px 10px; border-radius: 6px; display: inline-block; }

  .validation-note { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 24px; }
  .validation-note h3 { font-size: 1rem; font-weight: 700; margin-bottom: 16px; }
  .validation-note ul { margin: 0; padding-left: 20px; }
  .validation-note li { font-size: 0.88rem; color: rgba(255,255,255,0.5); line-height: 1.6; margin-bottom: 8px; }

  .limitations-list { display: flex; flex-direction: column; gap: 16px; margin-bottom: 28px; }
  .limitation-item { display: flex; gap: 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 20px; }
  .limitation-item h3 { font-size: 0.95rem; font-weight: 700; margin-bottom: 6px; }
  .limitation-item p { font-size: 0.85rem; color: rgba(255,255,255,0.5); line-height: 1.5; margin: 0; }

  .disclaimer-card { background: rgba(239,68,68,0.06); border: 1px solid rgba(239,68,68,0.15); border-radius: 14px; padding: 24px; }
  .disclaimer-card h3 { font-size: 1rem; font-weight: 700; margin-bottom: 12px; color: #EF4444; }
  .disclaimer-card p { font-size: 0.88rem; line-height: 1.6; margin: 0; color: rgba(255,255,255,0.5); }

  .cta-section { text-align: center; padding: 48px 24px; background: rgba(99,102,241,0.05); border: 1px solid rgba(99,102,241,0.15); border-radius: 20px; }
  .cta-section h2 { font-family: 'Inter', sans-serif; font-size: 1.4rem; font-weight: 800; margin-bottom: 24px; }
  .cta-buttons { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
  .btn { display: inline-flex; align-items: center; gap: 8px; padding: 14px 28px; border-radius: 12px; font-size: 0.95rem; font-weight: 700; text-decoration: none; transition: transform 0.15s; }
  .btn:hover { transform: translateY(-2px); }
  .btn--primary { background: linear-gradient(135deg, #6366F1, #4F46E5); color: #fff; }
  .btn--secondary { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.7); }

  @media (max-width: 900px) {
    .page { grid-template-columns: 1fr; }
    .sidebar { position: relative; top: 0; display: flex; flex-wrap: wrap; gap: 8px; padding: 16px; }
    .sidebar__title { display: none; }
    .sidebar__link { padding: 8px 12px; font-size: 0.78rem; }
  }

  @media (max-width: 640px) {
    .principles-grid { grid-template-columns: 1fr; }
    .metrics-grid { grid-template-columns: 1fr; }
    .layer { flex-direction: column; gap: 12px; }
    .std-values { flex-direction: column; gap: 8px; }
  }
</style>