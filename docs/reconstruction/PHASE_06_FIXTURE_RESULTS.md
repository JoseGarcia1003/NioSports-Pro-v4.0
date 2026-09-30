# Fase 6 — resultados exclusivamente ficticios

NO SON RESULTADOS NBA. Comparación para comprobar software, sin ganador seleccionado ni implicación comercial. Cada configuración evalúa los mismos 40 eventos ficticios repartidos en cuatro bloques. No se han leído valores de calibración o reserva final.

## Escenario con todas las variables

| Candidato | Variables utilizadas | MAE (puntos ficticios) | RMSE | Δ MAE frente a media histórica |
|---|---:|---:|---:|---:|
| historical_mean | 0 | 6.7836 | 8.4226 | 0.0000 |
| moving_mean | 2 | 2.5979 | 3.0698 | -4.1857 |
| ridge | 26 | 3.3593 | 3.9601 | -3.4243 |
| simple_tree | 26 | 4.6498 | 5.4454 | -2.1338 |
| xgboost | 26 | 4.0414 | 4.9587 | -2.7422 |
| lightgbm | 26 | 4.0413 | 4.9513 | -2.7423 |
| mlp | 26 | 3.7561 | 4.7640 | -3.0275 |
| mean_ensemble | 26 | 3.5168 | 4.2556 | -3.2668 |
| stacking | 26 | 3.2847 | 4.0412 | -3.4989 |

La media histórica solo usa etiquetas de entrenamiento; no usa variables predictoras. La media móvil usa las dos medias L20. Las restantes configuraciones respetan grupos/derivados F4. Las diferencias negativas indican menor error en este fixture, no significancia ni superioridad real.

## Matriz completa y ablaciones

Δ compara cada configuración contra el mismo candidato con todas las variables. Un valor negativo en una ablación no demuestra que una variable sea inútil en la población deportiva.

