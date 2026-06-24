@echo off
REM Configura ambiente virtual no Windows (equivalente ao setup.sh do Linux).
cd /d "%~dp0"
echo Criando ambiente virtual...
python -m venv .venv
if errorlevel 1 (
  echo ERRO: python -m venv falhou. Instale Python 3.12 com "Add to PATH".
  pause
  exit /b 1
)
call .venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements.txt
if errorlevel 1 (
  echo ERRO: pip install falhou.
  pause
  exit /b 1
)
playwright install chromium
echo.
echo Ambiente pronto. Execute: iniciar-servidor.bat
pause
