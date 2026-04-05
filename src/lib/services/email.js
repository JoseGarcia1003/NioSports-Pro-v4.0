// src/lib/services/email.js
// Email service using Resend for transactional emails
import { Resend } from 'resend';
import { env } from '$env/dynamic/private';

let _resend = null;

function getResend() {
  if (!_resend) {
    const key = env.RESEND_API_KEY;
    if (!key) {
      console.warn('[Email] RESEND_API_KEY not configured');
      return null;
    }
    _resend = new Resend(key);
  }
  return _resend;
}

const FROM = 'NioSports Pro <onboarding@resend.dev>';
const BRAND = {
  color: '#6366F1',
  bg: '#060912',
  cardBg: '#111318',
  text: '#ededed',
  muted: '#94a3b8',
  success: '#10B981',
  error: '#EF4444',
};

function layout(title, content) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;background:${BRAND.color};border-radius:12px;padding:10px 14px;">
        <span style="color:white;font-size:18px;font-weight:800;letter-spacing:-0.02em;">NioSports PRO</span>
      </div>
    </div>
    <div style="background:${BRAND.cardBg};border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px 28px;">
      <h1 style="color:${BRAND.text};font-size:22px;font-weight:800;margin:0 0 16px;text-align:center;">${title}</h1>
      ${content}
    </div>
    <div style="text-align:center;margin-top:24px;">
      <p style="color:${BRAND.muted};font-size:12px;margin:0;">NioSports Pro — Análisis cuantitativo de totales NBA</p>
      <p style="color:${BRAND.muted};font-size:11px;margin:8px 0 0;">
        <a href="https://nio-sports-pro-v4-0.vercel.app/legal/terms" style="color:${BRAND.muted};">Términos</a> · 
        <a href="https://nio-sports-pro-v4-0.vercel.app/legal/privacy" style="color:${BRAND.muted};">Privacidad</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendWelcomeEmail(to, displayName) {
  const resend = getResend();
  if (!resend) return null;

  const name = displayName || 'there';
  const html = layout('¡Bienvenido a NioSports Pro!', `
    <p style="color:${BRAND.muted};font-size:15px;line-height:1.6;margin:0 0 20px;">
      Hola <strong style="color:${BRAND.text}">${name}</strong>, tu cuenta está lista.
    </p>
    <p style="color:${BRAND.muted};font-size:14px;line-height:1.6;margin:0 0 24px;">
      NioSports Pro utiliza XGBoost ML con 26+ features para analizar totales NBA por período (Q1, HALF, FULL). 
      Cada predicción incluye proyección, probabilidad calibrada, edge y expected value.
    </p>
    <div style="text-align:center;margin:28px 0;">
      <a href="https://nio-sports-pro-v4-0.vercel.app/" 
         style="display:inline-block;background:${BRAND.color};color:white;padding:14px 36px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;">
        Ir al Dashboard →
      </a>
    </div>
    <div style="border-top:1px solid rgba(255,255,255,0.06);padding-top:20px;margin-top:24px;">
      <p style="color:${BRAND.muted};font-size:13px;margin:0 0 12px;font-weight:600;">Acciones rápidas:</p>
      <table style="width:100%;border-spacing:0 8px;">
        <tr>
          <td style="background:rgba(99,102,241,0.08);border-radius:8px;padding:12px 16px;">
            <a href="https://nio-sports-pro-v4-0.vercel.app/totales" style="color:${BRAND.color};font-size:13px;font-weight:600;text-decoration:none;">📊 Analizar Totales</a>
          </td>
        </tr>
        <tr>
          <td style="background:rgba(99,102,241,0.08);border-radius:8px;padding:12px 16px;">
            <a href="https://nio-sports-pro-v4-0.vercel.app/picks" style="color:${BRAND.color};font-size:13px;font-weight:600;text-decoration:none;">🎯 Ver Picks del Día</a>
          </td>
        </tr>
        <tr>
          <td style="background:rgba(99,102,241,0.08);border-radius:8px;padding:12px 16px;">
            <a href="https://nio-sports-pro-v4-0.vercel.app/methodology" style="color:${BRAND.color};font-size:13px;font-weight:600;text-decoration:none;">🧠 Leer Metodología</a>
          </td>
        </tr>
      </table>
    </div>
  `);

  try {
    const result = await resend.emails.send({ from: FROM, to, subject: '¡Bienvenido a NioSports Pro! 🏀', html });
    console.log('[Email] Welcome sent to', to);
    return result;
  } catch (err) {
    console.error('[Email] Welcome failed:', err.message);
    return null;
  }
}

