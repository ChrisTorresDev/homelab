# Cloudflare Tunnel Setup Guide (2025 Dashboard)

**Complete guide for setting up Cloudflare Tunnel with christorresdev.com on your Proxmox homelab.**

This guide reflects the CURRENT Cloudflare dashboard interface as of November 2025 and includes solutions for common DNS record conflicts.

---

## Quick Summary

You'll be setting up a Cloudflare Tunnel to route traffic from the internet to your homelab (192.168.50.120) without port forwarding. The tunnel creates a secure outbound connection from your server to Cloudflare's network.

**What you'll accomplish:**
- Create a Cloudflare Tunnel named "homelab-tunnel"
- Configure public hostnames (christorresdev.com and www.christorresdev.com)
- Deploy the cloudflared connector on CT 200
- Resolve DNS record conflicts
- Enable HTTPS with Cloudflare's proxy

---

## Prerequisites

1. **Cloudflare account** (FREE plan is sufficient)
2. **Domain added to Cloudflare** (christorresdev.com)
3. **Nameservers updated** at Namecheap (pointing to Cloudflare)
4. **DNS propagation complete** (verify with `nslookup christorresdev.com`)
5. **CT 200 server** (192.168.50.120) with Docker installed

---

## Part 1: Resolve DNS Record Conflicts (CRITICAL STEP)

### Why This Happens

When you add a domain to Cloudflare, it automatically imports existing DNS records from Namecheap. These records conflict with the CNAME records that Cloudflare Tunnel needs to create.

**The error message you're seeing:**
```
An A, AAAA, or CNAME record with that host already exists
```

This means there are already DNS records for `@` (root domain) or `www` that need to be deleted before the tunnel can create its own records.

### Step 1.1: Check Existing DNS Records

1. Log in to your Cloudflare dashboard at https://dash.cloudflare.com
2. Click on your domain: **christorresdev.com**
3. In the left sidebar, click **DNS** → **Records**
4. Look for any existing records for:
   - **Name: `@`** (represents christorresdev.com)
   - **Name: `www`** (represents www.christorresdev.com)
   - **Type: A, AAAA, or CNAME**

### Step 1.2: Delete Conflicting Records

**IMPORTANT: Take a screenshot or note down the details before deleting** (in case you need to restore them later)

For each conflicting record:
1. Click the **Edit** button (pencil icon) or the record itself
2. Click **Delete** at the bottom
3. Confirm the deletion

Common records to delete:
- **Type A, Name @, Content: [Some IP address]** ← DELETE THIS
- **Type A, Name www, Content: [Some IP address]** ← DELETE THIS
- **Type CNAME, Name www, Content: @** ← DELETE THIS

**After deletion, you should have NO records with names `@` or `www`.**

---

## Part 2: Create Cloudflare Tunnel

### Step 2.1: Access Zero Trust Dashboard

1. Log in to Cloudflare dashboard at https://dash.cloudflare.com
2. In the left sidebar, click **Zero Trust**
   - If you don't see "Zero Trust", look for **Cloudflare One** or check the top-right dropdown menu
   - First-time users: You'll be prompted to set up a Zero Trust organization (FREE, just enter a team name like "homelab")
3. Complete the Zero Trust setup if prompted:
   - Choose a **Team Name**: `homelab` or `christorres`
   - Select payment plan: **FREE**
   - Click **Continue**

### Step 2.2: Navigate to Tunnels

Once in Zero Trust dashboard:
1. In the left sidebar, expand **Networks**
2. Click **Tunnels**
3. Click **Create a tunnel** button (top-right corner)

### Step 2.3: Choose Connector Type

1. Select **Cloudflared** (default and recommended)
2. Click **Next**

### Step 2.4: Name Your Tunnel

1. Enter tunnel name: **homelab-tunnel**
2. Click **Save tunnel**

### Step 2.5: Install Connector (Get Token)

**IMPORTANT: This page shows installation instructions for various platforms.**

