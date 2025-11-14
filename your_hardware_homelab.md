# Your Hardware Homelab Setup Guide

## Table of Contents
1. [Hardware Inventory](#hardware-inventory)
2. [Architecture Options](#architecture-options)
3. [Recommended Setup](#recommended-setup)
4. [Prerequisites & Preparation](#prerequisites--preparation)
5. [Step-by-Step Setup](#step-by-step-setup)
6. [Service Configuration](#service-configuration)
7. [Remote Access Setup](#remote-access-setup)
8. [Maintenance & Best Practices](#maintenance--best-practices)
9. [Summary](#summary)
10. [Quick Reference: IP Addresses](#quick-reference-ip-addresses)
11. [Getting Help](#getting-help)

---

## Hardware Inventory

### Desktop (Primary Hypervisor)
- **1x Lenovo Legion Desktop PC**
  - 32GB RAM
  - 512GB NVMe SSD (currently ~477GB actual)
  - **2x 1TB HDDs** (Seagate ST1000DM003 + WD WD10EZEX)
    - **Note**: Originally had 3TB HDD but removed due to broken SATA port
  - **NVIDIA GTX 1060 6GB** (GPU passthrough target)
  - Intel chipset with VT-d/IOMMU support
  - Limited SATA ports - recommend PCIe SATA expansion card or USB 3.2 enclosures for additional drives

This box now runs **Proxmox VE** 24/7, hosts all ZFS pools, and passes the GTX 1060 directly to the Windows 11 gaming VM so you keep near-native performance.

### Laptops & Roles
- **2x Lenovo ThinkPad X1 (8th gen Intel)** – lab/dev boxes, great for testing Ansible, Kubernetes, or future nodes.
- **2x Lenovo T480s (quad-core 8th gen)** – one becomes the always-on backup/observability node; the other is a spare utility host or VPN exit node.
- **1x Dell Latitude 7520 (11th gen Intel with Iris Xe)** – ideal Jellyfin/Tdarr node thanks to the latest Intel Quick Sync engine (H.264/H.265 4K hardware transcodes).

### Storage Drives

**Current Internal Storage:**
- **1x 512GB NVMe SSD** - Running Proxmox VE with `rpool` (ext4 filesystem)
- **2x 1TB SATA HDDs** - Available for `bulkpool` (mirror recommended for reliability)

**Planned External Storage (when enclosures arrive):**
- **4x 1TB SATA SSDs (not yet connected)**
  - 2 drives → `fastpool` mirrored ZFS for VM/LXC disks on the Legion
  - 2 drives → `backup-ssd` mirrored ZFS inside the T480s backup node
- **3-4x 1TB HDDs (not yet connected)**
  - Combine with or replace internal HDDs to create a 4-disk RAIDZ1 `bulkpool` for media + Nextcloud data
- **1x 3TB HDD (offline)**
  - Currently not connected due to broken SATA port
  - Can be used later as cold-backup disk for `zfs send` archives via USB enclosure

**Current ZFS Pools (Phase 1 - Limited Hardware)**

| Pool | Disks | Purpose | Status |
|------|-------|---------|--------|
| `rpool` | NVMe single disk | Proxmox system, VM disks on local-lvm | ✅ Current |
| `bulkpool` | 2x 1TB HDD (mirror) | Media, Nextcloud data, general files | ✅ Recommended |

**Planned ZFS Pools (Full Setup - When External Storage Arrives)**

| Pool | Disks | Purpose | Status |
|------|-------|---------|--------|
| `fastpool` | 2x 1TB SSD (mirror) | VM disks, Docker volumes, databases | ⏳ Pending external SSDs |
| `bulkpool` | 4x 1TB HDD (RAIDZ1) | Media, Nextcloud data, general files | ⏳ Pending external HDDs |
| `backup-ssd` | 2x 1TB SSD mirror on T480s | Remote replica target for snapshots | ⏳ Phase 3 |
| `archive` | 3TB HDD (single) via USB | Weekly offline snapshots; kept unplugged when idle | ⏳ Deferred (broken SATA port) |

**Note:** With only 2x 1TB HDDs available internally, using a **ZFS mirror is strongly recommended** over striping for data protection. This provides 1TB usable capacity with single-drive fault tolerance, which is safer than 2TB striped with no redundancy.

### Power Protection
- **APC 1200VA / 720W UPS**
  - Connect the Legion, network core (router + switch), and the external storage enclosure.
  - Run `apcupsd` on both the Legion (Proxmox) and the T480s backup node for graceful shutdowns.
  - Perform a quarterly runtime test and replace the battery every 3-4 years.

---

## Architecture Options

You still have three viable deployment models, but **Option A is now selected** and drives the rest of this guide.

### Option A: Proxmox with GPU Passthrough (Selected & Recommended)

```
┌───────────────────────────────────────────────────────┐
│ Lenovo Legion Desktop - Proxmox VE + ZFS + UPS        │
│ 32GB RAM | GTX 1060 passthrough | fastpool + bulkpool │
├───────────────────────────────────────────────────────┤
│  VM 100: Windows 11 Gaming (GPU passthrough)          │
│  CT 200: Infra / Docker / RustDesk / Nextcloud        │
│  CT 210: Storage services (Samba/NFS, backups)        │
│  Additional lightweight VMs/LXCs on demand            │
└───────────────────────────────────────────────────────┘
          │
          │ 10/100/1000 LAN
          ↓
┌───────────────────────────────────────────────────────┐
│ Dell Latitude 7520 - Ubuntu Server + Docker           │
│ Jellyfin, Tdarr, media apps w/ Intel Quick Sync       │
└───────────────────────────────────────────────────────┘
          │
          ↓
┌───────────────────────────────────────────────────────┐
│ Lenovo T480s #1 - Proxmox Backup / ZFS replica        │
│ backup-ssd mirror, Borg/Restic, UPS monitoring        │
└───────────────────────────────────────────────────────┘
```

**Pros:**
- Simultaneous gaming + services without rebooting.
- Hands-on experience with Proxmox, GPU passthrough, ZFS, and backups.
- Centralized storage with redundancy plus off-host replication.
- UPS-backed primary host prevents sudden power loss.

**Cons:**
- Highest complexity (IOMMU tuning, ZFS management).
- Legion stays powered more hours to host services.
- Requires USB/SATA enclosures for additional disks.

**Best for:** A single powerful tower acting as the lab backbone while other laptops handle auxiliary workloads.

### Option B: Dual-Boot Windows + Linux

Keep Legion dual-booting Windows and Ubuntu Server. Still viable if you ever want to simplify, but you must shut down services to game, and there is no easy GPU passthrough.

### Option C: Laptop-Only Homelab

Run everything on the laptops via Proxmox/Ubuntu nodes. Power efficient yet limited by thermals, NICs, and expandability. Remains a fallback if the Legion has to stay 100% dedicated to gaming.

---

## Recommended Setup

### Architecture: Proxmox-First with GPU Passthrough, ZFS, and Dedicated Media Node

```
                APC 1200VA UPS
                     │
         ┌────────────┴────────────┐
         │                         │
┌────────────────────────────────────────────────────────────┐
│ Lenovo Legion Desktop (Proxmox VE 8)                       │
│ 32GB RAM • GTX 1060 • fastpool (SSD mirror) • bulkpool     │
├────────────────────────────────────────────────────────────┤
│ VM 100  Windows 11 Gaming (GPU passthrough + NVMe)         │
│ CT 200  Infra LXC (Docker, Portainer, RustDesk, Nextcloud) │
│ CT 210  Storage LXC (Samba/NFS, snapshot scripts)          │
│ PBS Client + UPS daemon                                    │
└────────────────────────────────────────────────────────────┘
         │ 1 GbE LAN
         ↓
┌────────────────────────────────────────────┐    ┌──────────────────────────────────────────┐
│ Dell Latitude 7520                         │    │ Lenovo T480s #1                          │
│ Ubuntu Server + Docker                     │    │ Proxmox Backup Server + backup-ssd pool │
│ Jellyfin w/ Intel Quick Sync, Tdarr, qBitt │    │ Receives ZFS replicas + runs apcupsd    │
└────────────────────────────────────────────┘    └──────────────────────────────────────────┘
```

### Key Principles
1. **Legion does everything**: virtualization, storage, and networking stay centralized.
2. **GPU passthrough** keeps Windows gaming at 95-98% native performance.
3. **ZFS everywhere**: mirrors + RAIDZ1 for resiliency, rolling snapshots, and off-host replication.
4. **Dedicated media acceleration**: the Dell’s Iris Xe handles 4K Plex/Jellyfin workloads without touching the GTX 1060.
5. **UPS coverage** ensures clean shutdowns and protects spinning disks.

### Resource Allocation on Legion (Proxmox VE)
- **VM 100 – Windows 11 Gaming**
  - 16GB RAM, 6 vCPUs, GTX 1060 passthrough, NVMe disk, USB controller passthrough for keyboard/mouse.
- **CT 200 – `infra-lxc` (Docker & Core Services)**
  - 6GB RAM, 4 vCPUs, runs Docker/Compose for Portainer, RustDesk server, Tailscale exit node, Watchtower.
  - Mounts `fastpool/infra` dataset for persistent volumes.
- **CT 210 – `storage-lxc`**
  - 6GB RAM, 4 vCPUs, exports `bulkpool` via Samba/NFS, hosts Nextcloud data directory, runs scripts for ZFS snapshots + replication.
- **Free Capacity**
  - ~4GB RAM + spare cores reserved for short-lived lab VMs (Kali, pfSense, etc.).

### Supporting Nodes & Roles
- **Dell Latitude 7520 (192.168.50.130)**
  - Ubuntu Server 24.04 + Docker.
  - Jellyfin (Quick Sync), Tdarr, qBittorrent, Kavita, etc.
  - Mounts Legion’s media share via NFS (`bulkpool/media`).
- **Lenovo T480s #1 (192.168.50.140)**
  - Proxmox Backup Server w/ `backup-ssd` mirror.
  - Receives nightly `zfs send` from Legion + Borg backups from Jellyfin node.
  - Monitors UPS via USB if colocated.
- **Lenovo T480s #2 / ThinkPad X1s**
  - Optional roles: pfSense test box, WireGuard gateway, Ansible control node, development sandbox.

### Storage Layout (ZFS)

**Current Phase 1 Setup (Limited Hardware):**

**Primary Storage (Legion):**
- **NVMe (local-lvm)** - Proxmox default storage:
  - VM disks (Windows 11, utility VMs)
  - Container rootfs volumes
  - ~400GB usable after Proxmox overhead
- **bulkpool** (2x 1TB HDD mirror - recommended):
  - `bulkpool/media` – Movies, TV, Music, Photos (NFS export to Dell)
  - `bulkpool/cloud` – Nextcloud primary storage
  - `bulkpool/backups` – Configuration backups, VM exports
  - ~1TB usable with single-drive fault tolerance

**Planned Full Setup (When External Storage Arrives):**

**Primary Storage (Legion):**
- `fastpool` (2x 1TB SSD mirror - fast storage):
  - `fastpool/vmdata` – VM disks (Windows, utility VMs)
  - `fastpool/infra` – Docker volumes + configs
  - ~1TB usable, high-performance storage
- `bulkpool` (4x 1TB HDD RAIDZ1 - bulk storage):
  - `bulkpool/media` – Movies, TV, Music, Photos (NFS export to Dell)
  - `bulkpool/cloud` – Nextcloud primary storage
  - `bulkpool/backups` – Staging area for Borg/Restic archives
  - ~3TB usable with single-drive fault tolerance

**Backup Storage (T480s - Phase 3):**
- `backup-ssd` (2x 1TB SSD mirror on T480s):
  - `backup-ssd/fastpool/vmdata` – receives replicas of `fastpool/vmdata`
  - `backup-ssd/bulkpool/media` – receives replicas of `bulkpool/media`
  - `backup-ssd/bulkpool/cloud` – receives replicas of `bulkpool/cloud`

**Cold Storage (Deferred):**
- `archive` (3TB HDD - offline via USB):
  - Currently not connected due to broken SATA port
  - Will be used via USB enclosure when available
  - Full weekly snapshots of all pools
  - Unplugged and stored off-site between backups

### Redundancy & Backup Strategy
1. **Local protection**: SSD mirror (rpool) + HDD RAIDZ1 (bulkpool) handle single-disk failures without downtime.
2. **Snapshots**: Automatic snapshots via `zfs-auto-snapshot` - 15-min (4), hourly (24), daily (7), weekly (4), monthly (12).
3. **Replication**: Nightly `zfs send` jobs push snapshots to `backup-ssd` on the T480s over SSH.
4. **Cold copies**: Weekly `zfs send -R` of all pools to the 3TB archive disk stored offline.
5. **PBS backups**: Proxmox Backup Server stores deduplicated VM/CT backups with 7-day retention.
6. **Cloud sync (optional)**: rclone/Backblaze B2 for irreplaceable data (documents, photos).

### UPS Integration Checklist
- Plug Legion, switch/router, drive enclosure, and T480s backup brick into the APC UPS.
- Install `apcupsd` on Legion (`apt install apcupsd`) and configure USB cable on `/dev/usb/hiddev0`.
- Configure `apccontrol` to call `pvenode shutdown` after ~90 seconds on battery.
- On the T480s, run `apcupsd` in netclient mode pointing at Legion so both hosts shut down gracefully.

---

## Prerequisites & Preparation

### Before You Begin
1. **Firmware updates**: Update Legion BIOS + GPU vBIOS, and ensure Dell/T480s firmware is current.
2. **Enable virtualization**: In Legion BIOS enable Intel VT-x, VT-d, SR-IOV, and Above 4G decoding.
3. **Disable Secure Boot + Fast Boot**: Required for Proxmox + passthrough.
4. **Label drives**: Physically label each SSD/HDD to avoid confusion when creating pools.
5. **Prep enclosures**: Use USB 3.0 SATA docks with UASP support for the spare drives if the case lacks bays.
6. **Remove laptop batteries** (for 24/7 hosts) per Lenovo safety guidelines to avoid swelling.
7. **Install Tailscale account, GitHub, Docker Hub** (same as before) for configuration backups.
8. **Verify UPS runtime**: With everything connected, run a self-test and confirm at least 10 minutes of battery.
9. **Download ISOs**: Proxmox VE 8.2, Windows 11, Ubuntu Server 24.04, Proxmox Backup Server 3.x.

### Reference Credentials & Network Plan
| Host | Role | Static IP |
|------|------|-----------|
| Legion Proxmox | Primary hypervisor | `192.168.50.110/24` |
| Windows 11 VM | Gaming workstation | `192.168.50.111/24` |
| CT 200 (`infra-lxc`) | Docker/Portainer/RustDesk/Nextcloud | `192.168.50.120/24` |
| Dell Latitude 7520 | Jellyfin media node | `192.168.50.130/24` |
| Lenovo T480s #1 | Proxmox Backup Server | `192.168.50.140/24` |

Reserve these addresses on your router’s DHCP server before you start.

---

## Step-by-Step Setup

### Phase 1: Convert the Legion to Proxmox VE with GPU Passthrough

#### Step 1.1: Install Proxmox VE 8
1. Create a Proxmox bootable USB using Balena Etcher.
2. Boot the Legion from USB (F12) → "Install Proxmox VE".
3. Select ZFS **RAID1** for the two 1TB SSDs as the system disk.
   - The installer will create a pool named `rpool` (this is the default and recommended).
   - This pool will hold the Proxmox system, VM disks, and container storage.
4. Set the management IP to `192.168.50.110/24`, gateway = router IP, DNS = router or 1.1.1.1.
5. After install, disable the enterprise repository and enable the no-subscription repo:
```bash
sed -i 's/^deb/#deb/' /etc/apt/sources.list.d/pve-enterprise.list
echo "deb http://download.proxmox.com/debian/pve bookworm pve-no-subscription" > /etc/apt/sources.list.d/pve-no-subscription.list
apt update && apt full-upgrade
```
6. Update `/etc/hosts` to map `192.168.50.110 legion-proxmox`, then reboot.

#### Step 1.2: Attach Remaining Drives & Build Pools

**IMPORTANT: Current Hardware Configuration**
- You have **only 2x 1TB HDDs** available (not 4 drives as originally planned)
- The 3TB drive is offline due to broken SATA port
- External enclosures with additional drives have not arrived yet

**Recommended Configuration: ZFS Mirror (Data Protection)**
```bash
# List all disks to identify your drives
lsblk -o NAME,SIZE,MODEL,SERIAL

# Expected output with your current hardware:
# NAME        SIZE MODEL              SERIAL          TYPE
# nvme0n1     477G KIOXIA...           ...             disk
# ├─nvme0n1p1   1G                                     part  # EFI
# ├─nvme0n1p2   1G                                     part  # BIOS
# └─nvme0n1p3 475G                                     part  # Root + LVM
# sda         932G Seagate_ST1000DM003  ...            disk
# sdb         932G WDC_WD10EZEX         ...            disk

# List disk IDs (these are stable across reboots)
ls -l /dev/disk/by-id/ | grep -v part | grep -E '(ata|nvme)'

# Create HDD MIRROR pool for bulk storage with redundancy
# IMPORTANT: Replace these IDs with your actual disk IDs from the command above
DISK_1TB_A="/dev/disk/by-id/ata-ST1000DM003-XXXXX"  # Replace with your Seagate ID
DISK_1TB_B="/dev/disk/by-id/ata-WDC_WD10EZEX-XXXXX" # Replace with your WD ID

echo "Creating ZFS mirror with:"
echo "  Drive 1: ${DISK_1TB_A}"
echo "  Drive 2: ${DISK_1TB_B}"
echo ""
echo "This will provide ~1TB usable with single-drive fault tolerance."
echo "Press Ctrl+C to cancel, or Enter to continue..."
read

# Create mirrored pool (RECOMMENDED for data safety)
zpool create -f bulkpool mirror ${DISK_1TB_A} ${DISK_1TB_B}

# Verify pool creation
zpool status bulkpool

# Should show:
#   pool: bulkpool
#   state: ONLINE
#   config:
#     NAME                    STATE
#     bulkpool                ONLINE
#       mirror-0              ONLINE
#         ata-ST1000DM003...  ONLINE
#         ata-WDC_WD10EZEX... ONLINE

# Create datasets on bulkpool for media and files
zfs create bulkpool/media
zfs create bulkpool/cloud
zfs create bulkpool/backups

# Proxmox already uses local-lvm on NVMe for VM storage
# No need to create rpool/vmdata since we're using the default local-lvm

# Verify all pools
zpool list
zfs list
```

**Alternative: Striped Pool (NOT RECOMMENDED - No Redundancy)**
```bash
# Only use this if you absolutely need 2TB capacity and accept the risk
# If EITHER drive fails, you lose ALL data in the pool!
zpool create -f bulkpool ${DISK_1TB_A} ${DISK_1TB_B}

# This gives ~2TB usable but ZERO fault tolerance
```

**Why Mirror is Recommended:**
- ✅ Survives single drive failure with zero data loss
- ✅ Better random read performance (ZFS reads from both drives)
- ✅ Safer for important data (media can be re-downloaded, but configs cannot)
- ❌ Only 1TB usable instead of 2TB (50% capacity overhead)
- ✅ Worth the tradeoff until external drives arrive for RAIDZ1

**Important Notes:**
- The NVMe already hosts Proxmox and VMs via local-lvm (no ZFS needed there yet)
- When external enclosures arrive, you can migrate to the full RAIDZ1 setup
- Label drives physically so you know which is which
- The `/dev/disk/by-id` paths ensure ZFS can find drives even if `/dev/sdX` names change

**ZFS Tuning for VM Workloads:**
```bash
# Optimize recordsize for VM disks (improves random I/O)
zfs set recordsize=16k rpool/vmdata
zfs set compression=lz4 rpool/vmdata
zfs set sync=standard rpool/vmdata  # Use 'standard' with UPS, 'disabled' if no UPS (risky)
zfs set primarycache=all rpool/vmdata

# Optimize for Docker volumes
zfs set recordsize=128k rpool/infra
zfs set compression=lz4 rpool/infra
zfs set atime=off rpool/infra  # Disable access time updates for performance

# Optimize for bulk media storage
zfs set recordsize=1M bulkpool/media
zfs set compression=lz4 bulkpool/media
zfs set atime=off bulkpool/media

# Limit ZFS ARC (cache) to 8GB on 32GB system
# This leaves enough RAM for VMs and containers
echo "options zfs zfs_arc_max=8589934592" > /etc/modprobe.d/zfs.conf
echo "options zfs zfs_arc_min=2147483648" >> /etc/modprobe.d/zfs.conf
update-initramfs -u -k all

# Note: Reboot required for ARC limits to take effect
```

**Enable automatic snapshots:**
```bash
# Install zfs-auto-snapshot
apt install -y zfs-auto-snapshot

# Enable automatic snapshots for critical datasets
zfs set com.sun:auto-snapshot=true rpool/vmdata
zfs set com.sun:auto-snapshot=true rpool/infra
zfs set com.sun:auto-snapshot=true bulkpool/media
zfs set com.sun:auto-snapshot=true bulkpool/cloud

# Configure snapshot retention (optional, modify /etc/default/zfs-auto-snapshot)
# Defaults: 4 fifteen-minute, 24 hourly, 7 daily, 4 weekly, 12 monthly
```

#### Step 1.3: Enable GPU Passthrough

First, verify that your system supports IOMMU (Intel VT-d):
```bash
# Check if IOMMU is available
dmesg | grep -e DMAR -e IOMMU

# Check CPU virtualization support
egrep -o '(vmx|svm)' /proc/cpuinfo | sort -u
# Should output: vmx (Intel) or svm (AMD)
```

Now enable IOMMU in GRUB:
```bash
# For Intel systems (Legion Desktop)
sed -i 's/GRUB_CMDLINE_LINUX_DEFAULT="quiet"/GRUB_CMDLINE_LINUX_DEFAULT="quiet intel_iommu=on iommu=pt"/' /etc/default/grub
update-grub

# Blacklist Nouveau + enable vfio
echo -e "blacklist nouveau\nblacklist nvidiafb" | tee /etc/modprobe.d/blacklist-nvidia.conf
cat <<'EOM' | tee /etc/modules-load.d/vfio.conf
vfio
vfio_iommu_type1
vfio_pci
vfio_virqfd
EOM

# Find your NVIDIA GPU PCI IDs
echo "Finding NVIDIA GPU PCI IDs..."
lspci -nn | grep -i nvidia

# Example output:
# 01:00.0 VGA compatible controller [0300]: NVIDIA Corporation GP106 [GeForce GTX 1060 6GB] [10de:1c03] (rev a1)
# 01:00.1 Audio device [0403]: NVIDIA Corporation GP106 High Definition Audio Controller [10de:10f1] (rev a1)
#
# The IDs you need are in the brackets at the end: [10de:1c03] and [10de:10f1]
# Note: 10de:1b83 is for GTX 1070, 10de:1c03 is for GTX 1060 6GB - use YOUR specific IDs!

# Bind GPU to vfio-pci - REPLACE THESE IDS WITH YOUR OUTPUT FROM ABOVE
# For GTX 1060 6GB, typical IDs are: 10de:1c03,10de:10f1
echo "options vfio-pci ids=10de:1c03,10de:10f1" | tee /etc/modprobe.d/vfio-pci.conf

# Apply changes
update-initramfs -u -k all

# Reboot to apply all changes
reboot
```

After reboot, verify GPU passthrough is configured correctly:
```bash
# Check IOMMU is enabled
dmesg | grep -i iommu | head -20

# Verify GPU is bound to vfio-pci (not nvidia or nouveau)
lspci -k | grep -A 3 -i nvidia

# Expected output should show:
# Kernel driver in use: vfio-pci

# Check IOMMU groups
for d in /sys/kernel/iommu_groups/*/devices/*; do
  n=${d#*/iommu_groups/*}; n=${n%%/*}
  printf 'IOMMU Group %s ' "$n"
  lspci -nns "${d##*/}"
done | grep -i nvidia

# Ideally, GPU VGA and Audio should be in the same IOMMU group
```

#### Step 1.4: Create Windows 11 Gaming VM (VMID 100)

First, download required ISOs:
```bash
cd /var/lib/vz/template/iso

# Download VirtIO drivers ISO
wget https://fedorapeople.org/groups/virt/virtio-win/direct-downloads/stable-virtio/virtio-win.iso

# Upload your Windows 11 ISO to this directory (via SCP or Proxmox UI)
# You can download it from: https://www.microsoft.com/software-download/windows11
```

Create the VM in Proxmox UI:
1. **General Tab**:
   - VM ID: 100
   - Name: Windows-11-Gaming
2. **OS Tab**:
   - ISO image: Select your Windows 11 ISO
   - Guest OS: Microsoft Windows, Version 11/2022
3. **System Tab**:
   - Machine: q35
   - BIOS: OVMF (UEFI)
   - Add EFI Disk: Yes
   - Add TPM: Yes (v2.0) - required for Windows 11
   - SCSI Controller: VirtIO SCSI
4. **Disks Tab**:
   - Bus/Device: VirtIO Block
   - Storage: local-zfs (rpool)
   - Disk size: 256 GiB (expand later if needed)
   - Cache: Write back
   - Discard: Enabled (for trim support)
5. **CPU Tab**:
   - Sockets: 1
   - Cores: 6
   - Type: host
6. **Memory Tab**:
   - Memory: 16384 MiB (16GB)
   - Ballooning Device: Enabled
   - Minimum memory: 8192 MiB
7. **Network Tab**:
   - Bridge: vmbr0
   - Model: VirtIO (paravirtualized)

After VM creation, configure GPU passthrough:
```bash
# Add GTX 1060 to the VM
# Find your GPU PCI address
lspci | grep -i nvidia
# Example output: 01:00.0 VGA compatible controller: NVIDIA...
#                 01:00.1 Audio device: NVIDIA...

# Add GPU via command line (replace 01:00 with your address)
qm set 100 -hostpci0 01:00,pcie=1,x-vga=1

# Alternative: Add via Proxmox UI
# Hardware → Add → PCI Device → Select GPU → Check "All Functions" + "Primary GPU"
```

Add additional CD/DVD drive for VirtIO drivers:
```bash
qm set 100 -ide2 local:iso/virtio-win.iso,media=cdrom
```

**Installing Windows 11**:
1. Start the VM and connect via Console (noVNC)
2. Boot from Windows 11 ISO
3. When you reach "Where do you want to install Windows?" and see no drives:
   - Click "Load driver"
   - Browse to the VirtIO CD (E: or D:)
   - Navigate to `viostor\w11\amd64`
   - Select "Red Hat VirtIO SCSI controller" and install
   - Now you should see the 256GB disk
4. Complete Windows installation normally
5. **After first boot**, install remaining VirtIO drivers:
   - Open File Explorer → virtio-win CD
   - Run `virtio-win-gt-x64.msi` (guest tools installer)
   - This installs: Network, Balloon, Serial, and other drivers
   - Reboot when complete

**Post-Installation**:
1. Install QEMU Guest Agent (included in virtio-win-gt-x64.msi)
2. Enable Guest Agent in Proxmox: `qm set 100 --agent 1`
3. Reboot VM to activate agent
4. Download and install NVIDIA drivers from nvidia.com (GTX 1060 drivers)
5. Run Windows Update
6. Install Steam, Discord, and your games
7. Test GPU performance with GPU-Z or a benchmark tool

#### Step 1.5: Build the Infrastructure LXC (CT 200)

First, download the Debian container template:
```bash
pveam update
pveam available | grep debian
pveam download local debian-12-standard_12.2-1_amd64.tar.zst
```

Create an **unprivileged** container (more secure):
```bash
pct create 200 local:vztmpl/debian-12-standard_12.2-1_amd64.tar.zst \
  --hostname infra-lxc \
  --storage local-zfs \
  --rootfs 8 \
  --memory 6144 \
  --cores 4 \
  --net0 name=eth0,bridge=vmbr0,ip=192.168.50.120/24,gw=192.168.50.1 \
  --nameserver 192.168.50.1 \
  --features nesting=1 \
  --unprivileged 1 \
  --password
```

**Important**: For Docker to work in unprivileged containers, you need to configure ID mapping:
```bash
# Add to the container config for proper permissions
cat >> /etc/pve/lxc/200.conf <<EOF
# Enable Docker in unprivileged container
lxc.apparmor.profile: unconfined
lxc.cgroup2.devices.allow: a
lxc.cap.drop:
lxc.mount.auto: proc:rw sys:rw
EOF
```

Mount the ZFS dataset for persistent data:
```bash
# First, create the dataset on the host
zfs create rpool/infra

# Add mount point to container config
echo "mp0: rpool/infra,mp=/srv/infra" >> /etc/pve/lxc/200.conf
```

Start the container and install Docker:
```bash
pct start 200

# Enter the container
pct enter 200

# Inside container - update and install packages
apt update && apt upgrade -y
apt install -y curl gnupg2 ca-certificates

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose plugin
apt install -y docker-compose-plugin

# Install other useful tools
apt install -y git vim htop ncdu tailscale

# Verify Docker is working
docker --version
docker compose version

# Exit container
exit
```

Set up the `/srv/infra` directory structure:
```bash
pct exec 200 -- bash -c "
mkdir -p /srv/infra/{portainer,rustdesk,nextcloud,watchtower}
mkdir -p /srv/infra/nextcloud/{db,config,data}
chmod -R 755 /srv/infra
"
```

The container is now ready to deploy Docker services (see Service Configuration section for compose files).

#### Step 1.6: Create Storage LXC (CT 210)

Clone CT 200 to create CT 210:
```bash
# Clone the container
pct clone 200 210 --hostname storage-lxc --full

# Update network configuration
pct set 210 --net0 name=eth0,bridge=vmbr0,ip=192.168.50.125/24,gw=192.168.50.1

# Add mount points for bulk storage
cat >> /etc/pve/lxc/210.conf <<EOF
mp0: bulkpool/media,mp=/media
mp1: bulkpool/cloud,mp=/cloud
EOF

# Start the container
pct start 210
```

Configure NFS and Samba exports:
```bash
# Enter the container
pct enter 210

# Install NFS and Samba
apt update
apt install -y nfs-kernel-server samba samba-common-bin

# Configure NFS exports
cat >> /etc/exports <<EOF
# Media share for Jellyfin node (Dell)
/media 192.168.50.130(rw,sync,no_subtree_check,root_squash,all_squash,anonuid=1000,anongid=1000)
# Backup share
/cloud 192.168.50.0/24(rw,sync,no_subtree_check,root_squash)
EOF

# Apply NFS exports
exportfs -ra
systemctl enable --now nfs-kernel-server

# Configure Samba for Windows access
cat >> /etc/samba/smb.conf <<EOF

[media]
   comment = Media Library
   path = /media
   browseable = yes
   read only = no
   guest ok = no
   valid users = @users
   create mask = 0664
   directory mask = 0775

[cloud]
   comment = Nextcloud Data
   path = /cloud
   browseable = yes
   read only = no
   guest ok = no
   valid users = @users
   create mask = 0664
   directory mask = 0775
EOF

# Create a Samba user (replace with your username)
smbpasswd -a root

# Restart Samba
systemctl enable --now smbd nmbd
systemctl restart smbd nmbd

# Verify services are running
systemctl status nfs-kernel-server smbd

exit
```

Create proper directory structure and permissions:
```bash
pct exec 210 -- bash -c "
mkdir -p /media/{Movies,TV,Music,Photos}
mkdir -p /cloud
chown -R 1000:1000 /media /cloud
chmod -R 755 /media /cloud
"
```

Verify shares are accessible:
```bash
# Test NFS from Legion host
showmount -e 192.168.50.125

# Test from Jellyfin node (Dell)
ssh 192.168.50.130 "showmount -e 192.168.50.125"
```

#### Step 1.7: Configure UPS & Backups on Legion

Install and configure apcupsd for UPS monitoring:
```bash
# Install apcupsd
apt install -y apcupsd

# Configure apcupsd
cat > /etc/apcupsd/apcupsd.conf <<EOF
## apcupsd.conf - APC UPS configuration

UPSCABLE usb
UPSTYPE usb
DEVICE

# Hostname and device name
UPSNAME Legion-UPS
DEVICE

# Shutdown parameters
BATTERYLEVEL 20
MINUTES 5
TIMEOUT 0

# Network server settings (for remote monitoring)
NETSERVER on
NISIP 0.0.0.0
NISPORT 3551

# Logging
STATTIME 300
STATFILE /var/log/apcupsd.status
LOGSTATS on
DATATIME 0
EOF

# Enable apcupsd
systemctl enable apcupsd
systemctl start apcupsd

# Verify UPS is detected
apcaccess status
```

Configure graceful VM/CT shutdown on power loss:
```bash
# Create custom shutdown script
cat > /etc/apcupsd/doshutdown <<'EOF'
#!/bin/bash
# Custom Proxmox shutdown script for UPS power loss

WALL="/usr/bin/wall"
SHUTDOWN="/sbin/shutdown"

echo "UPS power failure - initiating graceful shutdown" | ${WALL}

# Shutdown all VMs gracefully
echo "Stopping VMs..." | ${WALL}
for vmid in $(qm list | awk 'NR>1 {print $1}'); do
    echo "Stopping VM ${vmid}..."
    qm shutdown ${vmid} --timeout 120 &
done

# Shutdown all containers
echo "Stopping containers..." | ${WALL}
for ctid in $(pct list | awk 'NR>1 {print $1}'); do
    echo "Stopping CT ${ctid}..."
    pct shutdown ${ctid} --timeout 120 &
done

# Wait for all VMs/CTs to stop
echo "Waiting for VMs and containers to shutdown..." | ${WALL}
wait

# Give ZFS a moment to flush
sleep 10

# Now shutdown the host
echo "Shutting down host system..." | ${WALL}
${SHUTDOWN} -h now "apcupsd UPS power failure shutdown"
EOF

chmod +x /etc/apcupsd/doshutdown

# Update apccontrol to call our custom script
sed -i 's|/sbin/shutdown -h now|/etc/apcupsd/doshutdown|g' /etc/apcupsd/apccontrol

# Restart apcupsd to apply changes
systemctl restart apcupsd
```

Test the UPS configuration:
```bash
# Check UPS status
apcaccess status

# Expected output should show:
# STATUS   : ONLINE
# LINEV    : ~120V (or your region's voltage)
# LOADPCT  : <percentage>
# BCHARGE  : 100.0 Percent
# TIMELEFT : <minutes>

# Test power failure simulation (ONLY IF YOU'RE READY!)
# apctest
# Choose option 1 (simulate power failure)
# Watch the shutdown process
```

Create ZFS replication script (will be completed in Phase 3 after backup node is set up):
```bash
# Placeholder - full script added in Step 3.3
touch /usr/local/sbin/zfs-replicate.sh
chmod +x /usr/local/sbin/zfs-replicate.sh
```

#### Step 1.8: Configure SMART Monitoring

Install and configure smartmontools to monitor drive health:
```bash
# Install smartmontools
apt install -y smartmontools

# Enable SMART on all drives
for disk in /dev/sd? /dev/nvme?n1; do
    if [ -e "$disk" ]; then
        echo "Enabling SMART on $disk..."
        smartctl -s on "$disk" 2>/dev/null || true
    fi
done

# Test SMART capabilities on each drive
for disk in /dev/sd? /dev/nvme?n1; do
    if [ -e "$disk" ]; then
        echo "=== SMART info for $disk ==="
        smartctl -i "$disk"
        smartctl -H "$disk"  # Health status
        echo ""
    fi
done
```

Configure email alerts for drive failures:
```bash
# Configure smartd
cat > /etc/smartd.conf <<'EOF'
# Monitor all disks, enable automatic attribute autosave
DEVICESCAN -a -o on -S on -n standby,q -s (S/../.././02|L/../../6/03) -W 4,35,40 -m root

# Explanation:
# -a: Monitor all attributes
# -o on: Enable automatic offline tests
# -S on: Enable attribute autosave
# -n standby,q: Don't wake up sleeping drives
# -s (S/../.././02|L/../../6/03): Short test daily at 2am, long test Saturdays at 3am
# -W 4,35,40: Warn on temp differences, min 35°C, max 40°C
# -m root: Send alerts to root user (configure email forwarding below)
EOF

# Enable and start smartd
systemctl enable smartd
systemctl restart smartd

# Verify smartd is monitoring
systemctl status smartd
```

Set up email forwarding (optional):
```bash
# Install postfix for email alerts
apt install -y postfix mailutils

# Configure to use your email provider
# Or set up a relay through Gmail/SendGrid/etc.
# Example: https://www.digitalocean.com/community/tutorials/how-to-install-and-configure-postfix-as-a-send-only-smtp-server-on-ubuntu-20-04

# Test email
echo "SMART monitoring test from Legion Proxmox" | mail -s "SMART Test" your-email@example.com
```

Create a weekly SMART health check script:
```bash
cat > /usr/local/sbin/smart-health-check.sh <<'EOF'
#!/bin/bash
# Weekly SMART health report

REPORT_FILE="/tmp/smart-health-report.txt"
echo "SMART Health Report - $(date)" > "$REPORT_FILE"
echo "========================================" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

for disk in /dev/sd? /dev/nvme?n1; do
    if [ -e "$disk" ]; then
        echo "=== $disk ===" >> "$REPORT_FILE"
        smartctl -H "$disk" >> "$REPORT_FILE" 2>&1
        smartctl -A "$disk" | grep -E "(Reallocated_Sector_Ct|Current_Pending_Sector|Offline_Uncorrectable|Temperature_Celsius|Power_On_Hours)" >> "$REPORT_FILE" 2>&1
        echo "" >> "$REPORT_FILE"
    fi
done

# Optionally email the report
# mail -s "Weekly SMART Health Report" root < "$REPORT_FILE"

# Or just log it
cat "$REPORT_FILE" >> /var/log/smart-health.log
EOF

chmod +x /usr/local/sbin/smart-health-check.sh

# Schedule weekly report (Sundays at 6am)
(crontab -l 2>/dev/null; echo "0 6 * * 0 /usr/local/sbin/smart-health-check.sh") | crontab -
```

Check current drive health:
```bash
# Run the health check script manually
/usr/local/sbin/smart-health-check.sh
cat /tmp/smart-health-report.txt

# Check ZFS pool status
zpool status -v

# Check for any ZFS errors
zpool status | grep -i error
```

### Phase 2: Deploy the Media & Application Node (Dell Latitude 7520)

#### Step 2.1: Install Ubuntu Server 24.04
1. Write the ISO using Ventoy/Etcher, boot the Dell, and install with static IP `192.168.50.130`.
2. Select **OpenSSH server** during install.
3. After first boot:
```bash
sudo apt update && sudo apt upgrade -y
sudo timedatectl set-timezone <your-zone>
```

#### Step 2.2: Enable Intel Quick Sync
```bash
sudo usermod -aG video,audio $USER
sudo apt install -y intel-media-va-driver-non-free vainfo
vainfo  # verify H.264/H.265 support
```
Optional tuning:
```bash
echo 'options i915 enable_guc=3' | sudo tee /etc/modprobe.d/i915.conf
sudo update-initramfs -u -k all && sudo reboot
```

#### Step 2.3: Install Docker & Compose
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
sudo apt install -y docker-compose-plugin
```

#### Step 2.4: Mount Legion’s Media Share
```bash
sudo mkdir -p /mnt/media
sudo nano /etc/fstab
# 192.168.50.110:/bulkpool/media  /mnt/media  nfs  defaults,_netdev  0  0
sudo mount -a
```

#### Step 2.5: Deploy Jellyfin + Tdarr
Create `/srv/media/docker-compose.yml` (see Service Configuration for the full file) and run `docker compose up -d`.

#### Step 2.6: Optional Media Apps
- qBittorrent, Sonarr/Radarr, Lidarr, Bazarr.
- Kavita/Plex alternatives.
- Monitor GPU with `sudo intel_gpu_top`.

### Phase 3: Build the Backup & Observability Node (Lenovo T480s)

#### Step 3.1: Hardware Prep
- Remove battery, mount SSD mirror, connect Ethernet and (optionally) the UPS USB cable.

#### Step 3.2: Install Proxmox Backup Server
1. Install PBS, assign IP `192.168.50.140`.
2. Create `backup-ssd` mirror:
```bash
zpool create backup-ssd mirror /dev/disk/by-id/ssdA /dev/disk/by-id/ssdB
zfs create backup-ssd/vmdata
```
3. Add datastore in the PBS UI pointing to `/backup-ssd/vmdata`.

#### Step 3.3: Configure ZFS Replication

Set up SSH keys for password-less replication:
```bash
# On Legion, create SSH key for replication
ssh-keygen -t ed25519 -f /root/.ssh/pbs -N ""
ssh-copy-id -i /root/.ssh/pbs.pub root@192.168.50.140

# Test connection
ssh -i /root/.ssh/pbs root@192.168.50.140 "hostname"
```

Create the ZFS replication script with proper incremental support:
```bash
cat > /usr/local/sbin/zfs-replicate.sh <<'EOF'
#!/bin/bash
# ZFS replication script with incremental support
# Replicates datasets from Legion to T480s backup node

set -euo pipefail

# Configuration
REMOTE_HOST="root@192.168.50.140"
SSH_KEY="/root/.ssh/pbs"
DATASETS=("rpool/vmdata" "bulkpool/media" "bulkpool/cloud")
SNAP_PREFIX="repl"
LOG_FILE="/var/log/zfs-replication.log"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log "=== Starting ZFS replication ==="

for ds in "${DATASETS[@]}"; do
    log "Processing dataset: $ds"

    # Create snapshot with timestamp
    SNAP_NAME="${SNAP_PREFIX}-$(date +%Y%m%d-%H%M%S)"
    SNAP="${ds}@${SNAP_NAME}"

    # Create snapshot
    if ! zfs snapshot "$SNAP"; then
        log "ERROR: Failed to create snapshot $SNAP"
        continue
    fi
    log "Created snapshot: $SNAP"

    # Determine target dataset name
    TARGET_DS="backup-ssd/${ds}"

    # Check if target dataset exists
    if ssh -i "$SSH_KEY" "$REMOTE_HOST" "zfs list -H -o name $TARGET_DS" 2>/dev/null; then
        # Target exists - do incremental send
        # Find the most recent common snapshot
        LAST_SNAP=$(ssh -i "$SSH_KEY" "$REMOTE_HOST" \
            "zfs list -H -t snapshot -o name -s creation $TARGET_DS 2>/dev/null" | \
            grep "@${SNAP_PREFIX}-" | tail -1 | cut -d@ -f2)

        if [ -n "$LAST_SNAP" ]; then
            # Verify source has this snapshot
            if zfs list -H -t snapshot "${ds}@${LAST_SNAP}" &>/dev/null; then
                log "Incremental send from ${ds}@${LAST_SNAP} to ${SNAP}"
                if zfs send -I "${ds}@${LAST_SNAP}" "$SNAP" | \
                   ssh -i "$SSH_KEY" "$REMOTE_HOST" "zfs recv -F $TARGET_DS"; then
                    log "Successfully replicated $ds (incremental)"
                else
                    log "ERROR: Incremental replication failed for $ds"
                fi
            else
                log "WARNING: Last snapshot ${LAST_SNAP} not found on source, doing full send"
                if zfs send -R "$SNAP" | \
                   ssh -i "$SSH_KEY" "$REMOTE_HOST" "zfs recv -F $TARGET_DS"; then
                    log "Successfully replicated $ds (full)"
                else
                    log "ERROR: Full replication failed for $ds"
                fi
            fi
        else
            log "No previous snapshots found, doing full send"
            if zfs send -R "$SNAP" | \
               ssh -i "$SSH_KEY" "$REMOTE_HOST" "zfs recv -F $TARGET_DS"; then
                log "Successfully replicated $ds (full)"
            else
                log "ERROR: Full replication failed for $ds"
            fi
        fi
    else
        # Target doesn't exist - do initial full send
        log "Target dataset doesn't exist, doing initial full send"
        if zfs send -R "$SNAP" | \
           ssh -i "$SSH_KEY" "$REMOTE_HOST" "zfs recv $TARGET_DS"; then
            log "Successfully created and replicated $ds (initial)"
        else
            log "ERROR: Initial replication failed for $ds"
        fi
    fi
done

# Cleanup old replication snapshots (keep last 7 days)
log "Cleaning up old replication snapshots..."
CLEANUP_DATE=$(date -d '7 days ago' +%Y%m%d 2>/dev/null || date -v-7d +%Y%m%d)
for ds in "${DATASETS[@]}"; do
    zfs list -H -t snapshot -o name "$ds" | grep "@${SNAP_PREFIX}-" | while read snap; do
        snap_date=$(echo "$snap" | grep -oP '@'"${SNAP_PREFIX}"'-\K\d{8}' || \
                    echo "$snap" | sed -n 's/.*@'"${SNAP_PREFIX}"'-\([0-9]\{8\}\).*/\1/p')
        if [ -n "$snap_date" ] && [ "$snap_date" -lt "$CLEANUP_DATE" ]; then
            log "Removing old snapshot: $snap"
            zfs destroy "$snap" || log "WARNING: Failed to remove $snap"
        fi
    done
done

log "=== ZFS replication completed ==="
EOF

chmod +x /usr/local/sbin/zfs-replicate.sh
```

Test the replication script:
```bash
# Run manually first to verify it works
/usr/local/sbin/zfs-replicate.sh

# Check the log
tail -50 /var/log/zfs-replication.log

# Verify snapshots were created
zfs list -t snapshot | grep repl-

# Verify data arrived on backup server
ssh root@192.168.50.140 "zfs list -t all | grep backup-ssd"
```

Schedule nightly replication:
```bash
# Add cron job for 3 AM daily
(crontab -l 2>/dev/null; echo "0 3 * * * /usr/local/sbin/zfs-replicate.sh") | crontab -

# Verify cron entry
crontab -l
```

#### Step 3.4: Proxmox Backup Jobs
- Add PBS storage in Proxmox (`Datacenter → Storage → Add → PBS`).
- Create nightly backup jobs for VM 100, CT 200, CT 210 (keep at least 7 versions).
- Test restore quarterly.

#### Step 3.5: UPS & Monitoring
```bash
apt install apcupsd prometheus-node-exporter grafana-agent
```
- Configure PBS as an `apcupsd` NETCLIENT.
- Ship Prometheus metrics to Grafana or a lightweight Loki/Promtail stack.

---

## Service Configuration

### RustDesk Setup (Infra LXC)

Create the RustDesk directory and docker-compose file:
```bash
# On CT 200 (infra-lxc)
mkdir -p /srv/infra/rustdesk
cd /srv/infra/rustdesk

cat > docker-compose.yml <<'EOF'
services:
  hbbs:
    image: rustdesk/rustdesk-server:latest
    container_name: rustdesk-hbbs
    command: hbbs -r 192.168.50.120:21117
    volumes:
      - ./data:/root
    ports:
      - 21115:21115
      - 21116:21116
      - 21116:21116/udp
      - 21118:21118
    restart: unless-stopped

  hbbr:
    image: rustdesk/rustdesk-server:latest
    container_name: rustdesk-hbbr
    command: hbbr
    volumes:
      - ./data:/root
    ports:
      - 21117:21117
      - 21119:21119
    restart: unless-stopped
EOF

# Deploy the stack
docker compose up -d

# Wait a few seconds for containers to start
sleep 5

# Copy the public key (needed for RustDesk clients)
cat ./data/id_ed25519.pub
echo "Save this public key for configuring RustDesk clients"
```

**Configure RustDesk clients:**
- On each client machine, install RustDesk
- Settings → Network → ID Server: `192.168.50.120`
- Settings → Network → Relay Server: `192.168.50.120`
- Settings → Network → Key: `<paste the public key from above>`

### Jellyfin Media Organization
- Folder structure on Legion:
```bash
sudo mkdir -p /bulkpool/media/{Movies,TV,Music,Photos}
sudo chown -R 1000:1000 /bulkpool/media
```
- Follow the standard naming scheme, mount shares on your workstation, and trigger library scans at `http://192.168.50.130:8096`.

### Jellyfin Hardware Acceleration Options
| Device | GPU | Best Use | Notes |
|--------|-----|----------|-------|
| Dell Latitude 7520 | Intel Iris Xe (11th gen) | 4K HDR → 1080p HEVC/H.264, AV1 decode | Best choice; supports ≥4 simultaneous 1080p transcodes with VA-API.
| Lenovo T480s | Intel UHD 620 (8th gen) | Up to two 1080p streams | Works if Dell is offline; install `intel-media-va-driver-non-free`.
| ThinkPad X1 | Intel UHD 620 (varies by gen) | Test/dev workloads | Suitable for lab Jellyfin or backup server.

Enable Quick Sync:
```bash
sudo usermod -aG render,audio,dri $USER
sudo chmod 755 /dev/dri
```
Then set Jellyfin → Dashboard → Playback → Hardware acceleration = **VA-API** with device `/dev/dri/renderD128`.

### Nextcloud (Infra LXC)
- Reverse proxy (Caddy/Traefik) optional, otherwise access via `https://192.168.50.120`.
- Data directory on `/bulkpool/cloud`; database lives on `fastpool/infra`.
- Install apps: Calendar, Contacts, Tasks, Notes, Photos, Deck, Talk.

### Additional Services
- Portainer, Dockge, Watchtower inside CT 200.
- Grafana/Loki/Prometheus either on CT 200 or the T480s backup node.
- Tdarr/qBittorrent stack already outlined under Phase 2.

---

## Remote Access Setup

### Tailscale VPN
1. Install on Legion Proxmox host and advertise `192.168.50.0/24`.
2. Join from CT 200, Dell 7520, PBS, and the Windows VM.
3. Approve subnet routes + exit nodes in the Tailscale admin console.
4. Use ACLs to limit which devices can reach Jellyfin, Nextcloud, etc.

---

## Maintenance & Best Practices

### Monthly Tasks
**ZFS Pool Scrubbing:**
```bash
# Run scrub on all pools
zpool scrub rpool
zpool scrub bulkpool

# Check scrub progress
zpool status

# View scrub history
zpool history | grep scrub
```

**SMART Monitoring:**
```bash
# Check all drive health
for disk in /dev/sd? /dev/nvme?n1; do
    [ -e "$disk" ] && smartctl -H "$disk"
done

# Check drive temperatures
smartctl -A /dev/sda | grep Temperature
```

**Update Systems:**
```bash
# Proxmox host
apt update && apt upgrade -y

# Containers
pct exec 200 -- bash -c "apt update && apt upgrade -y"
pct exec 210 -- bash -c "apt update && apt upgrade -y"

# Dell media node
ssh 192.168.50.130 "sudo apt update && sudo apt upgrade -y && sudo docker images | grep -v REPOSITORY | awk '{print $1}' | xargs -L1 docker pull"
```

### Quarterly Tasks
**UPS Maintenance:**
```bash
# Check UPS status and battery health
apcaccess status

# Run self-test
apctest  # Choose option for runtime calibration

# Review UPS event log
tail -100 /var/log/apcupsd.events
```

**Backup Verification:**
```bash
# Test Proxmox Backup Server restore
# Create a test VM
qm create 999 --name backup-test --memory 1024 --cores 1 --net0 virtio,bridge=vmbr0

# Restore latest backup to test VM
# (Use PBS UI or: pbs-restore vm 100 999 --repository root@192.168.50.140:datastore)

# Boot test VM and verify
qm start 999

# Clean up
qm stop 999
qm destroy 999

# Test ZFS replication restore
ssh root@192.168.50.140 "zfs list -t snapshot backup-ssd/rpool/vmdata | tail -5"
```

### Weekly Tasks - Archive Disk Backup

**IMPORTANT: Archive backups are currently DEFERRED**

The 3TB archive drive is not connected due to a broken SATA port on the Legion motherboard. This functionality will be available once you:
1. Acquire a USB 3.0 SATA enclosure for the 3TB drive, OR
2. Install a PCIe SATA expansion card to add more SATA ports

**When the 3TB drive is reconnected via USB enclosure**, create the archive disk backup script:
```bash
cat > /usr/local/sbin/zfs-archive.sh <<'EOF'
#!/bin/bash
# Weekly offline archive backup script
# Connect the 3TB archive disk via USB before running

set -euo pipefail

ARCHIVE_POOL="archive"
DATE=$(date +%Y%m%d)
LOG_FILE="/var/log/zfs-archive.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log "=== Starting archive backup ==="

# Check if archive disk is connected
if ! zpool list "$ARCHIVE_POOL" &>/dev/null; then
    # Try to import it
    if zpool import 2>&1 | grep -q "$ARCHIVE_POOL"; then
        log "Importing archive pool..."
        zpool import "$ARCHIVE_POOL"
    else
        log "ERROR: Archive pool not found. Connect the 3TB USB drive and run: zpool import $ARCHIVE_POOL"
        exit 1
    fi
fi

log "Archive pool status:"
zpool status "$ARCHIVE_POOL" | tee -a "$LOG_FILE"

# Create full recursive snapshots and send to archive
# NOTE: Only backing up bulkpool for now (VMs on local-lvm don't use ZFS yet)
for pool in bulkpool; do
    log "Archiving $pool..."

    SNAP="${pool}@archive-${DATE}"

    # Create snapshot
    if ! zfs snapshot -r "$SNAP"; then
        log "ERROR: Failed to create snapshot $SNAP"
        continue
    fi

    # Send to archive (full send with replication stream)
    if zfs send -R "$SNAP" | zfs recv -F "${ARCHIVE_POOL}/${pool}"; then
        log "Successfully archived $pool"
    else
        log "ERROR: Failed to archive $pool"
    fi
done

# Cleanup old archive snapshots (keep last 4 weekly backups)
log "Cleaning up old archive snapshots..."
CLEANUP_DATE=$(date -d '28 days ago' +%Y%m%d 2>/dev/null || date -v-28d +%Y%m%d)
for pool in bulkpool; do
    zfs list -H -t snapshot -o name "${ARCHIVE_POOL}/${pool}" 2>/dev/null | \
        grep "@archive-" | while read snap; do
        snap_date=$(echo "$snap" | sed -n 's/.*@archive-\([0-9]\{8\}\)/\1/p')
        if [ -n "$snap_date" ] && [ "$snap_date" -lt "$CLEANUP_DATE" ]; then
            log "Removing old archive snapshot: $snap"
            zfs destroy "$snap" || log "WARNING: Failed to remove $snap"
        fi
    done
done

# Scrub the archive pool
log "Starting scrub of archive pool..."
zpool scrub "$ARCHIVE_POOL"

log "=== Archive backup completed ==="
log "Scrub is running. Wait for completion, then run: zpool export $ARCHIVE_POOL"
log "You can check scrub progress with: zpool status $ARCHIVE_POOL"
EOF

chmod +x /usr/local/sbin/zfs-archive.sh
```

**To use the archive backup (when available):**
```bash
# 1. Connect the 3TB archive drive via USB enclosure
# 2. Run the script
/usr/local/sbin/zfs-archive.sh

# 3. Wait for scrub to complete (check with: zpool status archive)
watch -n 10 zpool status archive

# 4. Export the pool (safely unmount)
zpool export archive

# 5. Disconnect the drive and store it off-site
```

**Temporary Alternative Backup Strategy:**
Until the archive drive is available, back up critical data to:
- External USB drive (manual weekly exports)
- Cloud storage (rclone to Backblaze B2, Google Drive, etc.)
- Network share on another machine

### Patch Cadence
- **Proxmox host**: Monthly security updates
- **Windows VM**: Patch Tuesday (second Tuesday of month)
- **Containers**: Weekly updates or use Watchtower for automation
- **PBS backup node**: Monthly updates

### Configuration Backups
```bash
# Backup Proxmox configs
mkdir -p /root/config-backups
tar -czf /root/config-backups/proxmox-config-$(date +%Y%m%d).tar.gz \
    /etc/pve \
    /etc/network/interfaces \
    /etc/hosts \
    /etc/apcupsd \
    /usr/local/sbin

# Backup Docker Compose files
pct exec 200 -- tar -czf /root/docker-compose-backup-$(date +%Y%m%d).tar.gz /srv/infra

# Copy to Nextcloud or commit to private Git repo
```

### General Best Practices
- Keep laptops used as 24/7 servers on cooling pads with good airflow
- Monitor temperatures during summer months
- Replace UPS battery every 3-4 years or when runtime drops below 50% of spec
- Keep documentation updated when you make changes
- Test disaster recovery procedures at least once a year

---

## Summary

### What You Built
✅ Legion Proxmox host with GPU-passthrough Windows VM, ZFS rpool/bulkpool, and UPS support
✅ Dell 7520 media node leveraging Intel Quick Sync for Jellyfin/Tdarr hardware transcoding
✅ Lenovo T480s backup node with Proxmox Backup Server + mirrored SSDs receiving ZFS replicas
✅ Nextcloud, Samba/NFS, Portainer, RustDesk, and Tailscale running from unprivileged LXC containers
✅ Multi-tier backup strategy: snapshots + replication + PBS + cold archive covering all failure scenarios
✅ Complete monitoring: SMART health checks, UPS monitoring, automatic snapshots

### Costs & Expectations
- Hardware + software: $0 (reuse).
- Power: ~$12-15/month for Legion + Dell + T480s on UPS.
- Gaming performance: 95-98% native via passthrough.
- Transcoding: 4×1080p or 2×4K→1080p on Dell; 1-2×1080p on T480s.

---

## Quick Reference: IP Addresses
```
192.168.50.110 - Legion Proxmox host (https://192.168.50.110:8006)
192.168.50.111 - Windows 11 Gaming VM
192.168.50.120 - Infra LXC (Docker, Portainer, RustDesk, Nextcloud)
192.168.50.130 - Dell Latitude 7520 (Jellyfin/Tdarr)
192.168.50.140 - Lenovo T480s Proxmox Backup Server
```

---

## Getting Help
1. Gather service status/logs (`systemctl`, `journalctl`, `docker compose logs`).
2. Capture exact error strings before searching or posting.
3. Include goal, expected vs. actual result, hardware, OS versions, and what you’ve tried when asking for help.

Enjoy the upgraded Option A build—now with real redundancy, UPS coverage, and dedicated Jellyfin hardware acceleration!
