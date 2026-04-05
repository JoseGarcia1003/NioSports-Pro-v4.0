<svelte:head>
  <title>Juego Responsable — NioSports Pro</title>
</svelte:head>

<div class="legal-page">
  <div class="legal-header">
    <a href="/" class="back">← Volver</a>
    <div class="warning-banner">⚠️ Advertencia Importante sobre Apuestas</div>
    <h1>Juego <span class="accent">Responsable</span></h1>
  </div>

  <div class="legal-body">
    <div class="highlight-box">
      <p><strong>NioSports Pro es una herramienta de análisis estadístico, NO un sistema garantizado de ganancias.</strong> Las apuestas deportivas conllevan riesgo real de pérdida financiera. Nunca apuestes dinero que no puedas permitirte perder.</p>
    </div>

    <section>
      <h2>Sobre las Predicciones</h2>
      <p>Nuestro modelo XGBoost v3.0 tiene una tasa de acierto validada de ~61% en walk-forward backtesting. Esto significa que aproximadamente <strong>4 de cada 10 predicciones serán incorrectas</strong>. El rendimiento histórico no garantiza resultados futuros.</p>
      <p>Las líneas de apuestas están diseñadas por los libros para ser difíciles de superar consistentemente. El 95% de los apostadores pierde dinero a largo plazo.</p>
    </section>

    <section>
      <h2>Señales de Problema</h2>
      <p>Considera buscar ayuda si:</p>
      <ul>
        <li>Apuestas más de lo que puedes permitirte perder</li>
        <li>Persigues pérdidas con más apuestas</li>
        <li>Las apuestas afectan tus relaciones o trabajo</li>
        <li>Ocultas tus apuestas a familiares</li>
        <li>Usas crédito o préstamos para apostar</li>
      </ul>
    </section>

    <section>
      <h2>Recursos de Ayuda</h2>
      <ul>
        <li><strong>Ecuador:</strong> Ministerio de Salud Pública — 171</li>
        <li><strong>Internacional:</strong> Gamblers Anonymous — <a href="https://www.gamblersanonymous.org" target="_blank" rel="noopener">gamblersanonymous.org</a></li>
        <li><strong>Nacional Problem Gambling Helpline (EEUU):</strong> 1-800-522-4700</li>
      </ul>
    </section>

    <section>
      <h2>Nuestro Compromiso</h2>
      <ul>
        <li>Publicamos resultados reales incluyendo pérdidas, sin cherry-picking</li>
        <li>No prometemos ganancias ni "sistemas infalibles"</li>
        <li>El bankroll tracker está diseñado para promover gestión responsable</li>
        <li>Usuarios menores de 18 años no pueden usar el Servicio</li>
      </ul>
    </section>
  </div>
</div>

<style>
  .legal-page { max-width: 720px; margin: 0 auto; padding: 48px 24px; color: var(--color-text-primary); }
  .legal-header { margin-bottom: 48px; }
  .back { color: #6366f1; text-decoration: none; font-size: 14px; display: block; margin-bottom: 20px; }
  .back:hover { color: #818cf8; }
  .warning-banner {
    display: inline-block;
    background: rgba(245,158,11,0.12);
    border: 1px solid rgba(245,158,11,0.3);
    color: #fbbf24; font-size: 13px; font-weight: 600;
    padding: 6px 16px; border-radius: 8px; margin-bottom: 16px;
  }
  h1 { font-size: 36px; font-weight: 800; margin: 0; }
  .accent { color: #6366f1; }
  .legal-body { display: flex; flex-direction: column; gap: 32px; }
  .highlight-box {
    background: rgba(239,68,68,0.08);
    border: 1px solid rgba(239,68,68,0.25);
    border-radius: 12px; padding: 20px 24px;
  }
  .highlight-box p { color: #fca5a5; margin: 0; line-height: 1.7; }
  section { border-bottom: 1px solid var(--color-border); padding-bottom: 32px; }
  section:last-child { border-bottom: none; }
  h2 { font-size: 18px; font-weight: 700; color: #f1f5f9; margin: 0 0 12px; }
  p { color: var(--color-text-muted); line-height: 1.7; margin: 0 0 12px; }
  ul { color: var(--color-text-muted); line-height: 1.7; padding-left: 20px; margin: 0; }
  li { margin-bottom: 8px; }
  a { color: #6366f1; }
  strong { color: #f1f5f9; }
</style>