| Candidato | Escenario | MAE | RMSE | Δ MAE respecto a all |
|---|---|---:|---:|---:|
| ridge | baseline | 2.8781 | 3.3324 | -0.4812 |
| simple_tree | baseline | 4.8006 | 5.8574 | 0.1508 |
| xgboost | baseline | 3.9559 | 5.0215 | -0.0855 |
| lightgbm | baseline | 3.9514 | 4.9869 | -0.0900 |
| mlp | baseline | 2.7629 | 3.1515 | -0.9931 |
| mean_ensemble | baseline | 3.2988 | 3.8881 | -0.2180 |
| stacking | baseline | 2.8345 | 3.2614 | -0.4502 |
| ridge | plus_form | 3.0119 | 3.5285 | -0.3474 |
| simple_tree | plus_form | 4.6498 | 5.4454 | 0.0000 |
| xgboost | plus_form | 4.0502 | 4.9524 | 0.0088 |
| lightgbm | plus_form | 3.9423 | 4.8556 | -0.0990 |
| mlp | plus_form | 3.1990 | 3.7843 | -0.5571 |
| mean_ensemble | plus_form | 3.2942 | 3.8910 | -0.2226 |
| stacking | plus_form | 2.8927 | 3.5007 | -0.3920 |
| ridge | plus_rest | 3.1273 | 3.6288 | -0.2320 |
| simple_tree | plus_rest | 4.6498 | 5.4454 | 0.0000 |
| xgboost | plus_rest | 4.0502 | 4.9524 | 0.0088 |
| lightgbm | plus_rest | 3.9253 | 4.8366 | -0.1161 |
| mlp | plus_rest | 3.5435 | 4.4007 | -0.2126 |
| mean_ensemble | plus_rest | 3.4517 | 4.0878 | -0.0651 |
| stacking | plus_rest | 3.0764 | 3.7641 | -0.2082 |
| historical_mean | all | 6.7836 | 8.4226 | 0.0000 |
| moving_mean | all | 2.5979 | 3.0698 | 0.0000 |
| ridge | all | 3.3593 | 3.9601 | 0.0000 |
| simple_tree | all | 4.6498 | 5.4454 | 0.0000 |
| xgboost | all | 4.0414 | 4.9587 | 0.0000 |
| lightgbm | all | 4.0413 | 4.9513 | 0.0000 |
| mlp | all | 3.7561 | 4.7640 | 0.0000 |
| mean_ensemble | all | 3.5168 | 4.2556 | 0.0000 |
| stacking | all | 3.2847 | 4.0412 | 0.0000 |
| ridge | without_long | 5.7348 | 6.5819 | 2.3755 |
| simple_tree | without_long | 5.6476 | 6.9947 | 0.9978 |
| xgboost | without_long | 5.8378 | 6.6726 | 1.7964 |
| lightgbm | without_long | 5.5665 | 6.4338 | 1.5252 |
| mlp | without_long | 5.6205 | 7.0459 | 1.8644 |
| mean_ensemble | without_long | 5.3163 | 6.2075 | 1.7995 |
| stacking | without_long | 5.7109 | 6.5479 | 2.4263 |
| ridge | without_short | 3.2141 | 3.7309 | -0.1452 |
| simple_tree | without_short | 5.1802 | 6.3790 | 0.5304 |
| xgboost | without_short | 3.9196 | 4.9921 | -0.1218 |
| lightgbm | without_short | 3.7481 | 4.8487 | -0.2932 |
| mlp | without_short | 4.0813 | 5.0114 | 0.3253 |
| mean_ensemble | without_short | 3.3817 | 4.2539 | -0.1351 |
| stacking | without_short | 3.2553 | 3.8495 | -0.0294 |
| ridge | without_medium | 3.3243 | 3.8665 | -0.0350 |
| simple_tree | without_medium | 4.6498 | 5.4454 | 0.0000 |
| xgboost | without_medium | 4.0305 | 4.9274 | -0.0109 |
| lightgbm | without_medium | 4.0378 | 4.9571 | -0.0035 |
| mlp | without_medium | 3.7628 | 4.4927 | 0.0067 |
| mean_ensemble | without_medium | 3.5470 | 4.1741 | 0.0302 |
| stacking | without_medium | 3.1544 | 3.9218 | -0.1303 |
| ridge | without_venue | 3.3638 | 4.0186 | 0.0045 |
| simple_tree | without_venue | 4.6498 | 5.4454 | 0.0000 |
| xgboost | without_venue | 4.0499 | 4.9517 | 0.0085 |
| lightgbm | without_venue | 4.0427 | 4.9189 | 0.0014 |
| mlp | without_venue | 4.0499 | 4.9481 | 0.2938 |
| mean_ensemble | without_venue | 3.5515 | 4.2681 | 0.0348 |
| stacking | without_venue | 3.3610 | 4.2029 | 0.0763 |
| ridge | without_dispersion | 3.2034 | 3.7772 | -0.1559 |
| simple_tree | without_dispersion | 4.6498 | 5.4454 | 0.0000 |
| xgboost | without_dispersion | 4.0350 | 4.9560 | -0.0065 |
| lightgbm | without_dispersion | 3.9484 | 4.8878 | -0.0929 |
| mlp | without_dispersion | 3.5666 | 4.3407 | -0.1895 |
| mean_ensemble | without_dispersion | 3.3737 | 4.1003 | -0.1431 |
| stacking | without_dispersion | 3.2333 | 3.9565 | -0.0514 |
| ridge | without_rest | 3.3020 | 3.8795 | -0.0573 |
| simple_tree | without_rest | 4.6498 | 5.4454 | 0.0000 |
| xgboost | without_rest | 4.0414 | 4.9587 | 0.0000 |
| lightgbm | without_rest | 4.0462 | 4.9514 | 0.0049 |
| mlp | without_rest | 3.6840 | 4.3145 | -0.0721 |
| mean_ensemble | without_rest | 3.3081 | 4.0735 | -0.2087 |
| stacking | without_rest | 3.2034 | 3.9200 | -0.0813 |
| ridge | without_context | 3.2738 | 3.7716 | -0.0855 |
| simple_tree | without_context | 4.6498 | 5.4454 | 0.0000 |
| xgboost | without_context | 4.0414 | 4.9587 | 0.0000 |
| lightgbm | without_context | 4.0171 | 4.9330 | -0.0242 |
| mlp | without_context | 3.5161 | 3.9633 | -0.2399 |
| mean_ensemble | without_context | 3.4448 | 4.0706 | -0.0720 |
| stacking | without_context | 3.0934 | 3.6596 | -0.1913 |

## Límites y reproducción

- 79 configuraciones, 316 evaluaciones exteriores; no 316 eventos independientes.
- Dos ejecuciones produjeron JSON idéntico en el mismo entorno; no garantía binaria entre sistemas operativos.
- Intervalos: no disponibles, cuatro bloques frente al mínimo predefinido de ocho. El algoritmo de intervalos sí tiene pruebas propias.
- No hay Brier/log loss/ECE deportivos, cuotas observadas, ROI/yield/CLV real ni ganador.
- Decisión: mantener candidatos experimentales y producción deshabilitada; selección empírica bloqueada.

Informe completo local regenerable: ml/experiments/output/phase06-comparison.json. SHA-256: 5223384f363cc998dce538b3b89ab0a80f0408d1e05917ce0f8f5ce284eeb1b5. Las cifras de esta tabla están redondeadas; el JSON conserva precisión completa.

Ver [metodología](EVALUATION_METRICS.md), [acta](PHASE_06.md) y [evidencia](CHECKS_PHASE_06.json).
