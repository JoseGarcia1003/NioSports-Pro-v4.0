"""
Recolecta datos históricos de NBA desde nba_api.
Almacena en Supabase para entrenamiento ML.

Uso: python ml/data/collect_historical.py
"""

import os
import sys
import time
import json
import pandas as pd
from datetime import datetime, timedelta
from dotenv import load_dotenv
from supabase import create_client

# Cargar .env.local del proyecto raíz
load_dotenv('.env.local')

SUPABASE_URL = os.getenv('VITE_SUPABASE_URL', '')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY', '')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: Configura VITE_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# ═══════════════════════════════════════════════════════════
# RECOLECCIÓN DE DATOS DESDE BALLDONTLIE (gratis, sin nba_api)
# ═══════════════════════════════════════════════════════════

BDL_API_KEY = os.getenv('BALLDONTLIE_API_KEY', '')
BDL_BASE = 'https://api.balldontlie.io/v1'

def bdl_headers():
    return {'Authorization': BDL_API_KEY} if BDL_API_KEY else {}

def fetch_games_for_season(season_year):
    """
    Obtiene todos los partidos de una temporada NBA.
    season_year: año de inicio (e.g., 2023 para 2023-24)
    """
    print(f"\n  Fetching season {season_year}-{season_year+1}...")
    all_games = []
    cursor = None
    page = 0
    
    while True:
        page += 1
        params = f"seasons[]={season_year}&per_page=100"
        if cursor:
            params += f"&cursor={cursor}"
        
        url = f"{BDL_BASE}/games?{params}"
        
        try:
            import httpx
            resp = httpx.get(url, headers=bdl_headers(), timeout=15)
            if resp.status_code == 429:
                print(f"    Rate limited, waiting 60s...")
                time.sleep(60)
                continue
            if resp.status_code != 200:
                print(f"    API error {resp.status_code}: {resp.text[:200]}")
                break
            
            data = resp.json()
            games = data.get('data', [])
            
            if not games:
                break
            
            all_games.extend(games)
            print(f"    Page {page}: {len(games)} games (total: {len(all_games)})")
            
            # Check for next cursor
            meta = data.get('meta', {})
            cursor = meta.get('next_cursor')
            if not cursor:
                break
            
            time.sleep(0.5)  # Rate limiting
            
        except Exception as e:
            print(f"    Error: {e}")
            time.sleep(5)
            continue
    
    return all_games

def process_and_store_games(games):
    """Procesa partidos y los guarda en Supabase."""
    
    # Cargar mapeo de equipos desde Supabase
    teams_resp = supabase.table('teams').select('id,name,full_name').execute()
    team_map = {}
    for t in teams_resp.data:
        team_map[t['full_name']] = t
    
    stored = 0
    skipped = 0
    
    for game in games:
        if game.get('status') != 'Final':
            skipped += 1
            continue
        
        home_full = game.get('home_team', {}).get('full_name', '')
        away_full = game.get('visitor_team', {}).get('full_name', '')
        
        home = team_map.get(home_full)
        away = team_map.get(away_full)
        
        if not home or not away:
            skipped += 1
            continue
        
        game_date = game.get('date', '')[:10]
        game_id = f"{game_date}-{home['name']}-{away['name']}"
        
        game_data = {
            'id': game_id,
            'date': game_date,
            'home_team_id': home['id'],
            'away_team_id': away['id'],
            'status': 'final',
            'home_score': game.get('home_team_score'),
            'away_score': game.get('visitor_team_score'),
            'external_id': str(game.get('id', '')),
        }
        
        try:
            supabase.table('games').upsert(game_data, on_conflict='id').execute()
            stored += 1
        except Exception as e:
            if 'duplicate' not in str(e).lower():
                print(f"    Error storing {game_id}: {e}")
            skipped += 1
    
    return stored, skipped

def main():
    print("═══════════════════════════════════════════")
    print("  NioSports Pro — Historical Data Collection")
    print("═══════════════════════════════════════════")
    
    # Recolectar últimas 5 temporadas
    seasons = [2020, 2021, 2022, 2023, 2024]
    total_stored = 0
    total_skipped = 0
    
    for season in seasons:
        games = fetch_games_for_season(season)
        stored, skipped = process_and_store_games(games)
        total_stored += stored
        total_skipped += skipped
        print(f"  Season {season}: {stored} stored, {skipped} skipped")
    
    print(f"\n═══════════════════════════════════════════")
    print(f"  TOTAL: {total_stored} games stored, {total_skipped} skipped")
    print(f"═══════════════════════════════════════════")

if __name__ == '__main__':
    main()