#!/bin/bash

# SecureApprove - Script de Setup Inicial para Servidor
# Este script prepara el entorno y despliega SecureApprove desde cero

set -e

echo "🚀 SecureApprove - Setup Inicial del Servidor"
echo "=============================================="

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[✅]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[⚠️]${NC} $1"; }
print_error() { echo -e "${RED}[❌]${NC} $1"; }
print_step() { echo -e "${BLUE}[🔄]${NC} $1"; }

# Variables
INSTALL_DIR="/opt/secureapprove"
REPO_URL="https://github.com/eudyespinoza/secureapprove.git"
PROJECT_NAME="secureapprove"

print_step "1. Verificando permisos de administrador..."
if [ "$EUID" -ne 0 ]; then
    print_error "Este script debe ejecutarse como root (sudo)"
    exit 1
fi
print_status "Permisos verificados"

print_step "2. Actualizando sistema..."
apt-get update -qq
print_status "Sistema actualizado"

print_step "3. Instalando dependencias básicas..."
apt-get install -y -qq git curl wget software-properties-common apt-transport-https ca-certificates gnupg lsb-release
print_status "Dependencias instaladas"

print_step "4. Instalando Docker..."
if ! command -v docker &> /dev/null; then
    # Instalar Docker
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable docker
    systemctl start docker
    print_status "Docker instalado"
else
    print_status "Docker ya instalado"
fi

print_step "5. Verificando Docker Compose..."
if ! docker compose version &> /dev/null; then
    print_error "Docker Compose no disponible"
    exit 1
fi
print_status "Docker Compose disponible"

print_step "6. Creando directorio de instalación..."
mkdir -p $INSTALL_DIR
cd $INSTALL_DIR
print_status "Directorio creado: $INSTALL_DIR"

print_step "7. Clonando repositorio de SecureApprove..."
if [ -d "$PROJECT_NAME" ]; then
    print_warning "Directorio ya existe, actualizando..."
    cd $PROJECT_NAME
    git pull origin develop
else
    git clone $REPO_URL $PROJECT_NAME
    cd $PROJECT_NAME
    git checkout develop 2>/dev/null || git checkout -b develop
fi
print_status "Repositorio clonado/actualizado"

print_step "8. Configurando variables de entorno..."
if [ ! -f ".env" ]; then
    if [ -f ".env.server" ]; then
        cp .env.server .env
        print_status "Variables copiadas desde .env.server"
    else
        cat > .env << 'EOF'
# SecureApprove - Variables de Producción
DOMAIN=localhost
ACME_EMAIL=admin@localhost
MONGODB_ROOT_USERNAME=admin
MONGODB_ROOT_PASSWORD=SecureMongo123!
MONGODB_USERNAME=secureapprove
MONGODB_PASSWORD=SecureApp123!
MONGODB_DB_NAME=secureapprove
REDIS_PASSWORD=SecureRedis123!
JWT_SECRET=super-secret-jwt-key-minimum-32-characters-long-production
NEXTAUTH_SECRET=super-secret-nextauth-key-minimum-32-chars-production
GRAFANA_ADMIN_PASSWORD=admin123!
TRAEFIK_AUTH=admin:$2a$10$8k7VQZ9XqGqJ5yQzJ5yQzO
NODE_ENV=production
EOF
        print_status "Archivo .env creado con valores por defecto"
    fi
fi

print_step "9. Creando directorios necesarios..."
mkdir -p logs/traefik
mkdir -p web-content
mkdir -p data/mongodb
mkdir -p data/redis
mkdir -p data/prometheus
mkdir -p data/grafana

# Ajustar permisos
chown -R 1000:1000 data/
chmod -R 755 data/

print_status "Directorios y permisos configurados"

print_step "10. Configurando firewall básico..."
if command -v ufw &> /dev/null; then
    ufw --force enable
    ufw allow ssh
    ufw allow 80
    ufw allow 443
    ufw allow 3000
    ufw allow 3001
    ufw allow 3002
    ufw allow 8080
    ufw allow 9090
    print_status "Firewall configurado"
else
    print_warning "UFW no disponible, configurar firewall manualmente"
fi

print_step "11. Dando permisos a scripts..."
chmod +x deploy-simple.sh
chmod +x deploy.sh 2>/dev/null || true
print_status "Permisos configurados"

print_step "12. Iniciando servicios de SecureApprove..."
./deploy-simple.sh

print_step "13. ¡Configuración completada!"

echo ""
echo "🎉 ¡SecureApprove instalado exitosamente!"
echo ""
echo "📁 Ubicación: $INSTALL_DIR/$PROJECT_NAME"
echo "🌐 Servicios disponibles:"
echo "   • Web Application: http://$(hostname -I | awk '{print $1}'):3000"
echo "   • API Test: http://$(hostname -I | awk '{print $1}'):3001"
echo "   • Traefik Dashboard: http://$(hostname -I | awk '{print $1}'):8080"
echo "   • Prometheus: http://$(hostname -I | awk '{print $1}'):9090"
echo "   • Grafana: http://$(hostname -I | awk '{print $1}'):3002"
echo ""
echo "🔧 Comandos útiles:"
echo "   • Estado: cd $INSTALL_DIR/$PROJECT_NAME && docker ps"
echo "   • Logs: cd $INSTALL_DIR/$PROJECT_NAME && docker compose -f infra/docker-compose.simple.yml logs -f"
echo "   • Detener: cd $INSTALL_DIR/$PROJECT_NAME && docker compose -f infra/docker-compose.simple.yml down"
echo "   • Reiniciar: cd $INSTALL_DIR/$PROJECT_NAME && ./deploy-simple.sh"
echo ""
echo "⚠️  Configuración de producción:"
echo "   • Editar archivo: $INSTALL_DIR/$PROJECT_NAME/.env"
echo "   • Cambiar DOMAIN por tu dominio real"
echo "   • Cambiar todas las contraseñas"
echo "   • Configurar SSL en tu dominio"
echo ""
print_status "¡Sistema listo para usar!"