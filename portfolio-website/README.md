# Chris Torres Portfolio Website

Professional portfolio website showcasing Python automation projects.

🌐 **Live Site**: https://christorresdev.com

## Overview

Modern, responsive portfolio website built with Next.js and deployed on self-hosted Proxmox infrastructure using Cloudflare Tunnel for external access.

## Features

- **Modern Design**: Clean, professional design with dark mode support
- **Responsive**: Mobile-first responsive design using Tailwind CSS
- **Fast Loading**: Static site generation for optimal performance
- **SEO Optimized**: Meta tags and semantic HTML for better search rankings
- **Self-Hosted**: Running on Proxmox homelab with FREE Cloudflare Tunnel

## Tech Stack

- **Framework**: Next.js 16 with TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Deployment**: Docker + Nginx
- **Reverse Proxy**: Nginx Proxy Manager
- **External Access**: Cloudflare Tunnel (FREE)
- **TLS**: Let's Encrypt via Nginx Proxy Manager

## Project Structure

```
portfolio-website/
├── app/                          # Next.js app directory
│   ├── page.tsx                  # Main portfolio page
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Global styles
├── deployment/                   # Deployment files
│   ├── DEPLOYMENT_GUIDE.md       # Complete deployment instructions
│   ├── docker-compose.portfolio.yml
│   ├── docker-compose.nginx-proxy-manager.yml
│   └── docker-compose.cloudflared.yml
├── public/                       # Static assets
├── Dockerfile                    # Multi-stage Docker build
├── nginx.conf                    # Custom nginx configuration
├── next.config.ts                # Next.js configuration
├── tailwind.config.ts            # Tailwind CSS configuration
└── package.json                  # Dependencies
```

## Local Development

### Prerequisites
- Node.js 20+
- npm

### Setup
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open browser
open http://localhost:3000
```

### Build
```bash
# Build static site
npm run build

# Preview production build
npm start
```

## Deployment

See **[deployment/DEPLOYMENT_GUIDE.md](deployment/DEPLOYMENT_GUIDE.md)** for complete step-by-step instructions.

### Quick Deploy to Proxmox CT 200

```bash
# SSH to CT 200
ssh root@192.168.50.120

# Copy project files
cd /srv/docker/portfolio

# Build and deploy
docker compose -f deployment/docker-compose.portfolio.yml up -d --build
```

## Portfolio Content

### Featured Projects

1. **Automated Report Generator**
   - Reduces weekly reporting from 2.5 hours to 5 minutes
   - Python, Pandas, Matplotlib, ReportLab
   - 97% time savings, zero manual errors
   - GitHub: https://github.com/ChrisTorresDev/automated-report-generator

2. **Data Cleaning & Validation Tool**
   - Reduces data preparation from 3 hours to 10 minutes
   - Python CLI with comprehensive validation
   - 94% time savings, zero validation errors
   - GitHub: https://github.com/ChrisTorresDev/data-cleaning-validation-tool

## Customization

### Update Content

Edit `app/page.tsx` to update:
- Projects showcase
- About section
- Contact information
- Skills and expertise

### Styling

Edit `tailwind.config.ts` and `app/globals.css` to customize:
- Colors and theme
- Typography
- Spacing and layout

### Add Pages

Create new pages in the `app/` directory:
```bash
# Example: Add a blog page
mkdir app/blog
touch app/blog/page.tsx
```

## Architecture

```
Internet (christorresdev.com)
    ↓
Cloudflare DNS + Tunnel (FREE CDN)
    ↓
CT 200 - Infra LXC (192.168.50.120)
    ↓
Nginx Proxy Manager (TLS termination)
    ↓
Portfolio Container (port 8090)
```

## Cost

**Total: $10-12/year** (domain only)

Everything else is FREE:
- Hosting: Self-hosted on Proxmox
- SSL/TLS: Let's Encrypt
- External Access: Cloudflare Tunnel
- CDN: Cloudflare
- Email Forwarding: Cloudflare Email Routing

## Monitoring

View container logs:
```bash
docker logs -f christorresdev-portfolio
```

Check container status:
```bash
docker ps | grep christorresdev
```

Rebuild after changes:
```bash
docker compose -f deployment/docker-compose.portfolio.yml up -d --build
```

## Performance

- **Static Generation**: Entire site pre-rendered for instant loading
- **CDN**: Cloudflare global CDN caches content worldwide
- **Compression**: Gzip enabled in nginx for smaller payloads
- **Caching**: Aggressive caching headers for static assets
- **Image Optimization**: Next.js optimized images

## SEO

- Semantic HTML structure
- Meta tags for social sharing
- Responsive design (mobile-first)
- Fast loading times
- HTTPS everywhere
- Sitemap ready

## Security

- **HTTPS Only**: Forced SSL via Nginx Proxy Manager
- **Security Headers**: X-Frame-Options, X-Content-Type-Options, etc.
- **Cloudflare Protection**: DDoS protection, bot filtering
- **No Port Forwarding**: Cloudflare Tunnel = no exposed ports
- **Regular Updates**: Watchtower auto-updates containers

## Troubleshooting

### Website not loading locally
```bash
# Check if container is running
docker ps | grep christorresdev

# Check logs for errors
docker logs christorresdev-portfolio

# Restart container
docker restart christorresdev-portfolio
```

### Build fails
```bash
# Clear build cache
rm -rf .next out node_modules

# Reinstall dependencies
npm install

# Rebuild
npm run build
```

### Can't access from internet
See troubleshooting section in [deployment/DEPLOYMENT_GUIDE.md](deployment/DEPLOYMENT_GUIDE.md)

## Future Enhancements

- [ ] Add blog section for technical articles
- [ ] Implement contact form with email notifications
- [ ] Add Cloudflare Web Analytics
- [ ] Create case studies page with detailed project breakdowns
- [ ] Add testimonials section
- [ ] Implement service offerings page
- [ ] Add downloadable resume/CV

## License

Copyright © 2024 Chris Torres. All rights reserved.

## Contact

- **Website**: https://christorresdev.com
- **Email**: contact@christorresdev.com
- **GitHub**: https://github.com/ChrisTorresDev

---

Built with Next.js • Deployed on Proxmox homelab • Secured with Cloudflare
