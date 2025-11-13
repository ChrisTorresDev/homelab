# Connect Mac to Proxmox Network (192.168.1.x)

## Problem Summary

**Current State:**
- Your Mac WiFi: `192.168.50.20` (gateway: `192.168.50.1`)
- Your Proxmox Server: `192.168.1.110` (gateway: `192.168.1.1`)
- **Issue:** Different subnets = no communication possible

**Goal:** Get your Mac onto the `192.168.1.x` network so you can SSH to Proxmox at `192.168.1.110`

---

## Diagnosis Results

Your Mac is currently:
- Connected via WiFi (interface: `en0`)
- Getting IP `192.168.50.20` via DHCP
- Gateway/router is at `192.168.50.1`

This means you have **TWO POSSIBLE SCENARIOS**:

### Scenario A: Your Router Has Multiple WiFi Networks
Your router might be broadcasting:
- **Main WiFi network** → assigns `192.168.1.x` IPs (this is where Proxmox is)
- **Guest/IoT WiFi network** → assigns `192.168.50.x` IPs (this is where your Mac currently is)

**Solution:** Connect to the main WiFi network instead

### Scenario B: Router WiFi is Misconfigured
Your router's:
- **Ethernet ports** → use `192.168.1.x` subnet
- **WiFi network** → uses `192.168.50.x` subnet

This is unusual but possible with certain router configurations.

**Solution:** Reconfigure router WiFi to use `192.168.1.x` subnet

---

## SOLUTION 1: Check for and Connect to Main WiFi Network

### Step 1: Check Available Networks

Click the WiFi icon in your Mac's menu bar (top-right corner). You should see a list of available networks.

**What to look for:**
- Networks with similar names (e.g., "MyNetwork" and "MyNetwork-Guest")
- Networks with "5G" or "2.4G" suffixes
- Any network you recognize as your "main" home network

### Step 2: Connect to Different WiFi Network

1. Click **WiFi icon** in menu bar
2. Look for your main network (might be named differently than current network)
3. Click the network name
4. Enter WiFi password if prompted
5. Wait 10-15 seconds for connection

### Step 3: Verify New IP Address

Open Terminal and run:

```bash
ifconfig en0 | grep "inet "
```

**Expected result:** Should now show `192.168.1.xxx` instead of `192.168.50.20`

Example:
```
inet 192.168.1.45 netmask 0xffffff00 broadcast 192.168.1.255
```

### Step 4: Test Proxmox Connection

```bash
ping -c 4 192.168.1.110
```

**Expected result:** You should see replies like:
```
64 bytes from 192.168.1.110: icmp_seq=0 ttl=64 time=2.3 ms
```

If ping works, try SSH:

```bash
ssh root@192.168.1.110
```

---

## SOLUTION 2: Access Router and Check Configuration

If you only see ONE WiFi network, you need to check your router settings.

### Step 1: Identify Your Router Admin Page

