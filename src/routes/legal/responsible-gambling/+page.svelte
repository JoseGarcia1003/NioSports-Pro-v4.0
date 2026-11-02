<svelte:head>
  <title>Juego responsable · NioSports Pro</title>
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
      <p>NioSports Pro no tiene hoy una tasa de acierto validada que publicar. Cuando exista, se mostrará junto con su tamaño de muestra y su periodo. Incluso un buen análisis falla con frecuencia: <strong>ningún pronóstico es seguro</strong> y el rendimiento pasado no garantiza resultados futuros.</p>
      <p>Las casas de apuestas incluyen un margen en sus cuotas, lo que hace difícil obtener beneficios de forma sostenida.</p>
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
        <li>Cuando publiquemos resultados, incluirán todas las pérdidas, sin seleccionar solo los aciertos</li>
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
  .back { color: var(--nio-accent); text-decoration: none; font-size: 14px; display: block; margin-bottom: 20px; }
  .back:hover { color: var(--nio-accent-hover); }
  .warning-banner {
    display: inline-block;
    background: var(--nio-gold-soft);
    border: 1px solid var(--nio-gold-border);
    color: var(--nio-accent); font-size: 13px; font-weight: 600;
    padding: 6px 16px; border-radius: 8px; margin-bottom: 16px;
  }
  h1 { font-family: var(--font-display); text-transform: uppercase; font-size: clamp(36px, 6vw, 54px); line-height: .95; font-weight: 800; margin: 0; }
  .accent { color: var(--nio-accent); }
  .legal-body { display: flex; flex-direction: column; gap: 32px; }
  .highlight-box {
    background: var(--nio-gold-soft);
    border: 1px solid var(--nio-gold-border);
    border-radius: 12px; padding: 20px 24px;
  }
  .highlight-box p { color: var(--nio-ink); margin: 0; line-height: 1.7; }
  section { border-bottom: 1px solid var(--color-border); padding-bottom: 32px; }
  section:last-child { border-bottom: none; }
  h2 { font-size: 18px; font-weight: 700; color: var(--nio-ink); margin: 0 0 12px; }
  p { color: var(--color-text-muted); line-height: 1.7; margin: 0 0 12px; }
  ul { color: var(--color-text-muted); line-height: 1.7; padding-left: 20px; margin: 0; }
  li { margin-bottom: 8px; }
  a { color: var(--nio-accent); }
  strong { color: var(--nio-ink); }
</style>