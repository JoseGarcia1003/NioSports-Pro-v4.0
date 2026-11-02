<script>
  const lastUpdated = 'Abril 2026';
  const email = 'joseluisgarciafonseca@gmail.com';
</script>

<svelte:head>
  <title>Política de Privacidad — NioSports Pro</title>
</svelte:head>

<div class="legal-page">
  <div class="legal-header">
    <a href="/" class="back">← Volver</a>
    <h1>Política de Privacidad</h1>
    <p class="updated">Última actualización: {lastUpdated}</p>
  </div>

  <div class="legal-body">
    <section>
      <h2>1. Datos que Recopilamos</h2>
      <p><strong>Datos de cuenta:</strong> email y UID proporcionados por Firebase Authentication al registrarte.</p>
      <p><strong>Datos de uso:</strong> picks guardados, transacciones de bankroll, y preferencias de la aplicación almacenados en Supabase PostgreSQL.</p>
      <p><strong>Datos de pago:</strong> procesados exclusivamente por Stripe. NioSports Pro nunca almacena números de tarjeta ni datos financieros.</p>
      <p><strong>Datos técnicos:</strong> mediciones anónimas de rendimiento (tiempos de carga y respuesta) y errores técnicos. Solo registramos la sección de la página (por ejemplo, «props»), el tipo de dispositivo (móvil o escritorio) y la medición; nunca tu identidad, tu correo ni tu dirección IP. Se conservan 30 días.</p>
    </section>

    <section>
      <h2>2. Cómo Usamos tus Datos</h2>
      <ul>
        <li>Proveer y mejorar el Servicio</li>
        <li>Procesar pagos y gestionar suscripciones</li>
        <li>Enviar comunicaciones relacionadas con el Servicio</li>
        <li>Detectar y prevenir fraudes o abusos</li>
      </ul>
      <p><strong>No vendemos ni compartimos tus datos con terceros para marketing.</strong></p>
    </section>

    <section>
      <h2>3. Terceros</h2>
      <ul>
        <li><strong>Firebase (Google):</strong> autenticación</li>
        <li><strong>Supabase:</strong> base de datos (servidores AWS us-east-1)</li>
        <li><strong>Stripe:</strong> procesamiento de pagos</li>
        <li><strong>Sentry:</strong> monitoreo de errores, solo si se activa (hoy no lo está)</li>
        <li><strong>Vercel / Railway:</strong> infraestructura de hosting</li>
      </ul>
    </section>

    <section>
      <h2>4. Retención de Datos</h2>
      <p>Tus datos se mantienen mientras tu cuenta esté activa. Al solicitar eliminación de cuenta, borramos todos tus datos en un plazo de 30 días, excepto los requeridos por obligaciones legales o fiscales.</p>
    </section>

    <section>
      <h2>5. Tus Derechos</h2>
      <p>Tienes derecho a acceder, corregir o eliminar tus datos personales. Para ejercer estos derechos, contáctanos en <a href="mailto:{email}">{email}</a>.</p>
    </section>

    <section>
      <h2>6. Cookies</h2>
      <p>Usamos cookies de sesión estrictamente necesarias para mantener tu login. No usamos cookies de tracking ni publicitarias.</p>
    </section>

    <section>
      <h2>7. Contacto</h2>
      <p>Para consultas de privacidad: <a href="mailto:{email}">{email}</a></p>
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