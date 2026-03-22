"""
Feature engineering para el modelo XGBoost.
Calcula rolling stats, matchup features, y factores contextuales.

Uso: python ml/data/feature_engineering.py
"""

import os
import sys
import pandas as pd
import numpy as np
from datetime import timedelta
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('.env.local')

SUPABASE_URL = os.getenv('VITE_SUPABASE_URL', '')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY', '')
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Arenas en altitud (Denver = 5280 ft, Salt Lake City = 4226 ft)
ALTITUDE_TEAMS = {'Nuggets': 5280, 'Jazz': 4226}

def load_games():
    """Carga todos los partidos finalizados desde Supabase."""
    print("  Loading games from Supabase...")
    
    all_games = []
    offset = 0
    batch_size = 1000
    
    while True:
        resp = supabase.table('games') \
            .select('*, home_team:teams!games_home_team_id_fkey(name), away_team:teams!games_away_team_id_fkey(name)') \
            .eq('status', 'final') \
            .order('date') \
            .range(offset, offset + batch_size - 1) \
            .execute()
        
        if not resp.data:
            break
        
        all_games.extend(resp.data)
        offset += batch_size
        
        if len(resp.data) < batch_size:
            break
    
    print(f"  Loaded {len(all_games)} games")
    
    df = pd.DataFrame(all_games)
    df['date'] = pd.to_datetime(df['date'])
    df['home_name'] = df['home_team'].apply(lambda x: x['name'] if x else None)
    df['away_name'] = df['away_team'].apply(lambda x: x['name'] if x else None)
    
    # Filtrar partidos sin scores (en lugar de .not_ en la query)
    df = df.dropna(subset=['home_score', 'away_score'])
    df['full_total'] = df['home_score'].astype(int) + df['away_score'].astype(int)
    
    print(f"  After filtering: {len(df)} games with scores")
    
    return df.sort_values('date').reset_index(drop=True)

def calculate_rolling_stats(df, team, window, date_cutoff):
    """
    Calcula estadísticas rolling para un equipo ANTES de una fecha.
    NUNCA usa datos del mismo día o posteriores (previene look-ahead bias).
    """
    # Partidos del equipo antes de la fecha
    mask = (
        ((df['home_name'] == team) | (df['away_name'] == team)) &
        (df['date'] < date_cutoff)
    )
    team_games = df[mask].tail(window)
    
    if len(team_games) == 0:
        return None
    
    totals = []
    home_totals = []
    away_totals = []
    
    for _, g in team_games.iterrows():
        total = g['full_total']
        totals.append(total)
        if g['home_name'] == team:
            home_totals.append(total)
        else:
            away_totals.append(total)
    
    return {
        'avg_total': np.mean(totals),
        'avg_home_total': np.mean(home_totals) if home_totals else np.mean(totals),
        'avg_away_total': np.mean(away_totals) if away_totals else np.mean(totals),
        'std_total': np.std(totals) if len(totals) > 1 else 10,
        'games_count': len(totals),
    }

def calculate_rest_days(df, team, game_date):
    """Calcula días de descanso antes de un partido."""
    mask = (
        ((df['home_name'] == team) | (df['away_name'] == team)) &
        (df['date'] < game_date)
    )
    prev_games = df[mask]
    
    if len(prev_games) == 0:
        return 3  # default
    
    last_game_date = prev_games['date'].max()
    rest = (game_date - last_game_date).days - 1
    return max(0, rest)

