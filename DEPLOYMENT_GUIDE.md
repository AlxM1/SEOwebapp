# Bare Metal Server Deployment Guide

Complete step-by-step instructions to deploy your SEO Analytics app to a bare metal server.

## Table of Contents

1. [Server Prerequisites](#server-prerequisites)
2. [Database Setup](#database-setup)
3. [Backend Deployment](#backend-deployment)
4. [Web App Setup](#web-app-setup)
5. [Nginx Configuration](#nginx-configuration)
6. [SSL Certificate Setup](#ssl-certificate-setup)
7. [Mobile App Configuration](#mobile-app-configuration)
8. [Systemd Services (Auto-Start)](#systemd-services-auto-start)
9. [Monitoring & Maintenance](#monitoring--maintenance)
10. [Troubleshooting](#troubleshooting)

---

## Server Prerequisites

### Minimum Requirements
- **OS**: Ubuntu 20.04 LTS or similar Linux distribution
- **CPU**: 2 cores minimum
- **RAM**: 4GB minimum
- **Storage**: 20GB free space
- **Domain Name**: Pointing to your server IP address

### 1. Connect to Your Server

```bash
ssh user@your-server-ip
```

### 2. Update System Packages

```bash
sudo apt update
sudo apt upgrade -y
```

### 3. Install Required Dependencies

```bash
# Install Node.js (v18+)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify Node.js installation
node --version  # Should be v18+
npm --version

# Install Git
sudo apt install -y git

# Install Nginx
sudo apt install -y nginx

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Certbot for SSL (Let's Encrypt)
sudo apt install -y certbot python3-certbot-nginx

# Install bun (optional but recommended for faster builds)
curl -fsSL https://bun.sh/install | bash
```

---

## Database Setup

### 1. Start PostgreSQL Service

```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql  # Auto-start on reboot

# Verify it's running
sudo systemctl status postgresql
```

### 2. Create Database and User

```bash
# Switch to postgres user
sudo -u postgres psql

# Inside psql terminal, run these commands:
CREATE USER seoapp WITH PASSWORD 'your-secure-password';
CREATE DATABASE seoapp_db OWNER seoapp;

# Grant permissions
GRANT ALL PRIVILEGES ON DATABASE seoapp_db TO seoapp;

# Exit psql
\q
```

### 3. Test Database Connection

```bash
psql -h localhost -U seoapp -d seoapp_db -c "SELECT version();"
# You'll be prompted for the password you created above
```

---

## Backend Deployment

### 1. Clone Your Project

```bash
cd /opt
sudo mkdir -p seoapp
sudo chown $USER:$USER seoapp
cd seoapp

# Clone your git repository
git clone <your-git-repo-url> .
```

### 2. Set Up Environment Variables

```bash
cd /opt/seoapp/backend
nano .env
```

Add the following configuration:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=seoapp
DB_PASSWORD=your-secure-password
DB_NAME=seoapp_db

# Server
PORT=5000
NODE_ENV=production

# JWT Secret (generate a random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-12345

# CORS
CORS_ORIGIN=https://yourdomain.com

# API Keys (optional)
GROK_API_KEY=your-grok-api-key
OPENAI_API_KEY=your-openai-api-key
```

**To generate a secure JWT secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Install Backend Dependencies

```bash
cd /opt/seoapp/backend
npm install
```

### 4. Initialize Database

The database will auto-initialize on first run, but you can manually initialize it:

```bash
node -e "require('./db').initializeDatabase();"
```

### 5. Test Backend Locally

```bash
cd /opt/seoapp/backend
node server.js
# You should see: "Server running on port 5000"
# Press Ctrl+C to stop
```

---

## Web App Setup

### 1. Build the Web App

```bash
cd /opt/seoapp

# Install dependencies
npm install

# Build for web (creates optimized web build)
npm run web
# or
bun run web
```

### 2. Serve Web App via Express

The Express backend already serves static files from the `public` folder. We'll create a web build folder:

```bash
cd /opt/seoapp

# Create public folder for web app
mkdir -p backend/public/web

# Copy your built web app (adjust path based on your build output)
# The web build output should be in .expo/web or dist folder
cp -r path/to/web-build/* backend/public/web/

# If you don't have a web build yet, we'll create a simple landing page
```

### 3. Create a Landing Page (Optional)

```bash
cat > /opt/seoapp/backend/public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SEO Analytics</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }
        .container {
            text-align: center;
            max-width: 600px;
            padding: 40px;
        }
        h1 { font-size: 48px; margin-bottom: 20px; }
        p { font-size: 18px; margin-bottom: 40px; opacity: 0.9; }
        .buttons {
            display: flex;
            gap: 20px;
            justify-content: center;
            flex-wrap: wrap;
        }
        a {
            padding: 15px 30px;
            border-radius: 8px;
            text-decoration: none;
            font-size: 16px;
            font-weight: 600;
            transition: all 0.3s;
        }
        .btn-primary {
            background: linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%);
            color: white;
        }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(20, 184, 166, 0.3); }
        .btn-secondary {
            background: rgba(255, 255, 255, 0.1);
            color: white;
            border: 2px solid rgba(255, 255, 255, 0.3);
        }
        .btn-secondary:hover { background: rgba(255, 255, 255, 0.2); }
    </style>
</head>
<body>
    <div class="container">
        <h1>SEO Analytics</h1>
        <p>Analyze your website's SEO performance with AI-powered insights</p>
        <div class="buttons">
            <a href="/admin" class="btn-primary">Admin Dashboard</a>
            <a href="/health" class="btn-secondary">API Status</a>
        </div>
    </div>
</body>
</html>
EOF
```

---

## Nginx Configuration

### 1. Create Nginx Configuration File

```bash
sudo nano /etc/nginx/sites-available/seoapp
```

Paste this configuration:

```nginx
upstream backend {
    server 127.0.0.1:5000;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Certificates (will be created by Certbot)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Logs
    access_log /var/log/nginx/seoapp_access.log;
    error_log /var/log/nginx/seoapp_error.log;

    # Root location - serve static files
    root /opt/seoapp/backend/public;

    # Static files
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API endpoints - proxy to Node backend
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Admin dashboard
    location /admin {
        proxy_pass http://backend/admin;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check
    location /health {
        proxy_pass http://backend/health;
        access_log off;
    }

    # Fallback for single-page app (if using web build)
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 2. Enable Nginx Site

```bash
sudo ln -s /etc/nginx/sites-available/seoapp /etc/nginx/sites-enabled/seoapp

# Remove default site if it exists
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## SSL Certificate Setup

### 1. Get Free SSL Certificate from Let's Encrypt

Replace `yourdomain.com` with your actual domain:

```bash
sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com

# Follow the prompts:
# - Enter your email
# - Accept the terms
# - Choose to share your email (optional)
```

### 2. Test SSL Certificate

```bash
sudo certbot renew --dry-run
```

### 3. Auto-Renew Certificate

Certbot automatically creates a renewal timer. Verify it's active:

```bash
sudo systemctl status certbot.timer
sudo systemctl enable certbot.timer
```

---

## Mobile App Configuration

### 1. Update Frontend Environment

In `/opt/seoapp/.env`:

```env
EXPO_PUBLIC_API_BASE_URL=https://yourdomain.com/api
```

### 2. Build Mobile App for Production

```bash
cd /opt/seoapp

# For iOS
eas build --platform ios --auto-submit

# For Android
eas build --platform android

# Or locally with Expo
npx expo build:ios
npx expo build:android
```

### 3. Alternative: Use Expo Go for Testing

```bash
npx expo start --tunnel
# Scan QR code with Expo Go app on your phone
```

---

## Systemd Services (Auto-Start)

### 1. Create Backend Service

```bash
sudo nano /etc/systemd/system/seoapp-backend.service
```

Paste:

```ini
[Unit]
Description=SEO Analytics Backend
After=network.target postgresql.service

[Service]
Type=simple
User=nobody
WorkingDirectory=/opt/seoapp/backend
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node /opt/seoapp/backend/server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

### 2. Enable and Start Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable seoapp-backend.service
sudo systemctl start seoapp-backend.service

# Check status
sudo systemctl status seoapp-backend.service

# View logs
sudo journalctl -u seoapp-backend.service -f
```

### 3. Create Nginx Service (Already exists, just verify)

```bash
sudo systemctl status nginx
sudo systemctl enable nginx
```

---

## Monitoring & Maintenance

### 1. Check Services Status

```bash
# Check if backend is running
sudo systemctl status seoapp-backend.service

# Check if Nginx is running
sudo systemctl status nginx

# Check if PostgreSQL is running
sudo systemctl status postgresql

# All at once
systemctl status seoapp-backend.service nginx postgresql
```

### 2. View Logs

```bash
# Backend logs
sudo journalctl -u seoapp-backend.service -f

# Nginx access logs
sudo tail -f /var/log/nginx/seoapp_access.log

# Nginx error logs
sudo tail -f /var/log/nginx/seoapp_error.log

# PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql.log
```

### 3. Database Backups

```bash
# Create backup
sudo -u postgres pg_dump seoapp_db > /opt/seoapp/backup_$(date +%Y%m%d_%H%M%S).sql

# Schedule daily backup (cron)
sudo crontab -e

# Add this line:
# 2 2 * * * sudo -u postgres pg_dump seoapp_db > /opt/seoapp/backups/backup_$(date +\%Y\%m\%d).sql
```

### 4. Check Disk Space

```bash
df -h
du -sh /opt/seoapp
```

### 5. Monitor Resource Usage

```bash
top
# or
htop  # Install with: sudo apt install htop
```

---

## Troubleshooting

### Backend Won't Start

```bash
# Check if port 5000 is in use
sudo lsof -i :5000

# Kill process if stuck
sudo kill -9 <PID>

# Check Node version
node --version

# Check dependencies installed
cd /opt/seoapp/backend
npm install

# Run manually to see error
node server.js
```

### Database Connection Error

```bash
# Test PostgreSQL connection
psql -h localhost -U seoapp -d seoapp_db -c "SELECT 1;"

# Check PostgreSQL is running
sudo systemctl status postgresql

# View PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql.log

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Nginx Not Forwarding Requests

```bash
# Test Nginx configuration
sudo nginx -t

# Check if Nginx is running
sudo systemctl status nginx

# Restart Nginx
sudo systemctl restart nginx

# Check Nginx logs
sudo tail -f /var/log/nginx/seoapp_error.log
```

### SSL Certificate Issues

```bash
# Check certificate expiry
sudo certbot certificates

# Renew manually
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run
```

### App Can't Connect to Backend

1. Verify `.env` file has correct domain
2. Check Nginx is forwarding `/api` to backend
3. Verify backend is running: `sudo systemctl status seoapp-backend.service`
4. Check firewall allows ports 80, 443: `sudo ufw status`

```bash
# Open firewall if needed
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 80/tcp  # HTTP
sudo ufw allow 443/tcp # HTTPS
sudo ufw enable
```

### Admin Panel Not Loading

```bash
# Verify admin.html exists
ls -la /opt/seoapp/backend/public/admin.html

# Check backend logs for errors
sudo journalctl -u seoapp-backend.service -f

# Try accessing health endpoint
curl https://yourdomain.com/health
```

---

## Quick Reference Commands

```bash
# Start all services
sudo systemctl start seoapp-backend.service nginx postgresql

# Stop all services
sudo systemctl stop seoapp-backend.service nginx postgresql

# Restart all services
sudo systemctl restart seoapp-backend.service nginx postgresql

# View all service status
systemctl status seoapp-backend.service nginx postgresql

# Check system logs
sudo journalctl -xef

# Update code from git
cd /opt/seoapp
git pull origin main
npm install  # if dependencies changed
sudo systemctl restart seoapp-backend.service

# Database shell
sudo -u postgres psql seoapp_db
```

---

## Deployment Checklist

- [ ] Server updated and dependencies installed
- [ ] PostgreSQL database and user created
- [ ] Backend cloned and dependencies installed
- [ ] `.env` file configured with database credentials
- [ ] Domain name pointing to server
- [ ] Nginx configuration created and tested
- [ ] SSL certificate obtained from Let's Encrypt
- [ ] Backend service created and running
- [ ] Frontend `.env` updated with production domain
- [ ] Mobile app rebuilt and submitted to app stores
- [ ] Database backups configured
- [ ] Logs and monitoring set up
- [ ] Tested accessing API endpoints
- [ ] Tested admin panel at `/admin`
- [ ] Created first admin user

---

## Next Steps

1. **Follow the deployment checklist** above step by step
2. **Test everything** before going live
3. **Set up monitoring** for production (optional but recommended)
4. **Create documentation** for your team on how to deploy updates

Good luck with your deployment! 🚀
