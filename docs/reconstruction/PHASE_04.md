# Fase 4 — candidatos NBA y ablaciones

Estado: EN CURSO. Autorizada el 29/09/2026. Base: 94b190a7. No iniciar F5.

1. Problema: ensemble histórico sin prueba válida de aporte incremental; mezclaba regresión de puntos con clasificación frente a una mediana artificial.
2. Importancia: complejidad no equivale a valor. Se necesitan referencias simples y candidatos comparables antes de decidir qué conservar.
3. Archivos: nuevo ml/experiments, dependencias aisladas, tests de experimentos y acta/continuidad. Entrenadores, CSV y pesos legacy permanecen intactos.
4. Cambio: candidatos de puntos FULL y configuración reproducible de grupos de variables; ablaciones con dependencias cerradas; interfaz de metamodelo entrenado solo con predicciones fuera de muestra (OOF).
5. Riesgos: fuga entre entrenamiento/evaluación, derivados que reintroducen variables eliminadas, presentar métricas sintéticas como deportivas, dependencias ausentes y resultados no reproducibles.
6. Verificación: ejecutar los modelos reales de las bibliotecas en fixtures explícitos; determinismo, referencia aritmética, aislamiento de escaladores, orden de variables, folds incompatibles, errores sin fallback; preservar hashes del legado.
7. Gate: referencias y todos los candidatos ejecutables, ablaciones coherentes, ensemble preparado para OOF temporal, informe sin ganador ni claims empíricos. F5 define protocolo temporal real y F6 evalúa valor incremental.
