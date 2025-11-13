# Troubleshooting SSH Connection to Proxmox

## Problem Statement

After installing Proxmox VE 8 on Legion Desktop, the system boots successfully and shows the login prompt at the physical console, but SSH connection from Mac fails with:

```
ssh: connect to host 192.168.1.110 port 22: Operation timed out
```

**Expected IP**: 192.168.1.110 (configured during installation)
**Symptom**: Connection timeout (not "connection refused")
**What this means**: Either network isn't configured, IP is different, or there's a firewall issue

---

## Step-by-Step Troubleshooting Guide

Run these commands at the **Proxmox physical console** (you can't SSH yet). Log in as `root` with the password you set during installation.

### Phase 1: Verify Network Configuration

#### Step 1.1: Check Current IP Address

```bash
ip addr show
```

**What to look for:**

```
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536
    inet 127.0.0.1/8 scope host lo

2: enp3s0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500
    inet 192.168.1.110/24 brd 192.168.1.255 scope global enp3s0

3: vmbr0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500
    inet 192.168.1.110/24 brd 192.168.1.255 scope global vmbr0
```

**Decision Tree:**

✅ **If you see `192.168.1.110/24` on vmbr0 or your ethernet interface**: Network is configured correctly, proceed to Step 1.2

❌ **If you see a DIFFERENT IP** (e.g., `192.168.1.50`): Your DHCP server assigned a different IP. Either:
- Use the IP shown to SSH (e.g., `ssh root@192.168.1.50`)
- OR fix the IP to 192.168.1.110 (see [Fix: Wrong IP Address](#fix-wrong-ip-address))

❌ **If you see NO IP on ethernet interface** (only `127.0.0.1` on lo): Network isn't configured. See [Fix: No IP Address](#fix-no-ip-address)

❌ **If interface shows `DOWN`** (no `UP` in the interface line): Interface is disabled. See [Fix: Interface Down](#fix-interface-down)

---

#### Step 1.2: Check Network Interface Status

```bash
ip link show
```

**What to look for:**

```
2: enp3s0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500
    link/ether 00:11:22:33:44:55 brd ff:ff:ff:ff:ff:ff
    state UP mode DEFAULT
```

**Decision Tree:**

✅ **If you see `UP` and `state UP`**: Interface is active, proceed to Step 1.3

❌ **If you see `DOWN` or `NO-CARRIER`**:
- Check ethernet cable is plugged in
- Check switch port is active
- Check cable with another device
- See [Fix: Interface Down](#fix-interface-down)

---

#### Step 1.3: Verify Network Configuration Files

```bash
cat /etc/network/interfaces
```

**Expected output:**

```
auto lo
iface lo inet loopback

iface enp3s0 inet manual

auto vmbr0
iface vmbr0 inet static
    address 192.168.1.110/24
    gateway 192.168.1.1
    bridge-ports enp3s0
    bridge-stp off
    bridge-fd 0
```

**Decision Tree:**

✅ **If config matches above** (with your IP): Configuration is correct, proceed to Step 1.4

❌ **If address is different or missing**: See [Fix: Wrong IP Address](#fix-wrong-ip-address)

❌ **If gateway is wrong**: See [Fix: Wrong Gateway](#fix-wrong-gateway)

---

#### Step 1.4: Test Gateway Connectivity

```bash
ping -c 4 192.168.1.1
```

**Expected output:**

```
PING 192.168.1.1 (192.168.1.1) 56(84) bytes of data.
64 bytes from 192.168.1.1: icmp_seq=1 ttl=64 time=0.5 ms
64 bytes from 192.168.1.1: icmp_seq=2 ttl=64 time=0.4 ms
...
--- 192.168.1.1 ping statistics ---
4 packets transmitted, 4 received, 0% packet loss
```

**Decision Tree:**

✅ **If ping succeeds (0% packet loss)**: Network routing works, proceed to Phase 2

❌ **If "Destination Host Unreachable"**: Gateway is unreachable. Check:
- Is router powered on?
- Is ethernet cable connected?
- Is gateway IP correct? (run `ip route show` to verify)

❌ **If "Network is unreachable"**: No default route configured. See [Fix: Wrong Gateway](#fix-wrong-gateway)

---

### Phase 2: Verify SSH Service

#### Step 2.1: Check SSH Service Status

```bash
systemctl status ssh
```

**Expected output:**

```
● ssh.service - OpenBSD Secure Shell server
     Loaded: loaded (/lib/systemd/system/ssh.service; enabled; preset: enabled)
     Active: active (running) since Mon 2025-01-13 10:00:00 EST; 5min ago
       Docs: man:sshd(8)
             man:sshd_config(5)
   Main PID: 1234 (sshd)
      Tasks: 1 (limit: 38372)
     Memory: 2.5M
        CPU: 50ms
     CGroup: /system.slice/ssh.service
             └─1234 "sshd: /usr/sbin/sshd -D [listener] 0 of 10-100 startups"
```

**Decision Tree:**

✅ **If "Active: active (running)"**: SSH is running, proceed to Step 2.2

⚠️  **If "Active: inactive (dead)" or "disabled"**: SSH service is stopped. See [Fix: SSH Not Running](#fix-ssh-not-running)

❌ **If "Failed" or error messages**: SSH failed to start. Check logs:

```bash
journalctl -xeu ssh.service
```

Common issues:
- Port already in use
- Configuration syntax error
- Missing host keys

---

#### Step 2.2: Verify SSH is Listening on Port 22

```bash
ss -tlnp | grep :22
```

**Expected output:**

```
LISTEN 0      128          0.0.0.0:22         0.0.0.0:*    users:(("sshd",pid=1234,fd=3))
LISTEN 0      128             [::]:22            [::]:*    users:(("sshd",pid=1234,fd=4))
```

**Decision Tree:**

✅ **If you see `:22` entries**: SSH is listening on all interfaces, proceed to Step 2.3

❌ **If NO output**: SSH isn't listening on port 22. See [Fix: SSH Not Listening](#fix-ssh-not-listening)

⚠️  **If listening on `127.0.0.1:22` only**: SSH is only listening on localhost. See [Fix: SSH Localhost Only](#fix-ssh-localhost-only)

---

#### Step 2.3: Test SSH Connection Locally

```bash
ssh root@localhost
```

**Decision Tree:**

✅ **If you get password prompt and can login**: SSH daemon works, issue is network/firewall. Proceed to Phase 3

❌ **If "Connection refused"**: SSH isn't listening properly. See [Fix: SSH Not Listening](#fix-ssh-not-listening)

❌ **If "Permission denied"**: Root login may be disabled. Check:

```bash
grep PermitRootLogin /etc/ssh/sshd_config
```

Should show: `PermitRootLogin yes` (or `prohibit-password`)

---

### Phase 3: Verify Firewall Rules

#### Step 3.1: Check if Firewall is Active

```bash
systemctl status pve-firewall
```

**Expected output:**

```
● pve-firewall.service - Proxmox VE firewall
     Loaded: loaded (/lib/systemd/system/pve-firewall.service; enabled)
     Active: active (running) since ...
```

**Decision Tree:**

✅ **If "Active: active (running)"**: Firewall is enabled, proceed to Step 3.2

⚠️  **If "Active: inactive (dead)"**: Firewall is disabled (good for troubleshooting). Proceed to Phase 4

---

#### Step 3.2: Check Firewall Rules

```bash
iptables -L INPUT -v -n | head -20
```

**What to look for:**

You should see rules allowing SSH (port 22). Look for lines like:

```
ACCEPT     tcp  --  *      *       0.0.0.0/0            0.0.0.0/0            tcp dpt:22
```

**Decision Tree:**

✅ **If you see ACCEPT rule for port 22**: Firewall allows SSH, proceed to Step 3.3

❌ **If you see DROP or REJECT for port 22**: Firewall is blocking SSH. See [Fix: Firewall Blocking SSH](#fix-firewall-blocking-ssh)

---

#### Step 3.3: Temporarily Disable Firewall for Testing

**IMPORTANT**: Only do this for troubleshooting on a trusted local network!

```bash
systemctl stop pve-firewall
```

**Now test SSH from your Mac:**

```bash
# From your Mac terminal
ssh root@192.168.1.110
```

**Decision Tree:**

✅ **If SSH works now**: Firewall was blocking the connection. See [Fix: Firewall Blocking SSH](#fix-firewall-blocking-ssh)

❌ **If SSH still times out**: Firewall isn't the issue. Proceed to Phase 4

**Don't forget to re-enable firewall:**

```bash
systemctl start pve-firewall
```

---

### Phase 4: Verify Network Connectivity from Mac

Run these commands **from your Mac terminal**.

#### Step 4.1: Check Mac Can See the Network

```bash
# From Mac terminal
ping -c 4 192.168.1.1
```

**Decision Tree:**

✅ **If ping succeeds**: Mac can reach router, proceed to Step 4.2

❌ **If "Request timeout" or "No route to host"**: Mac has network issues:
- Check Mac is connected to same network (WiFi or ethernet)
- Check Mac IP is in same subnet (run `ifconfig | grep inet`)
- Check router is functioning

---

#### Step 4.2: Check Mac Can Reach Proxmox

```bash
# From Mac terminal
ping -c 4 192.168.1.110
```

**Expected output:**

```
PING 192.168.1.110 (192.168.1.110): 56 data bytes
64 bytes from 192.168.1.110: icmp_seq=0 ttl=64 time=0.5 ms
64 bytes from 192.168.1.110: icmp_seq=1 ttl=64 time=0.4 ms
...
--- 192.168.1.110 ping statistics ---
4 packets transmitted, 4 received, 0% packet loss
```

**Decision Tree:**

✅ **If ping succeeds**: Mac can reach Proxmox, but SSH port is blocked. See [Fix: SSH Port Blocked](#fix-ssh-port-blocked)

❌ **If "Request timeout"**: Network routing issue between Mac and Proxmox:
- Verify Proxmox IP is correct (Step 1.1)
- Check router firewall/isolation settings (some routers isolate WiFi from ethernet)
- Check both devices are on same subnet

---

#### Step 4.3: Check if SSH Port is Open

```bash
# From Mac terminal
nc -zv 192.168.1.110 22
```

**Expected output:**

```
Connection to 192.168.1.110 port 22 [tcp/ssh] succeeded!
```

**Decision Tree:**

✅ **If "succeeded"**: Port is open, SSH should work. Try SSH again:

```bash
ssh -v root@192.168.1.110
```

The `-v` flag shows verbose output to help diagnose the issue.

❌ **If "Operation timed out"**: Port 22 is filtered/blocked. See [Fix: SSH Port Blocked](#fix-ssh-port-blocked)

❌ **If "Connection refused"**: SSH service isn't listening. Go back to Phase 2

---

## Common Fixes

### Fix: Wrong IP Address

If Proxmox has a different IP than expected:

```bash
# Edit network configuration
nano /etc/network/interfaces

# Find the vmbr0 section and change the address line:
auto vmbr0
iface vmbr0 inet static
    address 192.168.1.110/24    # Change this line
    gateway 192.168.1.1
    bridge-ports enp3s0
    bridge-stp off
    bridge-fd 0

# Save with Ctrl+X, Y, Enter

# Apply changes
ifreload -a

# Verify new IP
ip addr show vmbr0
```

**Alternative: Use the current IP**

If you want to keep the DHCP-assigned IP, just use that IP for SSH:

```bash
# From Mac
ssh root@192.168.1.XX  # Use the IP from Step 1.1
```

---

### Fix: No IP Address

If network interface has no IP assigned:

```bash
# Check if interface is managed by NetworkManager (shouldn't be on Proxmox)
systemctl status NetworkManager

# If it's running, disable it
systemctl stop NetworkManager
systemctl disable NetworkManager

# Restart networking
systemctl restart networking

# Verify IP is assigned
ip addr show
```

If still no IP, manually configure:

```bash
# Edit network config
nano /etc/network/interfaces

# Ensure you have these lines:
auto lo
iface lo inet loopback

iface enp3s0 inet manual

auto vmbr0
iface vmbr0 inet static
    address 192.168.1.110/24
    gateway 192.168.1.1
    bridge-ports enp3s0
    bridge-stp off
    bridge-fd 0

# Save and apply
ifreload -a

# Verify
ip addr show vmbr0
```

---

### Fix: Interface Down

If network interface shows DOWN:

```bash
# Bring interface up
ip link set enp3s0 up
ip link set vmbr0 up

# Verify
ip link show enp3s0
ip link show vmbr0

# Restart networking service
systemctl restart networking

# Check status
ip addr show
```

If interface still won't come up:
- Check ethernet cable is connected
- Try different cable
- Check switch port with another device
- Verify BIOS network settings aren't disabled

---

### Fix: Wrong Gateway

```bash
# Check current gateway
ip route show

# Should show:
# default via 192.168.1.1 dev vmbr0

# If wrong, edit config
nano /etc/network/interfaces

# Fix gateway line in vmbr0 section:
auto vmbr0
iface vmbr0 inet static
    address 192.168.1.110/24
    gateway 192.168.1.1    # Change this to your router IP
    bridge-ports enp3s0
    bridge-stp off
    bridge-fd 0

# Save and apply
ifreload -a

# Verify
ip route show
ping -c 4 192.168.1.1
```

---

### Fix: SSH Not Running

```bash
# Start SSH service
systemctl start ssh

# Enable to start at boot
systemctl enable ssh

# Verify it's running
systemctl status ssh

# Check it's listening
ss -tlnp | grep :22
```

If SSH fails to start, check logs:

```bash
journalctl -xeu ssh.service --no-pager | tail -50
```

Common issues:
- **Missing host keys**: Run `dpkg-reconfigure openssh-server`
- **Port already in use**: Check if another service is using port 22
- **Config syntax error**: Run `sshd -t` to test configuration

---

### Fix: SSH Not Listening

```bash
# Check SSH configuration
nano /etc/ssh/sshd_config

# Ensure these lines are present and NOT commented out:
Port 22
ListenAddress 0.0.0.0
PermitRootLogin yes

# Save changes

# Restart SSH
systemctl restart ssh

# Verify it's listening
ss -tlnp | grep :22

# Should show:
# LISTEN 0 128 0.0.0.0:22 0.0.0.0:*
```

---

### Fix: SSH Localhost Only

If SSH is only listening on 127.0.0.1:

```bash
# Edit SSH config
nano /etc/ssh/sshd_config

# Find this line:
# ListenAddress 127.0.0.1

# Change to:
ListenAddress 0.0.0.0

# Or comment it out with #
# ListenAddress 127.0.0.1

# Save and restart
systemctl restart ssh

# Verify
ss -tlnp | grep :22

# Should now show 0.0.0.0:22 instead of 127.0.0.1:22
```

---

### Fix: Firewall Blocking SSH

```bash
# Check Proxmox datacenter firewall settings
cat /etc/pve/firewall/cluster.fw

# Should contain:
[OPTIONS]
enable: 1

[RULES]
IN ACCEPT -i vmbr0 -source +cluster -p tcp -dport 22

# If missing, add it:
nano /etc/pve/firewall/cluster.fw

# Add this section:
[RULES]
IN ACCEPT -source 0.0.0.0/0 -p tcp -dport 22

# Save and reload firewall
pve-firewall restart

# Verify rule is active
iptables -L INPUT -v -n | grep :22
```

**Alternative: Temporarily disable firewall for trusted network**

```bash
# Disable datacenter firewall
pvesh set /cluster/firewall/options --enable 0

# Or disable for specific node
pvesh set /nodes/$(hostname)/firewall/options --enable 0

# Test SSH connection from Mac
# Once working, re-enable with proper rules
```

---

### Fix: SSH Port Blocked

If ping works but SSH times out:

#### On Proxmox Console:

```bash
# Verify SSH is listening
ss -tlnp | grep :22

# Should show:
# LISTEN 0 128 0.0.0.0:22 0.0.0.0:*

# Check firewall isn't blocking
iptables -L INPUT -v -n | grep :22

# Should show ACCEPT rule, not DROP or REJECT

# Temporarily allow all traffic for testing
iptables -I INPUT -p tcp --dport 22 -j ACCEPT

# Test SSH from Mac
# If it works, issue is firewall rules
```

#### Router/Network Issues:

Some routers have security features that can block SSH:
- AP Isolation (isolates WiFi clients from ethernet devices)
- Port filtering
- MAC address filtering

**To test:**
1. Connect Mac to ethernet cable instead of WiFi
2. Or connect Proxmox to WiFi (if possible) temporarily
3. Check router firewall/security settings

---

## Verification Checklist

Once you get SSH working, verify everything is correct:

```bash
# From Proxmox console
ip addr show                    # Verify IP is 192.168.1.110
ip route show                   # Verify gateway is 192.168.1.1
systemctl status ssh            # Verify SSH is active (running)
ss -tlnp | grep :22             # Verify SSH listening on 0.0.0.0:22
iptables -L INPUT -v -n | grep :22  # Verify firewall allows SSH

# From Mac
ping -c 4 192.168.1.110         # Should succeed
nc -zv 192.168.1.110 22         # Should show "succeeded"
ssh root@192.168.1.110          # Should get password prompt
```

---

## After SSH is Working

Once you successfully SSH into Proxmox, complete the post-installation configuration:

```bash
# SSH from Mac
ssh root@192.168.1.110

# Disable enterprise repository (requires subscription)
sed -i 's/^deb/#deb/' /etc/apt/sources.list.d/pve-enterprise.list

# Add no-subscription repository
echo "deb http://download.proxmox.com/debian/pve bookworm pve-no-subscription" > /etc/apt/sources.list.d/pve-no-subscription.list

# Update package list
apt update

# Upgrade system
apt full-upgrade -y

# Install useful tools
apt install -y vim htop ncdu lsscsi smartmontools zfs-auto-snapshot

# Update /etc/hosts for proper hostname resolution
echo "192.168.1.110 legion-proxmox.local legion-proxmox" >> /etc/hosts

# Reboot to apply kernel updates
reboot
```

Wait 2 minutes, then SSH back in to continue with the guide.

---

## Windows Product Key Recovery

If you forgot to export your Windows product key before wiping:

### Method 1: Check if Key is in UEFI/BIOS

Most modern laptops and pre-built desktops have the Windows key embedded in UEFI firmware. This survives OS reinstalls.

**After installing Windows 11 in the VM:**

1. **Open PowerShell as Administrator** in Windows VM
2. **Run this command:**

```powershell
wmic path softwarelicensingservice get OA3xOriginalProductKey
```

**If you see a product key (format: XXXXX-XXXXX-XXXXX-XXXXX-XXXXX):**
- This is your embedded OEM key
- Windows should auto-activate once it connects to the internet
- No further action needed

**If it returns blank:**
- Key is not embedded in UEFI
- Proceed to Method 2

---

### Method 2: Check Old Windows Installation Files

If you still have the old Windows installation on an external backup:

**Option A: If you backed up the C: drive before wiping:**

1. **Boot from Windows 11 install USB**
2. **Press Shift+F10** to open Command Prompt
3. **Mount the backup drive** (will appear as D:, E:, etc.)
4. **Run:**

```cmd
reg load HKLM\LEGACY "D:\Windows\System32\config\SOFTWARE"
reg query "HKLM\LEGACY\Microsoft\Windows NT\CurrentVersion" /v DigitalProductId
reg unload HKLM\LEGACY
```

This shows the binary product key data. You'll need a tool to decode it.

**Option B: Use ProduKey (if you have old Windows files):**

1. Download ProduKey from NirSoft: https://www.nirsoft.net/utils/product_cd_key_viewer.html
2. Run on a Windows machine
3. File → Select Source → Load product keys from external Windows directory
4. Browse to your backup's Windows folder
5. View the Windows product key

---

### Method 3: Microsoft Account Linked License

If your Windows 11 was linked to a Microsoft account:

1. **Install Windows 11 in VM without entering product key**
2. **Complete setup and connect to internet**
3. **Sign in with the SAME Microsoft account** you used on the original installation
4. **Windows should auto-activate** within 24 hours

To verify:

```
Settings → System → Activation
```

Should show: "Windows is activated with a digital license linked to your Microsoft account"

---

### Method 4: Check Original Purchase Documentation

If you bought the Legion Desktop:
- Check order confirmation email (digital licenses)
- Check physical product key sticker (OEM machines)
- Contact Lenovo support with serial number (may retrieve OEM key)

---

### Method 5: Buy New Windows 11 License

If all else fails:

**Official Microsoft:**
- Windows 11 Home: $139
- Windows 11 Pro: $199
- Buy from: microsoft.com/store

**Retail License Keys (cheaper alternatives):**
- Kinguin, G2A, CDKeys: $20-50 (OEM keys - legally gray area)
- eBay: $5-20 (volume license keys - often against TOS)

**Free Alternatives:**
- **Windows 11 without activation**: Fully functional except:
  - Watermark on desktop
  - Can't personalize themes/wallpapers
  - Some settings grayed out
  - No functional limitations for gaming/apps

- **Linux gaming**: Consider dual-booting with Pop!_OS or Nobara (gaming-optimized Linux)

---

### Best Practice for Future

**Before wiping any Windows installation:**

1. **Export product key:**
   ```powershell
   wmic path softwarelicensingservice get OA3xOriginalProductKey > C:\windows-key.txt
   ```

2. **Link to Microsoft account:**
   - Settings → Accounts → Your info
   - Sign in with Microsoft account
   - Settings → Update & Security → Activation
   - Verify "Linked to your Microsoft account"

3. **Take screenshot of activation page:**
   - Settings → System → Activation
   - Screenshot showing activation status

4. **Document in your homelab notes:**
   - Store in password manager
   - Save in CLAUDE.md or separate docs
   - Print and store physically

---

## Quick Diagnostic Script

Save this as `/root/diagnose-ssh.sh` for future troubleshooting:

```bash
#!/bin/bash
# Proxmox SSH Diagnostic Script

echo "=== Proxmox SSH Diagnostics ==="
echo ""

echo "1. Network Configuration:"
ip addr show | grep -A 5 vmbr0
echo ""

echo "2. Default Route:"
ip route show | grep default
echo ""

echo "3. SSH Service Status:"
systemctl is-active ssh
echo ""

echo "4. SSH Listening Ports:"
ss -tlnp | grep :22
echo ""

echo "5. Firewall Status:"
systemctl is-active pve-firewall
echo ""

echo "6. Firewall Rules for SSH:"
iptables -L INPUT -v -n | grep :22
echo ""

echo "7. Gateway Connectivity:"
ping -c 2 192.168.1.1 >/dev/null 2>&1 && echo "Gateway reachable" || echo "Gateway NOT reachable"
echo ""

echo "8. DNS Resolution:"
ping -c 1 google.com >/dev/null 2>&1 && echo "DNS working" || echo "DNS NOT working"
echo ""

echo "=== End Diagnostics ==="
```

**Make it executable and run:**

```bash
chmod +x /root/diagnose-ssh.sh
/root/diagnose-ssh.sh
```

---

## Summary

**Most common SSH issues on fresh Proxmox install:**

1. **Wrong IP address** (DHCP assigned different IP than expected)
   - Solution: Use the actual IP or reconfigure static IP

2. **Network interface not up** (cable unplugged, switch port issue)
   - Solution: Check physical connections, bring interface up

3. **SSH service not started** (rare on Proxmox, but possible)
   - Solution: `systemctl start ssh && systemctl enable ssh`

4. **Firewall blocking connection** (Proxmox firewall or router)
   - Solution: Configure firewall rules to allow SSH

5. **Router isolation** (WiFi isolated from ethernet)
   - Solution: Connect Mac to ethernet or disable AP isolation

**Follow this guide step-by-step** and you'll identify the exact issue. Most problems are resolved in Phase 1 (network configuration) or Phase 3 (firewall).

**Once SSH works**, continue with the Phase 1 guide at the "Post-Installation Configuration" section.

Good luck! 🚀
