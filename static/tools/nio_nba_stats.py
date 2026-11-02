"""NioSports Pro - descarga de estadisticas NBA por jugador y partido.

Uso (Windows, Simbolo del sistema):
    py -m pip install nba_api
    py nio_nba_stats.py                 # temporada actual, fase regular
    py nio_nba_stats.py --season 2025-26
    py nio_nba_stats.py --season 2025-26 --type Playoffs

La clave de ingesta se pide al ejecutar y no se muestra en pantalla.
Tambien puede definirse antes con:  set NIO_INGEST_SECRET=...
Fuente de los datos: stats.nba.com (a traves de la libreria nba_api).
"""
import argparse
import datetime as dt
import getpass
import json
import math
import os
import sys
import time
import urllib.error
import urllib.request

ENDPOINT = "https://nio-sports-pro-v4-0.vercel.app/api/ingest/nba-player-games"
PLAYERS_ENDPOINT = "https://nio-sports-pro-v4-0.vercel.app/api/ingest/nba-players"
POSITIONS = {"G", "F", "C", "G-F", "F-G", "F-C", "C-F", "G-C", "C-G"}
BATCH = 500
TYPES = ("Regular Season", "Playoffs", "PlayIn")


def current_season(today=None):
    today = today or dt.date.today()
    start = today.year if today.month >= 10 else today.year - 1
    return f"{start}-{(start + 1) % 100:02d}"


def as_int(value):
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return None
    return int(round(float(value)))


def as_minutes(value):
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return 0.0
    text = str(value)
    if ":" in text:
        mins, secs = text.split(":", 1)
        return round(int(mins) + int(secs) / 60, 2)
    return round(float(text), 2)


def to_row(rec, season, season_type):
    matchup = str(rec["MATCHUP"])
    is_home = " vs. " in matchup
    opponent = matchup.replace(" vs. ", " @ ").split(" @ ")[-1].strip()
    wl = rec.get("WL")
    keys = ("PTS", "REB", "AST", "FG3M", "FG3A", "FGM", "FGA", "FTM", "FTA", "OREB", "DREB", "STL", "BLK", "TOV", "PF")
    row = {
        "game_id": str(rec["GAME_ID"]).zfill(10),
        "player_id": int(rec["PLAYER_ID"]),
        "season": season,
        "season_type": season_type,
        "game_date": str(rec["GAME_DATE"])[:10],
        "player_name": str(rec["PLAYER_NAME"]).strip(),
        "team": str(rec["TEAM_ABBREVIATION"]).strip(),
        "opponent": opponent,
        "is_home": is_home,
        "won": True if wl == "W" else False if wl == "L" else None,
        "minutes": as_minutes(rec.get("MIN")),
        "plus_minus": as_int(rec.get("PLUS_MINUS")),
    }
    for key in keys:
        row[key.lower()] = as_int(rec.get(key)) or 0
    return row


def problems(r):
    """Mismas reglas que el servidor: una fila incoherente no se envia."""
    out = []
    if r["fg3m"] > r["fg3a"] or r["fgm"] > r["fga"] or r["ftm"] > r["fta"] or r["fg3m"] > r["fgm"]:
        out.append("aciertos superan intentos")
    if r["oreb"] + r["dreb"] != r["reb"]:
        out.append("rebotes no cuadran")
    if r["pts"] != 2 * r["fgm"] + r["fg3m"] + r["ftm"]:
        out.append("puntos no cuadran con los tiros")
    if r["team"] == r["opponent"] or len(r["opponent"]) != 3:
        out.append("rival invalido")
    return out


