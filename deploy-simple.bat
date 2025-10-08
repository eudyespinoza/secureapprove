@echo off
setlocal EnableDelayedExpansion

REM SecureApprove - Quick Production Deployment Script for Windows
REM Este script despliega la infraestructura básica de SecureApprove

echo 🚀 SecureApprove - Despliegue Rapido en Produccion
echo ==================================================

REM Verificar prerequisitos
echo [🔄] 1. Verificando prerequisitos...

where docker >nul 2>nul
if errorlevel 1 (
    echo [❌] Docker no esta instalado
    exit /b 1
)

where docker-compose >nul 2>nul
if not errorlevel 1 (
    set DOCKER_COMPOSE=docker-compose
) else (
    docker compose version >nul 2>nul
    if not errorlevel 1 (
        set DOCKER_COMPOSE=docker compose
    ) else (
        echo [❌] Docker Compose no esta instalado
        exit /b 1
    )
)

echo [✅] Docker instalado correctamente

REM Configurar variables de entorno
echo [🔄] 2. Configurando variables de entorno...

if not exist ".env" (
    if exist ".env.server" (
        copy .env.server .env >nul
        echo [✅] Variables copiadas desde .env.server
    ) else (
        echo [⚠️] Creando .env basico - ^!CAMBIAR EN PRODUCCION^!
        (
            echo # SecureApprove - Variables Basicas de Produccion
            echo DOMAIN=localhost
            echo ACME_EMAIL=admin@localhost
            echo MONGODB_ROOT_USERNAME=admin
            echo MONGODB_ROOT_PASSWORD=SecureMongo123
            echo MONGODB_USERNAME=secureapprove
            echo MONGODB_PASSWORD=SecureApp123
            echo MONGODB_DB_NAME=secureapprove
            echo REDIS_PASSWORD=SecureRedis123
            echo JWT_SECRET=super-secret-jwt-key-minimum-32-characters-long
            echo NEXTAUTH_SECRET=super-secret-nextauth-key-minimum-32-chars
            echo GRAFANA_ADMIN_PASSWORD=admin123
            echo TRAEFIK_AUTH=admin:password
            echo NODE_ENV=production
        ) > .env
    )
)

REM Crear directorios necesarios
echo [🔄] 3. Creando directorios...
if not exist "logs\traefik" mkdir logs\traefik
if not exist "web-content" mkdir web-content
echo [✅] Directorios creados

REM Asegurar que existe el contenido web
if not exist "web-content\index.html" (
    echo [⚠️] Creando pagina web de prueba...
    echo ^<h1^>SecureApprove - Sistema Activo^</h1^>^<p^>Funcionando correctamente^</p^> > web-content\index.html
)

REM Detener servicios existentes
echo [🔄] 4. Deteniendo servicios existentes...
!DOCKER_COMPOSE! -f infra\docker-compose.simple.yml down >nul 2>nul
echo [✅] Servicios detenidos

REM Iniciar servicios
echo [🔄] 5. Iniciando servicios de produccion...
!DOCKER_COMPOSE! -f infra\docker-compose.simple.yml up -d

if errorlevel 1 (
    echo [❌] Error al iniciar servicios
    exit /b 1
)

echo [✅] Servicios iniciados

REM Esperar a que los servicios estén listos
echo [🔄] 6. Esperando servicios...
timeout /t 15 /nobreak >nul

REM Verificar servicios
echo [🔄] 7. Verificando servicios...

curl -f -s http://localhost:3001/health >nul 2>nul
if not errorlevel 1 (
    echo [✅] API Test: Funcionando
) else (
    echo [⚠️] API Test: No responde ^(puede estar iniciando...^)
)

curl -f -s http://localhost:3000 >nul 2>nul
if not errorlevel 1 (
    echo [✅] Web: Funcionando
) else (
    echo [⚠️] Web: No responde ^(puede estar iniciando...^)
)

curl -f -s http://localhost:8080/ping >nul 2>nul
if not errorlevel 1 (
    echo [✅] Traefik: Funcionando
) else (
    echo [⚠️] Traefik: No responde ^(puede estar iniciando...^)
)

REM Estado final
echo [🔄] 8. ^!Despliegue completado^!
echo.
echo 🎉 SecureApprove desplegado exitosamente^!
echo.
echo 📊 Servicios Disponibles:
echo    • Web Application: http://localhost:3000
echo    • Web via Traefik: http://localhost:8081 ^(puerto alternativo^)
echo    • API Test: http://localhost:3001
echo    • Traefik Dashboard: http://localhost:8080
echo    • Prometheus: http://localhost:9090
echo    • Grafana: http://localhost:3002 ^(admin/admin123^)
echo    • MongoDB: localhost:27019
echo    • Redis: localhost:6379
echo.
echo 🔍 Comandos utiles:
echo    • Ver estado: docker ps
echo    • Ver logs: !DOCKER_COMPOSE! -f infra\docker-compose.simple.yml logs -f
echo    • Detener: !DOCKER_COMPOSE! -f infra\docker-compose.simple.yml down
echo    • Health check: curl http://localhost:3001/health
echo.
echo ⚠️ Recordatorios para produccion:
echo    • Cambiar contraseñas en .env
echo    • Configurar dominio real
echo    • Configurar SSL/TLS
echo    • Configurar firewall
echo.
echo [✅] ^!Sistema listo para usar^!

pause