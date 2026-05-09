# VPS setup

This guide describes the lightweight production setup for botchanjs on a single VPS.

## Runtime shape

- Docker image: `ghcr.io/tempestif/botchanjs:<release-tag>`
- App directory on the VPS: `/opt/botchanjs`
- Compose file: `/opt/botchanjs/compose.yml`
- Runtime secrets: `/opt/botchanjs/.env`
- Deploy command: `IMAGE_TAG=v1.2.3 node scripts/deploy.ts`

The bot does not expose an HTTP port. Discord connects out from the container, so `compose.yml` intentionally has no `ports`.

## VPS prerequisites

- Linux VPS with Docker Engine and Docker Compose v2.
- Node.js 24 or newer. Node 24 can run `scripts/deploy.ts` directly.
- Git.
- Optional: Vite+ (`vp`) if you want to run repository scripts on the VPS.

Tool ownership:

- Use Vite+ for Node.js and pnpm. See `docs/tooling.md`.
- Install Docker Engine and Docker Compose v2 as OS-level packages on the VPS.
- Use the official Vite+ installer for the global `vp` CLI.

Create a deploy user and app directory:

`sudo useradd -m -s /bin/bash deploy`

`sudo usermod -aG docker deploy`

`sudo mkdir -p /opt/botchanjs`

`sudo chown deploy:deploy /opt/botchanjs`

Clone the repository as the deploy user:

`git clone https://github.com/tempestif/botchanjs.git /opt/botchanjs`

Log out and back in after adding the user to the `docker` group.

## Runtime environment

Create `/opt/botchanjs/.env` from `.env.example`.

Required keys:

- `DISCORD_TOKEN`: Discord Bot token from the Discord Developer Portal.
- `DISCORD_CLIENT_ID`: Application client ID from the Discord Developer Portal.

Do not commit `.env`. The file belongs on the VPS only. Rotate the Discord token in the Developer Portal if it is ever exposed.

## Container registry access

The deploy target pulls from GHCR. If the image is private, log in on the VPS:

`echo "<github-token>" | docker login ghcr.io --username "<github-user>" --password-stdin`

Use a GitHub token with permission to read packages. Do not place the Discord token in GitHub Actions or in the Docker image.

## GitHub Secrets

Required for the deploy workflow:

- `VPS_HOST`: VPS hostname or IP address.
- `VPS_USER`: SSH user, usually `deploy`.
- `VPS_SSH_KEY`: Private SSH key for the deploy user.

Optional:

- `VPS_PORT`: SSH port. Defaults to `22`.
- `VPS_APP_DIR`: App directory. Defaults to `/opt/botchanjs`.

Bot runtime secrets such as `DISCORD_TOKEN` and `DISCORD_CLIENT_ID` stay in the VPS `.env` and are not GitHub Actions secrets.

## Release and deploy

Create and push a release tag:

`git tag v1.2.3`

`git push origin v1.2.3`

The GitHub Actions workflow builds and pushes:

- `ghcr.io/tempestif/botchanjs:v1.2.3`
- `ghcr.io/tempestif/botchanjs:latest`

Then it SSHes into the VPS, checks out the same tag, and runs:

`IMAGE_TAG=v1.2.3 node scripts/deploy.ts`

The deploy script runs `docker compose pull bot` and `docker compose up -d bot`.

## Manual deploy and dry run

From `/opt/botchanjs`:

`IMAGE_TAG=v1.2.3 node scripts/deploy.ts --dry-run`

`IMAGE_TAG=v1.2.3 node scripts/deploy.ts`

Useful environment variables:

- `APP_DIR`: app checkout directory. Defaults to the current directory.
- `COMPOSE_FILE`: compose file name. Defaults to `compose.yml`.
- `IMAGE_NAME`: image repository. Defaults to `ghcr.io/tempestif/botchanjs`.
- `IMAGE_TAG`: required Docker image tag.
- `DRY_RUN`: set to `true` to print commands without running them.
- `PRUNE_IMAGES`: set to `true` to run `docker image prune -f` after deploy.
- `REGISTRY_HOST`, `REGISTRY_USERNAME`, `REGISTRY_TOKEN`: optional registry login for deploy.

The deploy script never prints registry token values.

## Logs and operations

Show logs:

`cd /opt/botchanjs && IMAGE_TAG=v1.2.3 docker compose logs -f bot`

Restart the bot:

`cd /opt/botchanjs && IMAGE_TAG=v1.2.3 docker compose restart bot`

Stop the bot:

`cd /opt/botchanjs && IMAGE_TAG=v1.2.3 docker compose down`

Rollback to an older image tag:

`cd /opt/botchanjs && git checkout v1.2.2 && IMAGE_TAG=v1.2.2 node scripts/deploy.ts`

## systemd

No systemd unit is required for the initial setup. `restart: unless-stopped` lets Docker restart the bot container after daemon or VPS restarts. If you later need OS-level orchestration, create a small unit that runs `docker compose up -d bot` inside `/opt/botchanjs` after Docker is available.

## Local validation

Run app checks:

`vp check`

`vp run build`

Dry-run the deploy script:

`APP_DIR=$PWD IMAGE_TAG=v0.0.0 vp run deploy:vps -- --dry-run`

Docker validation, on a machine with Docker installed:

`docker build -t ghcr.io/tempestif/botchanjs:local .`

`IMAGE_TAG=local docker compose config`

`IMAGE_TAG=local docker compose up -d`
