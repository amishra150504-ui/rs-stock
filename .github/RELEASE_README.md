# Auto-release (GitHub Actions)

This repo includes a workflow that builds and publishes a new **Windows** GitHub Release on every push to `main`.

## Required secret

Add repository secret:

- Name: `GH_TOKEN`
- Value: GitHub Personal Access Token (classic) with `repo` scope

GitHub: **Settings → Secrets and variables → Actions → New repository secret**

## How it works

- On each push to `main` (except commits containing `[skip ci]`):
  - increments patch version in `package.json`
  - commits + tags `vX.Y.Z`
  - builds and publishes via `electron-builder`

