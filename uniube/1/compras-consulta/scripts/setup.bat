@echo off
cd /d "%~dp0.."
python -m venv .venv 2>nul
if exist .venv\Scripts\activate.bat (
  call .venv\Scripts\activate.bat
  python -m pip install --upgrade pip
  pip install -r requirements.txt
  echo venv> .install-mode
) else (
  python -m pip install --user -r requirements.txt
  echo user> .install-mode
)
if not exist output mkdir output
echo Instalacao concluida. Use scripts\run_web.bat
