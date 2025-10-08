#!/bin/bash

# SecureApprove - Deployment without Traefik (for external Nginx)
# Use this when you have existing Nginx handling ports 80/443

set -e

echo "🚀 SecureApprove - Despliegue sin Traefik (Nginx Externo)"
echo "========================================================"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[✅]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[⚠️]${NC} $1"; }
print_error() { echo -e "${RED}[❌]${NC} $1"; }
print_step() { echo -e "${BLUE}[🔄]${NC} $1"; }

# Verificar prerequisitos
print_step "1. Verificando prerequisitos..."

if ! command -v docker &> /dev/null; then
    print_error "Docker no está instalado"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! command -v docker compose &> /dev/null; then
    print_error "Docker Compose no está instalado"
    exit 1
fi

print_status "Docker instalado correctamente"

# Configurar variables de entorno
print_step "2. Configurando variables de entorno..."

if [ ! -f ".env" ]; then
    if [ -f ".env.server" ]; then
        cp .env.server .env
        print_status "Variables copiadas desde .env.server"
    else
        print_warning "Creando .env básico - ¡CAMBIAR EN PRODUCCIÓN!"
        cat > .env << EOF
DOMAIN=secureapprove.com
MONGODB_ROOT_USERNAME=admin
MONGODB_ROOT_PASSWORD=SecureMongo123
MONGODB_USERNAME=secureapprove
MONGODB_PASSWORD=SecureApp123
MONGODB_DB_NAME=secureapprove
REDIS_PASSWORD=SecureRedis123
JWT_SECRET=super-secret-jwt-key-minimum-32-characters-long
NEXTAUTH_SECRET=super-secret-nextauth-key-minimum-32-chars
GRAFANA_ADMIN_PASSWORD=admin123
NODE_ENV=production
EOF
    fi
fi

# Crear directorios necesarios
print_step "3. Creando directorios..."
mkdir -p web-content
print_status "Directorios creados"

# Asegurar que existe el contenido web
if [ ! -f "web-content/index.html" ]; then
    print_warning "Creando página web de prueba..."
    echo '<h1>SecureApprove - Sistema Activo</h1><p>Conectado via Nginx externo</p>' > web-content/index.html
fi

# Crear red de nginx si no existe
print_step "4. Configurando red de Docker..."
docker network create nginx-network 2>/dev/null || print_warning "Red nginx-network ya existe"
print_status "Red configurada"

# Detener servicios existentes
print_step "5. Deteniendo servicios existentes..."
docker-compose -f infra/docker-compose-no-traefik.yml down 2>/dev/null || true
print_status "Servicios detenidos"

# Iniciar servicios
print_step "6. Iniciando servicios (sin Traefik)..."

# Usar docker compose o docker-compose según disponibilidad
if command -v docker compose &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

$DOCKER_COMPOSE -f infra/docker-compose-no-traefik.yml up -d

print_status "Servicios iniciados"

# Esperar a que los servicios estén listos
print_step "7. Esperando servicios..."
sleep 15

# Verificar servicios
print_step "8. Verificando servicios..."

if curl -f -s http://localhost:3001/health > /dev/null 2>&1; then
    print_status "API Test: ✅ Funcionando en puerto 3001"
else
    print_warning "API Test: ⚠️  No responde (puede estar iniciando...)"
fi

if curl -f -s http://localhost:3000 > /dev/null 2>&1; then
    print_status "Web: ✅ Funcionando en puerto 3000"
else
    print_warning "Web: ⚠️  No responde (puede estar iniciando...)"
fi

# Estado final
print_step "9. ¡Despliegue completado!"

echo ""
echo "🎉 SecureApprove desplegado exitosamente (sin Traefik)!"
echo ""
echo "📊 Servicios Disponibles para Nginx:"
echo "   • Web Application: http://localhost:3000"
echo "   • API: http://localhost:3001"
echo "   • Prometheus: http://localhost:9090"
echo "   • Grafana: http://localhost:3002 (admin/admin123)"
echo "   • MongoDB: localhost:27019"
echo "   • Redis: localhost:6379"
echo ""
echo "🔗 Configuración para tu Nginx:"
echo "   • Web: proxy_pass http://host.docker.internal:3000;"
echo "   • API: proxy_pass http://host.docker.internal:3001/;"
echo ""
echo "🔍 Comandos útiles:"
echo "   • Ver estado: docker ps"
echo "   • Ver logs: $DOCKER_COMPOSE -f infra/docker-compose-no-traefik.yml logs -f"
echo "   • Detener: $DOCKER_COMPOSE -f infra/docker-compose-no-traefik.yml down"
echo ""
print_status "¡Listo para conectar con tu Nginx existente!"