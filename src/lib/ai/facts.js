// The only material the AI analyst may use: a list of facts produced by the
// system, each with value, source and date. The analyst explains; it never
// supplies figures of its own.
const r1 = v => Math.round(v * 10) / 10;

/** Facts for one sealed NBA points signal. */
export function signalFacts(entry, { day, sealHash = null, boxScoresThrough = null } = {}) {
  const facts = [];
  const add = (id, value, unit, text, source) => facts.push({ id, value, unit, text, source, asOf: boxScoresThrough || day });
  add('line', entry.line, 'pts', `Línea de mercado (mediana de ${entry.books} casas): ${entry.line} puntos`, 'The Odds API');
  add('books', entry.books, 'count', `Casas consultadas: ${entry.books}`, 'The Odds API');
  if (entry.l10?.n) {
    add('l10_hits', entry.l10.hits, 'count', `En ${entry.l10.hits} de sus últimos ${entry.l10.n} partidos quedó del lado indicado`, 'box score oficial (stats.nba.com)');
    add('l10_n', entry.l10.n, 'count', `Partidos considerados: ${entry.l10.n}`, 'box score oficial (stats.nba.com)');
    add('l10_pct', Math.round((entry.l10.hits / entry.l10.n) * 100), '%', 'Porcentaje L10', 'cálculo propio sobre el box score');
  }
  if (entry.model) {
    add('model_p', Math.round(entry.model.p * 100), '%', `Probabilidad del modelo ${entry.model.model}`, `modelo ${entry.model.model}`);
    add('model_mean', r1(entry.model.mean), 'pts', 'Media esperada por el modelo', `modelo ${entry.model.model}`);
    add('interval_low', entry.model.interval80[0], 'pts', 'Extremo inferior del rango 80 %', `modelo ${entry.model.model}`);
    add('interval_high', entry.model.interval80[1], 'pts', 'Extremo superior del rango 80 %', `modelo ${entry.model.model}`);
    add('model_games', entry.model.games, 'count', 'Partidos usados por el modelo', `modelo ${entry.model.model}`);
  }
  add('favour', entry.favour, 'count', 'Señales a favor', 'lectura reading-v1');
  add('against', entry.against, 'count', 'Señales en contra', 'lectura reading-v1');
  for (const [i, f] of (entry.findings || []).entries()) {
    for (const [j, n] of (f.text.match(/\d+(?:,\d+)?/g) || []).entries()) add(`finding_${i}_${j}`, Number(n.replace(',', '.')), 'num', f.text, 'lectura reading-v1');
  }
  return { subject: { player: entry.name, team: entry.team, opponent: entry.opponent, side: entry.side, stat: entry.stat, day, tipoff: entry.tipoff, sealHash },
    facts, unknowns: ['lesiones y alineaciones (sin proveedor contratado)', 'minutos previstos'] };
}
