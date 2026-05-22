@echo off
cd /d "%~dp0.."
set PYTHONPATH=%CD%\src;%PYTHONPATH%

if exist .venv\Scripts\activate.bat (
  call .venv\Scripts\activate.bat
) else if exist .venv (
  echo Aviso: .venv incompleto. Usando Python do sistema.
)

if not exist output mkdir output
python -m streamlit run src\contratos_consulta\app.py