def build_features_for_game(df, game_idx):
    """Construye vector de features para un partido específico."""
    game = df.iloc[game_idx]
    game_date = game['date']
    home = game['home_name']
    away = game['away_name']
    
    # Rolling stats para múltiples ventanas
    home_l5 = calculate_rolling_stats(df, home, 5, game_date)
    home_l10 = calculate_rolling_stats(df, home, 10, game_date)
    home_l20 = calculate_rolling_stats(df, home, 20, game_date)
    away_l5 = calculate_rolling_stats(df, away, 5, game_date)
    away_l10 = calculate_rolling_stats(df, away, 10, game_date)
    away_l20 = calculate_rolling_stats(df, away, 20, game_date)
    
    # Necesitamos al menos L5 para ambos equipos
    if not home_l5 or not away_l5:
        return None
    
    # Rest days
    home_rest = calculate_rest_days(df, home, game_date)
    away_rest = calculate_rest_days(df, away, game_date)
    
    # Altitude
    home_altitude = ALTITUDE_TEAMS.get(home, 0)
    
    # Season game number (proxy for time-of-season effects)
    season_start = pd.Timestamp(f"{game_date.year if game_date.month >= 10 else game_date.year - 1}-10-01")
    days_into_season = (game_date - season_start).days
    
    features = {
        # Home rolling totals
        'home_total_l5': home_l5['avg_total'],
        'home_total_l10': home_l10['avg_total'] if home_l10 else home_l5['avg_total'],
        'home_total_l20': home_l20['avg_total'] if home_l20 else home_l5['avg_total'],
        'home_home_avg': home_l10['avg_home_total'] if home_l10 else home_l5['avg_home_total'],
        'home_std': home_l10['std_total'] if home_l10 else home_l5['std_total'],
        
        # Away rolling totals
        'away_total_l5': away_l5['avg_total'],
        'away_total_l10': away_l10['avg_total'] if away_l10 else away_l5['avg_total'],
        'away_total_l20': away_l20['avg_total'] if away_l20 else away_l5['avg_total'],
        'away_away_avg': away_l10['avg_away_total'] if away_l10 else away_l5['avg_away_total'],
        'away_std': away_l10['std_total'] if away_l10 else away_l5['std_total'],
        
        # Combined/differential
        'total_sum_l5': home_l5['avg_total'] + away_l5['avg_total'],
        'total_sum_l10': (home_l10['avg_total'] if home_l10 else home_l5['avg_total']) + 
                         (away_l10['avg_total'] if away_l10 else away_l5['avg_total']),
        'total_diff_l5': home_l5['avg_total'] - away_l5['avg_total'],
        
        # Contextual
        'home_rest_days': min(home_rest, 7),  # Cap at 7
        'away_rest_days': min(away_rest, 7),
        'is_b2b_home': 1 if home_rest == 0 else 0,
        'is_b2b_away': 1 if away_rest == 0 else 0,
        'rest_diff': home_rest - away_rest,
        'altitude_ft': home_altitude,
        'days_into_season': min(days_into_season, 250),
        
        # Target
        'actual_total': game['full_total'],
        
        # Metadata (not features, for tracking)
        '_game_id': game['id'],
        '_date': str(game_date.date()),
        '_home': home,
        '_away': away,
        '_home_score': game['home_score'],
        '_away_score': game['away_score'],
    }
    
    return features

def build_dataset(df):
    """Construye dataset completo de features para todos los partidos."""
    print("  Building features for all games...")
    
    all_features = []
    skipped = 0
    
    for i in range(len(df)):
        if i % 500 == 0 and i > 0:
            print(f"    Processed {i}/{len(df)} games...")
        
        features = build_features_for_game(df, i)
        if features:
            all_features.append(features)
        else:
            skipped += 1
    
    dataset = pd.DataFrame(all_features)
    print(f"  Built {len(dataset)} samples ({skipped} skipped - insufficient history)")
    
    return dataset

def main():
    print("═══════════════════════════════════════════")
    print("  NioSports Pro — Feature Engineering")
    print("═══════════════════════════════════════════")
    
    df = load_games()
    
    if len(df) < 100:
        print("ERROR: Not enough games. Run collect_historical.py first.")
        sys.exit(1)
    
    dataset = build_dataset(df)
    
    # Save to CSV for training
    output_path = 'ml/data/nba_features.csv'
    dataset.to_csv(output_path, index=False)
    print(f"\n  Dataset saved to {output_path}")
    print(f"  Shape: {dataset.shape}")
    print(f"  Date range: {dataset['_date'].min()} to {dataset['_date'].max()}")
    print(f"  Mean total: {dataset['actual_total'].mean():.1f}")
    print(f"  Std total: {dataset['actual_total'].std():.1f}")

if __name__ == '__main__':
    main()