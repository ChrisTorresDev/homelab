# GEMINI.md

This file provides guidance to Gemini when working with code in this repository.

## Repository Purpose

This is a homelab documentation repository containing a comprehensive setup guide (`your_hardware_homelab.md`) for building a self-hosted infrastructure using repurposed hardware.

## Hardware Context

The guide is tailored to a specific hardware configuration:
- **Lenovo Legion Desktop** (32GB RAM, GTX 1060 6GB, 512GB NVMe + 1TB + 3TB HDDs) - Gaming PC running Proxmox VE 24/7
- **2x Lenovo T480s laptops** - One for Proxmox Backup Server (backup/observability node), one spare
- **2x ThinkPad X1 laptops** - Lab/dev boxes for testing
- **1x Dell Latitude 7520** - Dedicated Jellyfin/Tdarr media node with Intel Quick Sync
- **External storage**: 4x 1TB SSDs (2 for fastpool mirror on Legion, 2 for backup-ssd mirror on T480s) + 4x 1TB HDDs (RAIDZ1 bulkpool) + 1x 3TB HDD (cold backup archive)

## Architecture Overview

**Option A (Proxmox with GPU Passthrough)** is the selected architecture:

1. **Legion Desktop (192.168.50.110)**: Runs Proxmox VE 24/7 as primary hypervisor with GPU passthrough for Windows 11 gaming VM
2. **VM 100 - Windows 11 Gaming (192.168.50.111)**: GTX 1060 passthrough, 16GB RAM, native gaming performance
3. **CT 200 - Infra LXC (192.168.50.120)**: Docker host running Portainer, RustDesk, Nextcloud, Tailscale
4. **CT 210 - Storage LXC**: Samba/NFS exports, snapshot scripts
5. **Dell Latitude 7520 (192.168.50.130)**: Ubuntu Server + Docker running Jellyfin/Tdarr with Intel Quick Sync hardware transcoding
6. **T480s #1 (192.168.50.140)**: Proxmox Backup Server with backup-ssd mirror receiving ZFS replicas
7. **Remote Access**: Tailscale VPN for secure remote access without port forwarding

### Key Services
- **RustDesk**: Self-hosted remote desktop server (CT 200)
- **Jellyfin**: Media server with Intel Quick Sync transcoding (Dell 7520)
- **Nextcloud**: Cloud storage on bulkpool (CT 200/210)
- **Portainer**: Docker container management UI (CT 200)
- **Tailscale**: Zero-config VPN mesh network
- **Proxmox Backup Server**: Automated VM/CT backups with retention

### Storage Architecture (ZFS)
- **fastpool** (2x 1TB SSD mirror on Legion): VM disks, Docker volumes, databases
- **bulkpool** (4x 1TB HDD RAIDZ1 on Legion): Media, Nextcloud data, general files
- **backup-ssd** (2x 1TB SSD mirror on T480s): Receives ZFS send replicas
- **archive** (3TB HDD): Weekly offline snapshots, unplugged when idle

### IP Address Scheme
```
192.168.50.110 - Legion Proxmox host
192.168.50.111 - Windows 11 Gaming VM
192.168.50.120 - Infra LXC (Docker/Portainer/RustDesk/Nextcloud)
192.168.50.130 - Dell Latitude 7520 (Jellyfin/Tdarr)
192.168.50.140 - Lenovo T480s Proxmox Backup Server
```

## Documentation Structure

The main guide (`your_hardware_homelab.md`) is organized into phases:

- **Phase 1**: Legion Desktop conversion to Proxmox VE with GPU passthrough, ZFS pools, Windows 11 VM, and LXC containers
- **Phase 2**: Dell Latitude 7520 setup as dedicated media node with Intel Quick Sync
- **Phase 3**: T480s backup node with Proxmox Backup Server and ZFS replication

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
1. **Local protection**: ZFS mirrors + RAIDZ1 handle single-disk failures
2. **Snapshots**: Hourly (24h) + daily (14d) + weekly (8w) via zfs-auto-snapshot
3. **Replication**: ZFS send jobs to T480s backup node over SSH
4. **Cold copies**: Weekly snapshots to 3TB archive disk (offline storage)
5. **PBS backups**: Nightly Proxmox Backup Server jobs for VMs/containers

## Important Safety Notes

**Battery Removal**: The guide emphasizes removing batteries from laptops running 24/7 to prevent fire hazards from battery swelling during constant charging.

**UPS Integration**: APC 1200VA UPS backs Legion + network gear + storage + T480s with apcupsd for graceful shutdowns.

## When Making Updates

- Maintain the step-by-step instructional format with copy-paste ready commands
- Include both conceptual explanations and practical commands
- Keep IP addresses consistent with the established scheme (192.168.50.110-140)
- Preserve the three-phase installation structure
- Update power consumption estimates if hardware allocation changes
- Maintain the balance between beginner-friendly explanations and technical depth
