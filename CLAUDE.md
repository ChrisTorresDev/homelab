# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Purpose

This is a homelab documentation repository containing:
1. Comprehensive setup guides (`your_hardware_homelab.md`, `phase1-simplified-build.md`) for building a self-hosted infrastructure using repurposed hardware
2. **Portfolio website project** (`portfolio-website/`) - A professional Next.js website for showcasing freelance Python automation projects, designed to be self-hosted on the homelab infrastructure

## Hardware Context

The guide is tailored to a specific hardware configuration:
- **Lenovo Legion Desktop** (32GB RAM, GTX 1060 6GB, 512GB NVMe + 2x 1TB HDDs) - Gaming PC running Proxmox VE 24/7
  - **Note**: Originally had 3TB HDD but removed due to broken SATA port
- **2x Lenovo T480s laptops** - One for Proxmox Backup Server (backup/observability node), one spare
- **2x ThinkPad X1 laptops** - Lab/dev boxes for testing
- **1x Dell Latitude 7520** - Dedicated Jellyfin/Tdarr media node with Intel Quick Sync
- **External storage** (planned): 4x 1TB SSDs (2 for fastpool mirror on Legion, 2 for backup-ssd mirror on T480s) + 4x 1TB HDDs (RAIDZ1 bulkpool expansion) + 1x 3TB HDD (cold backup archive - currently offline)

## Architecture Overview

**Option A (Proxmox with GPU Passthrough)** is the selected architecture:

1. **Legion Desktop (192.168.50.110)**: Runs Proxmox VE 24/7 as primary hypervisor with GPU passthrough for Windows 11 gaming VM
2. **VM 100 - Windows 11 Gaming (192.168.50.111)**: GTX 1060 passthrough, 16GB RAM, native gaming performance
3. **CT 200 - Infra LXC (192.168.50.120)**: Docker host running Portainer, RustDesk, Nextcloud, Tailscale, AdGuard Home
4. **CT 210 - Storage LXC**: Samba/NFS exports, snapshot scripts
5. **Dell Latitude 7520 (192.168.50.130)**: Ubuntu Server + Docker running Jellyfin/Tdarr with Intel Quick Sync hardware transcoding
6. **T480s #1 (192.168.50.140)**: Proxmox Backup Server with backup-ssd mirror receiving ZFS replicas
7. **Remote Access**: Tailscale VPN for secure remote access without port forwarding

### Key Services
- **RustDesk**: Self-hosted remote desktop server (CT 200)
- **Jellyfin**: Media server with Intel Quick Sync transcoding (Dell 7520)
- **Sonarr**: TV show automation and library management (Dell 7520)
- **Radarr**: Movie automation and library management (Dell 7520)
- **qBittorrent**: Torrent download client (Dell 7520)
- **Prowlarr**: Indexer manager for Sonarr/Radarr (Dell 7520)
- **Nextcloud**: Cloud storage on bulkpool (CT 200/210)
- **Portainer**: Docker container management UI (CT 200)
- **AdGuard Home**: Network-wide ad-blocking DNS sinkhole (CT 200)
- **Tailscale**: Zero-config VPN mesh network
- **Nginx Proxy Manager**: Reverse proxy with Let's Encrypt SSL automation (CT 200)
- **Uptime Kuma**: Service monitoring dashboard with alerting (CT 200)
- **Proxmox Backup Server**: Automated VM/CT backups with retention (planned Phase 3)

### Storage Architecture (ZFS)
- **rpool** (NVMe single disk on Legion): Proxmox system, VM disks - **✅ Active**
- **bulkpool** (4x 1TB HDD RAIDZ1 via USB): Media, Nextcloud data, general files - **✅ Active (2.55TB usable)**
  - Mediasonic 4-bay USB 3.2 enclosure
  - Single-drive fault tolerance
  - ZFS compression active (~37% space savings)
- **fastpool** (3x 1TB SSD RAIDZ1 via SATA): Docker volumes, VM disks, databases - **✅ Active (1.79TB usable)**
  - Connected via internal SATA
  - Single-drive fault tolerance
  - Optimized for performance (16k recordsize)
