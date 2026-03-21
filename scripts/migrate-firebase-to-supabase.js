// scripts/migrate-firebase-to-supabase.js
// ════════════════════════════════════════════════════════════════
// One-time migration: reads all data from Firebase RTDB and
// inserts into Supabase PostgreSQL.
//
// Usage: node scripts/migrate-firebase-to-supabase.js
//
// Prerequisites:
//   - Supabase schema already created (run supabase/schema.sql)
//   - Firebase credentials available
//   - Environment variables set:
//     VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//     PUBLIC_FIREBASE_DATABASE_URL
// ════════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get } from 'firebase/database';

// Load env vars from .env.local
import { config } from 'dotenv';
config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FIREBASE_CONFIG = {
  apiKey: process.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.PUBLIC_FIREBASE_PROJECT_ID,
};

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE env vars. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

if (!FIREBASE_CONFIG.databaseURL) {
  console.error('Missing PUBLIC_FIREBASE_DATABASE_URL.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const firebaseApp = initializeApp(FIREBASE_CONFIG);
const db = getDatabase(firebaseApp);

async function readFirebase(path) {
  const snapshot = await get(ref(db, path));
  return snapshot.exists() ? snapshot.val() : null;
}

async function migrateUser(uid, userData) {
  console.log(`  Migrating user: ${uid}`);

  // 1. Migrate profile
  const profile = userData.profile || {};
  await supabase.from('user_profiles').upsert({
    id: uid,
    email: profile.email || null,
    display_name: profile.displayName || profile.username || null,
    plan: profile.plan || 'free',
    theme: userData.preferences?.theme || 'dark',
    default_odds: userData.preferences?.defaultOdds || -110,
    created_at: profile.createdAt || new Date().toISOString(),
  }, { onConflict: 'id' });

  // 2. Migrate picks (totales)
  const picks = userData.picks?.totales || {};
  let pickCount = 0;

  for (const [fbId, pick] of Object.entries(picks)) {
    const { error } = await supabase.from('picks').insert({
      user_id: uid,
      home_team: pick.localTeam || '',
      away_team: pick.awayTeam || '',
      period: pick.period || 'FULL',
      bet_type: pick.betType || 'OVER',
      line: parseFloat(pick.line) || 0,
      projection: pick.projection ? parseFloat(pick.projection) : null,
      probability: pick.probability ? parseFloat(pick.probability) : null,
      probability_pct: pick.probabilityPercent ? parseFloat(pick.probabilityPercent) : null,
      confidence: pick.confidence || null,
      edge: pick.edge ? parseFloat(pick.edge) : null,
      ev_percent: pick.evPercent ? parseFloat(pick.evPercent) : null,
      odds: pick.odds ? parseInt(pick.odds) : -110,
      status: pick.status || 'pending',
      closing_line: pick.closingLine ? parseFloat(pick.closingLine) : null,
      actual_total: pick.actualTotal ? parseFloat(pick.actualTotal) : null,
      model_error: pick.modelError ? parseFloat(pick.modelError) : null,
      did_bet: pick.didBet || false,
      bet_amount: pick.betAmount ? parseFloat(pick.betAmount) : null,
      is_combo: pick.isCombo || false,
      combo_line: pick.isCombo ? pick.line : null,
      note: pick.note || null,
      model_version: pick.modelVersion || '2.0.0',
      source: 'manual',
      created_at: pick.createdAt || new Date().toISOString(),
      resolved_at: pick.resolvedAt || null,
    });

    if (error) {
      console.error(`    Error migrating pick ${fbId}:`, error.message);
    } else {
      pickCount++;
    }
  }

  // 3. Migrate AI picks
  const aiPicks = userData.picks?.ai || {};
  for (const [fbId, pick] of Object.entries(aiPicks)) {
    await supabase.from('picks').insert({
      user_id: uid,
      home_team: pick.localTeam || pick.homeTeam || '',
      away_team: pick.awayTeam || '',
      period: pick.period || 'FULL',
      bet_type: pick.betType || pick.direction || 'OVER',
      line: parseFloat(pick.line || pick.marketLine) || 0,
      projection: pick.projection ? parseFloat(pick.projection) : null,
      probability_pct: pick.probabilityPercent ? parseFloat(pick.probabilityPercent) : null,
      confidence: pick.confidence || null,
      edge: pick.edge ? parseFloat(pick.edge) : null,
      ev_percent: pick.evPercent ? parseFloat(pick.evPercent) : null,
      odds: -110,
      status: pick.status || 'pending',
      model_version: pick.modelVersion || '2.0.0',
      source: 'ai',
      created_at: pick.createdAt || pick.generatedAt || new Date().toISOString(),
    }).then(({ error }) => {
      if (error && !error.message.includes('duplicate')) {
        console.error(`    Error migrating AI pick ${fbId}:`, error.message);
      }
    });
  }

  // 4. Migrate bankroll
  const bankroll = userData.bankroll || {};
  if (bankroll.initial || bankroll.current) {
    await supabase.from('user_profiles').update({
      initial_bankroll: bankroll.initial || 0,
      current_bankroll: bankroll.current || 0,
    }).eq('id', uid);
  }

  const history = bankroll.history || {};
  for (const [entryId, entry] of Object.entries(history)) {
    await supabase.from('bankroll_transactions').insert({
      user_id: uid,
      type: entry.type || 'deposit',
      amount: parseFloat(entry.amount) || 0,
      balance: parseFloat(entry.balance) || 0,
      note: entry.note || null,
      created_at: entry.date || new Date().toISOString(),
    }).then(({ error }) => {
      if (error) console.error(`    Error migrating bankroll entry:`, error.message);
    });
  }

  console.log(`    ✓ ${pickCount} picks, ${Object.keys(aiPicks).length} AI picks, ${Object.keys(history).length} bankroll entries`);
}

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  Firebase → Supabase Migration');
  console.log('═══════════════════════════════════════════');

  // Read all users from Firebase
  const users = await readFirebase('users');

  if (!users) {
    console.log('No users found in Firebase RTDB.');
    process.exit(0);
  }

  const userIds = Object.keys(users);
  console.log(`Found ${userIds.length} users to migrate.\n`);

  let migrated = 0;
  let failed = 0;

  for (const uid of userIds) {
    try {
      await migrateUser(uid, users[uid]);
      migrated++;
    } catch (err) {
      console.error(`  ✗ Failed to migrate user ${uid}:`, err.message);
      failed++;
    }
  }

  console.log('\n═══════════════════════════════════════════');
  console.log(`  Migration complete: ${migrated} migrated, ${failed} failed`);
  console.log('═══════════════════════════════════════════');
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
