@echo off
REM Sobe o app de licitações acessível em localhost e na rede local (Windows).
cd /d "%~dp0"
set HEADLESS=false
set APP_PORT=8095
call .venv\Scripts\activate.bat
echo.
echo Aplicativo de licitacoes:
echo   Local:  http://localhost:%APP_PORT%/
echo   Rede:   http://SEU_IP:%APP_PORT%/  (use: ipconfig - veja IPv4)
echo.
echo Para parar: feche esta janela ou Ctrl+C
echo.
python -m uvicorn app.main:app --host 0.0.0.0 --port %APP_PORT%
