# Diccionario de datos v1.0.0

Generado desde [dictionary.json](../../ml/contracts/dictionary.json). No editar las filas a mano.
Reglas comunes y metadatos obligatorios: [DATA_CONTRACT.md](DATA_CONTRACT.md).

Cada variable hereda partido, liga, temporada, periodo y zona de event; sus timestamps de captura/disponibilidad/publicación y fuente concreta están en observations. No hay fechas o proveedores ficticios por defecto.

training/inference indican uso admisible como entrada. target=true es etiqueta separada, nunca predictor. Que una variable esté descrita no demuestra que el motor actual la utilice.

Todas las definiciones tienen versión 1.0.0. Faltante: rechazo para construir vector (null con motivo puede conservarse como evidencia). Extremos: rechazo fuera del dominio; no clipping salvo transformación explícita con rawValue. Actualización: nueva revisión, nunca sobrescritura.

## NBA FULL

| Variable | Tipo / unidad | Rol y uso | Definición / fórmula |
|---|---|---|---|
| home_total_l5 | number / points | feature; train=true, inferencia=true | Mean of final combined scores in the last 5 completed games of this team, including overtime. Dominio: min=0. |
| home_total_l10 | number / points | feature; train=true, inferencia=true | Mean of final combined scores in the last 10 completed games of this team, including overtime. Dominio: min=0. |
| home_total_l20 | number / points | feature; train=true, inferencia=true | Mean of final combined scores in the last 20 completed games of this team, including overtime. Dominio: min=0. |
| home_home_avg | number / points | feature; train=true, inferencia=true | Mean combined score for home appearances within the last 10 completed games, not team points scored. Dominio: min=0. |
| home_std | number / points | feature; train=true, inferencia=true | Population standard deviation of combined totals in the last 10 completed games. Dominio: min=0. |
| away_total_l5 | number / points | feature; train=true, inferencia=true | Mean of final combined scores in the last 5 completed games of this team, including overtime. Dominio: min=0. |
| away_total_l10 | number / points | feature; train=true, inferencia=true | Mean of final combined scores in the last 10 completed games of this team, including overtime. Dominio: min=0. |
| away_total_l20 | number / points | feature; train=true, inferencia=true | Mean of final combined scores in the last 20 completed games of this team, including overtime. Dominio: min=0. |
| away_away_avg | number / points | feature; train=true, inferencia=true | Mean combined score for away appearances within the last 10 completed games, not team points scored. Dominio: min=0. |
| away_std | number / points | feature; train=true, inferencia=true | Population standard deviation of combined totals in the last 10 completed games. Dominio: min=0. |
| total_sum_l5 | number / points | feature; train=true, inferencia=true | Sum of two team window averages, not the predicted score. Receta: {"op":"sum","args":["home_total_l5","away_total_l5"]}. Dominio: min=0. |
| total_sum_l10 | number / points | feature; train=true, inferencia=true | Sum of two L10 averages. Receta: {"op":"sum","args":["home_total_l10","away_total_l10"]}. Dominio: min=0. |
| total_diff_l5 | number / points | feature; train=true, inferencia=true | Home minus away L5 average. Receta: {"op":"difference","args":["home_total_l5","away_total_l5"]}. |
| home_rest_days | integer / days | feature; train=true, inferencia=true | Completed calendar rest days in event timezone; legacy model input capped at 7, raw value must also be retained. Transformación: min(raw_rest_days,7); never default missing. Dominio: min=0, max=7. |
| away_rest_days | integer / days | feature; train=true, inferencia=true | Completed calendar rest days in event timezone; legacy model input capped at 7, raw value must also be retained. Transformación: min(raw_rest_days,7); never default missing. Dominio: min=0, max=7. |
| is_b2b_home | integer / indicator | feature; train=true, inferencia=true | 1 if raw rest days equals zero, otherwise 0. Dominio: min=0, max=1. |
| is_b2b_away | integer / indicator | feature; train=true, inferencia=true | 1 if raw rest days equals zero, otherwise 0. Dominio: min=0, max=1. |
| rest_diff | integer / days | feature; train=true, inferencia=true | Home raw rest minus away raw rest. NOT difference of capped values. |
| altitude_ft | number / feet | feature; train=true, inferencia=true | Venue altitude from a source; unknown altitude is missing, not zero. |
| days_into_season | integer / days | feature; train=true, inferencia=true | Days from documented season start; legacy training clipped at 250; retain raw value. Transformación: min(raw_days_into_season,250); season start must be sourced. Dominio: min=0, max=250. |
| momentum_5v10 | number / points | feature; train=true, inferencia=true | Combined L5 minus combined L10. Receta: {"op":"difference","args":["total_sum_l5","total_sum_l10"]}. |
| matchup_volatility | number / points | feature; train=true, inferencia=true | Sum of population standard deviations; not a probability model. Receta: {"op":"sum","args":["home_std","away_std"]}. Dominio: min=0. |
| total_rest | integer / days | feature; train=true, inferencia=true | Sum of capped rest inputs. Receta: {"op":"sum","args":["home_rest_days","away_rest_days"]}. Dominio: min=0, max=14. |
| both_rested | integer / indicator | feature; train=true, inferencia=true | Both capped rest inputs at least two. Receta: {"op":"all_gte","args":["home_rest_days","away_rest_days"],"threshold":2}. Dominio: min=0, max=1. |
| both_b2b | integer / indicator | feature; train=true, inferencia=true | Both B2B indicators are one. Receta: {"op":"all_gte","args":["is_b2b_home","is_b2b_away"],"threshold":1}. Dominio: min=0, max=1. |
| venue_split_diff | number / points | feature; train=true, inferencia=true | Home home-venue minus away away-venue average. Receta: {"op":"difference","args":["home_home_avg","away_away_avg"]}. |
| actual_total | integer / points | target; etiqueta separada | Final combined score including overtime, target only. Dominio: min=0. |

