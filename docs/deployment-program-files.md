# NAS Program Update Boundary

This document separates application files from household runtime data for the
Synology share at `\\192.168.50.179\docker\wardrobe`.

## Copy or Update

- `server.js`
- `package.json`
- `package-lock.json`
- `Dockerfile`
- `docker-compose.yml`
- `public/`
- `scripts/vendor-animal-island-assets.ps1`
- `THIRD_PARTY_NOTICES.md`
- `README.md`
- deployment documentation under `docs/`

## Never Overwrite or Delete

- `data/`
- `photos/`
- deployed `config.json`
- `wardrobe.tar`
- logs and PID files
- any NAS-only backup

The program update must be staged separately from runtime volumes. Compare the
program manifest first, stop the container only during an approved maintenance
window, copy program files without the preserved paths, rebuild, and verify
`/view`, `/classic/view`, and `/api/members` before declaring the update good.

The Island UI is the default on `/view`, `/admin`, and `/admin/login`. The
unchanged fallback remains available at `/classic/view`, `/classic/admin`, and
`/classic/admin/login`. The visible UI switch stores only the browser-local
`wardrobe_ui_v1` preference, so rollback does not alter the shared API,
session, JSON records, or photos.

Vendored Animal Island assets are licensed for this personal, non-commercial
use under CC BY-NC 4.0; preserve `THIRD_PARTY_NOTICES.md` when updating program
files.

No NAS deployment is performed as part of this implementation.