Your router is likely at one of these addresses:
- **Option 1:** `http://192.168.50.1` (your current gateway)
- **Option 2:** `http://192.168.1.1` (Proxmox's gateway)

### Step 2: Access Router from Mac

**Try Option 1 first** (since Mac can reach this):

```bash
# Open in browser
open http://192.168.50.1
```

**Login credentials** (common defaults):
- Username: `admin` Password: `admin`
- Username: `admin` Password: `password`
- Username: `admin` Password: (blank)
- Check sticker on router for default credentials

### Step 3: Check Network Configuration

Once logged into router admin panel:

1. Look for **LAN Settings** or **Network Settings**
2. Check **DHCP Server** configuration
3. Look for:
   - **Primary LAN subnet:** Should be `192.168.1.0/24`
   - **DHCP range:** Should be `192.168.1.100 - 192.168.1.254` or similar
   - **WiFi settings:** Should assign IPs from same subnet

### Step 4: Check if Multiple Networks Exist

Look for:
- **Guest Network** settings
- **IoT Network** settings
- **Multiple SSID** configurations

**Common router sections:**
- TP-Link: "Guest Network" under Wireless settings
- Netgear: "Guest Network" in Advanced > Wireless
- Asus: "Guest Network" in Wireless > Professional
- Linksys: "Guest Access" in Wireless settings

### Step 5: Fix WiFi Subnet (If Necessary)

If WiFi is on `192.168.50.x` but you want `192.168.1.x`:

1. Navigate to **LAN Settings** or **DHCP Server**
2. Change:
   - **IP Address:** from `192.168.50.1` to `192.168.1.1`
   - **Subnet Mask:** keep as `255.255.255.0`
   - **DHCP Start:** `192.168.1.100`
   - **DHCP End:** `192.168.1.200`
3. **Save** and router will likely reboot
4. **Reconnect** your Mac to WiFi
5. Mac should now get `192.168.1.x` IP via DHCP

**WARNING:** Changing router IP will disconnect all devices temporarily. Your Proxmox ethernet connection should remain stable if it's using static IP `192.168.1.110`.

---

## SOLUTION 3: Temporary Workaround - Use Ethernet Adapter

If WiFi is problematic, use a USB-C to Ethernet adapter:

### What You Need
- USB-C to Gigabit Ethernet adapter (Apple or third-party)
- Ethernet cable

### Setup Steps

1. Plug adapter into Mac's USB-C port
2. Connect ethernet cable from adapter to same switch/router as Proxmox
3. Mac should auto-detect and get `192.168.1.x` IP via DHCP

Verify:
```bash
ifconfig en7 | grep "inet "  # Interface name may vary
```

---

## SOLUTION 4: Advanced - Check Router via Proxmox

If you can't access router from Mac, access it through Proxmox console.

### From Proxmox Web UI Console

1. Access Proxmox normally (how you did initial setup)
2. Open Proxmox shell
3. Run:
```bash
ip addr show
ip route show
```

4. Try to access router from Proxmox:
```bash
ping 192.168.1.1
curl http://192.168.1.1  # Should show router login page HTML
```

### Check if Router is Dual-Subnet

From Proxmox shell, scan both subnets:

```bash
# Scan 192.168.1.x network
nmap -sn 192.168.1.0/24

# Try to reach the other subnet
ping 192.168.50.1
```

If Proxmox CAN reach `192.168.50.1`, your router is doing inter-VLAN routing and both subnets should be able to communicate.

---

## SOLUTION 5: Nuclear Option - Change Proxmox Network (NOT RECOMMENDED)

**Only do this if WiFi cannot be changed and you don't have ethernet adapter.**

This involves reconfiguring Proxmox to use `192.168.50.x` subnet instead. This is complex and not ideal.

### Why This Is Bad
- Your homelab guide assumes `192.168.1.x` scheme
- Breaks established IP plan in CLAUDE.md
- May indicate underlying network issue

### If You Must Do This

From Proxmox console (keyboard/monitor or IPMI):

1. Edit network config:
```bash
nano /etc/network/interfaces
```

2. Change:
```
auto vmbr0
iface vmbr0 inet static
    address 192.168.50.110/24  # Changed from 192.168.1.110
    gateway 192.168.50.1       # Changed from 192.168.1.1
    bridge-ports enp3s0
    bridge-stp off
    bridge-fd 0
```

3. Restart networking:
```bash
systemctl restart networking
```

4. Update `/Users/2021m1pro/my-projects/homelab/CLAUDE.md` IP scheme to use `192.168.50.x`

**Again: This is the LAST RESORT option.**

---

## Verification Checklist

After implementing a solution, verify everything works:

### 1. Check Mac IP Address
```bash
ifconfig en0 | grep "inet "
```
**Expected:** `inet 192.168.1.xxx` (NOT `192.168.50.20`)

### 2. Check Default Gateway
```bash
netstat -nr | grep default
```
**Expected:** `default 192.168.1.1` (NOT `192.168.50.1`)

### 3. Ping Gateway
```bash
ping -c 4 192.168.1.1
```
**Expected:** Successful replies

### 4. Ping Proxmox
```bash
ping -c 4 192.168.1.110
```
**Expected:** Successful replies

### 5. Test SSH to Proxmox
```bash
ssh root@192.168.1.110
```
**Expected:** Password prompt or successful connection

### 6. (Optional) Test Web UI
```bash
open https://192.168.1.110:8006
```
**Expected:** Proxmox web interface loads (ignore certificate warning)

---

## Troubleshooting Common Issues

### Issue: "No route to host" when pinging Proxmox

**Cause:** Still on different subnet or firewall blocking

**Fix:**
1. Verify Mac IP is `192.168.1.x`:
```bash
ifconfig en0 | grep "inet "
```

2. Verify Proxmox IP:
```bash
# From Proxmox console
ip addr show vmbr0
```

3. Check routing table:
```bash
netstat -nr | grep 192.168.1
```

### Issue: Mac gets 169.254.x.x IP (APIPA address)

**Cause:** DHCP server not responding on that network

**Fix:**
1. Router's DHCP might be disabled on `192.168.1.x` network
2. Access router admin panel
3. Enable DHCP server for LAN
4. Set range like `192.168.1.100 - 192.168.1.200`
5. Renew Mac DHCP lease:
```bash
sudo ipconfig set en0 DHCP
sudo dscacheutil -flushcache
```

### Issue: Can ping Proxmox but SSH fails

**Cause:** SSH service not running or firewall blocking port 22

**Fix from Proxmox console:**
```bash
# Check if SSH is running
systemctl status sshd

# Start SSH if needed
systemctl start sshd
systemctl enable sshd

# Check firewall (Proxmox uses iptables)
iptables -L -n | grep 22
```

### Issue: WiFi keeps reconnecting to wrong network

**Cause:** Mac auto-connects to stronger signal

**Fix:**
1. Open **System Settings** > **Wi-Fi**
2. Click **(i)** icon next to the `192.168.50.x` network
3. Uncheck **Auto-Join**
4. Optionally click **Forget This Network**

---

## Quick Command Reference

### Check Current Network
```bash
# Show IP addresses
ifconfig en0 | grep "inet "

# Show gateway
netstat -nr | grep default

# Show WiFi info
networksetup -getinfo "Wi-Fi"

# Scan available WiFi networks
/System/Library/PrivateFrameworks/Apple80211.framework/Resources/airport -s
```

### Change Networks via Terminal
```bash
# Disconnect WiFi
networksetup -setairportpower en0 off

# Reconnect WiFi
networksetup -setairportpower en0 on

# Connect to specific network
networksetup -setairportnetwork en0 "NetworkName" "password"

# Renew DHCP lease
sudo ipconfig set en0 DHCP
sudo dscacheutil -flushcache
```

### Test Connectivity
```bash
# Ping gateway
ping -c 4 192.168.1.1

# Ping Proxmox
ping -c 4 192.168.1.110

# SSH to Proxmox
ssh root@192.168.1.110

# Scan network for devices
nmap -sn 192.168.1.0/24  # Requires: brew install nmap
```

---

## Next Steps After Successful Connection

Once your Mac can reach Proxmox via SSH:

1. **Bookmark the IP scheme** - You'll be using these IPs throughout Phase 1, 2, 3:
   - `192.168.1.110` - Proxmox host
   - `192.168.1.111` - Windows 11 Gaming VM
   - `192.168.1.120` - Infra LXC container
   - `192.168.1.130` - Dell Latitude (Jellyfin)
   - `192.168.1.140` - T480s Backup Server

2. **Continue Phase 1** of your homelab build from `your_hardware_homelab.md`

3. **Consider static IP for Mac** (optional) - If you'll be managing Proxmox frequently:
```bash
# System Settings > Wi-Fi > Details > TCP/IP
# Change "Configure IPv4" from DHCP to Manual
# Set: 192.168.1.50 (or any unused IP in range)
# Subnet: 255.255.255.0
# Router: 192.168.1.1
```

---

## Summary

**Most Likely Solution:** You're connected to a guest/secondary WiFi network. Switch to your main WiFi network via the WiFi menu bar icon, and your Mac should get a `192.168.1.x` IP automatically.

**If only one WiFi exists:** Access router at `http://192.168.50.1` or `http://192.168.1.1` and either:
- Reconfigure WiFi to use `192.168.1.x` subnet (preferred)
- Enable inter-subnet routing so both networks can communicate

**Quickest verification:**
```bash
ifconfig en0 | grep "inet " && ping -c 2 192.168.1.110 && echo "SUCCESS: Ready for SSH"
```

Good luck with your homelab build!
