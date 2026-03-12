@echo off
echo Starting Telemedicine System...

:: Open a new command prompt, activate venv and start backend
start cmd /k "cd backend && call venv\Scripts\activate && uvicorn app.main:app --reload"

:: Open another command prompt and start frontend
start cmd /k "cd frontend && npm run dev"

echo Both servers are starting up!
echo Backend API will be available at: http://localhost:8000
echo Frontend will be available at: http://localhost:5173
pause
