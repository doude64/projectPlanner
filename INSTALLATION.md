# 🐧 Projects Planner - Linux Installation & HTTPS Setup Guide

Production-ready installation guide for deploying **Projects Planner** on Linux distributions (Ubuntu, Debian, RHEL, CentOS, Rocky Linux, Fedora, Debian).

---

## 📋 System Prerequisites & Package Installation

### 1. Update Package Repositories & Install System Build Tools
On Debian / Ubuntu:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential ufw openssl
```

On RHEL / Rocky Linux / AlmaLinux / Fedora:
```bash
sudo dnf update -y
sudo dnf groupinstall -y "Development Tools"
sudo dnf install -y curl git openssl firewalld
```

---

### 2. Install Node.js (v18 or v20 LTS) on Linux

#### Option A: Using NodeSource Binary Distributions (Recommended)

##### Debian / Ubuntu:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

##### RHEL / Rocky Linux / Fedora:
```bash
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo -E bash -
sudo dnf install -y nodejs
```

#### Option B: Using NVM (Node Version Manager)
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
```

Verify Node.js installation:
```bash
node -v   # Should output v20.x.x
npm -v    # Should output v10.x.x
```

---

## 🚀 Application Deployment

### Step 1: Clone or Place Application Files
Create a dedicated deployment directory (e.g. `/var/www/projectsPlaner` or `/opt/projectsPlaner`):
```bash
sudo mkdir -p /var/www/projectsPlaner
sudo chown -R $USER:$USER /var/www/projectsPlaner
cd /var/www/projectsPlaner
```

*(Copy your project files into `/var/www/projectsPlaner`)*

### Step 2: Install Node Dependencies
```bash
cd /var/www/projectsPlaner
npm install
```

### Step 3: Build Production Frontend
Compile the React (Vite) static bundle:
```bash
npm run build
```

---

## 🔒 HTTPS / SSL Configuration on Linux

Choose one of the following methods for securing traffic over `https://`:

---

### Method 1: Nginx Reverse Proxy with Let's Encrypt Certbot (Recommended for Production)

Running Node.js internally on `127.0.0.1:3001` behind Nginx is the standard Linux production architecture.

#### 1. Install Nginx & Certbot

##### Debian / Ubuntu:
```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

##### RHEL / Rocky Linux:
```bash
sudo dnf install -y epel-release
sudo dnf install -y nginx certbot python3-certbot-nginx
```

#### 2. Configure Nginx Virtual Host

Create an Nginx configuration file:
```bash
sudo nano /etc/nginx/sites-available/projects-planner
```

Paste the following block (replace `planner.yourdomain.com` with your domain name or server IP):
```nginx
server {
    listen 80;
    server_name planner.yourdomain.com;

    # Redirect large header requests & security limits
    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3001;
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

Enable the configuration and reload Nginx:
```bash
# Debian / Ubuntu
sudo ln -s /etc/nginx/sites-available/projects-planner /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 3. Provision Free SSL Certificate via Let's Encrypt
```bash
sudo certbot --nginx -d planner.yourdomain.com
```
Certbot automatically provisions trusted SSL certificates, enables HTTPS on port 443, and configures automatic renewal via `systemd` timers.

---

### Method 2: Direct Node.js HTTPS (Self-Signed Certificates / Private Network)

If running directly on Linux without Nginx, generate SSL certificates using OpenSSL:

#### 1. Generate SSL Certificates
```bash
cd /var/www/projectsPlaner
mkdir -p certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certs/key.pem \
  -out certs/cert.pem \
  -subj "/C=FR/ST=State/L=City/O=ProjectsPlanner/CN=localhost"
```

#### 2. Run Node.js with SSL Environment Variables
```bash
export SSL_KEY_PATH="/var/www/projectsPlaner/certs/key.pem"
export SSL_CERT_PATH="/var/www/projectsPlaner/certs/cert.pem"
export PORT=3001

npm run server
```

---

## ⚙️ Setting Up `systemd` Service (Daemonizing Node.js)

To run **Projects Planner** continuously in the background on Linux and restart automatically on server reboot, create a `systemd` service:

### Step 1: Create a Systemd Unit File
```bash
sudo nano /etc/systemd/system/projects-planner.service
```

Paste the following configuration:
```ini
[Unit]
Description=Projects Planner Node.js Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/projectsPlaner
ExecStart=/usr/bin/node /var/www/projectsPlaner/server/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3001
# Optional: Uncomment below if using direct Node HTTPS certificates
# Environment=SSL_KEY_PATH=/var/www/projectsPlaner/certs/key.pem
# Environment=SSL_CERT_PATH=/var/www/projectsPlaner/certs/cert.pem

# Security enhancements
ProtectSystem=full
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

### Step 2: Set Directory Permissions
Ensure `www-data` owns the project directory so SQLite can read/write data:
```bash
sudo chown -R www-data:www-data /var/www/projectsPlaner
```

### Step 3: Enable & Start Service
```bash
sudo systemctl daemon-reload
sudo systemctl enable projects-planner
sudo systemctl start projects-planner
```

### Step 4: Check Service Status & Logs
```bash
# Check service running status
sudo systemctl status projects-planner

# View real-time application logs
sudo journalctl -u projects-planner -f
```

---

## 🛡️ Linux Firewall Configuration

Ensure firewall ports are open for HTTP (80), HTTPS (443), or standalone Node (3001):

### Using UFW (Ubuntu / Debian):
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3001/tcp
sudo ufw reload
```

### Using Firewalld (RHEL / Rocky Linux / CentOS):
```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --reload
```

---

## 🔑 Default Login Credentials

Access your server via browser at **`https://your-server-ip`** or **`https://planner.yourdomain.com`**:

| Role | Username | Password | Privileges |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `didier` | Full privileges (Create users, reset passwords, create projects) |
| **Editor** | `editor_john` | `editor123` | Create & edit assigned projects |
| **Reader** | `reader_sarah` | `reader123` | View-only agenda calendar |

---

## 🛠️ Linux Useful Maintenance Commands

- **Restart Application Service**:
  ```bash
  sudo systemctl restart projects-planner
  ```
- **Rebuild Frontend after updates**:
  ```bash
  cd /var/www/projectsPlaner
  npm run build
  sudo systemctl restart projects-planner
  ```
- **Backup Database**:
  ```bash
  cp /var/www/projectsPlaner/data/projects_planner.db ~/backup_projects_planner_$(date +%F).db
  ```