- **backup-ssd** (2x 1TB SSD mirror on T480s): Receives ZFS send replicas - **⏳ Planned Phase 3**
- **archive** (3TB HDD): Weekly offline snapshots, unplugged when idle - **⏳ Deferred (needs power adapter)**

### IP Address Scheme
```
192.168.50.110 - Legion Proxmox host
192.168.50.111 - Windows 11 Gaming VM
192.168.50.120 - Infra LXC (Docker/Portainer/RustDesk/Nextcloud/AdGuard)
192.168.50.130 - Dell Latitude 7520 (Jellyfin/Tdarr)
192.168.50.140 - Lenovo T480s Proxmox Backup Server
```

## Documentation Structure

The repository contains multiple interconnected documentation files:

### Main Guides
- **`your_hardware_homelab.md`**: Comprehensive three-phase setup guide for the full homelab architecture
  - Phase 1: Legion Desktop → Proxmox VE with GPU passthrough, ZFS pools, Windows 11 VM, and LXC containers
  - Phase 2: Dell Latitude 7520 → dedicated media node with Intel Quick Sync
  - Phase 3: T480s → backup node with Proxmox Backup Server and ZFS replication

- **`phase1-simplified-build.md`**: Streamlined Phase 1 guide for starting immediately with limited hardware (single NVMe + HDDs, no external enclosures yet). Designed as a stepping stone to the full architecture.
  - **Expanded with Docker Services**: Now includes comprehensive deployment guides for:
    - Portainer (container management UI)
    - Watchtower (automatic container updates)
    - RustDesk (self-hosted remote desktop)
    - Nextcloud (cloud storage)
    - Tailscale (VPN mesh network)
    - AdGuard Home (network-wide ad blocking)
    - Uptime Kuma (service monitoring dashboard)
    - Nginx Proxy Manager (reverse proxy with TLS management)

### Troubleshooting Guides
- **`troubleshooting-ssh-connection.md`**: Step-by-step debugging for Proxmox SSH connectivity issues
- **`proxmox_login_troubleshooting.md`**: Solutions for Proxmox web UI and console authentication problems
- **`mac-network-setup.md`**: macOS-specific network configuration and connectivity troubleshooting

### Portfolio Website Project
- **`portfolio-website/`**: Complete Next.js application for christorresdev.com
  - **`README.md`**: Project overview, tech stack, local development instructions
  - **`deployment/DEPLOYMENT_GUIDE.md`**: Complete step-by-step deployment guide for Proxmox homelab
  - **`app/page.tsx`**: Main portfolio page showcasing Python automation projects
  - **`Dockerfile`** + **`nginx.conf`**: Production containerization
  - **`deployment/docker-compose.*.yml`**: Docker Compose files for all services (NPM, Cloudflared, Portfolio)
- **`PORTFOLIO_WEBSITE_SUMMARY.md`**: High-level project summary, what's completed, and next steps

### Documentation Workflow
- Start with `phase1-simplified-build.md` if building with limited hardware immediately
- Use `your_hardware_homelab.md` as the canonical reference for the complete architecture
- Reference troubleshooting guides when specific issues arise during setup
- For portfolio website deployment, follow `portfolio-website/deployment/DEPLOYMENT_GUIDE.md`
- Keep IP addressing scheme (192.168.50.110-140) consistent across all documentation

## Key Technical Decisions

### Storage Strategy
- **ZFS mirrors + RAIDZ1** for resiliency without RAID controller complexity
- SSDs for fast VM/container workloads
- HDDs pooled for bulk media storage
- NFS exports for Linux/Proxmox access, Samba for Windows access
- Automated snapshots (hourly/daily/weekly) + replication to backup node

### Virtualization Choice
- **Proxmox VE** chosen over VMware ESXi (free license, better homelab support in 2025, GPU passthrough)
- **GPU passthrough** enables simultaneous gaming + services without dual-booting
- **LXC containers** for lightweight service hosting (Docker, storage services)
- VirtIO drivers for optimal VM performance