## Tenis MATCH

| Variable | Tipo / unidad | Rol y uso | Definición / fórmula |
|---|---|---|---|
| tennis.rank | integer / rank | context; train=false, inferencia=false | Published ranking, not an Elo input. Dominio: min=1. |
| tennis.surface | enum / category | feature; train=true, inferencia=true | Court surface of the event. Valores: ['hard', 'clay', 'grass']. Dominio: min=0. |
| tennis.best_of | enum / sets | context; train=false, inferencia=false | Scheduled match format, context until model explicitly uses it. Valores: [3, 5]. Dominio: min=0. |
| tennis.injury_status | enum / category | eligibility; train=false, inferencia=true | Latest reported or cleared incidence; no report does not mean healthy. Valores: ['reported', 'cleared', 'unknown']. Dominio: min=0. |
| tennis.elo_overall | number / rating | feature; train=true, inferencia=true | Chronological general rating; algorithm version and input history required. |
| tennis.elo_surface | number / rating | feature; train=true, inferencia=true | Chronological surface rating; not interchangeable with general Elo. |
| tennis.history_count | integer / count | eligibility; train=false, inferencia=true | Observed count with sample identity, season and surface; not automatically used by Elo. Dominio: min=0. |
| tennis.surface_count | integer / count | eligibility; train=false, inferencia=true | Observed count with sample identity, season and surface; not automatically used by Elo. Dominio: min=0. |
| tennis.h2h_wins | integer / count | context; train=false, inferencia=false | Observed count with sample identity, season and surface; not automatically used by Elo. Dominio: min=0. |
| tennis.h2h_losses | integer / count | context; train=false, inferencia=false | Observed count with sample identity, season and surface; not automatically used by Elo. Dominio: min=0. |
| tennis.matches | integer / count | context; train=false, inferencia=false | Observed count with sample identity, season and surface; not automatically used by Elo. Dominio: min=0. |
| tennis.service_points | integer / count | context; train=false, inferencia=false | Observed count with sample identity, season and surface; not automatically used by Elo. Dominio: min=0. |
| tennis.first_serve_in | integer / count | context; train=false, inferencia=false | Observed count with sample identity, season and surface; not automatically used by Elo. Dominio: min=0. |
| tennis.first_serve_won | integer / count | context; train=false, inferencia=false | Observed count with sample identity, season and surface; not automatically used by Elo. Dominio: min=0. |
| tennis.second_serve_points | integer / count | context; train=false, inferencia=false | Observed count with sample identity, season and surface; not automatically used by Elo. Dominio: min=0. |
| tennis.second_serve_won | integer / count | context; train=false, inferencia=false | Observed count with sample identity, season and surface; not automatically used by Elo. Dominio: min=0. |
| tennis.break_points_faced | integer / count | context; train=false, inferencia=false | Observed count with sample identity, season and surface; not automatically used by Elo. Dominio: min=0. |
| tennis.break_points_saved | integer / count | context; train=false, inferencia=false | Observed count with sample identity, season and surface; not automatically used by Elo. Dominio: min=0. |
| tennis.break_opportunities | integer / count | context; train=false, inferencia=false | Observed count with sample identity, season and surface; not automatically used by Elo. Dominio: min=0. |
| tennis.breaks_converted | integer / count | context; train=false, inferencia=false | Observed count with sample identity, season and surface; not automatically used by Elo. Dominio: min=0. |
| tennis.aces | integer / count | context; train=false, inferencia=false | Observed count with sample identity, season and surface; not automatically used by Elo. Dominio: min=0. |
| tennis.double_faults | integer / count | context; train=false, inferencia=false | Observed count with sample identity, season and surface; not automatically used by Elo. Dominio: min=0. |
| tennis.winner | string / participant_id | target; etiqueta separada | Winner of a completed singles match; post-event target only. |
| tennis.result_status | enum / category | target; etiqueta separada | Observed sporting outcome; retired/walkover are not completed targets. Valores: ['completed', 'retired', 'walkover', 'disqualified', 'cancelled']. Dominio: min=0. |

## Fuente concreta y uso histórico

La descripción source de cada definición exige origen histórico o derivación documentada. La observación identifica provider, recordId y revision; la derivación NBA incluye registros de su ventana. La lista de confianza se suministra en servidor; un metadato autodeclarado no autentica origen.
El CSV legado no cumple ese contrato. Consultar LEGACY_DATA_REPORT.json; no completar los metadatos ausentes mediante suposiciones.
