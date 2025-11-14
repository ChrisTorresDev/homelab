# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Purpose

This is a homelab documentation repository containing a comprehensive setup guide (`your_hardware_homelab.md`) for building a self-hosted infrastructure using repurposed hardware.

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
- **rpool** (NVMe single disk on Legion): Proxmox system, VM disks - **Current Phase**
- **bulkpool** (2x 1TB HDD mirror on Legion): Media, Nextcloud data, general files - **Current Phase**
- **fastpool** (2x 1TB SSD mirror on Legion): VM disks, Docker volumes, databases - **Planned with external SSDs**
- **bulkpool-expanded** (4x 1TB HDD RAIDZ1 on Legion): Expanded media storage - **Planned with external HDDs**
- **backup-ssd** (2x 1TB SSD mirror on T480s): Receives ZFS send replicas - **Planned Phase 3**
- **archive** (3TB HDD): Weekly offline snapshots, unplugged when idle - **Deferred until 3TB drive reconnected**

### IP Address Scheme
```
192.168.50.110 - Legion Proxmox host
192.168.50.111 - Windows 11 Gaming VM
192.168.50.120 - Infra LXC (Docker/Portainer/RustDesk/Nextcloud)
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

### Troubleshooting Guides
- **`troubleshooting-ssh-connection.md`**: Step-by-step debugging for Proxmox SSH connectivity issues
- **`proxmox_login_troubleshooting.md`**: Solutions for Proxmox web UI and console authentication problems
- **`mac-network-setup.md`**: macOS-specific network configuration and connectivity troubleshooting

### Documentation Workflow
- Start with `phase1-simplified-build.md` if building with limited hardware immediately
- Use `your_hardware_homelab.md` as the canonical reference for the complete architecture
- Reference troubleshooting guides when specific issues arise during setup
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

## When Making Updates

- Maintain the step-by-step instructional format with copy-paste ready commands
- Include both conceptual explanations and practical commands
- Keep IP addresses consistent with the established scheme (192.168.50.110-140)
- Preserve the three-phase installation structure
- Update power consumption estimates if hardware allocation changes
- Maintain the balance between beginner-friendly explanations and technical depth
- When adding new troubleshooting documentation, follow the pattern established in existing troubleshooting guides (problem statement, step-by-step diagnosis, root cause, solution)
- Cross-reference related documentation (e.g., link troubleshooting guides from main setup guides where issues commonly occur)
