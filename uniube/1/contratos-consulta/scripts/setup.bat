@echo off
REM Instalacao — Windows
cd /d "%~dp0.."

where python >nul 2>&1
if errorlevel 1 (
  echo Erro: Python nao encontrado. Instale Python 3.10+ de python.org
  exit /b 1
)

if exist .venv\Scripts\activate.bat (
  goto :install_venv
)

if exist .venv (
  echo Removendo .venv incompleto...
  rmdir /s /q .venv
)

python -m venv .venv 2>nul
if exist .venv\Scripts\activate.bat (
  call .venv\Scripts\activate.bat
  python -m pip install --upgrade pip
  pip install -r requirements.txt
  echo venv> .install-mode
  goto :done
)

if exist .venv rmdir /s /q .venv
echo Aviso: venv nao criado. Instalando com pip --user...
python -m pip install --user -r requirements.txt
echo user> .install-mode

:done
set PYTHONPATH=%CD%\src;%PYTHONPATH%
echo.
echo Instalacao concluida.
echo   Interface web:  scripts\run_web.bat
echo   CLI: scripts\run_cli.bat list --public-only
exit /b 0

:install_venv
call .venv\Scripts\activate.bat
pip install -r requirements.txt
echo venv> .install-mode
goto :done
