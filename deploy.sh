# SecureApprove Production Deployment Script

#!/bin/bash

set -e  # Exit on any error

echo "🚀 Starting SecureApprove Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check prerequisites
print_step "1. Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

print_status "Prerequisites check passed ✅"

# Environment setup
print_step "2. Setting up environment..."

if [ ! -f ".env.production" ]; then
    print_error ".env.production file not found. Please copy from .env.production template and configure."
    exit 1
fi

# Copy production environment
cp .env.production .env
print_status "Environment configured ✅"

# Install dependencies
print_step "3. Installing dependencies..."
npm ci --only=production
print_status "Dependencies installed ✅"

# Build applications
print_step "4. Building applications..."
npm run build
print_status "Applications built ✅"

# Create necessary directories
print_step "5. Creating directories..."
mkdir -p logs/api
mkdir -p logs/web
mkdir -p logs/traefik
mkdir -p certs/letsencrypt
mkdir -p backups
mkdir -p monitoring/prometheus
mkdir -p monitoring/grafana

print_status "Directories created ✅"

# Generate MongoDB keyfile
print_step "6. Generating MongoDB keyfile..."
mkdir -p infra/mongodb
openssl rand -base64 756 > infra/mongodb/keyfile
chmod 400 infra/mongodb/keyfile
print_status "MongoDB keyfile generated ✅"

# Create external Docker network
print_step "7. Creating Docker networks..."
docker network create traefik 2>/dev/null || print_warning "Network 'traefik' already exists"
print_status "Docker networks ready ✅"

# Pull Docker images
print_step "8. Pulling Docker images..."
docker-compose -f infra/docker-compose.prod.yml pull
print_status "Docker images pulled ✅"

# Build custom images
print_step "9. Building custom images..."
docker-compose -f infra/docker-compose.prod.yml build
print_status "Custom images built ✅"

# Start services
print_step "10. Starting services..."
docker-compose -f infra/docker-compose.prod.yml up -d
print_status "Services started ✅"

# Wait for services to be ready
print_step "11. Waiting for services to be ready..."
sleep 30

# Health checks
print_step "12. Performing health checks..."

# Check API health
if curl -f -s http://localhost:3001/health > /dev/null; then
    print_status "API health check passed ✅"
else
    print_error "API health check failed ❌"
    exit 1
fi

# Check Web health
if curl -f -s http://localhost:3000/api/health > /dev/null; then
    print_status "Web health check passed ✅"
else
    print_error "Web health check failed ❌"
    exit 1
fi

# Final status
print_step "13. Deployment complete!"

echo ""
echo "🎉 SecureApprove has been successfully deployed to production!"
echo ""
echo "📊 Services Status:"
echo "   • API Server: http://localhost:3001"
echo "   • Web Application: http://localhost:3000"
echo "   • MongoDB: localhost:27017"
echo "   • Redis: localhost:6379"
echo "   • Traefik Dashboard: http://localhost:8080"
echo "   • Grafana: http://localhost:3001"
echo ""
echo "🔍 Monitoring:"
echo "   • Health Check: curl http://localhost:3001/health"
echo "   • Logs: docker-compose -f infra/docker-compose.prod.yml logs -f"
echo "   • Stats: curl http://localhost:3001/api/stats"
echo ""
echo "🛡️  Security Notes:"
echo "   • Change default passwords immediately"
echo "   • Configure SSL certificates"
echo "   • Set up monitoring alerts"
echo "   • Review security policies"
echo ""
echo "📚 Documentation: See README.md for detailed configuration"

# Create maintenance script
cat > maintenance.sh << 'EOF'
#!/bin/bash

case "$1" in
    status)
        docker-compose -f infra/docker-compose.prod.yml ps
        ;;
    logs)
        docker-compose -f infra/docker-compose.prod.yml logs -f ${2:-}
        ;;
    restart)
        docker-compose -f infra/docker-compose.prod.yml restart ${2:-}
        ;;
    stop)
        docker-compose -f infra/docker-compose.prod.yml down
        ;;
    backup)
        docker exec secureapprove-mongodb-primary mongodump --uri="mongodb://admin:password@localhost:27017/secureapprove?authSource=admin" --out=/tmp/backup
        ;;
    update)
        git pull
        docker-compose -f infra/docker-compose.prod.yml pull
        docker-compose -f infra/docker-compose.prod.yml up -d --build
        ;;
    *)
        echo "Usage: $0 {status|logs|restart|stop|backup|update}"
        echo ""
        echo "  status  - Show container status"
        echo "  logs    - Show logs (optional service name)"
        echo "  restart - Restart services (optional service name)"
        echo "  stop    - Stop all services"
        echo "  backup  - Create database backup"
        echo "  update  - Update and restart services"
        ;;
esac
EOF

chmod +x maintenance.sh
print_status "Maintenance script created ✅"

echo ""
print_status "Use ./maintenance.sh for ongoing operations"