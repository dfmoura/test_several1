@echo off
cd /d "%~dp0.."
if exist .venv\Scripts\activate.bat call .venv\Scripts\activate.bat
set PYTHONPATH=%CD%\src;%PYTHONPATH%
python -m compras_consulta.cli %*
