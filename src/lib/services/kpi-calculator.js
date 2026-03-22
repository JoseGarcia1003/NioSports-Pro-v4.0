// src/lib/services/kpi-calculator.js
// Calcula KPIs REALES a partir de picks resueltos del usuario.

function americanToDecimal(odds) {
  if (!odds) return 1.909;
  if (odds > 0) return (odds / 100) + 1;
  return (100 / Math.abs(odds)) + 1;
}

function calculateStreak(picks) {
  if (!picks || picks.length === 0) return { value: '—', label: 'Sin datos' };
  const sorted = [...picks]
    .filter(p => p.status === 'win' || p.status === 'loss')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (sorted.length === 0) return { value: '—', label: 'Sin resultados' };
  const firstResult = sorted[0].status;
  let count = 0;
  for (const pick of sorted) {
    if (pick.status === firstResult) count++;
    else break;
  }
  if (firstResult === 'win') return { value: `${count}W`, label: count >= 3 ? 'Racha activa' : '' };
  return { value: `${count}L`, label: count >= 3 ? 'Racha negativa' : '' };
}

function calculateAvgCLV(picks) {
  const withCLV = picks.filter(p => p.closingLine != null && p.line != null && p.status !== 'pending');
  if (withCLV.length === 0) return { value: '—', label: 'Sin datos CLV' };
  let totalCLV = 0;
  for (const p of withCLV) {
    const clv = p.betType === 'OVER'
      ? parseFloat(p.closingLine) - parseFloat(p.line)
      : parseFloat(p.line) - parseFloat(p.closingLine);
    totalCLV += clv;
  }
  const avg = totalCLV / withCLV.length;
  const sign = avg >= 0 ? '+' : '';
  const label = avg >= 1 ? 'Sharp' : avg >= 0 ? 'Neutral' : 'Mejorable';
  return { value: `${sign}${avg.toFixed(1)}`, label };
}

export function calculateUserKPIs(picks) {
  if (!picks || picks.length === 0) {
    return [
      { label: 'Win Rate', value: '—', trend: 'Sin picks aún', icon: '🎯', color: 'emerald', empty: true },
      { label: 'ROI', value: '—', trend: 'Sin picks aún', icon: '📈', color: 'amber', empty: true },
      { label: 'Racha', value: '—', trend: 'Sin picks aún', icon: '🔥', color: 'orange', empty: true },
      { label: 'CLV Avg', value: '—', trend: 'Sin datos', icon: '💎', color: 'purple', empty: true },
    ];
  }

  const resolved = picks.filter(p => p.status === 'win' || p.status === 'loss');
  const wins = resolved.filter(p => p.status === 'win').length;
  const losses = resolved.filter(p => p.status === 'loss').length;
  const total = wins + losses;

  let winRateValue = '—', winRateTrend = 'Sin resultados';
  if (total > 0) {
    winRateValue = `${((wins / total) * 100).toFixed(1)}%`;
    winRateTrend = `${wins}W - ${losses}L`;
  }

  let roiValue = '—', roiTrend = 'Sin resultados';
  if (total > 0) {
    let profit = 0;
    for (const p of resolved) {
      const dec = americanToDecimal(p.odds || -110);
      profit += p.status === 'win' ? (dec - 1) : -1;
    }
    const roi = (profit / total) * 100;
    roiValue = `${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%`;
    roiTrend = `${profit >= 0 ? '+' : ''}${profit.toFixed(1)}u`;
  }

  const streak = calculateStreak(picks);
  const clv = calculateAvgCLV(picks);

  return [
    { label: 'Win Rate', value: winRateValue, trend: winRateTrend, icon: '🎯', color: 'emerald', empty: total === 0 },
    { label: 'ROI', value: roiValue, trend: roiTrend, icon: '📈', color: 'amber', empty: total === 0 },
    { label: 'Racha', value: streak.value, trend: streak.label, icon: '🔥', color: 'orange', empty: total === 0 },
    { label: 'CLV Avg', value: clv.value, trend: clv.label, icon: '💎', color: 'purple', empty: total === 0 },
  ];
}