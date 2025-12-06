# Portfolio Website Deployment Guide

Complete guide to deploy christorresdev.com on your Proxmox homelab using Cloudflare Tunnel.

## Architecture Overview

```
Internet (christorresdev.com)
    ↓
Cloudflare DNS + Tunnel (FREE, no port forwarding)
    ↓
CT 200 - Infra LXC (192.168.50.120)
    ↓
Nginx Proxy Manager (ports 80/443 + TLS certificates)
    ↓
Portfolio Website Container (port 8090)
```

## Total Cost: $10-12/year (domain only)

Everything else is FREE:
- Hosting: Your Proxmox server
- TLS/SSL: Let's Encrypt (via Nginx Proxy Manager)
- External Access: Cloudflare Tunnel
- Reverse Proxy: Nginx Proxy Manager

---

## Prerequisites

1. **Proxmox CT 200** (Infra LXC at 192.168.50.120) with:
   - Docker and Docker Compose installed
   - SSH access
   - Portainer running (optional, for easy management)

2. **Domain**: christorresdev.com from Namecheap

3. **Cloudflare Account**: Free account at cloudflare.com

---

## Step 1: Set Up Cloudflare

### 1.1 Create Cloudflare Account
1. Go to https://cloudflare.com and sign up for FREE account
2. Verify your email

### 1.2 Add Domain to Cloudflare
1. In Cloudflare dashboard, click "Add a site"
2. Enter: `christorresdev.com`
3. Select FREE plan
4. Cloudflare will scan your DNS records
5. Click "Continue"

### 1.3 Update Namecheap Nameservers
Cloudflare will provide 2 nameservers (something like):
```
ns1.cloudflare.com
ns2.cloudflare.com
```

**In Namecheap**:
1. Log in to Namecheap
2. Go to Domain List → christorresdev.com → Manage
3. Find "Nameservers" section
4. Select "Custom DNS"
5. Enter the 2 Cloudflare nameservers
6. Save changes

**⏰ DNS propagation takes 1-24 hours** (usually ~1 hour)

---

## Step 2: Create Cloudflare Tunnel

**IMPORTANT: The Cloudflare dashboard interface has changed significantly in 2025.**

For detailed, up-to-date instructions that match the current Cloudflare dashboard:

**Follow this guide: [CLOUDFLARE_TUNNEL_SETUP_2025.md](./CLOUDFLARE_TUNNEL_SETUP_2025.md)**

**If you encounter DNS record conflicts**, see: [TROUBLESHOOTING_DNS_CONFLICTS.md](./TROUBLESHOOTING_DNS_CONFLICTS.md)

### Quick Summary (for reference)

1. **Delete conflicting DNS records** in Cloudflare (A, AAAA, or CNAME for @ and www)
2. **Access Zero Trust dashboard**: https://one.dash.cloudflare.com
3. **Create tunnel**: Networks → Tunnels → Create a tunnel → Name: "homelab-tunnel"
4. **Copy tunnel token** from the Docker installation command
5. **Add public hostnames**:
   - `christorresdev.com` → `http://192.168.50.120:80`
   - `www.christorresdev.com` → `http://192.168.50.120:80`
6. **Deploy cloudflared container** on CT 200 (see below)

### 2.1 Deploy Cloudflared on CT 200

SSH into CT 200 (192.168.50.120):

```bash
ssh root@192.168.50.120
```

Create the webnet network (if not exists):
```bash
docker network create webnet
```

Create project directory:
```bash
cd /srv/docker
mkdir -p portfolio
cd portfolio
```

Create `.env` file with your tunnel token:
```bash
nano .env
```

Add (replace with YOUR token from Cloudflare):
```env
TUNNEL_TOKEN=eyJhIjoiYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY3ODkw...
```

Create `docker-compose.cloudflared.yml`:
```bash
nano docker-compose.cloudflared.yml
```

Paste this content:
```yaml
version: '3.8'

services:
  cloudflared:
    container_name: cloudflared-tunnel
    image: cloudflare/cloudflared:latest
    restart: unless-stopped
    command: tunnel --no-autoupdate run --token ${TUNNEL_TOKEN}
    networks:
      - webnet
    environment:
      - TUNNEL_TOKEN=${TUNNEL_TOKEN}

networks:
  webnet:
    external: true
```

Deploy the tunnel:
```bash
docker compose -f docker-compose.cloudflared.yml up -d
```

Verify it's running:
```bash
docker logs cloudflared-tunnel
```

