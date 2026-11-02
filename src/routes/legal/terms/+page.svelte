<script>
  const lastUpdated = 'Abril 2026';
  const appName = 'NioSports Pro';
  const email = 'joseluisgarciafonseca@gmail.com';
</script>

<svelte:head>
  <title>Términos · NioSports Pro</title>
</svelte:head>

<div class="legal-page">
  <div class="legal-header">
    <a href="/" class="back">← Volver</a>
    <h1>Términos de Servicio</h1>
    <p class="updated">Última actualización: {lastUpdated}</p>
  </div>

  <div class="legal-body">
    <section>
      <h2>1. Aceptación de los Términos</h2>
      <p>Al acceder y usar {appName} ("el Servicio"), aceptas estar vinculado por estos Términos de Servicio. Si no estás de acuerdo con alguna parte de estos términos, no puedes acceder al Servicio.</p>
    </section>

    <section>
      <h2>2. Descripción del Servicio</h2>
      <p>{appName} es una plataforma de análisis estadístico deportivo que ofrece análisis estadísticos y, cuando hay datos suficientes, pronósticos sobre eventos deportivos. El Servicio incluye o incluirá:</p>
      <ul>
        <li>Análisis y pronósticos estadísticos sobre partidos, jugadores y equipos</li>
        <li>Herramientas de seguimiento de bankroll personal</li>
        <li>Un historial público de pronósticos registrados antes del inicio de cada evento, cuando esté disponible</li>
      </ul>
    </section>

    <section>
      <h2>3. Disclaimer — No es Asesoramiento Financiero</h2>
      <p><strong>{appName} NO es un servicio de asesoramiento financiero, de inversión, ni de apuestas.</strong> Toda la información proporcionada es exclusivamente para fines de entretenimiento y análisis estadístico.</p>
      <p>El Servicio no garantiza ninguna tasa de acierto ni beneficio. Cualquier cifra de rendimiento que se publique indicará su muestra y periodo; el rendimiento pasado no garantiza resultados futuros. Nunca apuestes dinero que no puedas permitirte perder.</p>
    </section>

    <section>
      <h2>4. Planes y Pagos</h2>
      <p>El Servicio ofrece planes de suscripción procesados a través de Stripe. Al suscribirte:</p>
      <ul>
        <li>Los cargos se realizan de forma recurrente (mensual o anual)</li>
        <li>Puedes cancelar en cualquier momento desde el portal de facturación</li>
        <li>No se ofrecen reembolsos por períodos parciales ya utilizados</li>
        <li>Los precios pueden cambiar con 30 días de aviso previo</li>
      </ul>
    </section>

    <section>
      <h2>5. Uso Aceptable</h2>
      <p>Aceptas no usar el Servicio para:</p>
      <ul>
        <li>Reproducir o redistribuir las predicciones sin autorización</li>
        <li>Realizar ingeniería inversa del modelo predictivo</li>
        <li>Usar bots o scrapers automatizados</li>
        <li>Compartir credenciales de cuenta</li>
      </ul>
    </section>

    <section>
      <h2>6. Limitación de Responsabilidad</h2>
      <p>{appName} y su propietario no son responsables de pérdidas financieras derivadas del uso de las predicciones. El Servicio se proporciona "tal cual" sin garantías de ningún tipo.</p>
    </section>

    <section>
      <h2>7. Contacto</h2>
      <p>Para consultas sobre estos términos: <a href="mailto:{email}">{email}</a></p>
    </section>
  </div>
</div>

<style>
  .legal-page { max-width: 720px; margin: 0 auto; padding: 48px 24px; color: var(--color-text-primary); }
  .legal-header { margin-bottom: 48px; }
  .back { color: var(--nio-accent); text-decoration: none; font-size: 14px; display: block; margin-bottom: 20px; }
  .back:hover { color: var(--nio-accent-hover); }
  h1 { font-family: var(--font-display); text-transform: uppercase; font-size: clamp(36px, 6vw, 54px); line-height: .95; font-weight: 800; margin: 0 0 8px; }
  .updated { color: var(--color-text-muted); font-size: 14px; margin: 0; }
  .legal-body { display: flex; flex-direction: column; gap: 32px; }
  section { border-bottom: 1px solid var(--color-border); padding-bottom: 32px; }
  section:last-child { border-bottom: none; }
  h2 { font-size: 18px; font-weight: 700; color: var(--nio-ink); margin: 0 0 12px; }
  p { color: var(--color-text-muted); line-height: 1.7; margin: 0 0 12px; }
  p:last-child { margin-bottom: 0; }
  ul { color: var(--color-text-muted); line-height: 1.7; padding-left: 20px; margin: 0; }
  li { margin-bottom: 6px; }
  a { color: var(--nio-accent); }
  strong { color: var(--nio-ink); }
</style>