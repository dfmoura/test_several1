@echo off
setlocal
cd /d "%~dp0.."

where python >nul 2>&1 || (echo Erro: Python 3.10+ necessario. & exit /b 1)

if exist .venv\Scripts\activate.bat (
  call .venv\Scripts\activate.bat
  python -m pip install --upgrade pip
  pip install -r requirements.txt
  python -m playwright install chromium
  echo venv> .install-mode
) else (
  python -m pip install --user -r requirements.txt
  python -m playwright install chromium
  echo user> .install-mode
)

set PYTHONPATH=%CD%\src;%PYTHONPATH%
if not exist data mkdir data
if not exist output mkdir output
echo.
echo Instalacao concluida.
echo   Web:  scripts\run_web.bat
echo   CLI:  scripts\run_cli.bat stats
