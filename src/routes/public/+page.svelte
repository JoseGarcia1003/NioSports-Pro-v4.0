<script>
  import { onMount } from 'svelte';

  let picks = [];
  let stats = { total: 0, wins: 0, losses: 0, pushes: 0, winRate: 0, roi: 0, clvAvg: 0 };
  let loading = true;

  onMount(async () => {
    const res = await fetch('/api/public/track-record');
    if (res.ok) {
      const data = await res.json();
      picks = data.picks;
      stats = data.stats;
    }
    loading = false;
  });

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('es-EC', { month: 'short', day: 'numeric' });
  }

  function directionLabel(d) {
    return d === 'OVER' ? '↑ OVER' : '↓ UNDER';
  }
</script>

<svelte:head>
  <title>Track Record Público — NioSports Pro</title>
  <meta name="description" content="Resultados reales y verificables de NioSports Pro. Sin claims falsos." />
</svelte:head>

<div class="page">
  <!-- Header -->
  <div class="hero">
    <div class="hero-badge">🔴 EN VIVO · Actualizado diariamente</div>
    <h1>Track Record <span class="accent">Verificable</span></h1>
    <p class="subtitle">
      Cada pick es real, cada resultado es auditable. Sin curar, sin cherry-pick.
    </p>
  </div>

  <!-- KPIs -->
  {#if !loading}
  <div class="kpi-grid">
    <div class="kpi">
      <span class="kpi-value {stats.winRate >= 55 ? 'green' : stats.winRate >= 50 ? 'yellow' : 'red'}">
        {stats.winRate.toFixed(1)}%
      </span>
      <span class="kpi-label">Win Rate</span>
    </div>
    <div class="kpi">
      <span class="kpi-value {stats.roi >= 0 ? 'green' : 'red'}">
        {stats.roi >= 0 ? '+' : ''}{stats.roi.toFixed(1)}%
      </span>
      <span class="kpi-label">ROI</span>
    </div>
    <div class="kpi">
      <span class="kpi-value">{stats.total}</span>
      <span class="kpi-label">Picks Totales</span>
    </div>
    <div class="kpi">
      <span class="kpi-value {stats.clvAvg >= 0 ? 'green' : 'red'}">
        {stats.clvAvg >= 0 ? '+' : ''}{stats.clvAvg.toFixed(2)}
      </span>
      <span class="kpi-label">CLV Promedio</span>
    </div>
  </div>

  <!-- Tabla de picks -->
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Partido</th>
          <th>Pick</th>
          <th>Línea</th>
          <th>Confianza</th>
          <th>Resultado</th>
          <th>CLV</th>
        </tr>
      </thead>
      <tbody>
        {#each picks as p}
        <tr>
          <td class="muted">{formatDate(p.created_at)}</td>
          <td class="game">{p.home_team} vs {p.away_team}</td>
          <td class="direction {p.direction?.toLowerCase()}">{directionLabel(p.direction)}</td>
          <td>{p.bet_line ?? '—'}</td>
          <td>
            <span class="conf-badge" style="--c: {p.confidence >= 70 ? '#6366f1' : p.confidence >= 55 ? '#f59e0b' : '#64748b'}">
              {p.confidence ?? '—'}%
            </span>
          </td>
          <td>
            {#if p.status === 'won'}
              <span class="chip green">✓ WON</span>
            {:else if p.status === 'lost'}
              <span class="chip red">✗ LOST</span>
            {:else if p.status === 'push'}
              <span class="chip gray">— PUSH</span>
            {:else}
              <span class="chip gray">Pendiente</span>
            {/if}
          </td>
          <td class="{p.clv_points >= 0 ? 'green' : 'red'}">
            {p.clv_points != null ? (p.clv_points >= 0 ? '+' : '') + p.clv_points.toFixed(2) : '—'}
          </td>
        </tr>
        {/each}
      </tbody>
    </table>
  </div>

  {:else}
  <div class="loading">Cargando resultados...</div>
  {/if}

  <!-- CTA -->
  <div class="cta-section">
    <h2>¿Quieres las predicciones <em>antes</em> de que cierren las líneas?</h2>
    <p>El track record habla. El plan Pro te da acceso completo.</p>
    <a href="/pricing" class="cta-btn">Ver Planes →</a>
  </div>
</div>

<style>
  .page { max-width: 900px; margin: 0 auto; padding: 48px 24px; color: #e2e8f0; }

  .hero { text-align: center; margin-bottom: 48px; }
  .hero-badge {
    display: inline-block;
    background: rgba(239,68,68,0.12);
    border: 1px solid rgba(239,68,68,0.3);
    color: #f87171;
    font-size: 12px; font-weight: 600; letter-spacing: 0.05em;
    padding: 4px 12px; border-radius: 9999px; margin-bottom: 16px;
  }
  h1 { font-size: clamp(28px, 5vw, 48px); font-weight: 800; margin: 0 0 12px; }
  .accent { color: #6366f1; }
  .subtitle { color: #94a3b8; font-size: 16px; margin: 0; }

  .kpi-grid {
    display: grid; grid-template-columns: repeat(4, 1fr);
    gap: 16px; margin-bottom: 40px;
  }
  @media (max-width: 600px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }

  .kpi {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px; padding: 20px 16px; text-align: center;
  }
  .kpi-value { display: block; font-size: 28px; font-weight: 800; margin-bottom: 4px; }
  .kpi-label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
  .green { color: #22c55e; } .red { color: #ef4444; } .yellow { color: #f59e0b; }

  .table-wrap { overflow-x: auto; margin-bottom: 48px; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th { text-align: left; padding: 10px 12px; color: #64748b; font-weight: 500;
       font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;
       border-bottom: 1px solid rgba(255,255,255,0.06); }
  td { padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.04); }
  tr:hover td { background: rgba(99,102,241,0.04); }
  .muted { color: #64748b; }
  .game { font-weight: 500; }
  .direction.over { color: #6366f1; font-weight: 600; }
  .direction.under { color: #f59e0b; font-weight: 600; }

  .conf-badge {
    background: rgba(from var(--c) r g b / 0.12);
    color: var(--c);
    padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;
  }
  .chip {
    padding: 3px 10px; border-radius: 4px;
    font-size: 11px; font-weight: 700; letter-spacing: 0.04em;
  }
  .chip.green { background: rgba(34,197,94,0.12); color: #22c55e; }
  .chip.red   { background: rgba(239,68,68,0.12); color: #ef4444; }
  .chip.gray  { background: rgba(100,116,139,0.12); color: #94a3b8; }

  .cta-section {
    text-align: center;
    background: linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08));
    border: 1px solid rgba(99,102,241,0.2);
    border-radius: 16px; padding: 48px 32px;
  }
  .cta-section h2 { font-size: 24px; font-weight: 700; margin: 0 0 12px; }
  .cta-section p { color: #94a3b8; margin: 0 0 24px; }
  .cta-btn {
    display: inline-block;
    background: #6366f1; color: white;
    padding: 12px 32px; border-radius: 8px;
    font-weight: 700; text-decoration: none;
    transition: background 0.2s ease;
  }
  .cta-btn:hover { background: #4f46e5; }

  .loading { text-align: center; color: #64748b; padding: 80px 0; }
</style>