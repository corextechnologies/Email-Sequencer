# Email Sequencer - Linux VPS Deployment Guide

This guide will help you deploy the Email Sequencer application on a Linux VPS running on port 3007.

## Prerequisites

- Ubuntu 20.04+ or CentOS 8+ VPS
- Root access to the VPS
- Domain name pointing to your VPS (optional but recommended)
- PostgreSQL database (local or remote)

## Quick Deployment

### 1. Upload and Run Deployment Script

```bash
# Upload your project files to the VPS
scp -r . root@your-vps-ip:/var/www/email-sequencer/

# SSH into your VPS
ssh root@your-vps-ip

# Navigate to the project directory
cd /var/www/email-sequencer

# Make the deployment script executable
chmod +x deploy.sh

# Run the deployment script
./deploy.sh production
```

### 2. Configure Environment

```bash
# Edit the production environment file
nano .env.production

# Update the following variables:
# - DATABASE_URL: Your PostgreSQL connection string
# - JWT_SECRET: A secure random string
# - SMTP_*: Your email service configuration
# - FRONTEND_URL: Your frontend domain
# - BASE_URL: Your API domain
```

### 3. Start the Application

```bash
# Start with PM2
npm run start:prod

# Or use systemd service
systemctl start email-sequencer
systemctl enable email-sequencer
```

## Manual Deployment Steps

If you prefer to deploy manually, follow these steps:

### 1. System Setup

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install PM2 globally
npm install -g pm2

# Install PostgreSQL client
apt-get install -y postgresql-client

# Install other dependencies
apt-get install -y git curl wget
```

### 2. Application Setup

```bash
# Create application directory
mkdir -p /var/www/email-sequencer
cd /var/www/email-sequencer

# Clone or upload your code
git clone https://github.com/yourusername/Email-Sequencer.git .

# Install dependencies
npm install --production

# Build the application
npm run build

# Create logs directory
mkdir -p logs
chown -R www-data:www-data logs
```

### 3. Database Setup

```bash
# Create database (if using local PostgreSQL)
sudo -u postgres createdb email_sequencer_prod

# Run migrations
npm run migrate:prod

# Seed database (optional)
npm run seed:prod
```

### 4. Process Management

```bash
# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup
pm2 startup systemd -u www-data --hp /home/www-data
```

### 5. Systemd Service (Optional)

```bash
# Copy service file
cp email-sequencer.service /etc/systemd/system/

# Reload systemd
systemctl daemon-reload

# Enable and start service
systemctl enable email-sequencer
systemctl start email-sequencer
```

## Configuration

### Environment Variables

Key environment variables to configure in `.env.production`:

```bash
# Application
NODE_ENV=production
PORT=3007
BASE_URL=https://yourdomain.com:3007

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/email_sequencer_prod

# Security
JWT_SECRET=your_super_secure_jwt_secret_key_here
BCRYPT_ROUNDS=12

# Email
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
SMTP_FROM=noreply@yourdomain.com

# Frontend URLs
FRONTEND_URL=https://yourdomain.com
MOBILE_APP_URL=https://yourdomain.com

# Features
FEATURE_CAMPAIGNS_V2=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### CORS Configuration

Update the CORS origins in `src/index.ts` to include your production domains:

```typescript
const allowedOrigins = [
  // Add your production domains here
  'https://yourdomain.com',
  'https://app.yourdomain.com',
  // ... other origins
];
```

## Security

### Firewall Configuration

```bash
# Configure UFW firewall
ufw allow 22/tcp    # SSH
ufw allow 3007/tcp  # Application
ufw allow 80/tcp    # HTTP (if using reverse proxy)
ufw allow 443/tcp   # HTTPS (if using reverse proxy)
ufw --force enable
```

### SSL Certificate (Recommended)

```bash
# Install Certbot
apt install certbot

# Get SSL certificate
certbot certonly --standalone -d yourdomain.com

# Or use Let's Encrypt with nginx
apt install nginx
# Configure nginx as reverse proxy
```

### Nginx Reverse Proxy (Optional)

Create `/etc/nginx/sites-available/email-sequencer`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3007;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Monitoring

### Health Checks

The application provides several health check endpoints:

- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed system information
- `GET /ready` - Readiness probe
- `GET /live` - Liveness probe

### Logs

```bash
# View PM2 logs
pm2 logs

# View specific service logs
pm2 logs email-sequencer-api
pm2 logs email-sequencer-worker

# View systemd logs
journalctl -u email-sequencer -f
```

### Monitoring Commands

```bash
# Check PM2 status
pm2 status

# Monitor resources
pm2 monit

# Restart application
pm2 restart ecosystem.config.js

# Stop application
pm2 stop ecosystem.config.js
```

## Maintenance

### Updates

```bash
# Pull latest changes
git pull origin main

# Install new dependencies
npm install --production

# Build application
npm run build

# Run migrations
npm run migrate:prod

# Restart application
pm2 restart ecosystem.config.js
```

### Backups

```bash
# Database backup
pg_dump email_sequencer_prod > backup_$(date +%Y%m%d_%H%M%S).sql

# Application backup
tar -czf app_backup_$(date +%Y%m%d_%H%M%S).tar.gz /var/www/email-sequencer
```

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Check what's using port 3007
   lsof -i :3007
   # Kill the process
   kill -9 <PID>
   ```

2. **Database connection failed**
   ```bash
   # Check database status
   systemctl status postgresql
   # Check connection
   psql -h localhost -U username -d email_sequencer_prod
   ```

3. **Permission denied**
   ```bash
   # Fix ownership
   chown -R www-data:www-data /var/www/email-sequencer
   chmod -R 755 /var/www/email-sequencer
   ```

4. **PM2 not starting**
   ```bash
   # Check PM2 logs
   pm2 logs
   # Reset PM2
   pm2 kill
   pm2 start ecosystem.config.js --env production
   ```

### Log Locations

- Application logs: `/var/www/email-sequencer/logs/`
- PM2 logs: `~/.pm2/logs/`
- System logs: `/var/log/syslog`

## Performance Optimization

### PM2 Configuration

The `ecosystem.config.js` is configured for production with:
- Cluster mode for CPU utilization
- Memory limits and auto-restart
- Log rotation
- Health monitoring

### Database Optimization

- Ensure proper indexing
- Regular VACUUM and ANALYZE
- Connection pooling (configured in Database class)

### Monitoring

- Set up monitoring for CPU, memory, and disk usage
- Monitor database performance
- Set up alerts for application errors

## Support

For issues and questions:
- Check the logs first
- Review this deployment guide
- Check the application health endpoints
- Monitor system resources

## Security Checklist

- [ ] Firewall configured
- [ ] SSL certificate installed
- [ ] Strong passwords and secrets
- [ ] Regular security updates
- [ ] Database access restricted
- [ ] Log monitoring enabled
- [ ] Backup strategy implemented
