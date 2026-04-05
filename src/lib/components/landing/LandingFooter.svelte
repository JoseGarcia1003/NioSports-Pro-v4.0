<section class="final-cta">
  <div class="final-cta__content">
    <h2 class="final-cta__title">¿Listo para analizar con datos reales?</h2>
    <p class="final-cta__subtitle">Análisis cuantitativo de totales NBA. Sin humo, sin promesas vacías.</p>
    <div class="final-cta__buttons">
      <a href="/login" class="btn btn--primary btn--xl">
        Crear cuenta gratis
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </a>
      <a href="/pricing" class="btn btn--glass btn--xl">Ver precios</a>
    </div>
  </div>
</section>

<footer class="footer">
  <div class="footer__inner">
    <div class="footer__brand">
      <span class="footer__logo">NioSports Pro</span>
      <p class="footer__tagline">Análisis cuantitativo de totales NBA</p>
    </div>
    <nav class="footer__links">
      <a href="/pricing">Precios</a>
      <a href="/results">Track Record</a>
      <a href="/methodology">Metodología</a>
    </nav>
    <nav class="footer__links footer__links--legal">
      <a href="/legal/terms">Términos de Servicio</a>
      <a href="/legal/privacy">Política de Privacidad</a>
      <a href="/legal/responsible-gambling">Juego Responsable</a>
    </nav>
    <p class="footer__disclaimer">
      NioSports Pro es una herramienta de análisis. Las apuestas deportivas implican riesgo. Apuesta responsablemente.
      <br />1-800-522-4700 · gamblersanonymous.org
    </p>
  </div>
</footer>

<style>
  .final-cta { padding: 100px 32px; background: linear-gradient(180deg, transparent 0%, rgba(99,102,241,0.03) 50%, transparent 100%); }
  .final-cta__content { max-width: 600px; margin: 0 auto; text-align: center; }
  .final-cta__title { font-family: 'Inter', sans-serif; font-size: clamp(1.8rem, 4vw, 2.5rem); font-weight: 900; margin-bottom: 16px; letter-spacing: -0.02em; }
  .final-cta__subtitle { font-size: 1.1rem; color: var(--color-text-muted); margin-bottom: 32px; }
  .final-cta__buttons { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }

  :global(.btn--xl) { padding: 18px 40px; font-size: 1.1rem; }

  .footer { border-top: 1px solid var(--color-border); padding: 60px 32px 40px; }
  .footer__inner { max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; gap: 20px; text-align: center; }
  .footer__logo { font-family: 'Inter', sans-serif; font-size: 1.3rem; font-weight: 900; letter-spacing: -0.02em; }
  .footer__tagline { font-size: 0.9rem; color: var(--color-text-muted); margin-top: 4px; }
  .footer__links { display: flex; gap: 32px; flex-wrap: wrap; justify-content: center; }
  .footer__links a { font-size: 0.9rem; color: var(--color-text-muted); text-decoration: none; transition: color 0.2s ease; }
  .footer__links a:hover { color: #6366F1; }
  .footer__links--legal { gap: 24px; }
  .footer__links--legal a { font-size: 0.8rem; color: var(--color-text-muted); }
  .footer__disclaimer { font-size: 0.75rem; color: var(--color-text-muted); max-width: 500px; line-height: 1.6; }
</style>
```

---

## Archivo 10: Actualizar `.env.local` — agrega estas líneas al final:
```
# ── Stripe (NUEVO — Fase 5)
STRIPE_SECRET_KEY=sk_test_TU_KEY_AQUI
STRIPE_WEBHOOK_SECRET=whsec_TU_WEBHOOK_SECRET_AQUI
STRIPE_PRO_PRICE_IDS=price_xxx_monthly,price_xxx_annual
STRIPE_ELITE_PRICE_IDS=price_xxx_monthly,price_xxx_annual
PUBLIC_SITE_URL=http://localhost:5173