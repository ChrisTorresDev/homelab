# Proxmox Login Troubleshooting and Password Reset Guide

**Situation**: Proxmox VE 8 boots successfully but login fails at the console with the root password you set during installation.

**Goal**: Regain access to your Legion Desktop Proxmox host (192.168.50.110) as quickly as possible.

---

## Phase 1: Quick Checks (Try These First - 2 Minutes)

Before resetting anything, try these common issues:

### 1.1 Keyboard Indicator Lights

**Check RIGHT NOW before typing anything:**

1. **Caps Lock**: Is the Caps Lock LED lit on your keyboard?
   - If YES: Press Caps Lock once, then try logging in
   - Passwords are case-sensitive (Password123 ≠ password123)

2. **Num Lock**: Is Num Lock enabled on your Legion keyboard?
   - If YES and your password contains numbers: Try toggling Num Lock off
   - On some keyboards, Num Lock affects the number row keys

### 1.2 Keyboard Layout Test

**Test what keys are actually typing:**

At the login prompt, type in the **username field** (not password field where you can't see):
```
qwertyuiop[]
asdfghjkl;'
zxcvbnm,./
1234567890
```

**What to look for:**
- Does typing produce what you expect?
- Are you getting `qwertz` instead of `qwerty`? (German layout)
- Are brackets and special characters in different positions?
- Are numbers typing correctly?

**If keyboard layout is wrong:**
- You may have selected the wrong keyboard layout during Proxmox installation
- Your password was stored as typed with THAT layout
- Try typing your password as it would appear on the layout you selected during installation

### 1.3 Common Password Variations to Try

Try these variations of your password:

1. **All lowercase version** (in case Caps Lock was on during setup)
2. **All UPPERCASE version**
3. **Without special characters** (if you think they might be mapped differently)
4. **Retyping very slowly** (one character at a time, watching for any issues)

**If using special characters in your password:**
- `@` symbol location varies by keyboard layout
- Brackets `[]{}` locations vary significantly
- Quotes `"'` can be different positions

---

## Phase 2: Single User Mode Password Reset (Fastest Recovery - 5 Minutes)

This is the **preferred method** if Phase 1 didn't work. You'll boot into recovery mode and reset the root password.

### 2.1 Boot into Proxmox Boot Menu

1. **Reboot the Legion desktop**
   - Press the reset button or hold power button until it shuts down
   - Power it back on

2. **Immediately after POST** (when you see the Lenovo logo):
   - **Press and hold the SHIFT key** (for GRUB menu on UEFI systems)
   - OR **press ESC repeatedly** (older GRUB versions)
   - You should see the **GRUB boot menu** with Proxmox kernel entries

**What you should see:**
```
                    GNU GRUB version 2.06

 *Proxmox VE GNU/Linux
  Advanced options for Proxmox VE GNU/Linux
  UEFI Firmware Settings
```

3. **Select "Advanced options for Proxmox VE GNU/Linux"**
   - Use arrow keys to highlight this option
   - Press ENTER

4. **You'll see a submenu like:**
```
  Proxmox VE GNU/Linux, with Linux 6.X.X-X-pve
 *Proxmox VE GNU/Linux, with Linux 6.X.X-X-pve (recovery mode)
```

5. **Select the "recovery mode" entry**
   - Use arrow keys to highlight it
   - Press ENTER

### 2.2 Get Root Access in Recovery Mode

**After selecting recovery mode, you may see several options:**

```
Recovery Menu:
  resume    Resume normal boot
  clean     Try to make free space
  dpkg      Repair broken packages
  fsck      File system check
  grub      Update grub bootloader
  network   Enable networking
  root      Drop to root shell prompt
  system-summary  System summary
```

**Select "root - Drop to root shell prompt"** and press ENTER.

**Alternative scenario - Direct shell access:**
If you boot directly into a root shell without a menu, you'll see:
```
Give root password for maintenance
(or press Control-D to continue):
```

**Press Ctrl+D** to skip password (this often works in single-user mode).

### 2.3 Remount Filesystem as Read-Write

You should now have a root shell prompt. The filesystem is mounted read-only by default in recovery mode.

**Run this command:**
```bash
mount -o remount,rw /
```

**Verify it worked:**
```bash
mount | grep "on / "
```

**You should see:**
```
/dev/mapper/pve-root on / type ext4 (rw,relatime,errors=remount-ro)
```

Look for `(rw` which means read-write.

### 2.4 Reset Root Password

**Now change the root password:**
```bash
passwd root
```

**You'll see:**
```
New password:
Retype new password:
```

**IMPORTANT - Choose a simple temporary password for now:**
- Use only lowercase letters and numbers
- Example: `temppass123` or `proxmox2025`
- NO special characters that could cause keyboard layout issues
- You'll change this to a secure password later from the web UI

**Success message:**
```
passwd: password updated successfully
```

### 2.5 Reboot and Test

**Reboot the system:**
```bash
reboot -f
```

**OR if that doesn't work:**
```bash
sync
echo b > /proc/sysrq-trigger
```

**When the login prompt appears:**
- Username: `root`
- Password: `temppass123` (or whatever you just set)

**You should now be logged in!**

---

## Phase 3: Verify Access and Set Secure Password

### 3.1 Test Console Access

Once logged in at the console, verify basic functionality:

```bash
# Check hostname
hostname

# Check IP address
ip addr show

# Check Proxmox version
pveversion
```

**Expected output:**
```
pve
inet 192.168.50.110/24 brd 192.168.50.255 scope global vmbr0
pve-manager/8.X.X/XXXXXXX (running kernel: 6.X.X-X-pve)
```

### 3.2 Access Web Interface

From your main computer (not the Legion):

1. Open a web browser
2. Navigate to: `https://192.168.50.110:8006`
3. Accept the self-signed certificate warning
4. Login with:
   - **Username**: `root`
   - **Realm**: `Linux PAM standard authentication`
   - **Password**: `temppass123` (your temporary password)

**If you can't access the web interface:**
```bash
# Check if pveproxy is running
systemctl status pveproxy

# Check firewall status
iptables -L -n

# Check if web service is listening
ss -tlnp | grep 8006
```

### 3.3 Set a Secure Password (Web UI Method)

Now that you're in the web UI, set a proper secure password:

1. Click on **Datacenter** in the left sidebar
2. Expand **Datacenter** → **Permissions** → **Users**
3. Select `root@pam`
4. Click **Password** button at the top
5. Set your new secure password
6. Click **OK**

**Best practices for your new password:**
- 16+ characters
- Mix of uppercase, lowercase, numbers
- Avoid ambiguous special characters until you verify keyboard layout
- Test immediately by logging out and back in

### 3.4 Test New Password at Console

**Don't close the web UI yet!** First test at the physical console:

1. Go back to the Legion desktop
2. Press `Ctrl+Alt+F2` to switch to a different TTY
3. Try logging in with root and your new password
4. If it works: `exit` and press `Ctrl+Alt+F1` to return
5. If it fails: Go back to web UI and reset again (try simpler password)

### 3.5 Fix Keyboard Layout (If That Was the Issue)

If you discovered the keyboard layout was wrong, fix it:

**In Proxmox console:**
```bash
# Check current keyboard layout
localectl status

# List available layouts
localectl list-keymaps | grep -i us    # For US layouts
localectl list-keymaps | grep -i gb    # For UK layouts

# Set keyboard layout (example for US)
localectl set-keymap us

# For interactive configuration
dpkg-reconfigure keyboard-configuration
```

**Reboot to ensure it persists:**
```bash
reboot
```

---

## Phase 4: Live USB Password Reset (If Recovery Mode Fails)

Use this method if you **cannot access single-user/recovery mode** or if it asks for a password you don't have.

### 4.1 Prepare Proxmox USB Installer

**You'll need:**
- The same Proxmox VE 8 USB installer you used for installation
- Keep it plugged into the Legion desktop

### 4.2 Boot from USB

1. **Insert Proxmox USB installer** into Legion
2. **Reboot** and press **F12** repeatedly (Lenovo boot menu key)
3. **Select your USB drive** from the boot menu
4. **When Proxmox installer starts**, you'll see boot options:
   - Install Proxmox VE (Graphical)
   - Install Proxmox VE (Terminal UI)
   - **Advanced Options**
   - ...

5. **Select "Advanced Options"**
6. **Select "Rescue Boot"** or similar option

**Alternative if no rescue option:**
Select the standard installer, but **don't click Install** - we'll drop to a shell.

### 4.3 Access Console/Shell

**If using installer environment:**

Press `Ctrl+Alt+F2` or `Ctrl+Alt+F3` to switch to a console TTY.

You should get a root shell prompt in the live environment.

### 4.4 Mount Your Installed System

**Find your root partition:**
```bash
lsblk
```

**Expected output (your NVMe drive):**
```
NAME               MAJ:MIN RM   SIZE RO TYPE MOUNTPOINT
nvme0n1            259:0    0   512G  0 disk
├─nvme0n1p1        259:1    0  1007K  0 part
├─nvme0n1p2        259:2    0   512M  0 part
└─nvme0n1p3        259:3    0 511.5G  0 part
  ├─pve-swap       253:0    0     8G  0 lvm
  ├─pve-root       253:1    0    96G  0 lvm
  ├─pve-data_tmeta 253:2    0     4G  0 lvm
  └─pve-data_tdata 253:3    0   403G  0 lvm
```

**Your root filesystem is `pve-root` - mount it:**
```bash
# Create mount point
mkdir -p /mnt/pve

# Mount the root LVM volume
mount /dev/pve/root /mnt/pve

# Verify it mounted
ls /mnt/pve
```

**You should see:**
```
bin  boot  dev  etc  home  lib  media  mnt  opt  proc  root  run  sbin  srv  sys  tmp  usr  var
```

### 4.5 Chroot into Installed System

**Mount necessary filesystems and chroot:**
```bash
# Mount additional filesystems needed for chroot
mount --bind /dev /mnt/pve/dev
mount --bind /proc /mnt/pve/proc
mount --bind /sys /mnt/pve/sys

# Chroot into your installed system
chroot /mnt/pve
```

**Your prompt should change to show you're in the chroot environment.**

### 4.6 Reset Password

**Now you're inside your installed system, reset root password:**
```bash
passwd root
```

**Set a simple temporary password:**
- Example: `temppass123`
- No special characters
- You'll change it later from web UI

### 4.7 Exit and Reboot

**Exit the chroot and unmount:**
```bash
# Exit chroot
exit

# Unmount filesystems
umount /mnt/pve/sys
umount /mnt/pve/proc
umount /mnt/pve/dev
umount /mnt/pve

# Reboot
reboot
```

**Remove the USB drive when system reboots.**

**At the login prompt:**
- Username: `root`
- Password: `temppass123`

**You should now be logged in!** Proceed to Phase 3 to set a secure password.

---

## Phase 5: Complete Reinstall (Last Resort)

Consider reinstallation only if:
- All password reset methods failed
- You suspect system corruption
- Installation was incomplete
- You haven't configured anything yet (fresh install)

### 5.1 When to Reinstall vs. Recover

**Reinstall if:**
- You literally just installed Proxmox (< 1 hour ago)
- No VMs or containers created yet
- No ZFS pools configured yet
- Faster than troubleshooting (15 minutes vs. potential hours)

**Keep trying recovery if:**
- You've already configured VMs, containers, or storage
- ZFS pools are already created
- You've invested significant setup time
- Data would be lost

### 5.2 Avoiding the Same Issue

**During reinstallation:**

1. **At keyboard layout screen**:
   - Select **US English** (or your actual keyboard layout)
   - **Test the layout** by typing in any available text field
   - Verify special characters: `@#$%[]{}()`

2. **At password setup screen**:
   - Use a **temporary simple password** for installation
   - Example: `proxmox2025` (all lowercase, no special characters)
   - You'll change this to a secure password from the web UI later

3. **Immediately after first boot**:
   - Login at console with simple password
   - Access web UI at `https://192.168.50.110:8006`
   - Change to secure password from web UI
   - Test new password at console before proceeding

---

## Troubleshooting Decision Tree

```
Cannot login to Proxmox console
│
├─→ Phase 1: Quick Checks (2 min)
│   ├─→ Caps Lock? → Toggle and retry
│   ├─→ Num Lock? → Toggle and retry
│   ├─→ Keyboard layout test → Try typing password as it would appear on different layout
│   └─→ If still fails → Go to Phase 2
│
├─→ Phase 2: Single User Mode Reset (5 min) ← PREFERRED METHOD
│   ├─→ Can access GRUB menu?
│   │   ├─→ YES → Boot recovery mode → Reset password → SUCCESS
│   │   └─→ NO → Go to Phase 4
│   └─→ Recovery asks for password?
│       ├─→ YES → Go to Phase 4
│       └─→ NO → Press Ctrl+D → Reset password → SUCCESS
│
├─→ Phase 4: Live USB Reset (15 min)
│   ├─→ Boot from USB installer
│   ├─→ Access rescue mode or drop to shell
│   ├─→ Mount installed system
│   ├─→ Chroot and reset password
│   └─→ Reboot → SUCCESS
│
└─→ Phase 5: Reinstall (15 min)
    └─→ Only if fresh install (<1 hour old) OR all methods failed
```

---

## Prevention Tips for Future

### 1. Password Best Practices During Installation

**During Proxmox installation:**
- Use a **simple temporary password**: `proxmox2025` or `temppass123`
- Avoid special characters during installation
- Use only lowercase letters and numbers
- Change to secure password AFTER verifying console and web access

### 2. Always Test Immediately

**Right after installation completes:**
1. Login at physical console first
2. Access web UI from another computer
3. Login to web UI
4. THEN set your secure password from web UI
5. Test secure password at console before proceeding

### 3. Document Your Setup

**In this homelab repo, create `/Users/2021m1pro/my-projects/homelab/credentials.md`:**
```markdown
# Homelab Credentials (DO NOT COMMIT TO PUBLIC REPOS)

## Proxmox VE (Legion - 192.168.50.110)
- Username: root
- Password: [your secure password]
- Web UI: https://192.168.50.110:8006
- Keyboard layout: US English

## Recovery Information
- Root password last changed: 2025-11-13
- Temporary recovery password: temppass123
```

Add to `.gitignore`:
```
credentials.md
secrets/
*.key
*.pem
```

### 4. Keyboard Layout Configuration

**After first successful login, configure keyboard properly:**
```bash
# Set keyboard layout permanently
localectl set-keymap us

# For interactive configuration
dpkg-reconfigure keyboard-configuration

# Verify current setting
localectl status
```

---

## Quick Reference Commands

### Password Reset (Recovery Mode)
```bash
mount -o remount,rw /
passwd root
reboot -f
```

### Password Reset (Live USB Chroot)
```bash
lsblk
mount /dev/pve/root /mnt/pve
mount --bind /dev /mnt/pve/dev
mount --bind /proc /mnt/pve/proc
mount --bind /sys /mnt/pve/sys
chroot /mnt/pve
passwd root
exit
umount /mnt/pve/sys /mnt/pve/proc /mnt/pve/dev /mnt/pve
reboot
```

### Check Keyboard Layout
```bash
localectl status
localectl set-keymap us
dpkg-reconfigure keyboard-configuration
```

### Access Proxmox Web UI
```
URL: https://192.168.50.110:8006
Username: root
Realm: Linux PAM standard authentication
Password: [your password]
```

---

## Success Criteria

You'll know you've successfully recovered when:

- You can login at the physical console with username `root`
- You can access the web UI at `https://192.168.50.110:8006`
- Web UI login works with the same credentials
- You can change the password from web UI
- New password works at both console and web UI
- You can proceed with Phase 1 of the homelab guide

---

## Next Steps After Recovery

Once you've regained access:

1. **Set a secure password** from the web UI (Phase 3.3)
2. **Test console access** with new password (Phase 3.4)
3. **Update the system**:
   ```bash
   apt update
   apt full-upgrade
   ```
4. **Continue with Phase 1** of `/Users/2021m1pro/my-projects/homelab/your_hardware_homelab.md`
5. **Configure ZFS pools** (fastpool and bulkpool)
6. **Create Windows 11 VM** with GPU passthrough
7. **Create Infra LXC container** for Docker services

---

## Additional Help

If all methods fail and you're still locked out:

1. **Check Proxmox forums**: https://forum.proxmox.com/
2. **Search for**: "proxmox reset root password recovery mode"
3. **Reddit r/Proxmox**: Community members often help with access issues
4. **Proxmox documentation**: https://pve.proxmox.com/pve-docs/

**DO NOT** attempt to:
- Modify GRUB configuration without understanding it
- Delete LVM volumes to "start fresh"
- Force filesystem checks without knowing the implications
- Reinstall if you have data/VMs already configured

**Document what worked** so you can help others and remember for next time!
