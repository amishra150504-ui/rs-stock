# GitHub Releases Auto-Update (Windows)

This project is configured to publish Windows builds to GitHub Releases and let the installed app update itself (electron-updater).

## One-time setup (publisher machine)

1) Create a GitHub Personal Access Token (classic) with `repo` permission.
2) Set env var:

`setx GH_TOKEN "YOUR_TOKEN_HERE"`

Re-open the terminal after setting it.

## Publish a new version

1) Bump version in `package.json` (e.g. `0.1.0` → `0.1.1`).
2) Commit + push to `main`.
3) Build + publish release assets:

`npx electron-builder --win --publish always`

This uploads `latest.yml` and the installer/portable EXEs to GitHub Releases.

## User install / update flow

- First install: download `Management System Setup x.y.z.exe` from GitHub → Releases and install.
- Updates: app shows **Update Available** → click to download → then **Install Update** to restart updated.

## Notes

- Stored data is not touched by updates because the app keeps its `userData` directory path unchanged.
- Publishing requires `GH_TOKEN` (or another supported auth method) on the machine running the publish command.

