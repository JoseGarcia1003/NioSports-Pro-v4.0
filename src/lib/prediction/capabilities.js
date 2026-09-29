import { ARCHITECTURE_VERSION } from './contracts.js';
export const capabilities = Object.freeze({version:ARCHITECTURE_VERSION,
  nba:Object.freeze({FULL:'disabled_pending_compatible_artifact',HALF:'unsupported',Q1:'unsupported'}),
  tennis:Object.freeze({MATCH:'demo_experimental_only'}),commercialPicks:false});
