// Bankroll performance metrics, computed on the server from the user's settled
// tickets (real stake and real decimal odds of each one). Definitions:
//   decided   = tickets won + tickets lost (pushes and voids return the stake and are excluded)
//   hitRate   = won / decided, with a 95 % Wilson interval
//   staked    = sum of stakes of decided tickets
//   profit    = Σ stake·(odds − 1) over wins − Σ stake over losses
//   yield     = profit / staked            (return per unit staked)
//   roi       = profit / net capital       (net capital = deposits − withdrawals, when positive)
// Amounts are integer minor units; ratios are null when their denominator is zero.
import { wilson } from '../stats/distributions.js';

export const MIN_TICKETS = 30;

export function bankrollMetrics(tickets, wallet = null) {
  let won = 0, lost = 0, push = 0, voided = 0, pending = 0, staked = 0, profit = 0, oddsSum = 0, exposure = 0;
  for (const t of tickets || []) {
    const stake = Number(t.stake_minor) || 0, odds = Number(t.odds);
    if (t.status === 'win') { won++; staked += stake; profit += Math.round(stake * (odds - 1)); oddsSum += odds; }
    else if (t.status === 'loss') { lost++; staked += stake; profit -= stake; oddsSum += odds; }
    else if (t.status === 'push') push++;
    else if (t.status === 'void') voided++;
    else { pending++; exposure += stake; }
  }
  const decided = won + lost;
  const netCapital = wallet ? Number(wallet.deposited_minor || 0) - Number(wallet.withdrawn_minor || 0) : 0;
  return {
    tickets: (tickets || []).length, decided, won, lost, push, void: voided, pending, exposureMinor: exposure,
    stakedMinor: staked, profitMinor: profit,
    hitRate: decided ? won / decided : null, hitRateCI: wilson(won, decided),
    yield: staked > 0 ? profit / staked : null,
    roi: netCapital > 0 ? profit / netCapital : null,
    averageOdds: decided ? oddsSum / decided : null,
    // The ledger keeps its own running profit; both must agree or something was double-counted.
    consistentWithLedger: wallet ? Number(wallet.profit_minor || 0) === profit && Number(wallet.settled_stake_minor || 0) === staked : null,
    conclusive: decided >= MIN_TICKETS
  };
}
