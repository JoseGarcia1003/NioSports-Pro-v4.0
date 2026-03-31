// src/lib/services/kpi-calculator.js
// Calculates user KPIs from picks data (now from Supabase arrays, not Firebase objects).

/**
 * Calculate user KPIs from picks array.
 * @param {Array} picks - Array of pick objects from Supabase
 * @returns {Array} KPI cards data
 */
export function calculateUserKPIs(picks) {
  const empty = [
    { label: 'Win Rate', value: '—', color: 'blue', empty: true, badge: 'Sin picks aún' },
    { label: 'ROI', value: '—', color: 'green', empty: true, badge: 'Sin picks aún' },
    { label: 'Racha', value: '—', color: 'orange', empty: true, badge: 'Sin picks aún' },
    { label: 'CLV Avg', value: '—', color: 'purple', empty: true, badge: 'Sin datos' },
  ];

  if (!picks || !Array.isArray(picks) || picks.length === 0) return empty;

  // Convert object format to array if needed (backward compat)
  const picksArray = Array.isArray(picks) ? picks : Object.values(picks);

  // Filter resolved picks
  const resolved = picksArray.filter(p =>
    p.status === 'win' || p.status === 'loss' || p.result === 'win' || p.result === 'loss'
  );

  if (resolved.length === 0) return empty;

  // Win Rate
  const wins = resolved.filter(p => p.status === 'win' || p.result === 'win').length;
  const losses = resolved.filter(p => p.status === 'loss' || p.result === 'loss').length;
  const total = wins + losses;
  const winRate = total > 0 ? (wins / total * 100).toFixed(1) : '0.0';

  // ROI (assuming -110 odds flat betting)
  const profitPerWin = 100 / 110;  // $0.909 profit per $1 risked
  const totalProfit = (wins * profitPerWin) - losses;
  const roi = total > 0 ? (totalProfit / total * 100).toFixed(1) : '0.0';

  // Streak (sort by date, most recent first)
  const sorted = [...resolved].sort((a, b) => {
    const dateA = a.resolved_at || a.created_at || a.createdAt || '';
    const dateB = b.resolved_at || b.created_at || b.createdAt || '';
    return dateB.localeCompare(dateA);
  });

  let streak = 0;
  let streakType = '';
  if (sorted.length > 0) {
    const firstResult = sorted[0].status || sorted[0].result;
    streakType = firstResult === 'win' ? 'W' : 'L';
    for (const pick of sorted) {
      const result = pick.status || pick.result;
      if (result === firstResult) {
        streak++;
      } else {
        break;
      }
    }
  }

  // CLV Average
  const picksWithCLV = resolved.filter(p => p.clv_points != null && p.clv_points !== undefined);
  let clvAvg = null;
  if (picksWithCLV.length > 0) {
    const totalCLV = picksWithCLV.reduce((sum, p) => sum + (p.clv_points || 0), 0);
    clvAvg = (totalCLV / picksWithCLV.length).toFixed(2);
  }

  // Color coding
  const wrColor = parseFloat(winRate) >= 55 ? 'green' : parseFloat(winRate) >= 52 ? 'blue' : 'red';
  const roiColor = parseFloat(roi) > 0 ? 'green' : 'red';
  const streakColor = streakType === 'W' ? 'green' : 'orange';
  const clvColor = clvAvg !== null ? (parseFloat(clvAvg) > 0 ? 'green' : 'red') : 'purple';

  return [
    {
      label: 'Win Rate',
      value: `${winRate}%`,
      color: wrColor,
      empty: false,
      badge: `${wins}W-${losses}L`,
    },
    {
      label: 'ROI',
      value: `${roi}%`,
      color: roiColor,
      empty: false,
      badge: `${total} picks`,
    },
    {
      label: 'Racha',
      value: `${streak}${streakType}`,
      color: streakColor,
      empty: false,
      badge: streakType === 'W' ? 'Ganando' : 'Perdiendo',
    },
    {
      label: 'CLV Avg',
      value: clvAvg !== null ? `${clvAvg > 0 ? '+' : ''}${clvAvg}` : '—',
      color: clvColor,
      empty: clvAvg === null,
      badge: clvAvg !== null ? `${picksWithCLV.length} medidos` : 'Sin datos',
    },
  ];
}