1. You'll see tabs for different operating systems (Windows, macOS, Linux, Docker)
2. Click the **Docker** tab
3. You'll see a command like this:
   ```bash
   docker run cloudflare/cloudflared:latest tunnel --no-autoupdate run --token eyJhIjoiYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY3ODkw...
   ```
4. **COPY THE ENTIRE TOKEN** (the long string after `--token`)
   - The token starts with `eyJ` and is very long
   - Store it securely - you'll need it for the Docker deployment

5. **DO NOT click "Next" yet** - keep this page open, we'll configure public hostnames first

---

## Part 3: Configure Public Hostnames

### Step 3.1: Add Public Hostname #1 (Root Domain)

Still on the tunnel installation page:
1. Scroll down to find **Public Hostname** section
2. Click **Add a public hostname**

**Configure the hostname:**
- **Subdomain**: Leave blank (or enter `@`)
- **Domain**: Select `christorresdev.com` from dropdown
- **Path**: Leave blank
- **Type**: HTTP
- **URL**: `192.168.50.120:80`

**Additional application settings** (expand if available):
- Leave defaults (No TLS Verify can be left unchecked since we're using HTTP to NPM)

3. Click **Save hostname**

### Step 3.2: Add Public Hostname #2 (www Subdomain)

1. Click **Add a public hostname** again

**Configure the hostname:**
- **Subdomain**: `www`
- **Domain**: Select `christorresdev.com` from dropdown
- **Path**: Leave blank
- **Type**: HTTP
- **URL**: `192.168.50.120:80`

2. Click **Save hostname**

### Step 3.3: Verify Configuration

You should now see TWO public hostnames listed:
- `christorresdev.com` → `http://192.168.50.120:80`
- `www.christorresdev.com` → `http://192.168.50.120:80`

**If you get the DNS conflict error here:**
- Go back to Part 1 and ensure you deleted ALL conflicting DNS records
- Wait 1-2 minutes for DNS cache to clear
- Try adding the hostnames again

---

## Part 4: Deploy Cloudflared Container on CT 200

### Step 4.1: SSH to CT 200

```bash
ssh root@192.168.50.120
```

### Step 4.2: Create Project Directory

```bash
cd /srv/docker
mkdir -p portfolio
cd portfolio
```

### Step 4.3: Create Environment File

Create `.env` file with your tunnel token:

```bash
nano .env
```

Add this line (replace with YOUR actual token from Step 2.5):
```env
TUNNEL_TOKEN=eyJhIjoiYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY3ODkw...
```

Save and exit (Ctrl+X, Y, Enter)

### Step 4.4: Create Docker Compose File

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

Save and exit (Ctrl+X, Y, Enter)

### Step 4.5: Create Docker Network (if needed)

```bash
docker network create webnet
```

If it already exists, you'll see: "Error response from daemon: network with name webnet already exists" - this is OK!

### Step 4.6: Deploy Cloudflare Tunnel

```bash
docker compose -f docker-compose.cloudflared.yml up -d
```

### Step 4.7: Verify Tunnel is Running

Check container status:
```bash
docker ps | grep cloudflared
```

Check logs for "Connection established":
```bash
docker logs cloudflared-tunnel
```

You should see messages like:
```
INF Connection established connIndex=0
INF Connection established connIndex=1
INF Connection established connIndex=2
INF Connection established connIndex=3
```

**If you see 4 "Connection established" messages, your tunnel is working!**

---

## Part 5: Verify DNS Records Were Created

### Step 5.1: Check Cloudflare DNS

1. Go back to Cloudflare dashboard
2. Click your domain: **christorresdev.com**
3. Click **DNS** → **Records** in left sidebar
4. You should now see NEW CNAME records automatically created by the tunnel:

**Expected records:**
```
Type: CNAME | Name: @ | Target: <tunnel-uuid>.cfargotunnel.com | Proxy: Proxied (orange cloud)
Type: CNAME | Name: www | Target: <tunnel-uuid>.cfargotunnel.com | Proxy: Proxied (orange cloud)
```

The `<tunnel-uuid>` is a long random string like `abc123-def456-ghi789-jkl012`

**Proxy status should show the orange cloud icon** - this means Cloudflare is proxying traffic through their CDN.

### Step 5.2: Test DNS Resolution

From your Mac or any computer:

```bash
nslookup christorresdev.com
dig christorresdev.com
```

You should see Cloudflare IP addresses (like 104.21.x.x or 172.67.x.x), NOT your home IP.

---

## Part 6: Configure Cloudflare SSL/TLS Settings

### Step 6.1: Set Encryption Mode

1. In Cloudflare dashboard, click your domain
2. Go to **SSL/TLS** → **Overview** (left sidebar)
3. Set encryption mode to: **Full** (not Flexible, not Full Strict)

**Why Full?**
- **Flexible**: Cloudflare ↔ Visitor = HTTPS, Cloudflare ↔ Your Server = HTTP (less secure)
- **Full**: Both connections encrypted (recommended for homelab)
- **Full (Strict)**: Requires valid SSL cert on your server (we'll use Nginx Proxy Manager for this later)

### Step 6.2: Enable Always Use HTTPS

1. Go to **SSL/TLS** → **Edge Certificates**
2. Find **Always Use HTTPS**
3. Toggle it **ON**

This redirects all HTTP requests to HTTPS automatically.

---

## Part 7: Test the Tunnel

### Step 7.1: Verify Tunnel Status in Dashboard

1. Go to Zero Trust dashboard
2. Click **Networks** → **Tunnels**
3. Your **homelab-tunnel** should show status: **HEALTHY** (green checkmark)
4. Click on the tunnel name to see details:
   - Connectors: Should show 4 active connections
   - Public Hostnames: Should show your 2 configured hostnames

### Step 7.2: Test from Internet (Before NPM Setup)

Since you haven't deployed Nginx Proxy Manager yet, let's test that the tunnel reaches your server:

**Option A: Test with a simple web server**

On CT 200, start a test web server:
```bash
# Create a simple test page
mkdir -p /tmp/webtest
echo "<h1>Tunnel Working!</h1>" > /tmp/webtest/index.html

# Start Python web server on port 80
cd /tmp/webtest
python3 -m http.server 80
```

Now open your browser and visit:
- https://christorresdev.com
- https://www.christorresdev.com

You should see "Tunnel Working!" - this confirms the tunnel is routing traffic correctly!

**Press Ctrl+C to stop the test server when done.**

**Option B: Check with curl**

From your Mac:
```bash
curl -I https://christorresdev.com
```

You should see HTTP response headers from Cloudflare (look for "cf-ray" header).

---

## Troubleshooting

### Error: "An A, AAAA, or CNAME record with that host already exists"

**Solution:**
1. Go to Cloudflare dashboard → DNS → Records
2. Delete ALL existing A, AAAA, or CNAME records for `@` and `www`
3. Wait 1-2 minutes
4. Try creating the tunnel public hostname again

**Common causes:**
- Auto-imported DNS records from Namecheap
- Previous tunnel configurations
- Manually created records

### Tunnel shows "Down" or "Unhealthy"

**Check these:**
1. Container is running: `docker ps | grep cloudflared`
2. Check logs: `docker logs cloudflared-tunnel`
3. Verify token is correct in `.env` file
4. Restart container: `docker restart cloudflared-tunnel`
5. Check CT 200 internet connectivity: `ping 1.1.1.1`

### Can't find "Zero Trust" in Cloudflare dashboard

**Solutions:**
- Look for **Cloudflare One** instead (same thing, renamed)
- Check the dropdown menu in top-right corner
- Direct link: https://one.dash.cloudflare.com
- First-time users: You need to create a Zero Trust organization (free)

### DNS records not appearing after creating tunnel

**Wait 1-5 minutes** - Cloudflare needs time to create DNS records after you configure public hostnames.

If still not showing:
1. Go to Zero Trust → Networks → Tunnels
2. Click your tunnel name
3. Click **Public Hostnames** tab
4. Verify hostnames are listed
5. Try deleting and re-adding them

### Website shows Cloudflare error page

**Common errors:**
- **Error 502 Bad Gateway**: Your server (192.168.50.120) is not responding on port 80
  - Check if any service is listening on port 80: `netstat -tlnp | grep :80`
  - Deploy Nginx Proxy Manager (next step in deployment guide)
- **Error 521 Web Server Is Down**: Container not running or wrong IP
  - Verify IP address in tunnel config: should be `192.168.50.120:80`
  - Check firewall rules on CT 200: `iptables -L`
- **Error 1033 Argo Tunnel error**: Tunnel not connected
  - Check tunnel status: `docker logs cloudflared-tunnel`
  - Verify token is correct

---

## Next Steps

✅ **Cloudflare Tunnel is now configured and running!**

**Continue to the next part of the deployment:**
1. Deploy Nginx Proxy Manager (see main DEPLOYMENT_GUIDE.md Step 3.1)
2. Deploy Portfolio Website container (see main DEPLOYMENT_GUIDE.md Step 3.3)
3. Configure NPM proxy host with SSL certificate (see main DEPLOYMENT_GUIDE.md Step 4)

---

## Important Notes

### Free Plan Limitations (as of 2025)

**What's FREE:**
- Unlimited tunnels
- Unlimited bandwidth
- Unlimited public hostnames
- Global CDN and DDoS protection
- Basic SSL/TLS encryption
- Zero Trust access policies (up to 50 users)

**What's NOT included in FREE plan:**
- Advanced Zero Trust features (Access policies beyond 50 users)
- Custom SSL certificates (but Let's Encrypt via NPM works great)
- Log retention beyond 24 hours
- Advanced DDoS protection (L7 attack mitigation)

**For homelab use, the FREE plan is more than sufficient.**

### Security Best Practices

1. **Keep tunnel token secure** - treat it like a password
2. **Use Full SSL/TLS mode** - not Flexible
3. **Enable Always Use HTTPS** - force secure connections
4. **Configure Nginx Proxy Manager** - add proper SSL certs and headers
5. **Don't expose unnecessary services** - only route specific ports/paths
6. **Monitor tunnel logs** - check for unauthorized access attempts

### Tunnel Token Security

The tunnel token gives access to route traffic to your homelab. If compromised:
1. Go to Zero Trust → Networks → Tunnels
2. Click your tunnel → **Configure** tab
3. Delete and recreate the tunnel (generates new token)
4. Update `.env` file on CT 200 with new token
5. Restart container: `docker restart cloudflared-tunnel`

---

## Resources

**Official Documentation:**
- [Cloudflare Tunnel Guide (2025)](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
- [Create a Tunnel (Dashboard Method)](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/create-remote-tunnel/)
- [Public Hostname Configuration](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/routing-to-tunnel/)
- [Tunnels FAQ](https://developers.cloudflare.com/cloudflare-one/faq/cloudflare-tunnels-faq/)

**Community Resources:**
- [Cloudflare Community Forums](https://community.cloudflare.com/c/developers/cloudflare-tunnel/)
- [Cloudflare Tunnel GitHub](https://github.com/cloudflare/cloudflared)

---

## Cost Breakdown

| Item | Cost | Notes |
|------|------|-------|
| Cloudflare Tunnel | **FREE** | Unlimited bandwidth |
| Cloudflare DNS | **FREE** | Global DNS with CDN |
| Cloudflare SSL/TLS | **FREE** | Edge certificates |
| Zero Trust (Free Plan) | **FREE** | Up to 50 users |
| Domain (christorresdev.com) | $10-12/year | From Namecheap |
| **TOTAL** | **$10-12/year** | Domain only! |

---

**Your Cloudflare Tunnel is ready! Continue with deploying Nginx Proxy Manager and your portfolio website.**
