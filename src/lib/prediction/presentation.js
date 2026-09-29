import { ARCHITECTURE_VERSION, immutable } from './contracts.js';
const messages = {
  DATA_CONTRACT_REQUIRED:'Este análisis necesita una instantánea verificable del partido. Los promedios antiguos no cumplen ese requisito.',
  SNAPSHOT_UNAVAILABLE:'Todavía no hay una instantánea verificada disponible para este partido.',
  MODEL_UNAVAILABLE:'No hay un modelo habilitado compatible con estos datos y este periodo.',
  ARTIFACT_INCOMPATIBLE:'El artefacto del modelo no es compatible. No se usó un motor sustituto.',
  MODEL_EXECUTION_FAILED:'El motor no pudo completar el análisis. No se sustituyó por otra estimación.',
  UNSUPPORTED_SCOPE:'Este periodo no tiene un modelo propio habilitado.',
  INVALID_DATA:'Los datos no cumplen el contrato de procedencia y disponibilidad temporal.',
  PROBABILITY_UNAVAILABLE:'No hay una distribución compatible para calcular probabilidades.',
  DECISION_POLICY_NOT_ENABLED:'No se generan recomendaciones comerciales mientras su política y validación estén pendientes.'
};
// Presentation only copies stage outputs and selects text. It never recomputes probability/EV.
export function present({ context=null, projection=null, probability=null, decision=null, reason=null }) {
  const code = reason || decision?.reason || 'MODEL_UNAVAILABLE';
  return immutable({ version:ARCHITECTURE_VERSION, status:projection ? 'experimental' : 'abstained',
    reason:code, message:messages[code] || messages.INVALID_DATA,
    eventId:context?.event.id ?? null, snapshotHash:context?.snapshotHash ?? null,
    projection, probability, decision, recommendation:null, calibrated:false });
}
