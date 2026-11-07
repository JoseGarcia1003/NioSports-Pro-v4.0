#!/usr/bin/env node
// Walk-forward backtest of the nba-points model. Input: a JSON file
// [{ player, date, pts, minutes }] (one row per player-game, any order), e.g. an
// export of public.nba_player_games. For every game with enough prior games it
// predicts using ONLY earlier games and scores P(over line) where the line is
// the app's reference line (median of the previous 10 games, nudged to .5).
// Usage: node scripts/backtest-nba-points.mjs rows.json [--split 2026-01-15] [--grid]
import { readFileSync } from 'node:fs';
import { evaluate, grid } from './lib/nba-points-backtest.mjs';

const [file, ...flags] = process.argv.slice(2);
if (!file) { console.error('usage: backtest-nba-points.mjs rows.json [--split YYYY-MM-DD] [--grid]'); process.exit(2); }
const rows = JSON.parse(readFileSync(file, 'utf8'));
const split = flags.includes('--split') ? flags[flags.indexOf('--split') + 1] : null;
const out = flags.includes('--grid') ? grid(rows, split) : evaluate(rows, { split });
console.log(JSON.stringify(out, null, 2));