export async function sendDailyPicksEmail(to, displayName, picks, date) {
  const resend = getResend();
  if (!resend) return null;

  const name = displayName || 'Pro';
  const topPicks = picks.slice(0, 3);
  const dateStr = new Date(date || Date.now()).toLocaleDateString('es-EC', { weekday: 'long', month: 'long', day: 'numeric' });

  let picksHtml = topPicks.map(p => `
    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px;margin-bottom:10px;">
      <div style="color:${BRAND.text};font-size:14px;font-weight:700;margin-bottom:6px;">${p.homeTeam || p.home_team} vs ${p.awayTeam || p.away_team}</div>
      <div style="display:flex;gap:12px;align-items:center;">
        <span style="background:${(p.direction === 'OVER' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)')};color:${(p.direction === 'OVER' ? BRAND.success : BRAND.error)};padding:4px 10px;border-radius:6px;font-size:12px;font-weight:800;">${p.period} ${p.direction}</span>
        <span style="color:${BRAND.text};font-family:monospace;font-size:16px;font-weight:800;">${p.line}</span>
        <span style="color:${BRAND.muted};font-size:12px;">EV: +${p.evPercent || p.ev || 0}%</span>
      </div>
    </div>
  `).join('');

  const html = layout(`${topPicks.length} Picks para Hoy`, `
    <p style="color:${BRAND.muted};font-size:14px;margin:0 0 20px;">
      Hola <strong style="color:${BRAND.text}">${name}</strong>, aquí están tus mejores picks para <strong style="color:${BRAND.text}">${dateStr}</strong>.
    </p>
    ${picksHtml}
    ${picks.length > 3 ? `<p style="color:${BRAND.muted};font-size:13px;text-align:center;margin:12px 0 0;">+${picks.length - 3} picks más en tu dashboard</p>` : ''}
    <div style="text-align:center;margin-top:24px;">
      <a href="https://nio-sports-pro-v4-0.vercel.app/picks" 
         style="display:inline-block;background:${BRAND.color};color:white;padding:12px 32px;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none;">
        Ver Análisis Completo →
      </a>
    </div>
  `);

  try {
    const result = await resend.emails.send({ from: FROM, to, subject: `🏀 ${topPicks.length} Picks NBA — ${dateStr}`, html });
    console.log('[Email] Daily picks sent to', to);
    return result;
  } catch (err) {
    console.error('[Email] Daily picks failed:', err.message);
    return null;
  }
}

export async function sendResultsEmail(to, displayName, results) {
  const resend = getResend();
  if (!resend) return null;

  const name = displayName || 'Pro';
  const { wins = 0, losses = 0, pushes = 0, profit = '0.00', picks = [] } = results;
  const total = wins + losses;
  const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0';
  const isPositive = parseFloat(profit) >= 0;

  let resultsHtml = picks.slice(0, 5).map(p => {
    const status = p.status || p.result;
    const statusColor = status === 'win' ? BRAND.success : status === 'loss' ? BRAND.error : BRAND.muted;
    const statusLabel = status === 'win' ? 'WIN' : status === 'loss' ? 'LOSS' : 'PUSH';
    return `
    <tr>
      <td style="padding:8px 0;color:${BRAND.muted};font-size:13px;border-bottom:1px solid rgba(255,255,255,0.04);">${p.home_team} vs ${p.away_team}</td>
      <td style="padding:8px 0;color:${BRAND.text};font-size:13px;font-weight:600;border-bottom:1px solid rgba(255,255,255,0.04);">${p.period} ${p.direction}</td>
      <td style="padding:8px 0;text-align:right;border-bottom:1px solid rgba(255,255,255,0.04);">
        <span style="background:${statusColor}20;color:${statusColor};padding:3px 8px;border-radius:4px;font-size:11px;font-weight:700;">${statusLabel}</span>
      </td>
    </tr>`;
  }).join('');

  const html = layout('Resultados del Día', `
    <p style="color:${BRAND.muted};font-size:14px;margin:0 0 24px;">
      Hola <strong style="color:${BRAND.text}">${name}</strong>, aquí van los resultados de hoy.
    </p>
    <div style="display:flex;gap:12px;margin-bottom:24px;text-align:center;">
      <div style="flex:1;background:rgba(16,185,129,0.08);border-radius:12px;padding:16px;">
        <div style="color:${BRAND.success};font-size:24px;font-weight:800;">${wins}</div>
        <div style="color:${BRAND.muted};font-size:11px;text-transform:uppercase;">Ganados</div>
      </div>
      <div style="flex:1;background:rgba(239,68,68,0.08);border-radius:12px;padding:16px;">
        <div style="color:${BRAND.error};font-size:24px;font-weight:800;">${losses}</div>
        <div style="color:${BRAND.muted};font-size:11px;text-transform:uppercase;">Perdidos</div>
      </div>
      <div style="flex:1;background:rgba(99,102,241,0.08);border-radius:12px;padding:16px;">
        <div style="color:${isPositive ? BRAND.success : BRAND.error};font-size:24px;font-weight:800;">${isPositive ? '+' : ''}${profit}u</div>
        <div style="color:${BRAND.muted};font-size:11px;text-transform:uppercase;">Profit</div>
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;">
      ${resultsHtml}
    </table>
    <div style="text-align:center;margin-top:24px;">
      <a href="https://nio-sports-pro-v4-0.vercel.app/results" 
         style="display:inline-block;background:${BRAND.color};color:white;padding:12px 32px;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none;">
        Ver Track Record Completo →
      </a>
    </div>
  `);

  try {
    const result = await resend.emails.send({ from: FROM, to, subject: `${isPositive ? '✅' : '📊'} Resultados: ${wins}W-${losses}L (${isPositive ? '+' : ''}${profit}u)`, html });
    console.log('[Email] Results sent to', to);
    return result;
  } catch (err) {
    console.error('[Email] Results failed:', err.message);
    return null;
  }
}