Look for "Connection established" messages (should see 4 of them).

---

## Step 3: Deploy Infrastructure on CT 200

SSH into CT 200 and create project directory:

```bash
cd /srv/docker
mkdir portfolio
cd portfolio
```

### 3.1 Deploy Nginx Proxy Manager

Create `.env` file:
```bash
cat > .env << 'EOF'
TUNNEL_TOKEN=your_cloudflare_tunnel_token_here
EOF
```

Download the docker-compose files from the portfolio-website/deployment directory to CT 200, or create them manually:

**Deploy Nginx Proxy Manager**:
```bash
docker compose -f docker-compose.nginx-proxy-manager.yml up -d
```

Wait 30 seconds for NPM to start, then access the admin panel:
- URL: http://192.168.50.120:81
- Default login:
  - Email: `admin@example.com`
  - Password: `changeme`

**Change the password immediately!**

### 3.2 Deploy Cloudflare Tunnel

```bash
# Edit .env and add your tunnel token
nano .env

# Deploy cloudflared
docker compose -f docker-compose.cloudflared.yml up -d
```

Check tunnel status:
```bash
docker logs cloudflared-tunnel
```

You should see "Connection established" messages.

### 3.3 Build and Deploy Portfolio Website

Transfer the portfolio website code to CT 200:

**Option A: Clone from git** (if you push to GitHub):
```bash
cd /srv/docker/portfolio
git clone https://github.com/YourUsername/portfolio-website.git
cd portfolio-website
```

**Option B: Copy files via SCP** (from your Mac):
```bash
# From your Mac in the homelab directory
cd /Users/2021m1pro/my-projects/homelab
scp -r portfolio-website root@192.168.50.120:/srv/docker/portfolio/
```

**Build and deploy**:
```bash
cd /srv/docker/portfolio/portfolio-website
docker compose -f deployment/docker-compose.portfolio.yml up -d --build
```

Check if it's running:
```bash
docker ps | grep christorresdev
curl http://localhost:8090
```

---

## Step 4: Configure Nginx Proxy Manager

### 4.1 Add Proxy Host

1. Access NPM: http://192.168.50.120:81
2. Click "Proxy Hosts" → "Add Proxy Host"

**Details Tab**:
- Domain Names: `christorresdev.com`, `www.christorresdev.com`
- Scheme: `http`
- Forward Hostname / IP: `christorresdev-portfolio`
- Forward Port: `80`
- ✅ Cache Assets
- ✅ Block Common Exploits
- ✅ Websockets Support

**SSL Tab**:
- SSL Certificate: "Request a new SSL Certificate"
- ✅ Force SSL
- ✅ HTTP/2 Support
- ✅ HSTS Enabled
- ✅ I Agree to the Let's Encrypt Terms of Service
- Email: your-email@example.com

Click "Save"

NPM will automatically request and configure a FREE Let's Encrypt TLS certificate!

---

## Step 5: Configure DNS in Cloudflare

### 5.1 Add DNS Records

Go to Cloudflare dashboard → DNS → Records:

**A Record** (or use Tunnel CNAME):
Since you're using Cloudflare Tunnel, the DNS is automatically configured when you set up the tunnel public hostname. Verify these records exist:

- Type: `CNAME`
- Name: `@`
- Target: Your tunnel UUID (auto-created)
- Proxy status: ✅ Proxied (orange cloud)

- Type: `CNAME`
- Name: `www`
- Target: `christorresdev.com`
- Proxy status: ✅ Proxied (orange cloud)

### 5.2 Cloudflare Settings

**SSL/TLS Settings**:
1. Go to SSL/TLS → Overview
2. Set encryption mode to: **Full**

**Security Settings** (optional but recommended):
1. Go to Security → Settings
2. Security Level: "Medium"
3. Enable "Bot Fight Mode"

---

## Step 6: Test Everything

### 6.1 Local Tests (from CT 200)
```bash
# Test portfolio directly
curl http://localhost:8090

# Test through NPM
curl -H "Host: christorresdev.com" http://localhost:80
```

### 6.2 External Tests (from your Mac or phone)

**Wait for DNS propagation** (check with):
```bash
nslookup christorresdev.com
dig christorresdev.com
```

**Test the website**:
```bash
curl -I https://christorresdev.com
```

Open in browser:
- https://christorresdev.com
- https://www.christorresdev.com

Both should work with valid HTTPS!

---

## Step 7: Email Configuration

Set up email forwarding for contact@christorresdev.com:

