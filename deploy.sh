#!/bin/bash
# Automated deployment script for Ubuntu/Hostinger
# This script deploys the Diario Mercantil application with all necessary checks

set -e  # Exit on error

echo "==================================="
echo "Diario Mercantil - Deployment Script"
echo "==================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
print_info() { echo -e "$1"; }

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then 
    print_error "Please run as root or with sudo"
    exit 1
fi

print_info "\n📋 Step 1: Checking Prerequisites"

# Check for Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed"
    print_info "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl enable docker
    systemctl start docker
    print_success "Docker installed"
else
    print_success "Docker is already installed"
fi

# Check for Docker Compose
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed"
    print_info "Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    print_success "Docker Compose installed"
else
    print_success "Docker Compose is already installed"
fi

print_info "\n🔧 Step 2: Preparing Application"

# Navigate to project directory (adjust path as needed)
PROJECT_DIR="/root/DIARIO-MERCANTIL-05012026"
if [ ! -d "$PROJECT_DIR" ]; then
    print_error "Project directory not found: $PROJECT_DIR"
    print_info "Please adjust PROJECT_DIR in this script"
    exit 1
fi

cd "$PROJECT_DIR"
print_success "Changed to project directory"

# Create storage directories if they don't exist
mkdir -p backend/storage/{uploads,results,database,cache}
chmod -R 775 backend/storage
print_success "Storage directories prepared"

print_info "\n🔄 Step 3: Stopping Existing Containers"
docker-compose down || true
print_success "Containers stopped"

print_info "\n🏗️  Step 4: Building Images (this may take several minutes)"
docker-compose build --no-cache
print_success "Images built successfully"

print_info "\n🚀 Step 5: Starting Services"
docker-compose up -d

# Wait for services to be ready
print_info "\n⏳ Waiting for services to start..."
sleep 10

# Check container health
print_info "\n🏥 Step 6: Health Checks"
for service in backend db frontend; do
    if docker-compose ps | grep -q "$service.*Up"; then
        print_success "$service is running"
    else
        print_error "$service failed to start"
        docker-compose logs $service
        exit 1
    fi
done

# Wait for database to be fully ready
print_info "\n⏳ Waiting for database initialization (this may take 30-60 seconds)..."
max_wait=60
waited=0
until docker-compose exec -T backend php -r "require '/var/www/html/src/Database.php'; Database::healthCheck();" 2>/dev/null; do
    if [ $waited -ge $max_wait ]; then
        print_error "Database did not become ready in time"
        docker-compose logs backend
        docker-compose logs db
        exit 1
    fi
    echo -n "."
    sleep 2
    waited=$((waited+2))
done
print_success "\nDatabase is ready"

print_info "\n📊 Step 7: Verifying Application"

# Test backend API
if curl -f -s http://localhost/api/rate/bcv > /dev/null; then
    print_success "Backend API is responding"
else
    print_warning "Backend API test failed (may be normal if endpoint requires auth)"
fi

# Test frontend
if curl -f -s http://localhost/ > /dev/null; then
    print_success "Frontend is accessible"
else
    print_error "Frontend is not accessible"
    exit 1
fi

# Show running containers
print_info "\n📦 Running Containers:"
docker-compose ps

# Show logs (last 20 lines)
print_info "\n📝 Recent Logs:"
docker-compose logs --tail=20

print_info "\n${GREEN}==================================="
print_info "✅ Deployment Complete!"
print_info "===================================${NC}"
print_info ""
print_info "Access your application:"
print_info "  • Frontend: http://YOUR_SERVER_IP"
print_info "  • phpMyAdmin: http://YOUR_SERVER_IP:8088"
print_info ""
print_info "Default admin credentials:"
print_info "  • Username: merchandev"
print_info "  • Password: G0ku*1896"
print_info ""
print_info "Useful commands:"
print_info "  • View logs: docker-compose logs -f"
print_info "  • Restart: docker-compose restart"
print_info "  • Stop: docker-compose down"
print_info "  • Check status: docker-compose ps"
print_info ""
print_info "For troubleshooting, check:"
print_info "  docker-compose logs backend"
print_info "  docker-compose logs frontend"
print_info "  docker-compose logs db"
print_info ""
