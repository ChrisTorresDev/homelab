# Phase 1 Simplified Build Guide: Start Now with Limited Hardware

## Overview

This guide is designed for starting your Legion homelab build **immediately** with only the hardware you currently have, while maintaining a clear path to migrate to the full redundant setup when enclosures and additional drives arrive.

**Current Hardware Constraints:**
- Lenovo Legion Desktop (32GB RAM, Intel chipset with VT-d, GTX 1060 6GB)
- 512GB NVMe SSD (~477GB actual capacity)
- **2x 1TB HDDs** (Seagate ST1000DM003 + WD WD10EZEX)
  - **Note**: Originally had 3TB HDD but removed due to broken SATA port
- **Limited SATA ports** - no more internal expansion without PCIe card
- **NO external enclosures** for at least a month
- **NO additional SSDs or HDDs** yet

**What You'll Achieve:**
- Proxmox VE 8 running on Legion with GPU passthrough
- Windows 11 gaming VM with near-native performance
- Basic infrastructure LXC container for Docker services
- Functional homelab that can be expanded later without rebuilding

---

## Table of Contents
1. [Storage Strategy Decision](#storage-strategy-decision)
2. [Pre-Installation: Backing Up Your Data](#pre-installation-backing-up-your-data)
3. [Proxmox Installation](#proxmox-installation)
4. [ZFS Pool Configuration](#zfs-pool-configuration)
5. [GPU Passthrough Setup](#gpu-passthrough-setup)
6. [Windows 11 VM Creation](#windows-11-vm-creation)
7. [Basic Infrastructure Container](#basic-infrastructure-container)
8. [Understanding Your Limitations](#understanding-your-limitations)
9. [Migration Plan: Path to Full Setup](#migration-plan-path-to-full-setup)

---

## Storage Strategy Decision

### Recommended Approach: ZFS Mirror for Data Protection

**IMPORTANT UPDATE**: You only have **2x 1TB HDDs** available (3TB drive removed due to broken SATA port).

After evaluating all options, here's the **recommended storage topology** for your current hardware:

```
┌─────────────────────────────────────────────────────────┐
│ Legion Desktop - Proxmox VE                             │
├─────────────────────────────────────────────────────────┤
│ NVMe (512GB) - Single disk, no redundancy               │
│   • Proxmox system (root via local-lvm)                 │
│   • Windows 11 VM disk (~240GB)                         │
│   • Infrastructure LXC rootfs (~20GB)                   │
│   • Docker volumes (~50GB)                              │
│   • Free space buffer (~150GB)                          │
├─────────────────────────────────────────────────────────┤
│ bulkpool (2x 1TB HDDs) - MIRROR (RECOMMENDED)           │
│   • Media files (movies, TV, music)                     │
│   • Nextcloud data                                      │
│   • Docker volume backups                               │
│   • Configuration backups                               │
│   • Total usable: ~1TB with single-drive protection     │
│                                                          │
│ Alternative: Striped (NOT RECOMMENDED)                  │
│   • Total usable: ~2TB with ZERO redundancy             │
│   • Losing either drive = lose ALL data                 │
└─────────────────────────────────────────────────────────┘
```

### Why ZFS Mirror is Recommended?

**Pros:**
- **Data protection**: Survives single drive failure with zero data loss
- **Better read performance**: ZFS reads from both drives simultaneously
- **Peace of mind**: Your media library and configs are protected
- **Safer testing**: Learn ZFS without risking catastrophic data loss
- **Easy expansion**: When external drives arrive, migrate to RAIDZ1

**Cons:**
- **50% capacity**: Only 1TB usable instead of 2TB
- **Slower writes**: Mirror writes to both drives (minimal impact for HDDs)

**Why Mirror Over Stripe?**

With only 2 drives, you have two choices:
1. **Mirror (RECOMMENDED)**: 1TB usable, survives 1 drive failure
2. **Stripe (RISKY)**: 2TB usable, losing EITHER drive loses ALL data

Unless you absolutely need 2TB and can accept total data loss risk, **mirror is the safer choice** until external storage arrives.

### Risk Mitigation Strategy

**With ZFS Mirror on HDDs**: You have protection against single drive failure for bulk data.
**NVMe still has no redundancy**: Critical VMs and containers need backup protection.

Here's how to protect yourself:

1. **Critical Data Protection**:
   - Keep your important Windows files in Nextcloud (synced to cloud)
   - Use Windows 11's File History to an external USB drive (weekly)
   - Export Proxmox configs weekly to bulkpool/backups
   - ZFS snapshots protect against accidental deletion on bulkpool

2. **Backup Workflow**:
   - External USB drive for monthly VM backups (manual exports)
   - Configuration files in a Git repository or Nextcloud
   - Media files are protected by ZFS mirror (can survive 1 HDD failure)
   - Critical documents synced to cloud storage (Backblaze, Google Drive, etc.)

3. **When to Stop Adding Data**:
   - Stop adding media when bulkpool reaches 80% full (~800GB used if mirrored)
   - Keep 20% free on NVMe at all times (~100GB buffer)
   - With 1TB mirrored, plan external storage when you hit 700-800GB used

---

## Pre-Installation: Backing Up Your Data

### Step 1: Inventory Your Current Data

```bash
# On your current Windows 11 installation, check what you have:
# - Desktop, Documents, Pictures, Videos, Downloads
# - Installed applications (list what you need to reinstall)
# - Game saves (Steam Cloud, manual backups)
# - Browser bookmarks and passwords (export from browser)
```

### Step 2: Backup Your HDD Data

Assuming your 1TB and 3TB drives have data:

**Option A: Temporary Backup to External Drive**
```bash
# If you have ANY external USB drive available:
# 1. Connect external drive to Windows
# 2. Copy all important data from 1TB and 3TB to external
# 3. This data will be copied back after Proxmox installation
```

**Option B: Accept Data Loss on HDDs**
- If the HDDs contain only media files that you can re-download, you can skip this
- **WARNING**: All data on these drives will be ERASED during ZFS pool creation

### Step 3: Create a Windows 11 Recovery USB

You'll be reinstalling Windows 11 as a VM, so you need the ISO:

**Download Windows 11 ISO:**
```bash
# From Microsoft's official site:
# https://www.microsoft.com/software-download/windows11

# Create a bootable USB with:
# - Ventoy (recommended - can hold multiple ISOs)
# - Rufus
# - Balena Etcher

# You'll need:
# - Windows 11 ISO (~6GB)
# - Proxmox VE 8.2 ISO (~1.5GB)
# - VirtIO drivers ISO (~600MB)
```

### Step 4: Export Critical Windows Data

**Critical Items to Backup:**
1. **Documents & Files**: Copy to external USB or cloud storage
2. **Browser Data**: Export bookmarks, passwords (LastPass/1Password/Chrome sync)
3. **Game Saves**:
   - Steam: `C:\Program Files (x86)\Steam\userdata`
   - GOG: `C:\Users\<username>\Documents\<game-name>`
   - Epic: Usually syncs automatically
4. **Application Settings**: Export configs for applications you use daily
5. **Activation Keys**: Note Windows 11 license key, other software licenses

**Export Windows Product Key:**
```powershell
# Run in PowerShell as Administrator:
wmic path softwarelicensingservice get OA3xOriginalProductKey

# Or use a tool like ProduKey to view all installed software keys
# Save this information securely - you'll need it for the VM
```

### Step 5: Create Installation Media

**You'll Need:**
1. **Proxmox VE 8.2 ISO** - Download from https://proxmox.com/downloads
2. **Bootable USB** - Use Ventoy or Balena Etcher
3. **VirtIO Drivers** - Download from https://fedorapeople.org/groups/virt/virtio-win/direct-downloads/stable-virtio/virtio-win.iso

---

## Proxmox Installation

### BIOS Configuration

Before installation, configure your Legion BIOS:

1. **Press F2 or Del** during boot to enter BIOS
2. **Enable these settings:**
   - Intel VT-x (Virtualization Technology)
   - Intel VT-d (IOMMU/I/O Virtualization)
   - SR-IOV (if available)
   - Above 4G Decoding (critical for GPU passthrough)
3. **Disable these settings:**
   - Secure Boot (required for Proxmox)
   - Fast Boot
   - CSM/Legacy Boot (use UEFI only)
4. **Save and Exit**

### Installation Steps

1. **Boot from USB**: Press F12 during boot, select your Proxmox USB
2. **Select "Install Proxmox VE"**
3. **Target Disk**: Select your **512GB NVMe SSD**
4. **Filesystem Options**:
   - Filesystem: **ext4** (NOT ZFS - we'll create ZFS pools manually)
   - Click "Options" and verify:
     - `hdsize`: Leave default (use full disk)
     - `swapsize`: 8GB (adjust if needed)
     - `maxroot`: Leave default
     - `minfree`: 16GB (emergency space)

**Why ext4 instead of ZFS for root?**
- We'll manually create ZFS pools later with more control
- ext4 uses less RAM (ZFS ARC can consume 50% of RAM)
- Easier to troubleshoot for beginners
- You can still use ZFS for data pools

5. **Location and Time Zone**: Select your country and timezone
6. **Administration Password**: Choose a STRONG password
7. **Network Configuration**:
   - Management Interface: Select your Ethernet adapter
   - Hostname: `legion-proxmox.local`
   - IP Address: `192.168.50.110/24`
   - Gateway: `192.168.50.1` (your router IP)
   - DNS Server: `192.168.50.1` or `1.1.1.1`

8. **Confirm and Install**: Review settings and click "Install"

**Installation takes 5-10 minutes**

9. **Remove USB and Reboot**

### Post-Installation Configuration

After reboot, Proxmox is accessible at: `https://192.168.50.110:8006`

**From another computer**, open a web browser and log in:
- Username: `root`
- Password: (the password you set during install)

**Initial Setup Tasks:**

```bash
# SSH into Proxmox from your workstation:
ssh root@192.168.50.110

# Update package repositories (disable enterprise repo)
sed -i 's/^deb/#deb/' /etc/apt/sources.list.d/pve-enterprise.list
echo "deb http://download.proxmox.com/debian/pve bookworm pve-no-subscription" > /etc/apt/sources.list.d/pve-no-subscription.list

# Update system
apt update && apt full-upgrade -y

# Install useful tools
apt install -y vim htop ncdu lsscsi smartmontools zfs-auto-snapshot

# Update /etc/hosts for proper hostname resolution
echo "192.168.50.110 legion-proxmox.local legion-proxmox" >> /etc/hosts

# Reboot to apply kernel updates
reboot
```

Wait 2 minutes, then SSH back in to continue.

---

## ZFS Pool Configuration

### Understanding Your Disk Layout

First, identify your disks:

```bash
# List all block devices
lsblk -o NAME,SIZE,MODEL,SERIAL,TYPE

# Example output:
# NAME        SIZE MODEL              SERIAL          TYPE
# nvme0n1     512G Samsung_SSD_980    S12345          disk
# ├─nvme0n1p1   1G                                    part  # EFI
# ├─nvme0n1p2   1G                                    part  # BIOS boot
# └─nvme0n1p3 510G                                    part  # Root filesystem
# sda           1T WDC_WD10EZEX       WD-12345        disk
# sdb           3T Seagate_ST3000DM   Z1234567        disk

# List disk IDs (these are stable across reboots)
ls -l /dev/disk/by-id/ | grep -v part | grep -E '(ata|nvme)'
```

### Create the Data Pool (Mirrored 2x 1TB)

**RECOMMENDED**: This is a **mirrored pool with single-drive redundancy**. If one drive fails, your data survives.

```bash
# First, verify your disk IDs
lsblk -o NAME,SIZE,MODEL,SERIAL

# Expected output:
# NAME        SIZE MODEL              SERIAL          TYPE
# nvme0n1     477G KIOXIA...           ...             disk
# sda         932G Seagate_ST1000DM003  ...            disk
# sdb         932G WDC_WD10EZEX         ...            disk

# List disk IDs (stable identifiers)
ls -l /dev/disk/by-id/ | grep -v part | grep ata

# Identify your two 1TB drives
DISK_1TB_A=$(ls -l /dev/disk/by-id/ | grep 'ata-ST1000DM003' | grep -v part | awk '{print $9}' | head -1)
DISK_1TB_B=$(ls -l /dev/disk/by-id/ | grep 'ata-WDC_WD10EZEX' | grep -v part | awk '{print $9}' | head -1)

echo "Drive A (Seagate): /dev/disk/by-id/${DISK_1TB_A}"
echo "Drive B (WD):      /dev/disk/by-id/${DISK_1TB_B}"

# VERIFY THESE ARE CORRECT BEFORE PROCEEDING!
# All data on these drives will be DESTROYED

echo ""
echo "Creating ZFS MIRROR (recommended for data protection)"
echo "Usable capacity: ~1TB with single-drive fault tolerance"
echo "Press Ctrl+C to cancel, or Enter to continue..."
read

# Create the mirrored pool (RECOMMENDED)
zpool create -f bulkpool mirror \
  /dev/disk/by-id/${DISK_1TB_A} \
  /dev/disk/by-id/${DISK_1TB_B}

# Verify pool creation
zpool status bulkpool

# You should see:
#   pool: bulkpool
#   state: ONLINE
#   config:
#     NAME                    STATE
#     bulkpool                ONLINE
#       mirror-0              ONLINE
#         ata-ST1000DM003...  ONLINE
#         ata-WDC_WD10EZEX... ONLINE
```

**Alternative: Striped Pool (NOT RECOMMENDED)**
```bash
# Only if you need 2TB and accept ZERO fault tolerance
# WARNING: Losing EITHER drive means losing ALL data!
zpool create -f bulkpool \
  /dev/disk/by-id/${DISK_1TB_A} \
  /dev/disk/by-id/${DISK_1TB_B}

# This gives ~2TB but no redundancy
```

### Create ZFS Datasets

```bash
# Create organized datasets for different types of data
zfs create bulkpool/media        # Movies, TV, Music
zfs create bulkpool/cloud        # Nextcloud data
zfs create bulkpool/backups      # Configuration backups, VM exports
zfs create bulkpool/docker       # Docker volume backups (optional)

# Set optimal properties for media files
zfs set compression=lz4 bulkpool/media
zfs set recordsize=1M bulkpool/media
zfs set atime=off bulkpool/media

# Set properties for cloud storage
zfs set compression=lz4 bulkpool/cloud
zfs set recordsize=128k bulkpool/cloud

# Set properties for backups
zfs set compression=lz4 bulkpool/backups
zfs set recordsize=128k bulkpool/backups

# Enable automatic snapshots for critical data
zfs set com.sun:auto-snapshot=true bulkpool/cloud
zfs set com.sun:auto-snapshot=true bulkpool/backups
zfs set com.sun:auto-snapshot=true bulkpool/docker
zfs set com.sun:auto-snapshot=false bulkpool/media  # Don't snapshot media

# Verify your datasets
zfs list
```

### Expected Output

**If you created a MIRROR (recommended):**
```
NAME                 USED  AVAIL     REFER  MOUNTPOINT
bulkpool            1.12M   928G       96K  /bulkpool
bulkpool/backups      96K   928G       96K  /bulkpool/backups
bulkpool/cloud        96K   928G       96K  /bulkpool/cloud
bulkpool/docker       96K   928G       96K  /bulkpool/docker
bulkpool/media        96K   928G       96K  /bulkpool/media
```

You have **~1TB total usable space** with single-drive protection.

**If you created a STRIPE (not recommended):**
```
NAME                 USED  AVAIL     REFER  MOUNTPOINT
bulkpool            1.12M  1.81T       96K  /bulkpool
bulkpool/backups      96K  1.81T       96K  /bulkpool/backups
bulkpool/cloud        96K  1.81T       96K  /bulkpool/cloud
bulkpool/docker       96K  1.81T       96K  /bulkpool/docker
bulkpool/media        96K  1.81T       96K  /bulkpool/media
```

You have **~2TB total usable space** with zero redundancy.

### Configure Automatic Snapshots

```bash
# zfs-auto-snapshot is already installed

# Configure snapshot retention in /etc/default/zfs-auto-snapshot
# Default retention:
# - Frequent (15min): 4 snapshots = 1 hour
# - Hourly: 24 snapshots = 1 day
# - Daily: 7 snapshots = 1 week
# - Weekly: 4 snapshots = 1 month
# - Monthly: 12 snapshots = 1 year

# Verify auto-snapshot is working
systemctl status zfs-auto-snapshot-frequent.timer
systemctl status zfs-auto-snapshot-hourly.timer
systemctl status zfs-auto-snapshot-daily.timer
systemctl status zfs-auto-snapshot-weekly.timer
systemctl status zfs-auto-snapshot-monthly.timer

# All should show "active (waiting)"
```

### Configure SMART Monitoring

```bash
# Enable SMART on all drives
for disk in /dev/sda /dev/sdb /dev/nvme0n1; do
    if [ -e "$disk" ]; then
        echo "Enabling SMART on $disk..."
        smartctl -s on "$disk" 2>/dev/null || true
    fi
done

# Check current health status
echo "=== NVMe Health ==="
smartctl -H /dev/nvme0n1
smartctl -A /dev/nvme0n1 | grep -E "(Temperature|Available_Spare|Percentage_Used|Data_Units)"

echo "=== HDD Health ==="
smartctl -H /dev/sda
smartctl -A /dev/sda | grep -E "(Reallocated_Sector|Current_Pending|Offline_Uncorrectable|Temperature|Power_On_Hours)"

smartctl -H /dev/sdb
smartctl -A /dev/sdb | grep -E "(Reallocated_Sector|Current_Pending|Offline_Uncorrectable|Temperature|Power_On_Hours)"

# Configure smartd for automatic monitoring
cat > /etc/smartd.conf <<'EOF'
# Monitor all disks
DEVICESCAN -a -o on -S on -n standby,q -s (S/../.././02|L/../../6/03) -W 4,35,45
EOF

systemctl enable smartd
systemctl restart smartd
systemctl status smartd
```

---

## GPU Passthrough Setup

GPU passthrough setup is **identical** regardless of your storage configuration.

### Step 1: Verify IOMMU Support

```bash
# Check if IOMMU is available
dmesg | grep -e DMAR -e IOMMU

# You should see lines like:
# [    0.000000] DMAR: IOMMU enabled
# [    0.000000] DMAR: Intel(R) Virtualization Technology for Directed I/O

# Check CPU virtualization support
egrep -o '(vmx|svm)' /proc/cpuinfo | sort -u

# Should output: vmx (Intel) or svm (AMD)
```

If you don't see IOMMU messages, **go back to BIOS** and enable VT-d.

### Step 2: Enable IOMMU in GRUB

```bash
# For Intel systems (Legion Desktop)
nano /etc/default/grub

# Find the line starting with: GRUB_CMDLINE_LINUX_DEFAULT="quiet"
# Change it to: GRUB_CMDLINE_LINUX_DEFAULT="quiet intel_iommu=on iommu=pt"

# Save and exit (Ctrl+X, Y, Enter)

# Update GRUB
update-grub
```

### Step 3: Configure VFIO Modules

```bash
# Blacklist Nouveau (open-source NVIDIA driver)
cat > /etc/modprobe.d/blacklist-nvidia.conf <<EOF
blacklist nouveau
blacklist nvidiafb
EOF

# Load VFIO modules at boot
cat > /etc/modules-load.d/vfio.conf <<EOF
vfio
vfio_iommu_type1
vfio_pci
vfio_virqfd
EOF
```

### Step 4: Find Your GPU PCI IDs

```bash
# Find your NVIDIA GPU PCI IDs
lspci -nn | grep -i nvidia

# Example output:
# 01:00.0 VGA compatible controller [0300]: NVIDIA Corporation GP106 [GeForce GTX 1060 6GB] [10de:1c03] (rev a1)
# 01:00.1 Audio device [0403]: NVIDIA Corporation GP106 High Definition Audio Controller [10de:10f1] (rev a1)

# The IDs you need are in the brackets at the end: [10de:1c03] and [10de:10f1]
# IMPORTANT: Your IDs may be different! Use the IDs from YOUR output above.
```

**Common NVIDIA GTX PCI IDs:**
- GTX 1060 6GB: `10de:1c03,10de:10f1`
- GTX 1060 3GB: `10de:1c02,10de:10f1`
- GTX 1070: `10de:1b81,10de:10f0`
- GTX 1080: `10de:1b80,10de:10f0`

### Step 5: Bind GPU to VFIO-PCI

```bash
# REPLACE THESE IDS WITH YOUR OUTPUT FROM STEP 4!
echo "options vfio-pci ids=10de:1c03,10de:10f1" > /etc/modprobe.d/vfio-pci.conf

# Apply changes
update-initramfs -u -k all

# Reboot to apply all changes
reboot
```

### Step 6: Verify GPU Passthrough Configuration

After reboot, SSH back in and verify:

```bash
# Check IOMMU is enabled
dmesg | grep -i iommu | head -20

# You should see:
# [    0.000000] DMAR: IOMMU enabled
# [    0.xxx] Intel-IOMMU: enabled

# Verify GPU is bound to vfio-pci (NOT nvidia or nouveau)
lspci -k | grep -A 3 -i nvidia

# Expected output:
# 01:00.0 VGA compatible controller: NVIDIA Corporation GP106 [GeForce GTX 1060 6GB]
#         Subsystem: ...
#         Kernel driver in use: vfio-pci
#         Kernel modules: nvidiafb, nouveau
# 01:00.1 Audio device: NVIDIA Corporation GP106 High Definition Audio Controller
#         Subsystem: ...
#         Kernel driver in use: vfio-pci
#         Kernel modules: snd_hda_intel

# Both should show "Kernel driver in use: vfio-pci"

# Check IOMMU groups
for d in /sys/kernel/iommu_groups/*/devices/*; do
  n=${d#*/iommu_groups/*}; n=${n%%/*}
  printf 'IOMMU Group %s ' "$n"
  lspci -nns "${d##*/}"
done | grep -i nvidia

# Ideally, GPU VGA and Audio should be in the same IOMMU group
# Example: IOMMU Group 1 01:00.0 ...
#          IOMMU Group 1 01:00.1 ...
```

If everything shows `vfio-pci`, you're ready to create the VM!

---

## Windows 11 VM Creation

### Step 1: Download Required ISOs

```bash
# Change to ISO storage directory
cd /var/lib/vz/template/iso

# Download VirtIO drivers
wget https://fedorapeople.org/groups/virt/virtio-win/direct-downloads/stable-virtio/virtio-win.iso

# Upload your Windows 11 ISO
# Option A: Use Proxmox web UI (Datacenter → Storage → local → ISO Images → Upload)
# Option B: Use SCP from your workstation:
#   scp Windows11.iso root@192.168.50.110:/var/lib/vz/template/iso/

# Verify files are present
ls -lh /var/lib/vz/template/iso/
```

### Step 2: Create Windows 11 VM via Proxmox UI

Open Proxmox web UI at `https://192.168.50.110:8006`

**Click "Create VM" and configure:**

**1. General Tab:**
- VM ID: `100`
- Name: `Windows-11-Gaming`
- Resource Pool: (leave default)

**2. OS Tab:**
- ISO image: Select your Windows 11 ISO
- Guest OS Type: `Microsoft Windows`
- Version: `11/2022/2025`

**3. System Tab:**
- Graphics card: `Default`
- Machine: `q35`
- BIOS: `OVMF (UEFI)`
- Add EFI Disk: `✓ Enabled`
- EFI Storage: `local-lvm`
- Pre-Enroll keys: `✗ Disabled` (important!)
- Add TPM: `✓ Enabled`
- TPM Storage: `local-lvm`
- Version: `v2.0`
- SCSI Controller: `VirtIO SCSI single`
- Qemu Agent: `✓ Enabled` (install later)

**4. Disks Tab:**
- Bus/Device: `SCSI`
- Storage: `local-lvm` (this is your NVMe SSD)
- Disk size: `240` GiB (adjust based on your needs)
  - Minimum: 120GB (OS + apps)
  - Recommended: 240GB (OS + apps + some games)
  - Maximum: 400GB (if you have large game libraries)
- Cache: `Write back` (safe with UPS)
- Discard: `✓ Enabled` (for TRIM support)
- IO thread: `✓ Enabled`

**5. CPU Tab:**
- Sockets: `1`
- Cores: `6` (adjust based on your CPU - leave 2-4 cores for host)
- Type: `host`
- Enable NUMA: `✗ Disabled` (unless you have 2+ CPUs)

**6. Memory Tab:**
- Memory (MiB): `16384` (16GB)
- Minimum memory (MiB): `8192` (8GB - for ballooning)
- Ballooning Device: `✓ Enabled`

**7. Network Tab:**
- Bridge: `vmbr0`
- VLAN Tag: (leave blank)
- Firewall: `✓ Enabled`
- Model: `VirtIO (paravirtualized)`
- MAC address: (auto-generated)

**Click "Finish" but DON'T start the VM yet!**

### Step 3: Configure GPU Passthrough for VM

```bash
# SSH into Proxmox
ssh root@192.168.50.110

# Find your GPU PCI address
lspci | grep -i nvidia

# Example output:
# 01:00.0 VGA compatible controller: NVIDIA Corporation GP106 [GeForce GTX 1060 6GB]
# 01:00.1 Audio device: NVIDIA Corporation GP106 High Definition Audio Controller

# The address is: 01:00 (take the first two parts before the period)

# Add GPU to VM 100
# REPLACE 01:00 with YOUR GPU address from above!
qm set 100 -hostpci0 01:00,pcie=1,x-vga=1

# Verify it was added
qm config 100 | grep hostpci

# Output should show:
# hostpci0: 0000:01:00,pcie=1,x-vga=1

# Add VirtIO drivers CD
qm set 100 -ide2 local:iso/virtio-win.iso,media=cdrom

# Verify VM configuration
qm config 100
```

### Step 4: Install Windows 11

**Start the VM** from Proxmox UI or CLI:
```bash
qm start 100
```

**Connect to VM Console:**
- In Proxmox UI: Click VM 100 → Console (noVNC)
- Or use Spice/xterm.js for better performance

**Windows Installation Process:**

1. **Boot from Windows 11 ISO** (this happens automatically)

2. **Windows Setup Screen:**
   - Language: English (or your preference)
   - Click "Install now"

3. **Product Key:**
   - Click "I don't have a product key" (activate later)
   - Or enter your key if you have it

4. **Select Windows 11 Edition:**
   - Choose: `Windows 11 Pro` (recommended for homelab)
   - Accept license terms

5. **Installation Type:**
   - Select: `Custom: Install Windows only (advanced)`

6. **Disk Selection - IMPORTANT STEP:**
   - You should see **NO DRIVES** at this point (this is normal!)
   - Click "Load driver"
   - Click "Browse"
   - Navigate to CD drive (E: or D:) → `virtio-win`
   - Navigate to: `viostor` → `w11` → `amd64`
   - Select `Red Hat VirtIO SCSI controller` driver
   - Click "Next" to install the driver
   - **Now you should see the 240GB disk**

7. **Select the disk and click "Next"**
   - Windows will create partitions automatically
   - Installation begins (10-15 minutes)

8. **After First Reboot:**
   - Windows will continue setup
   - Connect to noVNC console again if disconnected

9. **OOBE (Out of Box Experience):**
   - Region: Select your country
   - Keyboard: Select your layout
   - Network: Skip for now (click "I don't have internet")
   - Name your PC: `Gaming-PC` (or your preference)
   - Create local account (or sign in with Microsoft account)

10. **First Boot to Desktop:**
    - Windows 11 is installed but needs drivers!

### Step 5: Install VirtIO Drivers

**Critical step for network, graphics, and balloon memory:**

1. **Open File Explorer** in Windows VM
2. **Navigate to CD drive** (should be E: or D:) labeled `virtio-win`
3. **Run `virtio-win-gt-x64.exe`** (VirtIO Guest Tools installer)
4. **Accept UAC prompt**
5. **Install all components:**
   - VirtIO Drivers
   - QEMU Guest Agent (important!)
   - SPICE Guest Tools
6. **Reboot when prompted**

**After reboot, verify drivers are working:**
- Device Manager should show no unknown devices
- Network should be working (Ethernet)
- Check Services: "QEMU Guest Agent" should be running

### Step 6: Enable QEMU Guest Agent in Proxmox

```bash
# SSH into Proxmox
ssh root@192.168.50.110

# Enable the agent for VM 100
qm set 100 --agent 1

# Reboot the VM for it to take effect
qm reboot 100
```

### Step 7: Install NVIDIA Drivers in Windows

**Inside the Windows VM:**

1. **Download NVIDIA Drivers:**
   - Visit: https://www.nvidia.com/Download/index.aspx
   - Select: GeForce GTX 1060 6GB
   - Operating System: Windows 11 64-bit
   - Download Type: Game Ready Driver
   - Download and run installer

2. **Install NVIDIA GeForce Experience** (optional):
   - Useful for driver updates and game optimization

3. **Reboot VM** after driver installation

4. **Verify GPU is working:**
   - Open NVIDIA Control Panel (right-click desktop)
   - Check "System Information" shows GTX 1060
   - Download and run GPU-Z to verify GPU is detected
   - Run a benchmark (3DMark, Heaven, etc.) to test performance

### Step 8: Configure Windows for Gaming

**Windows Updates:**
```
Settings → Windows Update → Check for updates
Install all updates and reboot
```

**Install gaming platforms:**
- Steam
- Epic Games Launcher
- GOG Galaxy
- Battle.net (Blizzard)
- EA App
- Xbox App

**Performance optimizations:**
1. **Disable unnecessary startup programs:**
   - Task Manager → Startup tab → Disable unwanted apps

2. **Power Plan:**
   - Control Panel → Power Options → High Performance

3. **Game Mode:**
   - Settings → Gaming → Game Mode → Enable

4. **Graphics Settings:**
   - Settings → System → Display → Graphics
   - Set apps to "High performance"

### Step 9: USB Passthrough (Keyboard & Mouse)

For best gaming experience, pass through your USB controller:

```bash
# SSH into Proxmox
ssh root@192.168.50.110

# Find USB controllers
lspci | grep -i usb

# Example output:
# 00:14.0 USB controller: Intel Corporation Cannon Lake PCH USB 3.1 xHCI Host Controller
# 00:1f.0 ISA bridge: Intel Corporation ...

# Find the PCI address of your keyboard/mouse USB controller
# Usually 00:14 for Intel systems

# Add USB controller to VM (REPLACE 00:14 with your address)
qm set 100 -hostpci1 00:14,pcie=1

# Reboot VM
qm reboot 100
```

**After reboot**, your USB keyboard and mouse should work natively in Windows with no input lag.

**Alternative: USB Device Passthrough** (if passing controller causes issues):
```bash
# Find USB devices
lsusb

# Example:
# Bus 001 Device 003: ID 046d:c52b Logitech, Inc. Unifying Receiver

# Add specific USB device to VM
qm set 100 -usb0 host=046d:c52b

# Reboot VM
qm reboot 100
```

### Step 10: Test Gaming Performance

**Benchmark tools:**
- 3DMark Time Spy (Steam)
- Heaven Benchmark
- Cinebench R23
- CrystalDiskMark (test NVMe speed)

**Expected performance:**
- GPU: 95-98% of native performance
- CPU: 90-95% of native performance
- Disk: 90-95% of native NVMe speed
- Network: Full gigabit speed

**If performance is lower than expected:**
- Verify CPU pinning (optional advanced feature)
- Check that host isn't CPU-limited
- Verify IOMMU groups are clean
- Check Windows Task Manager for background processes

---

## Basic Infrastructure Container

This LXC container will run Docker and essential services.

### Step 1: Download Debian Template

```bash
# SSH into Proxmox
ssh root@192.168.50.110

# Update template list
pveam update

# List available Debian templates
pveam available | grep debian

# Download Debian 12 template
pveam download local debian-12-standard_12.2-1_amd64.tar.zst

# Verify download
pveam list local
```

### Step 2: Create Infrastructure LXC Container

```bash
# Create unprivileged container
pct create 200 local:vztmpl/debian-12-standard_12.2-1_amd64.tar.zst \
  --hostname infra-lxc \
  --storage local-lvm \
  --rootfs 20 \
  --memory 6144 \
  --swap 2048 \
  --cores 4 \
  --net0 name=eth0,bridge=vmbr0,ip=192.168.50.120/24,gw=192.168.50.1 \
  --nameserver 192.168.50.1 \
  --features nesting=1 \
  --unprivileged 1 \
  --password

# Enter a strong password when prompted
```

### Step 3: Configure Container for Docker

**Edit container config for Docker support:**

```bash
nano /etc/pve/lxc/200.conf

# Add these lines at the end:
# lxc.apparmor.profile: unconfined
# lxc.cgroup2.devices.allow: a
# lxc.cap.drop:
# lxc.mount.auto: proc:rw sys:rw

# Save and exit (Ctrl+X, Y, Enter)
```

**Or use this command to append:**
```bash
cat >> /etc/pve/lxc/200.conf <<EOF

# Docker support
lxc.apparmor.profile: unconfined
lxc.cgroup2.devices.allow: a
lxc.cap.drop:
lxc.mount.auto: proc:rw sys:rw
EOF
```

### Step 4: Add ZFS Mount Point for Docker Data

```bash
# Create dataset on bulkpool for Docker volumes
zfs create bulkpool/docker-volumes

# Add mount point to container config
echo "mp0: /bulkpool/docker-volumes,mp=/srv/docker" >> /etc/pve/lxc/200.conf

# Set permissions (containers use UID 100000 in unprivileged mode)
chown -R 100000:100000 /bulkpool/docker-volumes
```

### Step 5: Start Container and Install Docker

```bash
# Start the container
pct start 200

# Wait a few seconds for boot
sleep 5

# Enter the container
pct enter 200

# Inside container - update and install packages
apt update && apt upgrade -y
apt install -y curl gnupg2 ca-certificates lsb-release

# Install Docker using official script
curl -fsSL https://get.docker.com | sh

# Install Docker Compose plugin
apt install -y docker-compose-plugin

# Install other useful tools
apt install -y git vim htop ncdu btop

# Verify Docker is working
docker --version
docker compose version

# Test Docker with hello-world
docker run hello-world

# Exit container
exit
```

### Step 6: Create Directory Structure

```bash
# Create organized directories for Docker services
pct exec 200 -- bash -c "
mkdir -p /srv/docker/{portainer,rustdesk,nextcloud,watchtower,traefik}
mkdir -p /srv/docker/nextcloud/{db,config,data}
chmod -R 755 /srv/docker
"
```

### Step 7: Deploy Portainer (Container Management UI)

```bash
# Create Portainer compose file
pct exec 200 -- bash -c "cat > /srv/docker/portainer/docker-compose.yml <<'EOF'
services:
  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: unless-stopped
    ports:
      - '9000:9000'
      - '9443:9443'
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    environment:
      - TZ=America/New_York

volumes:
  portainer_data:
    driver: local
EOF
"

# Start Portainer
pct exec 200 -- bash -c "cd /srv/docker/portainer && docker compose up -d"

# Check if it's running
pct exec 200 -- docker ps
```

**Access Portainer:**
- Open browser: `https://192.168.50.120:9443`
- Create admin account on first visit
- You can now manage all Docker containers from this UI

### Step 8: Deploy Watchtower (Auto-Update Containers)

```bash
# Create Watchtower compose file
pct exec 200 -- bash -c "cat > /srv/docker/watchtower/docker-compose.yml <<'EOF'
services:
  watchtower:
    image: containrrr/watchtower:latest
    container_name: watchtower
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - WATCHTOWER_CLEANUP=true
      - WATCHTOWER_POLL_INTERVAL=86400  # Check daily
      - WATCHTOWER_INCLUDE_STOPPED=false
      - TZ=America/New_York
EOF
"

# Start Watchtower
pct exec 200 -- bash -c "cd /srv/docker/watchtower && docker compose up -d"
```

Watchtower will automatically check for and update container images daily.

### Step 9: Basic Monitoring

```bash
# Install btop (better than htop)
pct exec 200 -- apt install -y btop

# Check container resource usage
pct exec 200 -- docker stats --no-stream

# Check ZFS mount point usage
pct exec 200 -- df -h /srv/docker
```

### Step 10: Deploy Tailscale (VPN for Remote Access)

Tailscale creates a secure, zero-config VPN mesh network that allows you to access your homelab from anywhere in the world without opening any ports on your router.

**1. Generate a Tailscale Auth Key:**

- Go to the [Tailscale Admin Console](https://login.tailscale.com/admin/settings/keys).
- Click "Generate auth key...".
- Make the key **Reusable** and **Ephemeral**.
- **Important**: Copy the generated key (`tskey-auth-...`). You will need it in the next step.

**2. Create Tailscale Directory:**

```bash
# Create directory for Tailscale config
pct exec 200 -- mkdir -p /srv/docker/tailscale
```

**3. Create Tailscale Compose File:**

```bash
# Create Tailscale compose file
pct exec 200 -- bash -c "cat > /srv/docker/tailscale/docker-compose.yml <<'EOF'
services:
  tailscale:
    image: tailscale/tailscale:latest
    container_name: tailscale
    hostname: infra-lxc
    environment:
      - TS_STATE_DIR=/var/lib/tailscale
      - TS_USERSPACE=true
      - TS_AUTHKEY=YOUR_AUTH_KEY_HERE # PASTE YOUR KEY
      - TS_EXTRA_ARGS=--advertise-routes=192.168.50.0/24 --accept-routes=true
    volumes:
      - /srv/docker/tailscale/state:/var/lib/tailscale
      - /dev/net/tun:/dev/net/tun
    cap_add:
      - net_admin
      - sys_module
    network_mode: host
    restart: unless-stopped
EOF
"
```

**4. Add Your Auth Key:**

Before starting the container, you need to replace `YOUR_AUTH_KEY_HERE` with the key you generated.

```bash
# SSH into the Proxmox host
ssh root@192.168.50.110

# Enter the LXC container
pct enter 200

# Edit the docker-compose file
nano /srv/docker/tailscale/docker-compose.yml

# Replace YOUR_AUTH_KEY_HERE with your actual Tailscale auth key.
# Press Ctrl+X, then Y, then Enter to save.

# Exit the container
exit
```

**5. Start Tailscale:**

```bash
# Start Tailscale from the Proxmox host
pct exec 200 -- bash -c "cd /srv/docker/tailscale && docker compose up -d"

# Check if it's running
pct exec 200 -- docker ps
```

**6. Enable Subnet Routes in Tailscale Admin Console:**

- Go to the [Tailscale Admin Console](https://login.tailscale.com/admin/machines).
- Find your `infra-lxc` machine and click the `...` menu, then "Edit route settings...".
- **Approve** the `192.168.50.0/24` subnet route.

Now, from any device connected to your Tailscale network (like your phone or laptop), you can access any device on your home network using its local IP address (e.g., `192.168.50.110` for Proxmox).

### Step 11: Deploy AdGuard Home (Network-wide Ad-blocker)

AdGuard Home is a network-wide ad and tracker-blocking DNS server. It provides a central place to manage what your devices can access, improving privacy and security for your entire network.

**1. Create AdGuard Home Directory:**

```bash
# Create directories for AdGuard Home config and work data
pct exec 200 -- mkdir -p /srv/docker/adguardhome/work
pct exec 200 -- mkdir -p /srv/docker/adguardhome/conf
```

**2. Create AdGuard Home Compose File:**

```bash
# Create AdGuard Home compose file
pct exec 200 -- bash -c "cat > /srv/docker/adguardhome/docker-compose.yml <<'EOF'
services:
  adguardhome:
    image: adguard/adguardhome:latest
    container_name: adguardhome
    restart: unless-stopped
    ports:
      - '53:53/tcp'        # DNS
      - '53:53/udp'        # DNS
      - '3001:3000/tcp'      # Initial setup UI
      - '8083:80/tcp'        # Admin UI
    volumes:
      - /srv/docker/adguardhome/work:/opt/adguardhome/work
      - /srv/docker/adguardhome/conf:/opt/adguardhome/conf
    environment:
      - TZ=America/New_York # Change to your timezone
EOF
"
```

**3. Start AdGuard Home:**

```bash
# Start AdGuard Home from the Proxmox host
pct exec 200 -- bash -c "cd /srv/docker/adguardhome && docker compose up -d"

# Check if it's running
pct exec 200 -- docker ps
```

**4. Complete the Web Setup:**

AdGuard Home requires a one-time setup through its web interface.

-   Open your browser and go to `http://192.168.50.120:3001`.
-   Follow the on-screen instructions:
    -   **Admin Web Interface**: Set to listen on port 80 (inside the container).
    -   **DNS Server**: Set to listen on port 53.
    -   **Authentication**: Create a username and password for your admin dashboard.
-   Once setup is complete, you can access the dashboard at `http://192.168.50.120:8083`.

**5. Configure Your Router:**

To make all devices on your network use AdGuard Home, you need to change the DNS server settings in your router.

-   Log in to your router's administration page (usually `192.168.50.1`).
-   Find the **DHCP** or **LAN** settings.
-   Change the **Primary DNS Server** to `192.168.50.120`.
-   Leave the secondary DNS blank or set it to a public DNS like `1.1.1.1` as a backup (though this may allow some ads to get through if AdGuard is down).
-   Save the settings and reboot your router if necessary.

Your devices will now automatically use AdGuard Home for DNS, and you should see queries appearing in the AdGuard Home dashboard.

### Step 12: Deploy Uptime Kuma (Service Monitoring Dashboard)

Uptime Kuma gives you a slick, self-hosted status page that continuously checks whether your homelab services are responding. It helps you catch issues (stopped containers, offline nodes, SSL certificate expirations) before you notice them the hard way.

**1. Create the Uptime Kuma Directory:**

```bash
# Create directory structure for persistent data
pct exec 200 -- mkdir -p /srv/docker/uptime-kuma/data
```

**2. Create the Docker Compose File:**

```bash
# Create docker-compose.yml
pct exec 200 -- bash -c "cat > /srv/docker/uptime-kuma/docker-compose.yml <<'EOF'
services:
  uptime-kuma:
    image: louislam/uptime-kuma:1
    container_name: uptime-kuma
    restart: unless-stopped
    ports:
      - '3002:3001'          # Host port 3002 -> container 3001
    environment:
      - TZ=America/New_York  # Update to your timezone
    volumes:
      - /srv/docker/uptime-kuma/data:/app/data
EOF
"
```

**3. Start the Container:**

```bash
pct exec 200 -- bash -c "cd /srv/docker/uptime-kuma && docker compose up -d"

# Confirm it is healthy
pct exec 200 -- docker ps --filter name=uptime-kuma
```

**4. Perform Initial Setup:**

- Open `http://192.168.50.120:3002`.
- Create the admin account (this is local to Uptime Kuma).
- Set up at least three monitors to start:
  - **HTTP(s) Monitor** → `https://192.168.50.110:8006` (Proxmox web UI). Enable "Ignore TLS/SSL" since Proxmox uses a self-signed cert.
  - **HTTP(s) Monitor** → `http://192.168.50.120:8080` (Nextcloud front-end behind Caddy or direct).
  - **DNS or Port Monitor** → Host `192.168.50.120` Port `53` (AdGuard Home DNS) or `:9443` for Portainer.
- Set the heartbeat interval to 30 seconds or 60 seconds to keep noise manageable.

**5. Add Notifications (Optional but Recommended):**

Uptime Kuma supports Discord, Telegram, Gotify, email, Slack, Matrix, Pushover, and more.

1. Go to **Settings → Notification → Setup Notification**.
2. Select your preferred notifier (Discord webhooks are easy).
3. Link the notifier to each monitor under the monitor's settings.

Now you have a single dashboard that shows if any service in CT 200 (or elsewhere) goes down.

### Step 13: Deploy Nginx Proxy Manager (Friendly Reverse Proxy)

Nginx Proxy Manager (NPM) gives you an easy UI to publish internal services with friendly hostnames (e.g., `https://nextcloud.home.lab`). It also handles TLS certificates and access control policies.

> **Ports 80, 81, and 443 must be free on CT 200.** Stop any other containers binding to these ports before deploying NPM.

**1. Create Directories for Config & Certificates:**

```bash
pct exec 200 -- mkdir -p /srv/docker/npm/{data,letsencrypt}
```

**2. Create the Docker Compose File:**

```bash
pct exec 200 -- bash -c "cat > /srv/docker/npm/docker-compose.yml <<'EOF'
services:
  npm:
    image: jc21/nginx-proxy-manager:2
    container_name: nginx-proxy-manager
    restart: unless-stopped
    ports:
      - '80:80'    # HTTP
      - '81:81'    # Admin UI
      - '443:443'  # HTTPS
    environment:
      - TZ=America/New_York  # Update to your timezone
    volumes:
      - /srv/docker/npm/data:/data
      - /srv/docker/npm/letsencrypt:/etc/letsencrypt
EOF
"
```

**3. Start the Stack:**

```bash
pct exec 200 -- bash -c "cd /srv/docker/npm && docker compose up -d"

# Verify the container is running
pct exec 200 -- docker ps --filter name=nginx-proxy-manager
```

**4. Secure the Admin UI:**

- Browse to `http://192.168.50.120:81`.
- Default credentials: **Email:** `admin@example.com` / **Password:** `changeme`.
- Immediately change the email + password and add a backup admin account.

**5. Create Friendly Hostnames:**

1. Inside AdGuard Home go to **Filters → DNS rewrites** and add entries such as:
   - `portainer.lab` → `192.168.50.120`
   - `nextcloud.lab` → `192.168.50.120`
   - `kuma.lab` → `192.168.50.120`
2. In NPM, click **Hosts → Proxy Hosts → Add Proxy Host** and configure:
   - **Domain Names:** `nextcloud.lab`
   - **Scheme:** `http`
   - **Forward Hostname/IP:** `192.168.50.120`
   - **Forward Port:** `8080`
   - Enable "Cache Assets" and "Block Common Exploits".
   - Save, then test at `https://nextcloud.lab` (will use HTTP until SSL is enabled).
3. Repeat for other services (Portainer on `9443`, Uptime Kuma on `3002`, AdGuard on `8083`, Jellyfin later, etc.).

**6. Handle TLS Certificates:**

- If you own a public domain and can forward ports 80/443, use the built-in Let's Encrypt HTTP or DNS challenge.
- For LAN-only names, either:
  - Use NPM's **"Custom" certificate** feature with a local CA (e.g., `mkcert`), or
  - Place NPM behind Tailscale and use `tailscale cert <hostname>` to generate certs.
- Assign the certificate under each proxy host's **SSL** tab. Enable "Force SSL" after a certificate is attached.

With NPM + AdGuard rewrites you can now use simple URLs (e.g., `https://kuma.lab`) from every LAN device without remembering ports.

---

## Understanding Your Limitations

### Current Setup Capabilities

✅ **What Works Great:**
- Windows 11 gaming at near-native performance
- Multiple Docker services running simultaneously
- Fast VM/container performance on NVMe
- 4TB storage for media and bulk files
- Basic snapshot protection for critical data
- Hardware transcoding ready (when Dell node added)

❌ **What You DON'T Have Yet:**
- **NO redundancy**: Any drive failure loses data on that drive
- **NO ZFS replication**: Can't replicate to backup server yet
- **NO Proxmox Backup Server**: Can't do deduplicated VM backups
- **Limited snapshot retention**: Only local snapshots (7 days)
- **No off-site backups**: All data is on one physical machine

### Capacity Planning

**NVMe SSD (512GB):**
```
Proxmox system:     ~20GB
Windows 11 VM:     240GB
Infra LXC rootfs:   20GB
Free/overhead:     232GB
─────────────────────────
Used immediately:  280GB
Available:         232GB
```

**Recommendations:**
- Keep 20% free (100GB) on NVMe at all times
- Effective usable space: ~130GB after VM/LXC
- Use for: Fast Docker volumes, test VMs, databases

**Bulkpool HDDs (2x 1TB mirrored - recommended):**
```
Total raw capacity:  2TB (2x 1TB mirror)
ZFS overhead:       ~3%
Mirroring overhead: 50% (data written twice)
Available:         ~1TB usable
```

**Recommendations:**
- Keep 20% free (200GB) at all times for ZFS performance
- Effective usable: ~800GB before needing external storage
- Use for: Media, Nextcloud data, backups, large Docker volumes
- Protected: Can survive single drive failure

**Alternative: Bulkpool HDDs (2x 1TB striped - not recommended):**
```
Total raw capacity:  2TB (2x 1TB striped)
ZFS overhead:       ~3%
Available:         ~1.94TB usable
```

**Note**: Striping provides 2x capacity but ZERO fault tolerance. Losing either drive destroys ALL data.

### When to STOP Adding Data

**Critical thresholds:**

1. **NVMe at 80% full (380GB used)**:
   - Stop creating new VMs
   - Move Docker volumes to bulkpool if possible
   - Consider removing old snapshots
   - Clean up Windows temp files

2. **Bulkpool at 80% full (800GB used for mirror, 1.5TB for stripe)**:
   - **STOP adding media files**
   - Don't add more Docker volumes
   - Wait for external enclosures to arrive
   - Start planning migration to full RAIDZ1 setup

3. **Any drive shows SMART errors**:
   - **IMMEDIATELY** backup critical data to external USB
   - Order replacement drive
   - Plan emergency migration or restoration

### Backup Strategy for Temporary Setup

Since you have no redundancy, **backups are CRITICAL**:

**Daily Backups (Manual until PBS is set up):**
```bash
# Backup Proxmox configs
cd /root
tar -czf proxmox-configs-$(date +%Y%m%d).tar.gz \
    /etc/pve \
    /etc/network/interfaces \
    /etc/hosts

# Copy to bulkpool
cp proxmox-configs-*.tar.gz /bulkpool/backups/

# Backup container configs
pct exec 200 -- tar -czf /srv/docker/backup-$(date +%Y%m%d).tar.gz /srv/docker
```

**Weekly Backups (Recommended):**
1. **Export Windows VM** to external USB drive (if you have one):
```bash
qm stop 100
qm export 100 /mnt/usb/windows11-backup-$(date +%Y%m%d).vma.zst
qm start 100
```

2. **Snapshot critical ZFS datasets**:
```bash
# Manual snapshot before major changes
zfs snapshot bulkpool/docker@before-update
zfs snapshot bulkpool/backups@weekly-$(date +%Y%m%d)
```

3. **Sync to cloud** (if you have Backblaze/Dropbox/etc):
```bash
# Install rclone in container
pct exec 200 -- apt install -y rclone

# Configure rclone with your cloud provider
pct exec 200 -- rclone config

# Sync critical Docker configs to cloud
pct exec 200 -- rclone sync /srv/docker/nextcloud/config remote:backups/nextcloud-config
```

### Performance Considerations

**Expected resource usage:**
- Proxmox host: 2-4GB RAM
- Windows 11 VM: 16GB RAM (16-8GB with ballooning)
- Infra LXC: 2-4GB RAM (6GB allocated)
- ZFS ARC: Will grow to consume free RAM (beneficial)

**With 32GB total RAM:**
- In use: 20-24GB
- Available for ARC: 8-12GB (improves performance)

**When to worry:**
- Host swap usage > 100MB
- Containers becoming unresponsive
- Windows VM stuttering in games

---

## Migration Plan: Path to Full Setup

When your **external enclosures** and **additional drives** arrive (4x 1TB SSDs, 3x 1TB HDDs), you'll migrate to the full redundant setup.

### Migration Overview

```
Current Setup:                    Full Setup:
─────────────────────────────────────────────────────────────
NVMe (512GB) - single             rpool (2x 1TB SSD mirror)
  • Proxmox root                    • Proxmox system
  • Windows VM                      • VM disks
  • Infra LXC                       • Docker volumes

bulkpool (2x 1TB) - mirror        bulkpool (4x 1TB HDD RAIDZ1)
  • Media files                     • Media library
  • Backups                         • Nextcloud data
  • Docker volumes                  • Large files
```

### Migration Steps (When Drives Arrive)

#### Phase 1: Add Fast SSD Pool (rpool)

**Prerequisites:**
- 2x 1TB SATA SSDs in USB 3.0 enclosures (UASP mode)
- Both enclosures connected to Legion
- External backup of VM 100 (Windows 11)

**Step 1: Connect and Identify New SSDs**

```bash
# Connect first SSD enclosure
lsblk -o NAME,SIZE,MODEL,SERIAL,TRAN

# You should see new disks (sdc, sdd, etc.)

# List disk IDs
ls -l /dev/disk/by-id/ | grep -E 'usb.*1T'

# Example output:
# usb-SSD_1TB_A_123456 -> ../../sdc
# usb-SSD_1TB_B_234567 -> ../../sdd
```

**Step 2: Create ZFS Mirror Pool (rpool)**

```bash
# IMPORTANT: Verify disk IDs are correct!
SSD1_ID="usb-SSD_1TB_A_123456"
SSD2_ID="usb-SSD_1TB_B_234567"

echo "Creating mirror with:"
echo "  Drive 1: /dev/disk/by-id/${SSD1_ID}"
echo "  Drive 2: /dev/disk/by-id/${SSD2_ID}"
echo ""
echo "Press Ctrl+C to cancel, or Enter to continue..."
read

# Create mirrored pool
zpool create -f rpool mirror \
  /dev/disk/by-id/${SSD1_ID} \
  /dev/disk/by-id/${SSD2_ID}

# Verify pool creation
zpool status rpool

# Should show:
#   pool: rpool
#   state: ONLINE
#   config:
#     NAME                  STATE
#     rpool                 ONLINE
#       mirror-0            ONLINE
#         usb-SSD_1TB_A...  ONLINE
#         usb-SSD_1TB_B...  ONLINE

# Create datasets
zfs create rpool/vmdata
zfs create rpool/docker-volumes

# Optimize for VMs
zfs set recordsize=16k rpool/vmdata
zfs set compression=lz4 rpool/vmdata
zfs set sync=standard rpool/vmdata

# Optimize for Docker
zfs set recordsize=128k rpool/docker-volumes
zfs set compression=lz4 rpool/docker-volumes
zfs set atime=off rpool/docker-volumes

# Enable automatic snapshots
zfs set com.sun:auto-snapshot=true rpool/vmdata
zfs set com.sun:auto-snapshot=true rpool/docker-volumes

# Verify
zfs list -o name,used,avail,refer,mountpoint
```

**Step 3: Migrate Windows VM to New Pool**

```bash
# Option A: Export and Import VM (safer, more downtime)
# ──────────────────────────────────────────────────────────

# Stop Windows VM
qm stop 100

# Export VM to backup
qm export 100 /bulkpool/backups/windows11-pre-migration.vma.zst

# Delete old VM disk (THIS IS DESTRUCTIVE!)
qm destroy 100 --purge

# Recreate VM with new disk on rpool
# (Use same settings as original, but storage=rpool)
# ... (follow VM creation steps from earlier, or restore from backup)

# Import VM from backup
qm importovf 100 /bulkpool/backups/windows11-pre-migration.vma.zst rpool

# Start VM
qm start 100

# Verify Windows boots correctly
# If successful, delete backup:
# rm /bulkpool/backups/windows11-pre-migration.vma.zst


# Option B: Live Migration (advanced, less downtime)
# ──────────────────────────────────────────────────────────

# Create new disk on rpool
qm disk import 100 /dev/zvol/local-lvm/vm-100-disk-0 rpool

# This will copy the disk while VM is running
# Wait for completion (may take 30-60 minutes)

# Stop VM
qm stop 100

# Update VM config to use new disk
qm set 100 -scsi0 rpool:vm-100-disk-1

# Remove old disk
qm disk remove 100 scsi0 --device scsi0

# Start VM
qm start 100

# Verify Windows boots correctly
```

**Step 4: Migrate Docker Volumes**

```bash
# Stop all containers
pct exec 200 -- bash -c "cd /srv/docker && docker compose down"

# Copy Docker data to new pool
rsync -avhP /bulkpool/docker-volumes/ /rpool/docker-volumes/

# Update container mount point
nano /etc/pve/lxc/200.conf

# Change:
#   mp0: /bulkpool/docker-volumes,mp=/srv/docker
# To:
#   mp0: /rpool/docker-volumes,mp=/srv/docker

# Restart container
pct stop 200
pct start 200

# Verify data is accessible
pct exec 200 -- ls -la /srv/docker

# Start containers
pct exec 200 -- bash -c "cd /srv/docker/portainer && docker compose up -d"
pct exec 200 -- bash -c "cd /srv/docker/watchtower && docker compose up -d"

# Verify containers are running
pct exec 200 -- docker ps

# If everything works, delete old data:
# rm -rf /bulkpool/docker-volumes/*
```

#### Phase 2: Rebuild Bulk Pool with RAIDZ1

**Prerequisites:**
- 3x 1TB HDDs in USB enclosures (or internal SATA if you add a PCIe card)
- Current 1TB + 3TB HDDs still connected
- Backup of all media files to external storage (optional but recommended)

**Step 1: Connect New HDDs**

```bash
# Connect new 1TB HDDs
lsblk -o NAME,SIZE,MODEL,SERIAL,TRAN

# List disk IDs
ls -l /dev/disk/by-id/ | grep -E 'ata.*1T'

# You should now have:
# - 2x 1TB (original, in bulkpool mirror)
# - 4x 1TB (new, unformatted)
```

**Step 2: Create New RAIDZ1 Pool**

```bash
# Identify new 1TB drives
HDD1_NEW="ata-WDC_WD10EZEX_new1"
HDD2_NEW="ata-WDC_WD10EZEX_new2"
HDD3_NEW="ata-WDC_WD10EZEX_new3"

# Create temporary pool with 3 new drives
zpool create -f bulkpool-new raidz1 \
  /dev/disk/by-id/${HDD1_NEW} \
  /dev/disk/by-id/${HDD2_NEW} \
  /dev/disk/by-id/${HDD3_NEW}

# Verify pool
zpool status bulkpool-new

# Create datasets
zfs create bulkpool-new/media
zfs create bulkpool-new/cloud
zfs create bulkpool-new/backups

# Optimize for media
zfs set recordsize=1M bulkpool-new/media
zfs set compression=lz4 bulkpool-new/media
zfs set atime=off bulkpool-new/media

# Enable snapshots
zfs set com.sun:auto-snapshot=true bulkpool-new/media
zfs set com.sun:auto-snapshot=true bulkpool-new/cloud
```

**Step 3: Migrate Data from Old bulkpool**

```bash
# Copy media files to new pool
rsync -avhP --progress /bulkpool/media/ /bulkpool-new/media/

# Copy backups
rsync -avhP --progress /bulkpool/backups/ /bulkpool-new/backups/

# Verify data integrity
diff -r /bulkpool/media/ /bulkpool-new/media/

# If everything matches, continue...
```

**Step 4: Expand Pool with Additional Drives**

```bash
# Export old bulkpool
zpool export bulkpool

# Add original 1TB drive to new pool
zpool attach bulkpool-new \
  /dev/disk/by-id/${HDD1_NEW} \
  /dev/disk/by-id/ata-WDC_WD10EZEX_original

# Wait for resilver to complete (may take hours)
watch -n 10 zpool status bulkpool-new

# Once resilver completes, rename pool
zpool export bulkpool-new
zpool import bulkpool-new bulkpool

# Verify final pool
zpool status bulkpool

# You now have RAIDZ1 with 4x 1TB drives = ~3TB usable
# (3TB drive is no longer in the pool - use for cold backups!)
```

**Step 5: Update Mounts and Services**

```bash
# Update any containers that mounted bulkpool
nano /etc/pve/lxc/200.conf

# Update mount point paths if needed

# Restart containers
pct stop 200
pct start 200

# Verify everything works
pct exec 200 -- ls -la /srv/docker
```

#### Phase 3: Set Up T480s Backup Node

Once the Legion is stable with rpool + bulkpool, follow **Phase 3** from the main guide:

1. Install Proxmox Backup Server on T480s
2. Create backup-ssd mirror pool
3. Configure ZFS replication
4. Set up automated backups

**Detailed steps**: See `/Users/2021m1pro/my-projects/homelab/your_hardware_homelab.md` Phase 3.

### Estimated Downtime

**Per-service downtime during migration:**
- Windows VM: 15-30 minutes (export/import) or 2-5 hours (live migration)
- Docker services: 10-20 minutes
- Media server: No downtime (data copied while offline)

**Total project time:**
- Phase 1 (SSD mirror): 2-4 hours
- Phase 2 (HDD RAIDZ1): 4-8 hours (mostly waiting for resilver)
- Phase 3 (Backup node): 2-3 hours

**Can be done over a weekend** with minimal impact to gaming/services.

### Migration Checklist

Before starting migration, verify:

- [ ] All new drives are healthy (SMART check)
- [ ] Current data is backed up to external storage
- [ ] You have tested VM exports/imports
- [ ] You have downtime window scheduled
- [ ] UPS is connected and tested
- [ ] You have this guide printed/accessible
- [ ] You have verified all disk IDs are correct

---

## Final Recommendations

### For the Next 1-2 Months (Before Enclosures Arrive)

**DO:**
- ✅ Use the system for gaming and learning Proxmox
- ✅ Deploy basic Docker services (Portainer, Nextcloud, RustDesk)
- ✅ Set up Tailscale VPN for remote access
- ✅ Practice taking and restoring ZFS snapshots
- ✅ Learn Docker Compose and container management
- ✅ Configure Windows VM for optimal gaming performance
- ✅ Document your setup and configurations

**DON'T:**
- ❌ Store critical, irreplaceable data without external backups
- ❌ Fill bulkpool beyond 80% capacity
- ❌ Deploy production services that others depend on
- ❌ Add more VMs unless you have space
- ❌ Disable automatic snapshots
- ❌ Ignore SMART warnings or drive errors

### Shopping List for Full Setup

When ready to complete the migration:

**Required Hardware:**
- [ ] 4x 1TB SATA SSDs (2 for rpool, 2 for backup-ssd on T480s)
- [ ] 3x 1TB HDDs (to complete 4-disk RAIDZ1 bulkpool)
- [ ] 2-4x USB 3.0 SATA enclosures with UASP support
  - Recommended: StarTech USB 3.0 to SATA III adapter
  - Alternative: PCIe SATA expansion card (4-8 ports)
- [ ] 1x APC 1200VA UPS (or equivalent)
  - Minimum runtime: 10 minutes with full load
  - USB monitoring cable included

**Optional but Recommended:**
- [ ] Cooling pads for laptops running 24/7
- [ ] Label maker for physical drive labels
- [ ] Spare USB cables
- [ ] Small UPS for network gear (router, switch)

**Estimated Cost:**
- SSDs: 4x $80 = $320
- HDDs: 3x $40 = $120
- Enclosures: 4x $25 = $100
- UPS: $180
- **Total: ~$720**

### Next Steps

1. **Short term (Today - Week 1):**
   - Complete Phase 1 Simplified Build
   - Test gaming performance in Windows VM
   - Deploy Portainer and Watchtower
   - Set up RustDesk server
   - Configure Tailscale VPN

2. **Medium term (Week 2-4):**
   - Add Dell Latitude 7520 as Jellyfin node (Phase 2 from main guide)
   - Deploy additional Docker services as needed
   - Practice VM snapshots and exports
   - Learn ZFS commands and snapshot management

3. **Long term (Month 2+):**
   - Order external enclosures and additional drives
   - Migrate to full redundant setup (follow Migration Plan above)
   - Add T480s Backup Server (Phase 3 from main guide)
   - Set up automated backups and monitoring

### Getting Help

**Before asking for help, gather:**
1. Output of failed command
2. Relevant log files (`journalctl -xe`, `dmesg`, etc.)
3. `zpool status` and `zfs list` output
4. Proxmox version: `pveversion -v`
5. What you expected vs what actually happened

**Useful resources:**
- Proxmox Wiki: https://pve.proxmox.com/wiki/
- Proxmox Forum: https://forum.proxmox.com/
- r/Proxmox: https://reddit.com/r/Proxmox
- r/homelab: https://reddit.com/r/homelab
- ZFS documentation: https://openzfs.github.io/openzfs-docs/

**Common issues:**
- GPU passthrough not working → Check IOMMU groups, VFIO bindings
- VM performance poor → Check CPU pinning, verify GPU is passed through
- ZFS pool degraded → Check `zpool status`, run scrub
- Container can't start → Check mounts, permissions, logs

---

## Summary

You've successfully created a **functional homelab** with limited hardware that can be **expanded later** without rebuilding from scratch.

**What you have now:**
- Proxmox VE hypervisor with GPU passthrough
- Windows 11 gaming VM with near-native performance
- Infrastructure LXC container running Docker services
- 4TB combined storage for media and files
- Basic ZFS snapshot protection
- Clear migration path to full redundant setup

**What you'll gain when enclosures arrive:**
- Full ZFS redundancy (mirrors + RAIDZ1)
- Dedicated Proxmox Backup Server
- Off-host ZFS replication
- 3TB cold backup archive
- UPS protection for graceful shutdowns

**Remember:**
- This is a **temporary setup** - don't store irreplaceable data without backups
- Order external enclosures and drives when budget allows
- Practice ZFS snapshots and VM exports regularly
- Have fun learning and gaming!

**You're now ready to start your homelab journey. Welcome to the club!** 🚀

---

## Quick Reference Commands

### ZFS Pool Management
```bash
zpool status              # Check pool health
zpool list                # List all pools
zfs list                  # List all datasets
zfs list -t snapshot      # List all snapshots
zpool scrub bulkpool      # Start scrub
```

### Container Management
```bash
pct list                  # List all containers
pct start 200             # Start container 200
pct stop 200              # Stop container 200
pct enter 200             # Enter container shell
pct exec 200 -- <cmd>     # Run command in container
```

### VM Management
```bash
qm list                   # List all VMs
qm start 100              # Start VM 100
qm stop 100               # Stop VM 100
qm reboot 100             # Reboot VM 100
qm shutdown 100           # Graceful shutdown
qm config 100             # Show VM config
```

### Docker Commands (Inside Container)
```bash
docker ps                         # List running containers
docker ps -a                      # List all containers
docker compose up -d              # Start services
docker compose down               # Stop services
docker compose logs -f            # Follow logs
docker stats                      # Resource usage
```

### System Monitoring
```bash
htop                      # Interactive process viewer
btop                      # Better process viewer
df -h                     # Disk space usage
zpool iostat 5            # ZFS I/O stats (5sec intervals)
smartctl -H /dev/sda      # Check drive health
```
