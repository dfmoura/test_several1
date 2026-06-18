@echo off
setlocal
cd /d "%~dp0.."
set PYTHONPATH=%CD%\src;%PYTHONPATH%
if exist .venv\Scripts\activate.bat call .venv\Scripts\activate.bat
if not exist data mkdir data
if not exist output mkdir output
python -m weblicitacoes_consulta.cli %*
