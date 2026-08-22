# infra

Config for the VPS that hosts alexcaesar.xyz, mirrored here for backup and change tracking. This directory is a snapshot pulled from the server (`ubuntu@<vps-ip>`) — it's not deployed automatically; edits here need to be copied back up manually.

Real `.env` files with secrets stay on the VPS only and are never committed (`infra/**/.env` is gitignored). Each service ships a `.env.example` documenting the required keys.

## Layout

```
caddy/                Caddyfile — reverse proxy + static file serving for all subdomains
homepage/              gethomepage.dev dashboard (homepage.alexcaesar.xyz)
monitoring-stack/      Grafana + Prometheus + node-exporter + cAdvisor (grafana.alexcaesar.xyz)
```

## Services on the VPS

Caddy (`caddy/Caddyfile`) terminates TLS and routes:

- `alexcaesar.xyz`, `www.alexcaesar.xyz` — this site's static build (`/var/www/alexcaesar.xyz`)
- `files.alexcaesar.xyz` — browsable static file share (`/var/www/files.alexcaesar.xyz`: documents/downloads/music/pictures/videos)
- `grafana.alexcaesar.xyz` — reverse proxy to the Grafana container
- `homepage.alexcaesar.xyz` — reverse proxy to the Homepage dashboard container

Docker containers (`docker ps` on the VPS): `homepage`, `grafana`, `prometheus`, `node-exporter`, `cadvisor`.

## Homepage dashboard (`homepage/`)

[gethomepage/homepage](https://github.com/gethomepage/homepage) container config — `services.yaml`, `bookmarks.yaml`, `widgets.yaml`, etc. Copy `.env.example` to `.env` and fill in `HOMEPAGE_ALLOWED_HOSTS` / Grafana credentials before running.

## Monitoring stack (`monitoring-stack/`)

Grafana + Prometheus + node-exporter + cAdvisor, set up via `setup.sh`. Copy `.env.example` to `.env` first. `Caddyfile.snippet` shows the reverse-proxy block already applied in `caddy/Caddyfile`.