### Media Server Choice
- **Jellyfin** chosen over Plex (free, no subscription required for remote access as of 2025)
- **Intel Quick Sync** (11th gen Iris Xe) for hardware transcoding on dedicated Dell node
- Supports 4+ simultaneous 1080p transcodes or 2x 4K→1080p

### Remote Access
- **Tailscale** preferred over WireGuard for ease of setup
- Subnet routing enabled to access entire home network remotely
- No port forwarding required

### Backup & Redundancy
**Current Phase (Limited Hardware):**
1. **Local protection**: ZFS mirror (2x 1TB HDD bulkpool) handles single-disk failure
2. **Snapshots**: Hourly (24h) + daily (14d) + weekly (8w) via zfs-auto-snapshot
3. **Critical data**: Manual exports to external USB drive recommended until external storage arrives

**Planned Phase (Full Setup):**
1. **Local protection**: ZFS mirrors + RAIDZ1 handle single-disk failures
2. **Replication**: ZFS send jobs to T480s backup node over SSH
3. **Cold copies**: Weekly snapshots to 3TB archive disk (offline storage) - deferred
4. **PBS backups**: Nightly Proxmox Backup Server jobs for VMs/containers

## Important Safety Notes

**Battery Removal**: The guide emphasizes removing batteries from laptops running 24/7 to prevent fire hazards from battery swelling during constant charging.

**UPS Integration**: APC 1200VA UPS backs Legion + network gear + storage + T480s with apcupsd for graceful shutdowns.

## Homelab-Guru Agent

This repository includes a custom Claude Code agent (`.claude/agents/homelab-guru.md`) specialized in homelab infrastructure guidance. The agent should be consulted for:
- Hardware selection and compatibility questions
- Storage topology decisions (ZFS mirrors vs RAIDZ1/2/3)
- GPU passthrough troubleshooting (IOMMU errors, VT-d configuration)
- Transcoding hardware recommendations (Quick Sync vs NVENC)
- Network architecture and 10GbE implementation
- Power efficiency and UPS sizing
- Virtualization platform best practices

Use the homelab-guru agent when questions require deep homelab expertise beyond basic documentation updates.

## Current Build Progress

**Last Updated**: 2025-12-10 (Phase 2 Media Automation Stack Complete - Sonarr, Radarr, qBittorrent, Prowlarr)

### Phase 1: Legion Desktop Setup (**✅ COMPLETE**)

**Completed Steps:**
- ✅ **Proxmox VE 8 Installation**: Successfully installed on Legion Desktop (192.168.50.110)
  - BIOS configured: VT-x, VT-d, Above 4G Decoding enabled
  - Network configured with static IP
  - Post-installation updates completed
- ✅ **ZFS Pool Configuration**: Created `bulkpool` with 2x 1TB HDD mirror
  - Single-drive fault tolerance active
  - Datasets created: media, cloud, backups, docker
  - Auto-snapshots configured via zfs-auto-snapshot
  - SMART monitoring enabled
- ✅ **GPU Passthrough Setup**: GTX 1060 configured for VM passthrough
  - IOMMU enabled and verified
  - VFIO modules configured
  - GPU PCI IDs bound to vfio-pci driver (10de:1c03,10de:10f1)
  - GPU isolated from host successfully
- ✅ **VM 100 - Windows 11 Gaming**: COMPLETED AND TESTED
  - VM created: 240GB disk, 16GB RAM, 6 cores, UEFI+TPM
  - Windows 11 fully installed and configured
  - VirtIO drivers installed (virtio-win-gt-x64.exe)
  - NVIDIA drivers installed and working
  - GPU passthrough active with x-vga=1 (physical monitor as primary display)
  - USB passthrough configured: Apple keyboard (05ac:024f)
  - Bluetooth passthrough configured: Realtek RTL8822BE (0bda:b023)
  - **Performance Benchmarks (confirming near-native GPU passthrough):**
    - Heaven Benchmark: 130 FPS @ 1080p, 60 FPS @ 1440p, 15 FPS @ 4K
    - Cinebench R23: 5520 pts (multi-core), 1003 pts (single-core)
    - CrystalDiskMark: 4068 MB/s read, 3699 MB/s write (sequential Q1T1)

