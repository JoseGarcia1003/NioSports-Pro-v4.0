// Automatic verification of AI-written analysis before publication. Every
// number must match a system fact, dates must be the subject's, no injury or
// line-up claims without a fact that supports them, and no certainty language.
// Sentences that fail are excluded from the published text, never "fixed".

const NUMBER = /(?<![\w-])(\d{1,3}(?:[.,]\d+)?)\s*(%|por ciento)?/g;
const DATE = /\b(\d{4}-\d{2}-\d{2})\b/g;
const INJURY = /\b(lesi[oó]n|lesionad[oa]s?|baja médica|duda para|no jugar[áa]|descanso|rotaci[oó]n|titular|suplente|alineaci[oó]n)\b/i;
const CERTAINTY = /\b(segur[oa]s?|segur[ií]sim[oa]s?|garantizad[oa]|fij[oa]|sin riesgo|no puede fallar|infalible|100\s*%|ganancia asegurada)\b/i;
const CAUSAL = /\b(porque|debido a|provoca|causa|gracias a)\b/i;

export function splitSentences(text) {
  return text.replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡0-9])/u).filter(Boolean);
}

/**
 * @param {string} text AI output
 * @param {{ facts: {id:string, value:number}[], subject: {day:string, tipoff?:string} }} sheet
 */
export function verifyAnalysis(text, sheet, { tolerance = 0.05 } = {}) {
  const values = sheet.facts.map(f => Number(f.value)).filter(Number.isFinite);
  const hasInjuryFact = sheet.facts.some(f => /injur|lesi/i.test(f.id));
  const allowedDates = new Set([sheet.subject.day, sheet.subject.tipoff?.slice(0, 10)].filter(Boolean));
  const sentences = splitSentences(text || '').map(s => {
    const reasons = [];
    for (const m of s.matchAll(NUMBER)) {
      if (/\d{4}-\d{2}-\d{2}/.test(s.slice(Math.max(0, m.index - 5), m.index + 10))) continue;
      const n = Number(m[1].replace(',', '.'));
      if (!values.some(v => Math.abs(v - n) <= Math.max(tolerance, Math.abs(v) * 0.005))) reasons.push(`cifra_sin_fuente:${m[1]}${m[2] ? '%' : ''}`);
    }
    for (const m of s.matchAll(DATE)) if (!allowedDates.has(m[1])) reasons.push(`fecha_no_registrada:${m[1]}`);
    if (INJURY.test(s) && !hasInjuryFact) reasons.push('afirmacion_lesion_o_alineacion_sin_dato');
    if (CERTAINTY.test(s)) reasons.push('lenguaje_de_certeza');
    if (CAUSAL.test(s)) reasons.push('causalidad_no_demostrada');
    return { text: s, ok: reasons.length === 0, reasons };
  });
  const kept = sentences.filter(s => s.ok);
  return { ok: sentences.length > 0 && kept.length === sentences.length, publishable: kept.map(s => s.text).join(' '),
    excluded: sentences.filter(s => !s.ok), checked: sentences.length };
}
