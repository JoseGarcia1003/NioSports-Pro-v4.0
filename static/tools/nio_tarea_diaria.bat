@echo off
rem NioSports Pro - carga diaria de estadisticas NBA (para el Programador de tareas).
rem No contiene ninguna clave: la lee de clave_ingesta.txt en la misma carpeta.
cd /d "%~dp0"
if not exist "clave_ingesta.txt" (
  echo %date% %time% - Falta clave_ingesta.txt en %~dp0>> nio_registro.txt
  exit /b 1
)
if not exist "nio_nba_stats.py" (
  echo %date% %time% - Falta nio_nba_stats.py en %~dp0>> nio_registro.txt
  exit /b 1
)
set /p NIO_INGEST_SECRET=<clave_ingesta.txt
echo ===== %date% %time% =====>> nio_registro.txt
py nio_nba_stats.py>> nio_registro.txt 2>&1
set "NIO_INGEST_SECRET="
exit /b %errorlevel%
