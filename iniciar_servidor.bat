@echo off
chcp 65001 >nul
echo ===================================================
echo Iniciando Servidor House-Turing
echo ===================================================
echo.

cd infra
echo [1/3] Levantando base de datos y n8n (Docker)...
docker compose up -d postgres n8n

echo [2/3] Levantando tunel de conexion...
docker compose --profile tunnel-quick up -d cloudflared-quick

echo [3/3] Verificando que el sistema este listo...
:loop
curl -s http://localhost:5690/healthz >nul
if errorlevel 1 (
  timeout /t 2 >nul
  goto loop
)

echo.
echo ===================================================
echo ¡El sistema esta en linea y listo para vender!
echo.
echo Para abrir el panel, ve a: http://localhost:5690/
echo ===================================================
pause