def post(rows, secret, endpoint=ENDPOINT, key="rows", extra=None):
    payload = {key: rows, **(extra or {})}
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(endpoint, data=body, method="POST", headers={"Authorization": f"Bearer {secret}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as res:
        return json.loads(res.read().decode("utf-8"))


def player_positions(season):
    """Posicion oficial (G, F, C o combinada) de cada jugador de la temporada."""
    from nba_api.stats.endpoints import playerindex
    frame = playerindex.PlayerIndex(season=season, timeout=60).get_data_frames()[0]
    players = []
    for rec in frame.to_dict("records"):
        pid = rec.get("PERSON_ID") or rec.get("PLAYER_ID")
        pos = str(rec.get("POSITION") or "").strip().upper()
        name = f"{rec.get('PLAYER_FIRST_NAME') or ''} {rec.get('PLAYER_LAST_NAME') or ''}".strip()
        team = str(rec.get("TEAM_ABBREVIATION") or "").strip().upper() or None
        if not pid or pos not in POSITIONS or not name:
            continue
        players.append({"player_id": int(pid), "player_name": name[:80], "team": team if team and len(team) == 3 else None, "position": pos})
    return players


def send_positions(season, secret):
    """Las posiciones son contexto opcional: un fallo aqui no invalida los partidos."""
    try:
        players = player_positions(season)
    except Exception as exc:
        print(f"Aviso: no se pudieron descargar las posiciones ({exc}). Los partidos ya estan guardados.")
        return
    stored = 0
    for i in range(0, len(players), 500):
        try:
            stored += post(players[i:i + 500], secret, PLAYERS_ENDPOINT, "players", {"season": season}).get("stored", 0)
        except Exception as exc:
            print(f"Aviso: el servidor no acepto las posiciones ({exc}).")
            return
    print(f"Posiciones actualizadas: {stored} jugadores.")


def main():
    parser = argparse.ArgumentParser(description="Descarga estadisticas NBA por jugador y las envia a NioSports Pro.")
    parser.add_argument("--season", default=current_season(), help="Temporada, por ejemplo 2026-27")
    parser.add_argument("--type", default="Regular Season", choices=TYPES, help="Fase de la temporada")
    args = parser.parse_args()

    try:
        from nba_api.stats.endpoints import leaguegamelog
    except ImportError:
        print("Falta la libreria nba_api. Ejecuta primero:  py -m pip install nba_api")
        return 1

    secret = os.environ.get("NIO_INGEST_SECRET") or getpass.getpass("Pega tu clave de ingesta (no se mostrara) y pulsa Enter: ").strip()
    if len(secret) < 24:
        print("La clave parece incompleta. Copiala de nuevo desde Vercel (INGEST_SECRET).")
        return 1

    print(f"Descargando {args.type} {args.season} desde stats.nba.com ...")
    frame = None
    for attempt in range(3):
        try:
            frame = leaguegamelog.LeagueGameLog(season=args.season, season_type_all_star=args.type, player_or_team_abbreviation="P", timeout=60).get_data_frames()[0]
            break
        except Exception as exc:  # red lenta o bloqueo temporal
            print(f"  Intento {attempt + 1} fallido: {exc}")
            time.sleep(5 * (attempt + 1))
    if frame is None:
        print("No se pudo descargar. Revisa tu conexion e intentalo en unos minutos.")
        return 1
    if frame.empty:
        print("La NBA no devolvio partidos para esa temporada y fase. Nada que enviar.")
        return 0

    rows, skipped = [], []
    for rec in frame.to_dict("records"):
        row = to_row(rec, args.season, args.type)
        issue = problems(row)
        (skipped.append((row["player_name"], row["game_id"], issue)) if issue else rows.append(row))

    print(f"{len(rows)} registros validos de {len(frame)} descargados ({len(skipped)} descartados).")
    for name, game, issue in skipped[:10]:
        print(f"  Descartado: {name} {game}: {', '.join(issue)}")

    sent = 0
    for i in range(0, len(rows), BATCH):
        chunk = rows[i:i + BATCH]
        try:
            result = post(chunk, secret)
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", "replace")[:400]
            print(f"El servidor rechazo el lote {i // BATCH + 1} (HTTP {exc.code}): {detail}")
            if exc.code == 401:
                print("La clave no coincide con INGEST_SECRET en Vercel, o falta redesplegar tras crearla.")
            return 1
        except urllib.error.URLError as exc:
            print(f"No se pudo contactar con NioSports Pro: {exc.reason}")
            return 1
        sent += result.get("stored", 0)
        print(f"  Lote {i // BATCH + 1}: {result.get('stored', 0)} guardados")

    print(f"Listo. {sent} registros guardados en NioSports Pro ({args.type} {args.season}).")
    send_positions(args.season, secret)
    return 0


if __name__ == "__main__":
    sys.exit(main())
