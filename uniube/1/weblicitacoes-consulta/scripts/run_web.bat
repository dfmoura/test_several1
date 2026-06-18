@echo off
setlocal
cd /d "%~dp0.."
call "%~dp0setup.bat" >nul 2>&1
set PYTHONPATH=%CD%\src;%PYTHONPATH%
if exist .venv\Scripts\activate.bat call .venv\Scripts\activate.bat
if not exist data mkdir data
if not exist output mkdir output
streamlit run src\weblicitacoes_consulta\app.py --server.headless true
