#!/bin/bash

# Email Sequencer Deployment Script for Linux VPS
# Usage: ./deploy.sh [production|staging]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="email-sequencer"
APP_DIR="/var/www/$APP_NAME"
SERVICE_USER="www-data"
NODE_VERSION="18"

# Environment
ENVIRONMENT=${1:-production}

echo -e "${BLUE}🚀 Starting deployment for $ENVIRONMENT environment${NC}"

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root (use sudo)"
    exit 1
fi

# Update system packages
print_status "Updating system packages..."
apt update && apt upgrade -y

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    print_status "Installing Node.js $NODE_VERSION..."
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt-get install -y nodejs
fi

# Install PM2 globally if not present
if ! command -v pm2 &> /dev/null; then
    print_status "Installing PM2..."
    npm install -g pm2
fi

# Install PostgreSQL client if not present
if ! command -v psql &> /dev/null; then
    print_status "Installing PostgreSQL client..."
    apt-get install -y postgresql-client
fi

# Create application directory
print_status "Setting up application directory..."
mkdir -p $APP_DIR
mkdir -p $APP_DIR/logs
mkdir -p $APP_DIR/backups

# Set permissions
chown -R $SERVICE_USER:$SERVICE_USER $APP_DIR
chmod -R 755 $APP_DIR

# Copy application files (assuming you're running from the project directory)
print_status "Copying application files..."
cp -r . $APP_DIR/
cd $APP_DIR

# Install dependencies
print_status "Installing dependencies..."
sudo -u $SERVICE_USER npm install --production

# Build the application
print_status "Building application..."
sudo -u $SERVICE_USER npm run build

# Create environment file if it doesn't exist
if [ ! -f "$APP_DIR/.env.production" ]; then
    print_warning "Creating production environment file..."
    cp env.production.example .env.production
    print_warning "Please edit .env.production with your actual configuration"
fi

# Run database migrations
print_status "Running database migrations..."
sudo -u $SERVICE_USER npm run migrate:prod

# Stop existing PM2 processes
print_status "Stopping existing processes..."
pm2 stop ecosystem.config.js 2>/dev/null || true
pm2 delete ecosystem.config.js 2>/dev/null || true

# Start the application with PM2
print_status "Starting application with PM2..."
sudo -u $SERVICE_USER pm2 start ecosystem.config.js --env $ENVIRONMENT

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup systemd -u $SERVICE_USER --hp /home/$SERVICE_USER

# Configure firewall
print_status "Configuring firewall..."
ufw allow 3007/tcp
ufw allow 22/tcp
ufw --force enable

# Setup log rotation
print_status "Setting up log rotation..."
cat > /etc/logrotate.d/$APP_NAME << EOF
$APP_DIR/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 $SERVICE_USER $SERVICE_USER
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

# Create systemd service for additional management
print_status "Creating systemd service..."
cat > /etc/systemd/system/$APP_NAME.service << EOF
[Unit]
Description=Email Sequencer API
After=network.target

[Service]
Type=forking
User=$SERVICE_USER
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/pm2 start ecosystem.config.js --env $ENVIRONMENT
ExecReload=/usr/bin/pm2 reload ecosystem.config.js
ExecStop=/usr/bin/pm2 stop ecosystem.config.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and enable service
systemctl daemon-reload
systemctl enable $APP_NAME

# Setup monitoring script
print_status "Setting up monitoring..."
cat > $APP_DIR/monitor.sh << 'EOF'
#!/bin/bash
# Simple health check script
HEALTH_URL="http://localhost:3007/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $RESPONSE -eq 200 ]; then
    echo "$(date): Health check passed"
else
    echo "$(date): Health check failed - HTTP $RESPONSE"
    pm2 restart email-sequencer-api
fi
EOF

chmod +x $APP_DIR/monitor.sh

# Add cron job for monitoring
(crontab -u $SERVICE_USER -l 2>/dev/null; echo "*/5 * * * * $APP_DIR/monitor.sh") | crontab -u $SERVICE_USER -

# Final status check
print_status "Checking application status..."
sleep 5
pm2 status

# Show useful commands
echo -e "${BLUE}📋 Useful commands:${NC}"
echo -e "  View logs: ${YELLOW}pm2 logs${NC}"
echo -e "  Monitor: ${YELLOW}pm2 monit${NC}"
echo -e "  Restart: ${YELLOW}pm2 restart ecosystem.config.js${NC}"
echo -e "  Stop: ${YELLOW}pm2 stop ecosystem.config.js${NC}"
echo -e "  Health check: ${YELLOW}curl http://localhost:3007/health${NC}"

print_status "Deployment completed successfully!"
print_warning "Don't forget to:"
print_warning "1. Configure your database connection in .env.production"
print_warning "2. Update CORS origins in src/index.ts"
print_warning "3. Configure your domain and SSL certificates"
print_warning "4. Test the application: curl http://localhost:3007/health"
