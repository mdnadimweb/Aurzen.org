# Vercel deployment

For the Netlify-to-Vercel migration, follow [VERCEL.md](VERCEL.md). Keep the existing hosted Turso database to preserve products, photos and orders. New photo uploads are limited to 4 MB across hosts.

# Netlify deployment

For Netlify, use the hosted Turso setup in [NETLIFY.md](NETLIFY.md). The persistent-disk requirements below describe the local SQLite hosting option only.

# Deploying AURZÉN

This app runs a Next.js Node.js server. It no longer exports a static `out/` directory.

## Hosting requirements

- Node.js 22.13 or newer and a single application instance.
- Persistent writable disk for SQLite, outside disposable release directories.
- HTTPS, a reverse proxy preserving the request host/origin, and environment secrets.
- A separate location for retained backups and an error/uptime monitoring service.

Do not deploy this database to an ephemeral function filesystem. For a platform without persistent disk, migrate the database layer to a managed database first.

## Installation

1. Install dependencies with `npm ci`.
2. Set `ADMIN_PASSWORD` to a unique secret of at least 16 characters. The server refuses admin access without it.
3. Set `DATABASE_PATH` to an absolute path on the persistent disk, such as `/var/lib/aurzen/aurzen.sqlite`. Keep the database and its WAL/SHM files out of source control and public directories.
4. Leave `CHECKOUT_ENABLED=false` during catalog preparation.
5. Run `npm run typecheck`, `npm test`, `npm run build`, and `npm run test:integration`.
6. Start with `npm run start`, behind the HTTPS reverse proxy.
7. Sign in at `/admin/` and replace the sample catalog. Every environment starts with its own seed catalog, once.
8. Complete [LAUNCH.md](LAUNCH.md), including deployed-browser acceptance checks, before enabling orders.

Set environment variables through the hosting provider. Never copy local credentials into tracked files. Admin cookies use the Secure flag in production, so HTTPS is required. The API rejects browser mutations whose Origin does not match the request URL; configure the reverse proxy accordingly.

## Backup and restore

`npm run backup` creates a consistent SQLite snapshot under `data/backups/` using `VACUUM INTO`, including committed WAL data. Copy snapshots to another protected machine/storage service; snapshots contain customer details and admin sessions. Schedule backups in the hosting environment and test restoring a copy.

Uploaded product photos are stored in the database and included in these snapshots. Allow at least 9 MB request bodies for `/api/admin/images/` at the proxy; individual photos are limited to 8 MB and decoded images to 25 megapixels. Server processing rotates, resizes to fit 1600×1600, strips metadata and re-encodes to WebP. Replaced or abandoned uploads remain in the database; monitor disk growth as the catalog expands.

To restore, stop the application completely, preserve the existing database and its sidecar files, then install the selected snapshot at `DATABASE_PATH`. Ensure old `-wal` and `-shm` sidecars cannot be reused with the restored snapshot. Restart and verify catalog and order counts. Clear the `sessions` table if the snapshot should not restore old administrator sessions.

## Operational limits

There are no live payments, courier bookings, SMS/email notifications, staff roles or customer accounts. Orders appear in the owner dashboard and require manual fulfilment. Stock is pooled per product across sizes. Current cancellation/return transitions restore stock, so staff should confirm returned goods are suitable for resale before marking them returned.

Before opening to the public, configure the final domain, canonical metadata, sitemap, business policies and production monitoring. Public abuse protection should be configured at the hosting edge; the app currently throttles administrator sign-in attempts. Business launch settings remain disabled locally.
