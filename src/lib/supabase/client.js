// src/lib/supabase/client.js
// ════════════════════════════════════════════════════════════════
// Cliente Supabase para NioSports Pro
// Reemplaza Firebase RTDB como base de datos principal.
// Firebase Auth se mantiene para autenticación.
// ════════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';
import { browser } from '$app/environment';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // We use Firebase Auth, not Supabase Auth
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

// ═══════════════════════════════════════════════════════════════
// DATABASE HELPERS — replaces dbRead/dbWrite/dbPush/dbRemove
// ═══════════════════════════════════════════════════════════════

/**
 * Get user picks from Supabase
 * @param {string} userId - Firebase UID
 * @param {Object} options - { limit, offset, status, period }
 */
export async function getUserPicks(userId, options = {}) {
  const { limit = 100, offset = 0, status, period, source } = options;

  let query = supabase
    .from('picks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);
  if (period) query = query.eq('period', period);
  if (source) query = query.eq('source', source);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Save a pick
 * @param {Object} pick - Pick data
 */
export async function savePick(pick) {
  const { data, error } = await supabase
    .from('picks')
    .insert(pick)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update a pick (e.g. set result)
 * @param {string} pickId - UUID
 * @param {Object} updates - Fields to update
 */
export async function updatePick(pickId, updates) {
  const { data, error } = await supabase
    .from('picks')
    .update(updates)
    .eq('id', pickId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a pick
 * @param {string} pickId - UUID
 */
export async function deletePick(pickId) {
  const { error } = await supabase
    .from('picks')
    .delete()
    .eq('id', pickId);

  if (error) throw error;
}

/**
 * Get user profile
 * @param {string} userId - Firebase UID
 */
export async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
  return data;
}

/**
 * Upsert user profile
 * @param {Object} profile - { id, email, display_name, ... }
 */
export async function upsertUserProfile(profile) {
  const { data, error } = await supabase
    .from('user_profiles')
    .upsert(profile, { onConflict: 'id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get bankroll transactions for a user
 * @param {string} userId
 * @param {number} limit
 */
export async function getBankrollHistory(userId, limit = 50) {
  const { data, error } = await supabase
    .from('bankroll_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Add bankroll transaction
 * @param {Object} transaction
 */
export async function addBankrollTransaction(transaction) {
  const { data, error } = await supabase
    .from('bankroll_transactions')
    .insert(transaction)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get today's games
 * @param {string} date - YYYY-MM-DD
 */
export async function getGamesByDate(date) {
  const { data, error } = await supabase
    .from('games')
    .select(`
      *,
      home_team:teams!games_home_team_id_fkey(id, name, full_name, abbreviation),
      away_team:teams!games_away_team_id_fkey(id, name, full_name, abbreviation)
    `)
    .eq('date', date)
    .order('start_time');

  if (error) throw error;
  return data || [];
}

/**
 * Get predictions for a game
 * @param {string} gameId
 */
export async function getGamePredictions(gameId) {
  const { data, error } = await supabase
    .from('predictions')
    .select('*')
    .eq('game_id', gameId)
    .eq('source', 'live')
    .order('period');

  if (error) throw error;
  return data || [];
}

/**
 * Get team stats as-of a date
 * @param {string} teamName - short name
 * @param {string} date - YYYY-MM-DD (optional, defaults to latest)
 */
export async function getTeamStats(teamName, date) {
  let query = supabase
    .from('team_stats')
    .select('*, team:teams!team_stats_team_id_fkey(name, full_name)')
    .eq('team.name', teamName)
    .order('date', { ascending: false })
    .limit(1);

  if (date) {
    query = query.lte('date', date);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data?.[0] || null;
}

/**
 * Get public track record (predictions with results)
 * @param {Object} options - { limit, period, source }
 */
export async function getTrackRecord(options = {}) {
  const { limit = 200, period, source = 'live' } = options;

  let query = supabase
    .from('predictions')
    .select(`
      *,
      game:games(date, home_team:teams!games_home_team_id_fkey(name), away_team:teams!games_away_team_id_fkey(name))
    `)
    .eq('source', source)
    .not('result', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (period) query = query.eq('period', period);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Get aggregate stats for track record
 */
export async function getTrackRecordStats() {
  const { data, error } = await supabase
    .rpc('get_track_record_stats');

  if (error) {
    // Fallback: compute client-side if RPC not available
    console.warn('[Supabase] RPC get_track_record_stats not available, computing client-side');
    return null;
  }
  return data;
}

/**
 * Get odds for a game
 * @param {string} gameId
 * @param {string} snapshotType - 'opening', 'current', 'closing'
 */
export async function getGameOdds(gameId, snapshotType = 'current') {
  const { data, error } = await supabase
    .from('odds_snapshots')
    .select('*')
    .eq('game_id', gameId)
    .eq('snapshot_type', snapshotType)
    .order('period');

  if (error) throw error;
  return data || [];
}

/**
 * Subscribe to real-time changes on a table
 * @param {string} table
 * @param {string} filterColumn
 * @param {string} filterValue
 * @param {Function} callback
 * @returns {Function} unsubscribe
 */
export function subscribeToChanges(table, filterColumn, filterValue, callback) {
  const channel = supabase
    .channel(`${table}_${filterValue}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
        filter: `${filterColumn}=eq.${filterValue}`,
      },
      (payload) => callback(payload)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
