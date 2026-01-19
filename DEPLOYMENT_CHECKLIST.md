# Quick Start Deployment Checklist

Use this checklist to deploy to your bare metal server quickly.

## Pre-Deployment Setup (Do Once)

### Server Access
- [ ] SSH into your server
- [ ] Run system update: `sudo apt update && sudo apt upgrade -y`

### Install Dependencies (5-10 minutes)
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs git nginx postgresql certbot python3-certbot-nginx
```

### Database Setup (5 minutes)
```bash
sudo systemctl start postgresql
sudo -u postgres psql
# In psql:
CREATE USER seoapp WITH PASSWORD 'your-secure-password';
CREATE DATABASE seoapp_db OWNER seoapp;
GRANT ALL PRIVILEGES ON DATABASE seoapp_db TO seoapp;
\q
```

### Clone Project
```bash
cd /opt
sudo mkdir -p seoapp && sudo chown $USER:$USER seoapp
cd seoapp
git clone <your-repo-url> .
```

---

## Configuration (Do Once)

### 1. Backend Environment (2 minutes)
```bash
cd /opt/seoapp/backend
nano .env
# Add these values:
# DB_HOST=localhost
# DB_USER=seoapp
# DB_PASSWORD=your-secure-password
# DB_NAME=seoapp_db
# PORT=5000
# JWT_SECRET=<run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
```

### 2. Frontend Environment (1 minute)
```bash
cd /opt/seoapp
nano .env
# Update:
# EXPO_PUBLIC_API_BASE_URL=https://analysis.seoh.ca/api
```

### 3. Nginx Configuration (3 minutes)
```bash
sudo nano /etc/nginx/sites-available/seoapp
# Copy from DEPLOYMENT_GUIDE.md section "Nginx Configuration"
# Replace "yourdomain.com" with your actual domain

sudo ln -s /etc/nginx/sites-available/seoapp /etc/nginx/sites-enabled/seoapp
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### 4. SSL Certificate (2 minutes)
```bash
sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com
# Follow prompts, enter your email
```

### 5. Backend Service (2 minutes)
```bash
sudo nano /etc/systemd/system/seoapp-backend.service
# Copy from DEPLOYMENT_GUIDE.md section "Systemd Services"

sudo systemctl daemon-reload
sudo systemctl enable seoapp-backend.service
sudo systemctl start seoapp-backend.service
```

---

## Installation (Do Once)

### Install Dependencies
```bash
cd /opt/seoapp/backend
npm install

cd /opt/seoapp
npm install
```

---

## Verify Everything Works

### Test Backend
```bash
curl http://localhost:3000/health
# Should return: {"status":"ok"}
```

### Test via Domain
```bash
curl https://analysis.seoh.ca/health
curl https://analysis.seoh.ca/api/admin/stats  # Should show admin endpoint exists
```

### Test Admin Panel
- Open browser: `https://analysis.seoh.ca/admin`
- Login with your first registered user (see DEPLOYMENT_GUIDE.md)

### View Logs
```bash
sudo journalctl -u seoapp-backend.service -f
# Check for any errors
```

---

## Deploy Code Updates

Whenever you push code changes:

```bash
cd /opt/seoapp
git pull origin main

# If backend changed:
cd backend
npm install
sudo systemctl restart seoapp-backend.service

# If frontend changed:
cd /opt/seoapp
npm install
# Rebuild web/mobile apps with updated env vars

# Check status
sudo systemctl status seoapp-backend.service
```

---

## Maintenance Commands

### Daily/Weekly Checks
```bash
# All services status
systemctl status seoapp-backend.service nginx postgresql

# Backend logs (last 50 lines)
sudo journalctl -u seoapp-backend.service -n 50

# Disk space
df -h

# Database connections
sudo -u postgres psql seoapp_db -c "SELECT count(*) FROM users;"
```

### Monthly Tasks
```bash
# Backup database
sudo -u postgres pg_dump seoapp_db > /opt/seoapp/backup_$(date +%Y%m%d).sql

# Check certificate expiry
sudo certbot certificates
```

### Restart Everything (if needed)
```bash
sudo systemctl restart seoapp-backend.service nginx postgresql
```

---

## Troubleshooting Quick Fixes

### Backend not starting?
```bash
sudo systemctl stop seoapp-backend.service
cd /opt/seoapp/backend
node server.js  # Run manually to see error
# Ctrl+C to stop
sudo systemctl start seoapp-backend.service
```

### Can't connect to database?
```bash
psql -h localhost -U seoapp -d seoapp_db -c "SELECT 1;"
# If fails, restart: sudo systemctl restart postgresql
```

### Admin panel shows blank?
```bash
# Check if admin.html exists
ls -la /opt/seoapp/backend/public/admin.html

# Check backend logs
sudo journalctl -u seoapp-backend.service -f
```

---

## Full Troubleshooting

See DEPLOYMENT_GUIDE.md for detailed troubleshooting section.

---

## Need Help?

See these files for detailed info:
- **DEPLOYMENT_GUIDE.md** - Complete deployment instructions
- **BACKEND_SETUP.md** - Backend API documentation
- **README.md** - App features and overview
