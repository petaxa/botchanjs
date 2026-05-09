# Tooling

This repository requires Docker and Vite+.

## Blank environment setup

Install system basics:

- Git
- curl
- Docker Engine/Desktop-compatible daemon

Install the global Vite+ entrypoint first:

`curl -fsSL https://vite.plus | bash`

Then let Vite+ set up Node.js and pnpm for this project:

`vp env setup`

`vp env on`

`vp env install`

`vp install`

Why this order matters: `vite-plus` in `devDependencies` is the project-local package, but `vp` is the global bootstrap command that installs dependencies, manages the runtime, and downloads the package manager. Without the global `vp`, a fresh machine cannot run `vp install` yet.

## Vite+

Vite+ owns JavaScript runtime and package-manager behavior:

- Node.js, pinned by `.node-version`
- pnpm, selected by `packageManager` in `package.json`
- dependency installation through `vp install`
- package scripts through `vp run`
- direct Node execution through the `node` shim created by `vp env setup`

## Common project commands

- `vp install`
- `vp check`
- `vp run build`
- `vp run deploy:vps -- --dry-run`

## Docker

Docker has two pieces:

- Docker CLI / Compose
- Docker Engine daemon

Use:

- macOS local development: Docker Desktop, OrbStack, Colima, or another Docker-compatible runtime.
- Linux VPS: Docker Engine and Docker Compose plugin from the distribution or Docker's official package repository.
- GitHub Actions: hosted runners already provide Docker; the workflow uses Docker actions for build and push.

After installing the daemon, verify:

`docker version`

`docker compose version`

## Why not Nix right now

Nix can manage a very complete development environment, but this repo only needs Docker and Vite+. Adding a Nix flake now would introduce extra bootstrap and maintenance work without replacing the Docker daemon requirement.

Consider Nix later if the project grows into multiple services, native dependencies, multiple OS targets, or if contributors already standardize on Nix.
