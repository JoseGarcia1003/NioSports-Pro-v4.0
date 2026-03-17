// src/lib/services/export-service.js
// Servicio para exportar picks desde el frontend

import { get } from 'svelte/store';
import { userId } from '$lib/stores/auth';
import { picksTotales } from '$lib/stores/data';

/**
 * Convierte odds americanos a decimales
 */
function americanToDecimal(odds) {
  if (odds > 0) return (odds / 100) + 1;
  return (100 / Math.abs(odds)) + 1;
}

/**
 * Calcula el CLV de un pick
 */
function calculateCLV(pick) {
  if (!pick.closingLine || !pick.line) return null;
  
  const clv = pick.betType === 'OVER'
    ? parseFloat(pick.closingLine) - parseFloat(pick.line)
    : parseFloat(pick.line) - parseFloat(pick.closingLine);
  
  return clv;
}

/**
 * Calcula estadísticas agregadas de los picks
 */
export function calculateStats(picks) {
  const resolved = picks.filter(p => p.status && p.status !== 'pending');
  const wins = resolved.filter(p => p.status === 'win').length;
  const losses = resolved.filter(p => p.status === 'loss').length;
  const pushes = resolved.filter(p => p.status === 'push').length;
  const total = wins + losses;

  let profit = 0;
  let totalCLV = 0;
  let clvCount = 0;

  resolved.forEach(p => {
    if (p.status === 'push') return;
    
    const odds = p.odds || -110;
    const decimalOdds = americanToDecimal(odds);
    
    if (p.status === 'win') {
      profit += (decimalOdds - 1);
    } else {
      profit -= 1;
    }

    const clv = calculateCLV(p);
    if (clv !== null) {
      totalCLV += clv;
      clvCount++;
    }
  });

  return {
    total: resolved.length,
    wins,
    losses,
    pushes,
    winRate: total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0',
    profit: profit.toFixed(2),
    roi: total > 0 ? ((profit / total) * 100).toFixed(1) : '0.0',
    avgCLV: clvCount > 0 ? (totalCLV / clvCount).toFixed(2) : null,
  };
}

/**
 * Exporta picks a CSV (client-side)
 */
export function exportToCSV(picks, filename = 'niosports-picks') {
  const headers = [
    'Fecha',
    'Equipos',
    'Período',
    'Tipo',
    'Línea',
    'Proyección',
    'Probabilidad%',
    'Confianza',
    'EV%',
    'Odds',
    'Estado',
    'Línea Cierre',
    'CLV',
    'Puntos Reales',
    'Error Modelo',
    'Apostado',
    'Monto',
  ];

  const rows = picks.map(p => {
    const clv = calculateCLV(p);
    return [
      p.createdAt ? new Date(p.createdAt).toLocaleDateString('es-ES') : '',
      `${p.awayTeam} @ ${p.localTeam}`,
      p.period || '',
      p.betType || '',
      p.line ?? '',
      p.projection?.toFixed(1) ?? '',
      p.probabilityPercent?.toFixed(1) ?? (p.probability ? (p.probability * 100).toFixed(1) : ''),
      p.confidence || '',
      p.evPercent?.toFixed(2) ?? '',
      p.odds ?? '',
      p.status || 'pending',
      p.closingLine ?? '',
      clv?.toFixed(1) ?? '',
      p.actualTotal ?? '',
      p.modelError?.toFixed(1) ?? '',
      p.didBet ? 'Sí' : 'No',
      p.betAmount ?? '',
    ];
  });

  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => {
      const str = String(cell);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(','))
  ].join('\n');

  // Crear y descargar archivo
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exporta picks a JSON (client-side)
 */
export function exportToJSON(picks, filename = 'niosports-picks') {
  const stats = calculateStats(picks);
  
  const exportData = {
    exportedAt: new Date().toISOString(),
    stats,
    picks: picks.map(p => ({
      ...p,
      clv: calculateCLV(p),
    })),
  };

  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Genera reporte de rendimiento
 */
export function generatePerformanceReport(picks) {
  const stats = calculateStats(picks);
  const resolved = picks.filter(p => p.status && p.status !== 'pending');

  // Por período
  const byPeriod = {};
  ['Q1', 'HALF', 'FULL'].forEach(period => {
    const periodPicks = resolved.filter(p => p.period === period);
    byPeriod[period] = calculateStats(periodPicks);
  });

  // Por mes
  const byMonth = {};
  resolved.forEach(p => {
    const month = new Date(p.createdAt).toISOString().slice(0, 7);
    if (!byMonth[month]) byMonth[month] = [];
    byMonth[month].push(p);
  });
  
  Object.keys(byMonth).forEach(month => {
    byMonth[month] = calculateStats(byMonth[month]);
  });

  // Por equipo (local)
  const byTeam = {};
  resolved.forEach(p => {
    const team = p.localTeam;
    if (!byTeam[team]) byTeam[team] = [];
    byTeam[team].push(p);
  });
  
  Object.keys(byTeam).forEach(team => {
    byTeam[team] = calculateStats(byTeam[team]);
  });

  // Rachas
  let currentStreak = 0;
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let tempWinStreak = 0;
  let tempLossStreak = 0;

  const sortedPicks = [...resolved].sort((a, b) => 
    new Date(a.createdAt) - new Date(b.createdAt)
  );

  sortedPicks.forEach(p => {
    if (p.status === 'win') {
      tempWinStreak++;
      tempLossStreak = 0;
      if (tempWinStreak > maxWinStreak) maxWinStreak = tempWinStreak;
      currentStreak = tempWinStreak;
    } else if (p.status === 'loss') {
      tempLossStreak++;
      tempWinStreak = 0;
      if (tempLossStreak > maxLossStreak) maxLossStreak = tempLossStreak;
      currentStreak = -tempLossStreak;
    }
  });

  return {
    overall: stats,
    byPeriod,
    byMonth,
    byTeam,
    streaks: {
      current: currentStreak,
      maxWin: maxWinStreak,
      maxLoss: maxLossStreak,
    },
    generatedAt: new Date().toISOString(),
  };
}

export default {
  calculateStats,
  exportToCSV,
  exportToJSON,
  generatePerformanceReport,
};