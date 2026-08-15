# VPS Monitoring Stack (Prometheus + Grafana)

Docker Compose stack for monitoring a VPS: host metrics (CPU, RAM, disk, network, load) via **node_exporter**, and per-container metrics (Docker) via **cAdvisor**, all visualized in **Grafana** with a pre-built dashboard that loads automatically — no manual setup in the UI required.

## What's included

- **Prometheus** — metrics collection, 30-day retention, bound to `localhost:9090` only.
- **node_exporter** — host-level metrics (CPU, memory, disk, network, load, uptime).
- **cAdvisor** — per-Docker-container CPU/memory/network metrics.
- **Grafana** — dashboards + datasource auto-provisioned on first boot, bound to `127.0.0.1:3000` (not public — Caddy fronts it).
- **`VPS Overview` dashboard** — CPU/RAM/disk/load/uptime/container-count at a glance, plus time-series panels for all of it and top-consumer breakdowns for containers.
- **Caddyfile.snippet** — the reverse-proxy block to add to your existing Caddy config.

## 1. Prerequisites

A VPS with Docker + the Compose plugin (you have this) and Caddy running natively (you have this too).

## 2. Get the file onto your VPS

On **your local machine**, from wherever `monitoring-stack.zip` downloaded to (e.g. `~/Downloads`):

```bash
scp ~/Downloads/monitoring-stack.zip your_user@your-vps-ip:~/
```

Then SSH in and unzip it:

```bash
ssh your_user@your-vps-ip
unzip monitoring-stack.zip
cd monitoring-stack
```

(No `unzip`? `sudo apt install unzip -y` first.)

## 3. Configure and start

```bash
chmod +x setup.sh
./setup.sh
```

It'll copy `.env.example` to `.env` and pause so you can edit it — set:

- `GRAFANA_ADMIN_PASSWORD` — a strong password
- `GRAFANA_DOMAIN` / `GRAFANA_ROOT_URL` — the subdomain you'll point at Grafana, e.g. `grafana.yourdomain.com` / `https://grafana.yourdomain.com`

Then it pulls images and starts the stack, with Grafana listening only on `127.0.0.1:3000`.

## 4. Wire up Caddy

Make sure DNS for the domain you chose (e.g. `grafana.yourdomain.com`) points at this VPS, then add the block from `Caddyfile.snippet` to `/etc/caddy/Caddyfile`:

```
grafana.yourdomain.com {
    reverse_proxy localhost:3000
}
```

Reload Caddy:

```bash
sudo systemctl reload caddy
```

Caddy handles TLS automatically. Visit `https://grafana.yourdomain.com` and log in with the credentials from `.env`. The **VPS Overview** dashboard is already there under Dashboards — nothing to import.

For more exhaustive dashboards, Grafana can pull community ones directly from its own UI (this doesn't touch my sandbox, so it works regardless): go to **Dashboards → New → Import** and enter one of these IDs, selecting the "Prometheus" datasource when prompted:

- **1860** — Node Exporter Full (very detailed host metrics)
- **893** — Docker and System Monitoring (host + container combined view)

## 5. Firewall

Grafana (3000) and Prometheus (9090) are both bound to `127.0.0.1` only — nothing to open for them. Just make sure your firewall allows the ports Caddy needs:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable   # if not already on
```

To reach Prometheus's own UI (targets page, ad-hoc queries) directly, use an SSH tunnel rather than exposing it:

```bash
ssh -L 9090:localhost:9090 your_user@your-vps-ip
# then browse to http://localhost:9090
```

## 6. Verify it's working

Prometheus targets page (via the SSH tunnel above, `http://localhost:9090/targets`) should show `prometheus`, `node-exporter`, and `cadvisor` all `UP`. If something's down:

```bash
sudo docker compose ps
sudo docker compose logs -f <service-name>
```

## 7. Day-2 operations

- **Update images**: `sudo docker compose pull && sudo docker compose up -d`
- **Restart everything**: `sudo docker compose restart`
- **Data lives in named Docker volumes** (`prometheus_data`, `grafana_data`) — they survive `docker compose down`, but back them up if you care about historical data:
  ```bash
  sudo docker run --rm -v monitoring-stack_grafana_data:/data -v $PWD:/backup alpine tar czf /backup/grafana_backup.tgz /data
  ```
- **Add more scrape targets** (e.g. nginx, postgres, redis exporters) by adding entries to `prometheus/prometheus.yml` under `scrape_configs`, then `sudo docker compose restart prometheus`.

## Notes

- Prometheus keeps 30 days of history by default (`--storage.tsdb.retention.time=30d` in `docker-compose.yml`) — adjust if you want more/less.
- Want alerting (e.g. Slack/email when disk fills up or CPU spikes)? That needs an `alertmanager` service and alert rules — happy to add it if you want it, just say the word.
