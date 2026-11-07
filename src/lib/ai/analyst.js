// AI analyst: turns a verified fact sheet into a short explanation in Spanish.
// Disabled unless AI_PROVIDER and its key are configured (no paid service is
// activated by default). Output is always passed through verifyAnalysis.
import { verifyAnalysis } from './verifier.js';

export const AI_DEFAULT_MODEL = 'claude-opus-5-5';

export function aiConfig(env) {
  const provider = env.AI_PROVIDER || '';
  if (provider !== 'anthropic') return { enabled: false, reason: provider ? 'unsupported_provider' : 'not_configured' };
  if (!env.ANTHROPIC_API_KEY) return { enabled: false, reason: 'missing_key' };
  return { enabled: true, provider, model: env.AI_MODEL || AI_DEFAULT_MODEL, maxTokens: Math.min(1200, Number(env.AI_MAX_TOKENS) || 700) };
}

export const SYSTEM_PROMPT = [
  'Eres el analista de NioSports Pro. Escribes en español neutro, sobrio y claro, para apostadores que quieren entender un pronóstico.',
  'Usa EXCLUSIVAMENTE las cifras de la ficha de datos que recibes. No añadas ninguna cifra, fecha, lesión, alineación ni acontecimiento que no esté en la ficha.',
  'Si un factor relevante figura en "desconocidos", dilo explícitamente como incertidumbre.',
  'No uses lenguaje de certeza ni prometas resultados; una probabilidad no es una garantía. No atribuyas causas que los datos no demuestran.',
  'Formato: 3 a 5 frases cortas, sin listas ni títulos.'
].join(' ');

/**
 * @param {object} sheet from signalFacts()
 * @param {{ env: object, client?: { messages: { create: Function } } }} deps
 */
export async function explain(sheet, { env, client = null }) {
  const cfg = aiConfig(env);
  if (!cfg.enabled) return { status: 'disabled', reason: cfg.reason };
  let api = client;
  if (!api) { const { default: Anthropic } = await import('@anthropic-ai/sdk'); api = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }); }
  const response = await api.messages.create({
    model: cfg.model, max_tokens: cfg.maxTokens, system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `Ficha de datos (JSON):\n${JSON.stringify(sheet)}\n\nExplica este pronóstico.` }]
  });
  const text = response.content.filter(b => b.type === 'text').map(b => b.text).join(' ').trim();
  const verification = verifyAnalysis(text, sheet);
  return { status: verification.publishable ? 'ok' : 'rejected', model: cfg.model, text: verification.publishable, excluded: verification.excluded, fullyVerified: verification.ok };
}