- ✅ **CT 200 - Infrastructure LXC**: COMPLETED
  - Debian 12 container created (192.168.50.120)
  - Docker and Docker Compose installed
  - **ZFS dataset: fastpool/docker-volumes** (migrated from bulkpool for better performance)
  - Mount point configured: /srv/docker → fastpool/docker-volumes
  - All Docker services running on SSD storage for optimal performance
  - Portainer deployed (https://portainer.christorresdev.com via NPM, https://192.168.50.120:9443 direct)
  - Watchtower deployed (auto-updates containers daily)
  - **RustDesk Server deployed and configured:**
    - Server running on 192.168.50.120
    - Public key: FEZFOdXIu0f3Bzk7duAf8y8P54lOJUjTAcV5bFu9zHM=
    - Clients configured on: Windows VM, Mac, and phone
    - Self-hosted remote desktop working
  - **Nextcloud deployed on bulkpool:**
    - Web UI: https://nextcloud.christorresdev.com (via NPM with SSL)
    - MariaDB + Redis for performance
    - Data stored on bulkpool/cloud dataset
    - Sync clients configured on: Windows VM, Mac, and phone
    - ZFS snapshots protecting cloud data
  - **Tailscale deployed for remote access:**
    - Deployed as a Docker container on infra-lxc (192.168.50.120)
    - Subnet routing enabled for 192.168.50.0/24
    - Remote access to all devices on the LAN is working
  - **AdGuard Home deployed for network-wide ad-blocking:**
    - Deployed as a Docker container on infra-lxc (192.168.50.120)
    - Admin UI: https://adguard.christorresdev.com (via NPM with SSL)
    - Router configured to use AdGuard Home for DNS
  - **Nginx Proxy Manager deployed with SSL:**
    - Admin UI: http://192.168.50.120:81
    - Let's Encrypt wildcard certificate configured (*.christorresdev.com + christorresdev.com)
    - Cloudflare DNS validation via API token
    - SSL certificates automatically renewing
    - Proxy hosts configured with HTTPS for all internal services
  - **Uptime Kuma deployed for monitoring:**
    - Dashboard: https://kuma.christorresdev.com (via NPM with SSL)
    - Monitoring: Proxmox (192.168.50.110), Windows 11 VM (192.168.50.225), AdGuard, Nextcloud, Portainer, RustDesk, Uptime Kuma itself
    - 60-second heartbeat intervals configured
    - All services showing green status

- ✅ **Storage Migration Completed (2025-12-09)**: MAJOR UPGRADE
  - **Successfully migrated from 2-disk mirror to 4-disk RAIDZ1 + SSD fastpool**
  - **bulkpool expansion:**
    - Before: 2x 1TB HDD mirror (890GB usable)
    - After: 4x 1TB HDD RAIDZ1 in Mediasonic USB 3.2 enclosure (2.55TB usable)
    - **+185% capacity increase**
    - ZFS compression active (~37% space savings)
    - Single-drive fault tolerance maintained
  - **fastpool creation:**
    - 3x 1TB SSD RAIDZ1 via internal SATA (1.79TB usable)
    - Docker volumes migrated to SSDs for better performance
    - Optimized for VM disks, containers, and databases
    - Single-drive fault tolerance
  - **Migration process:**
    - Zero data loss - all services migrated safely
    - Used temporary SSD backup during migration
    - Fixed all permission issues for unprivileged LXC
    - All services tested and verified working
  - **Total usable storage:** 4.34TB (2.55TB HDD + 1.79TB SSD)

**New Projects:**
- ✅ **Portfolio Website for Freelance Business (christorresdev.com)**: DEVELOPMENT COMPLETE
  - **Purpose**: Professional portfolio website showcasing Python automation projects for Upwork freelance business
  - **Domain**: christorresdev.com (purchased from Namecheap)
  - **Tech Stack**: Next.js 16 + TypeScript + Tailwind CSS
  - **Features**:
    - Modern, responsive design with dark mode support
    - Hero section highlighting Python automation expertise ("Save 10+ Hours Per Week")
    - Two featured projects with detailed metrics:
      - Automated Report Generator (97% time savings, 2.5 hours → 5 minutes)
      - Data Cleaning & Validation Tool (94% time savings, 3 hours → 10 minutes)
    - About section with skills and expertise
    - Contact section (email + GitHub links)
    - Static site generation for optimal performance
  - **Deployment Architecture** (planned for CT 200):
    ```
    Internet → Cloudflare Tunnel (FREE) → CT 200 → Nginx Proxy Manager (TLS) → Portfolio Container
    ```
  - **Files Created**:
    - `/portfolio-website/` - Complete Next.js application with all pages
    - `Dockerfile` + `nginx.conf` - Production containerization
    - `deployment/DEPLOYMENT_GUIDE.md` - Comprehensive step-by-step deployment instructions (updated for 2025)
    - `deployment/CLOUDFLARE_TUNNEL_SETUP_2025.md` - **NEW: 2025-specific Cloudflare dashboard guide**
    - `deployment/TROUBLESHOOTING_DNS_CONFLICTS.md` - **NEW: DNS record conflict resolution**
    - `deployment/docker-compose.*.yml` - All deployment configurations (NPM, Cloudflared, Portfolio)
    - `PORTFOLIO_WEBSITE_SUMMARY.md` - Project summary and next steps
    - `CLOUDFLARE_TUNNEL_UPDATE_SUMMARY.md` - **NEW: Documentation update summary**
  - **Status**: Website built and tested locally, documentation updated for current Cloudflare dashboard (Nov 2025)
  - **Cost**: $10-12/year (domain only, everything else FREE)
  - **Current Deployment Progress**:
    1. ✅ Domain purchased (christorresdev.com from Namecheap)
    2. ✅ Cloudflare account created and domain added
    3. ✅ Namecheap nameservers updated to Cloudflare
    4. ✅ Nginx Proxy Manager deployed on CT 200 with Let's Encrypt SSL
    5. ✅ DNS records configured for internal services (kuma, portainer, adguard, nextcloud)
    6. ⏳ Cloudflare Tunnel setup for public portfolio website
    7. ⏳ Deploy portfolio website container on CT 200
    8. ⏳ Configure DNS and email forwarding (contact@christorresdev.com)
  - **Timeline**: Internal services complete with HTTPS, portfolio deployment pending Cloudflare Tunnel setup

**Next Steps:**
1. ✅ **Tailscale for remote access from outside home network** - Deployed and working.
2. ✅ **AdGuard Home for network-wide ad-blocking** - Deployed and configured.
3. ✅ **Nginx Proxy Manager with Let's Encrypt SSL** - Deployed with wildcard certificate for all internal services.
4. ✅ **Uptime Kuma monitoring dashboard** - Deployed and monitoring all critical services.
5. **Portfolio website deployment** (NEXT):
   - Set up Cloudflare Tunnel for public access
   - Deploy portfolio container on CT 200
   - Configure email forwarding (contact@christorresdev.com)
6. Phase 2: Set up Dell Latitude 7520 as Jellyfin/Tdarr media node
7. Phase 3: Set up T480s as Proxmox Backup Server

**Current Guide**: Following `phase1-simplified-build.md` - Phase 1 core infrastructure COMPLETE!

**Phase 1 Documentation Updates:**
- ✅ `phase1-simplified-build.md` expanded with Tailscale deployment guide (Step 10)
- ✅ `phase1-simplified-build.md` expanded with AdGuard Home deployment guide (Step 11)
- ✅ `phase1-simplified-build.md` expanded with Uptime Kuma deployment guide (Step 12) - ready for deployment
- ✅ `phase1-simplified-build.md` expanded with Nginx Proxy Manager deployment guide (Step 13) - ready for deployment

**Known Issues Resolved:**
- VNC console access when GPU passthrough enabled (solved by configuring x-vga=1 for physical monitor)
- Windows installer not detecting disk (solved by loading VirtIO SCSI driver from virtio-win.iso)
- Display output routing (solved by using hostpci0 with x-vga=1 after driver installation)
- GPU PCI reset warnings (expected behavior with NVIDIA consumer cards, no impact on functionality)

**Known Minor Issues:**
- Bluetooth devices don't work at Windows login screen (Windows security feature) - USB keyboard required for login, Bluetooth works after login

### Phase 2: Dell Latitude 7520 Media Node (**✅ COMPLETE**)

**Completed Steps:**
- ✅ **Ubuntu Server 24.04 Installation**: Successfully installed on Dell Latitude 7520 (192.168.50.130)
  - Static IP configured (192.168.50.130/24)
  - Network connectivity verified to Legion and internet
  - System fully updated and timezone configured
- ✅ **Intel Quick Sync Enabled**: 11th gen Iris Xe hardware transcoding ready
  - VA-API drivers installed (intel-media-va-driver-non-free)
  - User added to video and render groups
  - Hardware acceleration verified with vainfo
  - Codec support confirmed: H.264, HEVC/H.265, VP9, AV1, MPEG2, VC1
  - Device path: /dev/dri/renderD128
- ✅ **Docker Installation**: Docker and Docker Compose deployed
  - Docker Engine installed via official script
  - Docker Compose plugin installed
  - User added to docker group for non-root access
  - Verified with hello-world test container
- ✅ **NFS Mount from Legion**: bulkpool/media mounted successfully
  - NFSv3 configured for compatibility
  - Mount path: /mnt/media → 192.168.50.110:/bulkpool/media
  - Auto-mount configured in /etc/fstab with _netdev option
  - 2.6TB media storage accessible
  - Directory structure: Movies/, TV/, Music/, Photos/
- ✅ **Jellyfin Deployment**: Media server running with hardware transcoding
  - Docker Compose deployment in ~/jellyfin/
  - Web UI: http://192.168.50.130:8096
  - Hardware acceleration: VA-API enabled
  - Device: /dev/dri/renderD128 passed through to container
  - Media libraries configured: Movies, TV Shows, Music, Photos
  - Admin account created and configured
  - Group IDs configured for render (109) and video (44) groups
- ✅ **Apple TV 4K Client Setup**: Infuse Pro configured and tested
  - Infuse Pro installed on Apple TV 4K (yearly subscription: $12.99/year)
  - Connected to Jellyfin server at 192.168.50.130:8096
  - Quality set to "Original" for direct play
  - Hardware decoding and audio passthrough enabled
  - Apple TV Match Dynamic Range and Match Frame Rate enabled
  - **4K direct play verified**: 0% GPU usage during playback
  - Streaming to 65" 4K HDR TV via HDMI
  - No transcoding required for H.264/H.265 content

**Performance Results:**
- ✅ **Direct Play Working**: Apple TV 4K natively decodes video (Intel GPU idle at 0%)
- ✅ **Hardware Transcoding Ready**: VA-API configured for scenarios requiring transcoding
- ✅ **Expected Capability**: 4+ simultaneous 1080p transcodes OR 2x 4K→1080p transcodes
- ✅ **Network Performance**: Gigabit Ethernet providing stable 4K streaming

**Client Application Decision:**
- **Infuse Pro selected** over Swiftfin due to:
  - Superior 4K HDR direct play support (HDR10 + Dolby Vision)
  - No audio sync issues
  - Full codec support (H.265/HEVC, TrueHD, Atmos)
  - Rock-solid stability
  - Active development and bug fixes
- **Swiftfin avoided** due to reported issues in Dec 2025:
  - HDR black screen problems
  - Dolby Vision color issues
  - Audio sync problems
  - Limited audio codec support

**Architecture Confirmed:**
```
Legion (192.168.50.110)
  └─ bulkpool/media (2.6TB ZFS RAIDZ1)
        ↓ NFSv3 mount
Dell 7520 (192.168.50.130)
  └─ Jellyfin Server (Docker)
     └─ Intel Quick Sync (11th gen Iris Xe + VA-API)
        ↓ Direct Play (H.264/H.265)
Apple TV 4K → HDMI → 65" 4K HDR TV
```

- ✅ **Power Management Configured for 24/7 Operation** (2025-12-10)
  - Sleep/suspend/hibernate disabled permanently
  - Lid switch configured to ignore (laptop can run closed)
  - systemd-logind configured: HandleLidSwitch=ignore, IdleAction=ignore
  - Server stays online 24/7 without suspending

- ✅ **Media Automation Stack Deployed** (2025-12-10)
  - **Sonarr** (port 8989): TV show automation
    - Root folder: /tv → /mnt/media/TV
    - Integrated with qBittorrent download client
    - Successfully tested: Downloaded Stranger Things (Seasons 1-5)
  - **Radarr** (port 7878): Movie automation
    - Root folder: /movies → /mnt/media/Movies
    - Integrated with qBittorrent download client
    - Successfully tested: Movie downloads working
  - **qBittorrent** (port 8080): Torrent client
    - Downloads folder: /home/chris/media-stack/qbittorrent/downloads
    - Integrated with Sonarr/Radarr for automatic imports
  - **Prowlarr** (port 9696): Indexer manager
    - Centralized indexer management for Sonarr/Radarr
  - **All services running in Docker** via LinuxServer.io images
  - **Auto-import configured**: Completed downloads moved to /mnt/media/ automatically

**Issues Resolved During Setup:**
- ✅ **Laptop sleep problem**: Dell was suspending after idle timeout, causing SSH disconnects
  - Solution: Disabled sleep targets, configured logind to ignore lid and idle actions
- ✅ **Disk space crisis**: Root filesystem reached 100% full (94GB/98GB)
  - Cause: 82GB of downloads in qBittorrent folder
  - Solution: Cleaned up downloads, freed 57GB (now at 40% usage)
  - Prevention: Configured Sonarr/Radarr to remove completed downloads after import
- ✅ **Radarr database corruption**: Disk I/O errors when disk was full
  - Solution: Fixed permissions on /home/chris/media-stack/radarr/ directory
  - Radarr database recovered after disk space freed
- ✅ **Volume mapping**: Initial confusion about root folder paths
  - Solution: Added /tv and /movies as root folders in Sonarr/Radarr settings

**Architecture Update:**
```
Legion (192.168.50.110)
  └─ bulkpool/media (2.6TB ZFS RAIDZ1)
        ↓ NFSv3 mount
Dell 7520 (192.168.50.130)
  ├─ Jellyfin Server (Docker) → Intel Quick Sync transcoding
  ├─ Sonarr (Docker) → TV automation → /mnt/media/TV/
  ├─ Radarr (Docker) → Movie automation → /mnt/media/Movies/
  ├─ qBittorrent (Docker) → Torrent downloads
  └─ Prowlarr (Docker) → Indexer management
        ↓ Direct Play (H.264/H.265)
Apple TV 4K → HDMI → 65" 4K HDR TV
```

**Next Steps for Phase 2:**
1. ✅ **Media Automation Stack** - Sonarr, Radarr, qBittorrent, Prowlarr deployed and tested
2. ⏳ **Remote Access**: Enable Jellyfin access via Tailscale for streaming outside home network
3. ⏳ **Tdarr Deployment** (optional): Media optimization/transcoding automation
4. ⏳ **Monitoring**: Add Dell 7520 to Uptime Kuma dashboard
5. ⏳ **Disk Space Management**: Consider moving downloads to NFS mount or monitor usage regularly

### Phase 3: T480s Backup Server (NOT STARTED)

## When Making Updates

- Maintain the step-by-step instructional format with copy-paste ready commands
- Include both conceptual explanations and practical commands
- Keep IP addresses consistent with the established scheme (192.168.50.110-140)
- Preserve the three-phase installation structure
- Update power consumption estimates if hardware allocation changes
- Maintain the balance between beginner-friendly explanations and technical depth
- When adding new troubleshooting documentation, follow the pattern established in existing troubleshooting guides (problem statement, step-by-step diagnosis, root cause, solution)
- Cross-reference related documentation (e.g., link troubleshooting guides from main setup guides where issues commonly occur)