### Option 1: Cloudflare Email Routing (FREE, Recommended)
1. Cloudflare dashboard → Email → Email Routing
2. Enable Email Routing
3. Add destination email (your personal email)
4. Add custom address: `contact@christorresdev.com`
5. Verify your destination email

### Option 2: Namecheap Email Forwarding
1. Namecheap → Domain List → christorresdev.com → Manage
2. Advanced DNS → Email Forwarding
3. Forward `contact@*` to your personal email

---

## Troubleshooting

### Website not accessible from internet
1. Check Cloudflare Tunnel is running: `docker logs cloudflared-tunnel`
2. Verify tunnel status in Cloudflare dashboard (should show "Healthy")
3. Check DNS propagation: `nslookup christorresdev.com`
4. Verify NPM proxy host is configured correctly
5. Check NPM access logs: `docker logs nginx-proxy-manager`

### SSL certificate not working
1. NPM needs ports 80/443 accessible from Cloudflare Tunnel
2. Check NPM SSL certificates page for errors
3. Make sure Cloudflare SSL mode is "Full" (not "Flexible")
4. Let's Encrypt rate limit: 5 failures per hour, wait 1 hour

### Cloudflare Tunnel disconnecting
1. Check CT 200 network connectivity: `ping 1.1.1.1`
2. Restart tunnel: `docker restart cloudflared-tunnel`
3. Check for CT 200 resource issues: `htop`, `df -h`
4. Verify tunnel token is correct in .env file

### Portfolio container not starting
1. Check logs: `docker logs christorresdev-portfolio`
2. Verify port 8090 is not in use: `netstat -tlnp | grep 8090`
3. Rebuild container: `docker compose -f deployment/docker-compose.portfolio.yml up -d --build --force-recreate`

---

## Maintenance

### Update Portfolio Content
```bash
# SSH to CT 200
ssh root@192.168.50.120
cd /srv/docker/portfolio/portfolio-website

# Pull latest changes (if using git)
git pull

# Rebuild and restart
docker compose -f deployment/docker-compose.portfolio.yml up -d --build
```

### View Logs
```bash
# Portfolio logs
docker logs -f christorresdev-portfolio

# Nginx Proxy Manager logs
docker logs -f nginx-proxy-manager

# Cloudflare Tunnel logs
docker logs -f cloudflared-tunnel
```

### Backup
Important data to backup:
- `/srv/docker/portfolio/` - Docker compose files and configs
- NPM data: `docker volume inspect npm-data` - Backup this volume
- SSL certificates: `docker volume inspect npm-letsencrypt`

---

## Performance Optimization

### Enable Cloudflare Caching
1. Cloudflare dashboard → Caching → Configuration
2. Caching Level: "Standard"
3. Browser Cache TTL: "Respect Existing Headers"

### Enable Cloudflare CDN
Already enabled! Cloudflare's orange cloud means your site is cached on their global CDN.

### Monitor Uptime
Deploy Uptime Kuma (already documented in phase1-simplified-build.md):
```bash
# Deploy Uptime Kuma
cd /srv/docker
# Follow phase1-simplified-build.md Step 12
```

---

## Cost Summary

| Item | Cost | Notes |
|------|------|-------|
| Domain (christorresdev.com) | $10-12/year | Namecheap |
| Cloudflare Tunnel | FREE | No port forwarding needed |
| Cloudflare CDN/DNS | FREE | Global CDN included |
| SSL Certificate | FREE | Let's Encrypt |
| Email forwarding | FREE | Cloudflare Email Routing |
| Hosting | $0 | Your Proxmox server |
| **TOTAL** | **$10-12/year** | Just the domain! |

---

## Next Steps

1. **Update GitHub links**: Create GitHub repos for your portfolio projects
2. **Add analytics**: Consider Cloudflare Web Analytics (FREE, privacy-friendly)
3. **SEO optimization**: Submit sitemap to Google Search Console
4. **Email signature**: Update to include christorresdev.com link
5. **Social media**: Add website link to LinkedIn, Upwork profile
6. **Blog section** (optional): Add `/blog` route to showcase articles

---

## Support

If you encounter issues:
1. Check Docker logs for error messages
2. Verify Cloudflare Tunnel is healthy
3. Test locally first (port 8090), then through NPM, then externally
4. Review troubleshooting section above
5. Check Cloudflare dashboard for tunnel connectivity

---

**Your portfolio website is now live at https://christorresdev.com!** 🎉
