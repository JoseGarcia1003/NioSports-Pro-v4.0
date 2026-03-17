<!-- src/routes/methodology/+page.svelte -->
<script>
  import { onMount } from 'svelte';
  
  let activeSection = 'overview';
  
  const sections = [
    { id: 'overview', label: '📊 Visión General', icon: '📊' },
    { id: 'model', label: '🧠 El Modelo', icon: '🧠' },
    { id: 'factors', label: '⚙️ Factores', icon: '⚙️' },
    { id: 'probability', label: '📐 Probabilidad', icon: '📐' },
    { id: 'validation', label: '✅ Validación', icon: '✅' },
    { id: 'limitations', label: '⚠️ Limitaciones', icon: '⚠️' },
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
  <meta name="description" content="Explicación transparente de cómo funciona el Motor Predictivo v2.0 de NioSports Pro. Factores, probabilidades y limitaciones." />
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
        <span class="sidebar__icon">{section.icon}</span>
        <span>{section.label.split(' ').slice(1).join(' ')}</span>
      </button>
    {/each}
  </nav>

  <!-- Main Content -->
  <main class="content">
    
    <div class="page__header">
      <h1 class="page__title">📖 Metodología</h1>
      <p class="page__subtitle">Transparencia total sobre cómo funciona nuestro sistema predictivo</p>
      <div class="version-badge">Motor Predictivo v2.0</div>
    </div>

    <!-- Section: Overview -->
    <section id="overview" class="section">
      <h2 class="section__title">📊 Visión General</h2>
      
      <div class="intro-card">
        <p>
          NioSports Pro utiliza un <strong>modelo estadístico basado en distribución normal</strong> para 
          predecir el total de puntos en partidos NBA. A diferencia de sistemas que usan fórmulas arbitrarias, 
          nuestro motor está fundamentado en principios estadísticos rigurosos y validado con datos históricos reales.
        </p>
      </div>

      <div class="principles-grid">
        <div class="principle-card">
          <span class="principle-card__icon">🎯</span>
          <h3>Precisión Estadística</h3>
          <p>Probabilidades calculadas con la función de distribución acumulativa (CDF) de la distribución normal, no fórmulas lineales arbitrarias.</p>
        </div>
        
        <div class="principle-card">
          <span class="principle-card__icon">📈</span>
          <h3>Recency Weighting</h3>
          <p>Los partidos recientes tienen mayor peso que el promedio de temporada, capturando la forma actual de los equipos.</p>
        </div>
        
        <div class="principle-card">
          <span class="principle-card__icon">🔍</span>
          <h3>Transparencia Total</h3>
          <p>Cada pick muestra los factores principales que influyeron en la predicción, permitiendo al usuario evaluar el análisis.</p>
        </div>
        
        <div class="principle-card">
          <span class="principle-card__icon">✅</span>
          <h3>Validación Continua</h3>
          <p>Backtesting con datos históricos reales y tracking de Closing Line Value para medir el edge real del modelo.</p>
        </div>
      </div>
    </section>

    <!-- Section: Model -->
    <section id="model" class="section">
      <h2 class="section__title">🧠 El Modelo Predictivo</h2>
      
      <p class="section__intro">
        El motor predictivo opera en tres capas claramente definidas:
      </p>

      <div class="layer-stack">
        <div class="layer">
          <div class="layer__number">1</div>
          <div class="layer__content">
            <h3>Capa de Datos</h3>
            <p>Recopilación de estadísticas actualizadas de cada equipo: puntos por período (Q1, HALF, FULL), 
            pace, eficiencia ofensiva/defensiva, splits home/away, y calendario (back-to-back, viajes).</p>
            <div class="layer__tags">
              <span class="tag">BallDontLie API</span>
              <span class="tag">Stats por período</span>
              <span class="tag">Home/Away splits</span>
            </div>
          </div>
        </div>

        <div class="layer">
          <div class="layer__number">2</div>
          <div class="layer__content">
            <h3>Capa de Features</h3>
            <p>Transformación de datos crudos en features predictivos: promedios ponderados por recencia, 
            ajustes contextuales (fatiga, viajes, altitud), y normalización para comparabilidad.</p>
            <div class="layer__tags">
              <span class="tag">Recency weighting</span>
              <span class="tag">Ajustes contextuales</span>
              <span class="tag">Normalización</span>
            </div>
          </div>
        </div>

        <div class="layer">
          <div class="layer__number">3</div>
          <div class="layer__content">
            <h3>Capa de Predicción</h3>
            <p>Generación de proyección final con incertidumbre cuantificada. Cálculo de probabilidad usando 
            distribución normal y Expected Value para cada pick.</p>
            <div class="layer__tags">
              <span class="tag">Distribución normal</span>
              <span class="tag">Uncertainty</span>
              <span class="tag">Expected Value</span>
            </div>
          </div>
        </div>
      </div>

      <div class="formula-card">
        <h3>🔢 Fórmula Base</h3>
        <div class="formula">
          <code>Proyección = (Stats_Home × Peso_Recencia) + (Stats_Away × Peso_Recencia) + Σ(Ajustes_Contextuales)</code>
        </div>
        <p class="formula-note">
          Los pesos de recencia dan 45% a los últimos 5 juegos, 30% a los juegos 6-10, y 25% al resto de la temporada.
        </p>
      </div>
    </section>

    <!-- Section: Factors -->
    <section id="factors" class="section">
      <h2 class="section__title">⚙️ Factores Contextuales</h2>
      
      <p class="section__intro">
        Cada ajuste tiene fundamento empírico basado en análisis de datos históricos NBA 2019-2024:
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
              <td><span class="factor-name">🔄 Back-to-Back</span></td>
              <td class="cell--negative">-2.8 pts</td>
              <td>±0.8</td>
              <td>Fatiga por jugar dos noches consecutivas</td>
            </tr>
            <tr>
              <td><span class="factor-name">📅 3rd in 4 Nights</span></td>
              <td class="cell--negative">-4.0 pts</td>
              <td>±1.0</td>
              <td>Tercer partido en cuatro noches</td>
            </tr>
            <tr>
              <td><span class="factor-name">✈️ Viaje Largo</span></td>
              <td class="cell--negative">-1.5 pts</td>
              <td>±0.5</td>
              <td>Viaje >2000 millas antes del partido</td>
            </tr>
            <tr>
              <td><span class="factor-name">🏔️ Altitud (Denver)</span></td>
              <td class="cell--positive">+1.2 pts</td>
              <td>±0.4</td>
              <td>Ventaja de altitud para equipos locales</td>
            </tr>
            <tr>
              <td><span class="factor-name">⭐ Estrella Ausente</span></td>
              <td class="cell--negative">-4.5 pts</td>
              <td>-3.5 a -6.0</td>
              <td>Jugador top-10 en usage rate ausente</td>
            </tr>
            <tr>
              <td><span class="factor-name">🏆 Playoffs</span></td>
              <td class="cell--negative">-2.0 pts</td>
              <td>±0.6</td>
              <td>Juego más defensivo en postemporada</td>
            </tr>
            <tr>
              <td><span class="factor-name">📊 Pace Matching</span></td>
              <td>Variable</td>
              <td>±3.0</td>
              <td>Ajuste basado en ritmo combinado de ambos equipos</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="info-callout">
        <span class="info-callout__icon">💡</span>
        <div>
          <strong>Calibración continua:</strong> Los ajustes se recalibran cada 3 meses con datos nuevos. 
          El rango indica la incertidumbre del factor basada en varianza histórica.
        </div>
      </div>
    </section>

    <!-- Section: Probability -->
    <section id="probability" class="section">
      <h2 class="section__title">📐 Cálculo de Probabilidad</h2>
      
      <p class="section__intro">
        La probabilidad de OVER/UNDER se calcula usando la <strong>distribución normal</strong>, 
        no fórmulas lineales arbitrarias:
      </p>

      <div class="math-card">
        <div class="math-step">
          <div class="math-step__number">1</div>
          <div class="math-step__content">
            <h4>Media (μ) = Proyección del modelo</h4>
            <p>La proyección de puntos totales calculada por el modelo.</p>
          </div>
        </div>

        <div class="math-step">
          <div class="math-step__number">2</div>
          <div class="math-step__content">
            <h4>Desviación estándar (σ) = Incertidumbre histórica</h4>
            <p>Basada en la varianza real de cada período:</p>
            <div class="std-values">
              <span class="std-item"><strong>Q1:</strong> σ = 4.8 pts</span>
              <span class="std-item"><strong>HALF:</strong> σ = 7.2 pts</span>
              <span class="std-item"><strong>FULL:</strong> σ = 10.5 pts</span>
            </div>
          </div>
        </div>

        <div class="math-step">
          <div class="math-step__number">3</div>
          <div class="math-step__content">
            <h4>Z-score = (Proyección - Línea) / σ</h4>
            <p>Mide cuántas desviaciones estándar está nuestra proyección de la línea del mercado.</p>
          </div>
        </div>

        <div class="math-step">
          <div class="math-step__number">4</div>
          <div class="math-step__content">
            <h4>P(OVER) = Φ(Z-score)</h4>
            <p>La función de distribución acumulativa normal nos da la probabilidad real.</p>
          </div>
        </div>
      </div>

      <div class="example-card">
        <h3>📝 Ejemplo Práctico</h3>
        <div class="example-content">
          <p><strong>Partido:</strong> Lakers vs Celtics | <strong>Línea:</strong> 228.5 | <strong>Período:</strong> FULL</p>
          <p><strong>Proyección del modelo:</strong> 235.2 puntos</p>
          <div class="example-calc">
            <p>Z = (235.2 - 228.5) / 10.5 = <strong>0.638</strong></p>
            <p>P(OVER) = Φ(0.638) = <strong>73.8%</strong></p>
          </div>
          <p class="example-result">
            ➡️ El modelo recomienda <span class="highlight-over">OVER 228.5</span> con 73.8% de confianza
          </p>
        </div>
      </div>
    </section>

    <!-- Section: Validation -->
    <section id="validation" class="section">
      <h2 class="section__title">✅ Validación y Métricas</h2>
      
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
          <div class="metric-target">Objetivo: &gt;0.0</div>
        </div>

        <div class="metric-card">
          <h3>ROI</h3>
          <p>Return on Investment asumiendo apuestas flat (misma cantidad en cada pick).</p>
          <div class="metric-target">Objetivo: &gt;3%</div>
        </div>

        <div class="metric-card">
          <h3>Calibración</h3>
          <p>Error promedio entre la proyección y el resultado real. Indica qué tan bien calibrado está el modelo.</p>
          <div class="metric-target">Objetivo: &lt;5 pts</div>
        </div>
      </div>

      <div class="validation-note">
        <h3>🔬 Metodología de Backtesting</h3>
        <ul>
          <li><strong>Walk-forward:</strong> Solo usamos datos disponibles ANTES del partido (sin look-ahead bias)</li>
          <li><strong>Líneas reales:</strong> Comparamos con líneas de apertura reales del mercado</li>
          <li><strong>Out-of-sample:</strong> Testeamos en datos que el modelo nunca vio durante calibración</li>
          <li><strong>Significancia:</strong> Mínimo 200+ picks para conclusiones estadísticamente válidas</li>
        </ul>
      </div>
    </section>

    <!-- Section: Limitations -->
    <section id="limitations" class="section">
      <h2 class="section__title">⚠️ Limitaciones Conocidas</h2>
      
      <p class="section__intro">
        Ningún modelo es perfecto. Ser honestos sobre las limitaciones es parte de nuestra filosofía de transparencia:
      </p>

      <div class="limitations-list">
        <div class="limitation-item">
          <span class="limitation-item__icon">🎲</span>
          <div>
            <h3>Naturaleza Probabilística</h3>
            <p>Las predicciones son probabilidades, no certezas. Un pick con 70% de probabilidad perderá ~30% de las veces por definición.</p>
          </div>
        </div>

        <div class="limitation-item">
          <span class="limitation-item__icon">📰</span>
          <div>
            <h3>Información No Capturada</h3>
            <p>El modelo no captura noticias de último minuto, lesiones no reportadas, problemas personales de jugadores, o factores motivacionales.</p>
          </div>
        </div>

        <div class="limitation-item">
          <span class="limitation-item__icon">📊</span>
          <div>
            <h3>Sample Size</h3>
            <p>Al inicio de temporada, las estadísticas tienen mayor varianza porque hay menos datos. Las predicciones son más confiables después de ~20 juegos por equipo.</p>
          </div>
        </div>

        <div class="limitation-item">
          <span class="limitation-item__icon">🔄</span>
          <div>
            <h3>Cambios de Roster</h3>
            <p>Trades y fichajes pueden alterar significativamente el rendimiento de un equipo. El modelo necesita ~5-10 juegos para ajustarse.</p>
          </div>
        </div>

        <div class="limitation-item">
          <span class="limitation-item__icon">⚡</span>
          <div>
            <h3>Latencia de Datos</h3>
            <p>Las estadísticas se actualizan periódicamente. Puede haber un retraso de hasta 24 horas en reflejar los últimos partidos.</p>
          </div>
        </div>
      </div>

      <div class="disclaimer-card">
        <h3>📢 Aviso Legal</h3>
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
        <a href="/results" class="btn btn--primary">📊 Ver Resultados</a>
        <a href="/picks" class="btn btn--secondary">🎯 Ver Picks de Hoy</a>
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

  /* Sidebar */
  .sidebar {
    position: sticky;
    top: 100px;
    height: fit-content;
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: 16px;
    padding: 20px 16px;
  }

  .sidebar__title {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-text-muted);
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
    color: var(--color-text-muted);
    font-size: 0.85rem;
    font-weight: 500;
    text-align: left;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .sidebar__link:hover {
    background: rgba(255,255,255,0.05);
    color: var(--color-text);
  }

  .sidebar__link.active {
    background: rgba(251,191,36,0.1);
    color: #fbbf24;
    font-weight: 600;
  }

  .sidebar__icon { font-size: 1rem; }

  /* Content */
  .content { min-width: 0; }

  .page__header { margin-bottom: 40px; }

  .page__title {
    font-family: 'Orbitron', sans-serif;
    font-size: clamp(1.5rem, 3vw, 2rem);
    font-weight: 900;
    margin-bottom: 8px;
  }

  .page__subtitle {
    color: var(--color-text-muted);
    font-size: 1rem;
    margin-bottom: 16px;
  }

  .version-badge {
    display: inline-block;
    background: linear-gradient(135deg, rgba(251,191,36,0.2), rgba(251,191,36,0.1));
    border: 1px solid rgba(251,191,36,0.3);
    color: #fbbf24;
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 0.78rem;
    font-weight: 700;
  }

  /* Sections */
  .section {
    margin-bottom: 60px;
    scroll-margin-top: 100px;
  }

  .section__title {
    font-size: 1.4rem;
    font-weight: 800;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 2px solid rgba(251,191,36,0.3);
  }

  .section__intro {
    font-size: 1rem;
    color: var(--color-text-muted);
    line-height: 1.7;
    margin-bottom: 24px;
  }

  /* Intro Card */
  .intro-card {
    background: linear-gradient(135deg, rgba(251,191,36,0.08), rgba(251,191,36,0.02));
    border: 1px solid rgba(251,191,36,0.2);
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 28px;
  }

  .intro-card p {
    font-size: 1.05rem;
    line-height: 1.7;
    margin: 0;
  }

  /* Principles Grid */
  .principles-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 16px;
  }

  .principle-card {
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: 14px;
    padding: 20px;
  }

  .principle-card__icon {
    font-size: 1.8rem;
    display: block;
    margin-bottom: 12px;
  }

  .principle-card h3 {
    font-size: 0.95rem;
    font-weight: 700;
    margin-bottom: 8px;
  }

  .principle-card p {
    font-size: 0.85rem;
    color: var(--color-text-muted);
    line-height: 1.5;
    margin: 0;
  }

  /* Layer Stack */
  .layer-stack {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 28px;
  }

  .layer {
    display: flex;
    gap: 20px;
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: 14px;
    padding: 20px;
  }

  .layer__number {
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, #fbbf24, #f59e0b);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 1.1rem;
    color: #000;
    flex-shrink: 0;
  }

  .layer__content h3 {
    font-size: 1rem;
    font-weight: 700;
    margin-bottom: 8px;
  }

  .layer__content p {
    font-size: 0.88rem;
    color: var(--color-text-muted);
    line-height: 1.5;
    margin-bottom: 12px;
  }

  .layer__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .tag {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 0.72rem;
    color: var(--color-text-muted);
  }

  /* Formula Card */
  .formula-card {
    background: rgba(0,0,0,0.3);
    border: 1px solid var(--color-border);
    border-radius: 14px;
    padding: 24px;
  }

  .formula-card h3 {
    font-size: 0.95rem;
    font-weight: 700;
    margin-bottom: 16px;
  }

  .formula {
    background: rgba(0,0,0,0.4);
    border-radius: 8px;
    padding: 16px;
    overflow-x: auto;
  }

  .formula code {
    font-family: 'DM Mono', monospace;
    font-size: 0.85rem;
    color: #34d399;
  }

  .formula-note {
    font-size: 0.82rem;
    color: var(--color-text-muted);
    margin-top: 12px;
    margin-bottom: 0;
  }

  /* Factors Table */
  .factors-table-wrap {
    overflow-x: auto;
    margin-bottom: 20px;
  }

  .factors-table {
    width: 100%;
    border-collapse: collapse;
  }

  .factors-table th,
  .factors-table td {
    padding: 14px 12px;
    text-align: left;
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }

  .factors-table th {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
    font-weight: 600;
    background: rgba(0,0,0,0.2);
  }

  .factor-name {
    font-weight: 600;
    white-space: nowrap;
  }

  .cell--positive { color: #34d399; font-weight: 600; font-family: 'DM Mono', monospace; }
  .cell--negative { color: #f87171; font-weight: 600; font-family: 'DM Mono', monospace; }

  /* Info Callout */
  .info-callout {
    display: flex;
    gap: 14px;
    background: rgba(59,130,246,0.1);
    border: 1px solid rgba(59,130,246,0.2);
    border-radius: 12px;
    padding: 16px 20px;
  }

  .info-callout__icon { font-size: 1.3rem; flex-shrink: 0; }

  .info-callout p {
    margin: 0;
    font-size: 0.88rem;
    line-height: 1.5;
  }

  /* Math Card */
  .math-card {
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 24px;
  }

  .math-step {
    display: flex;
    gap: 16px;
    padding: 16px 0;
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }

  .math-step:last-child { border-bottom: none; }

  .math-step__number {
    width: 32px;
    height: 32px;
    background: rgba(251,191,36,0.2);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.9rem;
    color: #fbbf24;
    flex-shrink: 0;
  }

  .math-step__content h4 {
    font-size: 0.95rem;
    font-weight: 700;
    margin-bottom: 6px;
    font-family: 'DM Mono', monospace;
  }

  .math-step__content p {
    font-size: 0.85rem;
    color: var(--color-text-muted);
    margin: 0;
  }

  .std-values {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    margin-top: 10px;
  }

  .std-item {
    background: rgba(255,255,255,0.05);
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 0.82rem;
    font-family: 'DM Mono', monospace;
  }

  /* Example Card */
  .example-card {
    background: linear-gradient(135deg, rgba(52,211,153,0.08), rgba(52,211,153,0.02));
    border: 1px solid rgba(52,211,153,0.2);
    border-radius: 16px;
    padding: 24px;
  }

  .example-card h3 {
    font-size: 1rem;
    font-weight: 700;
    margin-bottom: 16px;
  }

  .example-content p {
    font-size: 0.9rem;
    margin-bottom: 8px;
  }

  .example-calc {
    background: rgba(0,0,0,0.3);
    border-radius: 8px;
    padding: 14px 18px;
    margin: 16px 0;
    font-family: 'DM Mono', monospace;
    font-size: 0.9rem;
  }

  .example-calc p { margin: 6px 0; }

  .example-result {
    font-weight: 600;
    margin-top: 16px !important;
    margin-bottom: 0 !important;
  }

  .highlight-over {
    background: rgba(52,211,153,0.2);
    padding: 2px 8px;
    border-radius: 4px;
    color: #34d399;
  }

  /* Metrics Grid */
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 16px;
    margin-bottom: 28px;
  }

  .metric-card {
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: 14px;
    padding: 20px;
  }

  .metric-card--highlight {
    border-color: rgba(251,191,36,0.3);
    background: linear-gradient(135deg, rgba(251,191,36,0.05), transparent);
  }

  .metric-card h3 {
    font-size: 0.95rem;
    font-weight: 700;
    margin-bottom: 10px;
  }

  .metric-card p {
    font-size: 0.85rem;
    color: var(--color-text-muted);
    line-height: 1.5;
    margin-bottom: 12px;
  }

  .metric-target {
    font-size: 0.78rem;
    font-weight: 700;
    color: #34d399;
    background: rgba(52,211,153,0.1);
    padding: 6px 10px;
    border-radius: 6px;
    display: inline-block;
  }

  /* Validation Note */
  .validation-note {
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: 14px;
    padding: 24px;
  }

  .validation-note h3 {
    font-size: 1rem;
    font-weight: 700;
    margin-bottom: 16px;
  }

  .validation-note ul {
    margin: 0;
    padding-left: 20px;
  }

  .validation-note li {
    font-size: 0.88rem;
    color: var(--color-text-muted);
    line-height: 1.6;
    margin-bottom: 8px;
  }

  /* Limitations */
  .limitations-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 28px;
  }

  .limitation-item {
    display: flex;
    gap: 16px;
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: 14px;
    padding: 20px;
  }

  .limitation-item__icon {
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  .limitation-item h3 {
    font-size: 0.95rem;
    font-weight: 700;
    margin-bottom: 6px;
  }

  .limitation-item p {
    font-size: 0.85rem;
    color: var(--color-text-muted);
    line-height: 1.5;
    margin: 0;
  }

  /* Disclaimer Card */
  .disclaimer-card {
    background: rgba(248,113,113,0.08);
    border: 1px solid rgba(248,113,113,0.2);
    border-radius: 14px;
    padding: 24px;
  }

  .disclaimer-card h3 {
    font-size: 1rem;
    font-weight: 700;
    margin-bottom: 12px;
    color: #f87171;
  }

  .disclaimer-card p {
    font-size: 0.88rem;
    line-height: 1.6;
    margin: 0;
    color: var(--color-text-muted);
  }

  /* CTA Section */
  .cta-section {
    text-align: center;
    padding: 48px 24px;
    background: linear-gradient(135deg, rgba(251,191,36,0.1), rgba(251,191,36,0.02));
    border: 1px solid rgba(251,191,36,0.2);
    border-radius: 20px;
  }

  .cta-section h2 {
    font-size: 1.4rem;
    font-weight: 800;
    margin-bottom: 24px;
  }

  .cta-buttons {
    display: flex;
    gap: 14px;
    justify-content: center;
    flex-wrap: wrap;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 14px 28px;
    border-radius: 12px;
    font-size: 0.95rem;
    font-weight: 700;
    text-decoration: none;
    transition: transform 0.15s, box-shadow 0.15s;
  }

  .btn:hover { transform: translateY(-2px); }

  .btn--primary {
    background: linear-gradient(135deg, #fbbf24, #f59e0b);
    color: #000;
  }

  .btn--secondary {
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    color: var(--color-text);
  }

  /* Responsive */
  @media (max-width: 900px) {
    .page {
      grid-template-columns: 1fr;
    }

    .sidebar {
      position: relative;
      top: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 16px;
    }

    .sidebar__title { display: none; }

    .sidebar__link {
      padding: 8px 12px;
      font-size: 0.78rem;
    }

    .sidebar__icon { display: none; }
  }

  @media (max-width: 640px) {
    .principles-grid { grid-template-columns: 1fr; }
    .metrics-grid { grid-template-columns: 1fr; }
    .layer { flex-direction: column; gap: 12px; }
    .std-values { flex-direction: column; gap: 8px; }
  }
</style>