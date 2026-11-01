// Rule-based reading of a player prop. Every sentence is computed from stored box
// scores; nothing is estimated beyond what the sample shows. It is a structured
// summary of evidence, not a probability and not a recommendation.
import { STATS, statValue, hitRate, average, sided, seasonGames, defenseFor } from './props.js';

const fmt = n => n.toLocaleString('es', { maximumFractionDigits: 1 });
const pct = r => `${Math.round(r * 100)} %`;

/** +1 favours the chosen side, -1 goes against it, 0 is context only. */
function finding(weight, title, text, caution = false) {
  return { weight, title, text, caution };
}

/**
 * @param {{ games: any[], history?: any[] | null, stat: string, side: 'over'|'under', line: number,
 *           opponent: string, home: boolean, defense?: Record<string, any> | null }} input
 */
export function analyseProp({ games, history, stat, side, line, opponent, home, defense }) {
  const label = STATS[stat].label.toLowerCase();
  const verb = side === 'over' ? 'supera' : 'queda por debajo de';
  const towards = side === 'over' ? 1 : -1;
  const all = Array.isArray(history) && history.length ? history : games;
  const out = [];

  // 1. Recent hit rate (L10).
  const l10 = sided(hitRate(games, stat, line, 10), side);
  if (l10.over + l10.under >= 5) {
    const w = l10.rate >= 0.6 ? 1 : l10.rate <= 0.4 ? -1 : 0;
    out.push(finding(w, 'Forma reciente', `${capital(verb)} ${fmt(line)} en ${l10.hits} de sus últimos ${l10.over + l10.under} partidos (${pct(l10.rate)}).`));
  }

  // 2. Margin of the recent average against the line.
  const avg10 = average(games, stat, 10);
  if (avg10 != null && games.length >= 5) {
    const diff = avg10 - line;
    const rel = line > 0 ? Math.abs(diff) / line : 0;
    const w = rel < 0.05 ? 0 : Math.sign(diff) === towards ? 1 : -1;
    out.push(finding(w, 'Promedio frente a la línea', `Promedia ${fmt(avg10)} ${label} en L10, ${fmt(Math.abs(diff))} ${diff >= 0 ? 'por encima' : 'por debajo'} de la línea.`));
  }

  // 3. Trend: last 5 against last 20.
  const avg5 = average(games, stat, 5), avg20 = average(games, stat, 20);
  if (avg5 != null && avg20 && games.length >= 10) {
    const ratio = avg5 / avg20;
    if (ratio >= 1.1 || ratio <= 0.9) {
      const up = ratio > 1;
      out.push(finding(up === (side === 'over') ? 1 : -1, up ? 'Tendencia al alza' : 'Tendencia a la baja', `Promedia ${fmt(avg5)} en sus últimos 5 frente a ${fmt(avg20)} en los últimos 20.`));
    }
  }

  // 4. Tonight's venue.
  const venue = sided(hitRate(all.filter(g => g.home === home), stat, line), side);
  const venueN = venue.over + venue.under;
  if (venueN >= 5) {
    const w = venue.rate >= 0.6 ? 1 : venue.rate <= 0.4 ? -1 : 0;
    out.push(finding(w, home ? 'Como local' : 'Como visitante', `${capital(verb)} la línea en ${venue.hits} de ${venueN} partidos ${home ? 'en casa' : 'fuera'} (${pct(venue.rate)}).`));
  }

  // 5. Head-to-head against tonight's opponent.
  const h2h = sided(hitRate(all.filter(g => g.opponent === opponent), stat, line), side);
  const h2hN = h2h.over + h2h.under;
  if (h2hN >= 2) {
    const small = h2hN < 4;
    const w = small ? 0 : h2h.rate >= 0.6 ? 1 : h2h.rate <= 0.4 ? -1 : 0;
    out.push(finding(w, `Contra ${opponent}`, `${capital(verb)} la línea en ${h2h.hits} de ${h2hN} enfrentamientos guardados${small ? '; muestra demasiado pequeña para pesar' : ''}.`, small));
  }

  // 6. Opponent defence for this stat.
  const def = defenseFor(defense, opponent, stat);
  if (def) {
    const few = def.games < 8;
    const lenient = def.rank <= 10, strict = def.rank > def.of - 10;
    const w = few ? 0 : lenient ? towards : strict ? -towards : 0;
    out.push(finding(w, 'Defensa del rival', `${opponent} permite ${fmt(def.value)} ${label} por partido (puesto ${def.rank} de ${def.of}; 1 = el que más permite) en ${def.games} partidos${few ? ', una muestra aún corta' : ''}.`, few));
  }

  // 7. Minutes trend: fewer minutes undermine overs.
  const min5 = mean(games.slice(0, 5).map(g => g.minutes));
  const minSeason = mean(seasonGames(games).map(g => g.minutes));
  if (min5 != null && minSeason && seasonGames(games).length >= 5) {
    const r = min5 / minSeason;
    if (r <= 0.85 || r >= 1.15) {
      const more = r > 1;
      out.push(finding(more === (side === 'over') ? 1 : -1, more ? 'Más minutos' : 'Menos minutos', `Juega ${fmt(min5)} min en sus últimos 5 frente a ${fmt(minSeason)} de media en la temporada.`));
    }
  }

  // 8. Volatility (context only).
  const values = games.slice(0, 10).map(g => statValue(g, stat));
  const m = mean(values);
  if (m && values.length >= 8) {
    const cv = Math.sqrt(mean(values.map(v => (v - m) ** 2))) / m;
    if (cv >= 0.4) out.push(finding(0, 'Rendimiento irregular', `Sus últimos ${values.length} partidos varían mucho (desviación de ${Math.round(cv * 100)} % sobre su media): cualquier lectura es menos fiable.`, true));
  }

  // 9. Current-season sample size.
  const seasonN = seasonGames(games).length;
  if (seasonN < 5) out.push(finding(0, 'Temporada corta', `Solo ${seasonN} partido${seasonN === 1 ? '' : 's'} esta temporada; parte de la muestra viene de la anterior, con posibles cambios de equipo o rol.`, true));

  const favour = out.filter(f => f.weight > 0).length;
  const against = out.filter(f => f.weight < 0).length;
  // A clear reading needs breadth (3+ aligned signals) and a margin of 2 over the
  // opposite side; anything less stays 'mixta' rather than overstating thin evidence.
  const reading = favour >= 3 && favour >= against + 2 ? 'favorable' : against >= 3 && against >= favour + 2 ? 'desfavorable' : 'mixta';
  return { findings: out, favour, against, reading };
}

function mean(values) {
  const v = values.filter(Number.isFinite);
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
}

function capital(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
