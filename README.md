# AURZÉN — decoupled commerce monorepo

A responsive Bangladesh fashion storefront with an independent API, database-backed owner studio, cash-on-delivery checkout, inventory management, photo galleries and private order tracking. This repository targets **Coolify with Docker Compose and custom multi-stage Dockerfiles**.

The migration preserves the existing order/catalog schema and public URL paths. It does not move customer data, enable checkout or change a live hosting account automatically. Earlier Netlify/Vercel notes are retained under `docs/history/` as historical records; follow this README for the current architecture.

## Architecture

```text
Customer browser
      | HTTPS, one public hostname
Coolify reverse proxy (TLS)
      |
web:3000 — Next.js storefront / owner UI
      | /api/* and /media/* gateway; server-side catalog requests
      | private network + INTERNAL_API_TOKEN
api:4000 — Node.js HTTP service (no Next.js runtime)
      |
      | private network, DATABASE_URL
postgres:5432 — PostgreSQL 18 on the persistent postgres-data volume
                (no host port; reachable only by the API)
```

The frontend has no database credentials or administrator password. Only the API accesses business data. Browser API requests stay same-origin: no public backend hostname, broad CORS configuration, or build-time public API URL is needed. The internal token is a service credential, not a customer/admin session; admin routes also require the session cookie.

```text
apps/web/              Storefront, owner UI, server gateway, nonce CSP, Dockerfile
apps/api/src/          HTTP server, route handlers, authentication and database
apps/api/Dockerfile    Independent API build and production image
packages/shared/      Product/order types, options, phone validation, upload limits, CSP helpers
scripts/              Local development, backups, migration, checks and ZIP packaging
tests/                Checkout, persistence, tracking, authentication and security tests
docs/                 Version verification and validation results
compose.yaml          Coolify production stack (web, api, postgres); no port published to the host
compose.local.yaml    Local HTTP override; binds only localhost:3000
```

Both services are independently buildable from the repository root. The API can be replaced without rebuilding the frontend as long as the HTTP contracts remain compatible. SQLite requires a single API instance; do not horizontally scale API replicas against one SQLite volume. Turso is optional and retains the existing schema, including stored image bytes.

## Pinned toolchain

Verified on 7 November 2026 against the official Node.js release index and npm registry:

| Dependency | Exact version |
| --- | --- |
| Node.js LTS | 26.13.0 (Lithium) |
| npm | 11.20.0 |
| Next.js | 16.4.5 |
| React / React DOM | 19.3.1 |
| Motion | 14.10.1 |
| Sharp | 0.35.5 |
| Turso/libSQL client | 0.18.0 |
| node-postgres (`pg`) | 8.23.1 |
| PostgreSQL image | 18.6-alpine (digest pinned in Compose and CI) |
| PGlite / pglite-socket (tests only) | 0.5.12 / 0.2.15 |
| TypeScript | 7.0.2 |
| Node type definitions | 26.6.6 |
| React / React DOM type definitions | 19.3.0 |

Node has an LTS channel and Next.js has a support policy. Other dependencies generally have stable releases rather than an LTS designation. All direct dependencies use exact versions; `package-lock.json` pins the resolved dependency graph. `npm ci` reproduces it. Dockerfiles pin the Node multi-platform image digest as well as its version. CI actions use immutable commit hashes. See [version sources](docs/VERSIONS.md).

Treat pins as a reproducible snapshot, not permanent security maintenance. Review upstream advisories, refresh pins/digests together, and rerun the checks before upgrading.

## Local development

Install Node.js 26.13.0 with npm 11.20.0. On Windows PowerShell use `npm.cmd` if execution policy blocks `npm`.

```sh
npm ci --ignore-scripts
npm run setup
npm run dev
```

Open `http://localhost:3000/`; sign in at `/admin/` using the generated password in `.env`. Setup never prints secrets or overwrites an existing `.env`. Existing `.env.local` files from the older repository are not automatically imported by the new root launcher.

The launcher runs a development Next.js server and the compiled API on separate ports. Next.js hot reloads frontend edits. After API/shared changes, stop and rerun `npm run dev` to recompile them. `.env` is loaded at process start, followed by the optional Git-ignored `.env.development.local` override; restart after editing either file. When the override exists, use its `ADMIN_PASSWORD` for local sign-in. Existing process environment variables take precedence over both files. Bind the development servers only on a trusted machine.

Setup creates development-only settings: `COOKIE_SECURE=false` and `SEED_DEMO=true`. Fresh local databases receive demo products only when explicitly opted in. Production rejects demo seeding and starts with an empty catalog unless existing data is attached. Existing initialized catalogs are never replaced or reseeded.

## Local container walkthrough

Requires Docker Engine/Desktop with Docker Compose v2.20+.

1. Copy `.env.example` to `.env`, or use the setup-generated `.env`.
2. Fill in independent random `ADMIN_PASSWORD` and `INTERNAL_API_TOKEN` values. Leave checkout disabled.
3. Run:

```sh
docker compose -f compose.yaml -f compose.local.yaml config --quiet
docker compose -f compose.yaml -f compose.local.yaml up --build -d --wait
docker compose -f compose.yaml -f compose.local.yaml logs --tail=100
```

4. Visit `http://localhost:3000/` and `/admin/`. Production containers intentionally start without sample products. Add a test category/product or attach your existing database.
5. Stop with `docker compose -f compose.yaml -f compose.local.yaml down`. Do not add `--volumes` when retaining real data.

The local override disables Secure cookies for HTTP and publishes only loopback port 3000. **Never use that override in Coolify production.** The production file keeps cookies Secure and uses Coolify's HTTPS ingress. An optional `scripts/container-smoke.cjs` creates test records and must only run against disposable test environments.

## Coolify deployment — step by step

### 1. Prepare the server and source

Have a supported Linux server connected to Coolify, sufficient build resources, working Docker/Compose and a domain pointing to the server. A small server may need additional RAM/swap during Next.js builds; runtime memory limits are 1 GB for web and 512 MB for API. Enable only the necessary ingress ports through the server firewall.

Push the clean repository to your own Git provider. Keep `.env`, database files and uploaded customer data out of Git. Connect the repository through Coolify's supported source integration. The supplied ZIP is source: extract it and push its contents, not the ZIP file, to Git.

### 2. Create the application

In Coolify select your project/environment and add an application from the repository. Choose **Docker Compose**, set the base directory to `/`, and set the Compose location to `/compose.yaml`. Use the repository-root build context for both custom Dockerfiles. Do not select Nixpacks, a static-site build, or the old Netlify settings.

Parse/load the Compose file so Coolify discovers `web`, `api` and `postgres`. Coolify UI labels may vary by version; the required result is a Compose application using the two supplied Dockerfiles, the pinned official PostgreSQL image and the named `postgres-data` volume (plus `store-data`, which is only read by the one-time SQLite import).

### 3. Configure runtime variables

In the application's environment-variable settings provide:

- `INTERNAL_API_TOKEN`: independently generated random secret, at least 32 characters, identical in both services.
- `ADMIN_PASSWORD`: unique owner password, at least 16 characters. Prefer a generated 32-character value.
- `CHECKOUT_ENABLED=false` for initial verification.
- `POSTGRES_PASSWORD`: independently generated database password using only letters and digits (it is placed inside the connection URL), for example `node -e "console.log(require('node:crypto').randomBytes(24).toString('hex'))"`. Set it **before the first deploy**: PostgreSQL stores it when the volume is first created, and changing the variable later does not change the stored password.
- Only while importing an earlier hosted store: the existing `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` (see step 5). Remove them afterwards.

Do not mark these secrets as Docker build arguments. Do not copy `NETLIFY`, `VERCEL`, or an old `SITE_URL`; the normal container gateway does not need a fixed public hostname. Do not use `NEXT_PUBLIC_` for secrets. Coolify renders the referenced values into service runtime environments; redeploy after changing them.

### 4. Configure the public domain

Assign an HTTPS domain to **web**, targeting its internal port **3000**. If Coolify expects a domain containing a port, enter the equivalent of `https://shop.example.com:3000`; that suffix selects the container port, not the external HTTPS port. Follow the domain format shown by your Coolify version.

Assign **no public domain to api** and publish no host port for it. The frontend uses `http://api:4000` inside the Compose network. Let Coolify manage reverse-proxy routing and certificates. Ensure ingress preserves the original `Host` and overwrites `X-Forwarded-Proto` correctly; these headers are used for same-origin checks. Only trust these headers behind the configured ingress.

Changing the public hostname later requires DNS, a Coolify domain/certificate update and new logins on the new hostname, not a frontend rebuild or a CSP edit. Preserve URL paths and configure redirects from the old hostname for customers and search engines.

### 5. Choose persistence

Production data lives in the bundled **PostgreSQL** service. The API creates the tables on first start; the store starts empty (no demo products). Keep the same Coolify resource so the `postgres-data` volume is reused across deployments. Never delete that volume; it holds every product, photo and order.

**Bringing over an existing store** (one time, before opening checkout). The import only reads the old store, refuses to write into a PostgreSQL store that already has products, orders or categories, and verifies counts and photo bytes. Run it in the API container's terminal in Coolify (or `docker compose exec api ...`):

- From the earlier Coolify SQLite volume (`store-data`, already mounted at `/data`):
  `node scripts/migrate-postgres.cjs` (dry run, prints counts), then `node scripts/migrate-postgres.cjs --apply`.
- From hosted Turso: temporarily add `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` to the application, redeploy, run the same two commands, then remove both variables and redeploy.

Admin sessions and login counters are not copied; sign in again afterwards. Keep the old store untouched until you have checked products, photos and orders on the new site.

### 6. Deploy and inspect

Deploy the Compose application. Check that both custom image builds finish, the API becomes healthy, and the web service starts after the API health check. Image health checks are part of the Dockerfiles:

- API `/healthz`: readiness including a database query.
- Web `/healthz/`: frontend liveness; it does not prove backend availability.

Verify the catalog and prices, uploaded photos, admin login/logout, photo upload, tracking and mobile pages over the actual HTTPS domain. Use a staging database for destructive tests and test orders. Cookies should be host-only, Secure, HttpOnly and SameSite=Strict.

### 7. Cut over safely

Keep the old host available until the new store works. If both hosts share Turso, both can write the same real records; pause old-host ordering during cutover. After confirming production business details and checkout, set `CHECKOUT_ENABLED=true` and redeploy. Verify a controlled real COD order, stock deduction and fulfilment workflow before promoting the new address.

Configure permanent redirects from the old hostname, preserving paths/query strings. A provider-owned `netlify.app` hostname cannot be transferred to Coolify. Use an owned domain or the domain Coolify provides. For rollback, restore domain routing and the old checkout setting without overwriting newly received orders with an old backup.

### 8. Operate the store

Schedule PostgreSQL backups (see Backups), monitor uptime/API errors and volume usage, rotate secrets, and apply reviewed dependency/base-image updates. Add per-client request limits at the ingress for login, tracking and order submission; configure them on trusted client addresses rather than trusting arbitrary forwarding headers in application code.

## Environment variables and availability

### Build-time only

| Variable | Availability | Purpose |
| --- | --- | --- |
| `NODE_IMAGE` | Docker build ARG in both Dockerfiles | Exact runtime image and verified digest; default is pinned. Override only for a reviewed update. |

The application build requires **no database connection, administrator password, service token or public domain**. Secrets are not copied into build contexts or embedded in bundles. No application `NEXT_PUBLIC_*` values are used. If added later, Next.js public variables are build-time substitutions and need a rebuild; never put secrets there.

### Runtime only

| Variable | Service | Required/default | Purpose |
| --- | --- | --- | --- |
| `INTERNAL_API_URL` | Web server only | Compose fixes `http://api:4000`; local default `http://127.0.0.1:4000` | Fixed private upstream; never chosen from a browser-supplied URL. |
| `ADMIN_PASSWORD` | API only | Required, 16+ characters | Owner sign-in. Change and invalidate existing database sessions during credential incident response. |
| `POSTGRES_PASSWORD` | Compose only (postgres service and the API's `DATABASE_URL`) | Required; letters and digits | Database password. Set before the first deploy. |
| `DATABASE_URL` | API only | Compose builds `postgres://aurzen:…@postgres:5432/aurzen` | PostgreSQL connection. When set it takes precedence over Turso and SQLite. Leave empty in local `npm run dev` to use SQLite. |
| `DATABASE_POOL_MAX` | API only | 10 | Maximum PostgreSQL connections held by the API. |
| `DATABASE_PATH` | API only | `/data/aurzen.sqlite` in containers | Local SQLite file used when `DATABASE_URL` and Turso are unset (local development), and the source for the one-time import. |
| `TURSO_DATABASE_URL` | API only | Optional, must be `libsql://...` | Earlier hosted database; used as the import source, or as storage when `DATABASE_URL` is unset. |
| `TURSO_AUTH_TOKEN` | API only | Required when Turso URL is set | Database access secret. |
| `COOKIE_SECURE` | API only | `true` in production Compose | Set `false` only for deliberate local HTTP testing. |
| `SEED_DEMO` | API only | `false` in production | Opt-in development seeding; production rejects `true`. |
| `PORT` | Each service | Web 3000, API 4000 in images | Internal listener. Compose upstream and health checks assume these ports. |
| `HOST` | API only | `0.0.0.0` in image | API bind address. |
| `HOSTNAME` | Web only | `0.0.0.0` in image | Standalone Next.js bind address. |
| `API_PORT`, `WEB_PORT` | Local dev launcher only | 4000, 3000 | Local ports; update local `INTERNAL_API_URL` if changing API port. |
| `CHROME_PATH` | Test processes only | Windows Chrome path; set explicitly elsewhere | Browser executable for QA. |
| `SMOKE_URL` | Container test only | `http://127.0.0.1:3000` | Target for the destructive disposable-data smoke check. |
| `COMPOSE_BIN` | Configuration test only | Defaults to `docker compose` | Optional standalone Compose executable for `node scripts/check-compose.cjs`; configuration parsing does not require an engine. |

### Shared availability

| Variable | Availability | Purpose |
| --- | --- | --- |
| `INTERNAL_API_TOKEN` | Runtime, both servers; never browser or build | Mandatory 32+ character service credential. Rotate both services together. |
| `CHECKOUT_ENABLED` | Runtime, both servers; default false | API enforces order acceptance; web uses it for indexing metadata. Keep values synchronized. |
| `NODE_ENV` | Build tooling and runtime; image runtime fixed `production` | Next.js production mode and API startup checks. Local launcher uses development. Do not expose as a user-controlled deployment switch. |
| `NEXT_TELEMETRY_DISABLED` | Web build and runtime; image fixes `1` | Disables Next.js telemetry. |

Here “shared” explicitly means the listed services/phases receive the value; it does not mean browser exposure. Compose interpolation reads root `.env` locally or Coolify-managed values, then passes only the explicitly listed variables to each service. A runtime change needs a restart/redeploy, not a source rebuild; Coolify may rebuild as part of its deployment workflow.

## Security and CSP

- Non-root UID/GID 1000 containers, dropped Linux capabilities, no-new-privileges, read-only root filesystems, bounded tmpfs, process/memory limits and graceful API shutdown.
- Only the API connects to PostgreSQL, over the private Compose network; PostgreSQL publishes no host port. The API has no public host port, and its non-health routes require a constant-time-checked service token.
- Gateway forwards a fixed set of paths and selected headers, strips any browser-provided internal credential, rejects cross-origin mutations, bounds request bodies and applies upstream timeouts.
- Admin sessions are random, hashed in the database, expire after eight hours and use host-only HttpOnly/Secure/SameSite cookies. Login attempts are database-throttled. Tracking has durable per-reference and global limits. Configure additional per-client protection at ingress.
- Server-controlled prices, transactional stock updates, order retry protection, validation and private tracking are retained.
- Per-request random CSP nonces authorize framework scripts; production does not allow `unsafe-eval` or arbitrary inline scripts. Pages are dynamically rendered and not publicly cached so nonces stay fresh.
- `'self'` follows the current origin automatically. API connections remain same-origin; no hardcoded deployment hostname or wildcard script origin is needed.
- HTTPS external images remain allowed because the owner can use arbitrary HTTPS product image URLs. Brand fonts (Cormorant Garamond, DM Sans) are self-hosted, so no third-party font origins are allowed. Inline styles are allowed for React/Motion/gallery styling. These are intentional compatibility allowances, not claims of a fully strict style/image policy.
- Framing, plugins and base-URL injection are blocked. Responses set nosniff, frame denial, referrer and permissions policies. HTTPS page responses add HSTS without `includeSubDomains`.

New analytics/third-party integrations require deliberate CSP updates and suitable privacy/consent handling. They are not enabled by broad script or connection wildcards. A new domain does not require changing CSP, but a new external service may.

## Backups and restoration

### PostgreSQL (production)

Create a compressed, consistent dump while the store keeps running. On the server (or in Coolify's terminal for the `postgres` service, without the `docker compose exec -T postgres` prefix):

```sh
docker compose exec -T postgres pg_dump -U aurzen -d aurzen -Fc > aurzen-$(date +%F).dump
```

In Coolify the container name differs from the Compose service name; use `docker ps --filter name=postgres` to find it and `docker exec -i <name> ...` instead. Run it daily from cron or Coolify's scheduled tasks and copy the files to off-server storage. Dumps contain customer data: restrict access. Uploaded photos are stored in the database, so the dump includes them.

Restore into an **empty** database with checkout disabled:

```sh
docker compose exec -T postgres pg_restore -U aurzen -d aurzen --clean --if-exists < aurzen-2026-01-01.dump
```

Check product/order counts before re-enabling checkout. Test a restore on a staging copy at least once.

### Local SQLite (development)

For the SQLite fallback, run inside the API container or locally:

```sh
docker compose exec -T api node scripts/backup.cjs
```

This uses SQLite `VACUUM INTO` for a consistent snapshot at `/data/backups/`, including uploaded photos and committed WAL data. Use Coolify's terminal/automation equivalent when Compose is managed by Coolify. Copy snapshots to protected off-server storage; a backup on the same volume does not protect against volume loss. Snapshots contain customer data and sessions. Restrict access and test restoration.

Restore with the API stopped: preserve the current files, install the chosen snapshot at `/data/aurzen.sqlite`, remove/quarantine stale WAL/SHM sidecars, set ownership to 1000:1000, and restart. Check catalog/order counts before opening checkout. Invalidate restored sessions if needed. For Turso, use and verify the hosted provider's backup/export process; this local command deliberately refuses remote mode.

## Validation

```sh
npm run typecheck
npm test
npm run build
npm run test:integration
npm run test:deployment
npm run test:commerce
npm run test:presentation
npm run test:intro
npm audit --omit=dev --audit-level=high
```

Tests use temporary isolated databases and generated credentials. Browser checks require Chrome; on Linux set `CHROME_PATH` to its installed executable. The standalone deployment check runs separate production frontend/API processes, verifies secure cookies and nonce headers, and confirms a fresh production database contains no demo products.

The supplied GitHub Actions workflow repeats application checks, builds both Linux images, validates Compose, runs a container HTTP/database smoke check and verifies persistence after API restart. Its smoke records and volume are disposable. The workflow has not passed merely because it exists; inspect an actual run before treating it as evidence.

See [VALIDATION.md](docs/VALIDATION.md) for the checks actually executed for this delivery and their limits. Docker Engine/Coolify testing is distinct from host application testing. Physical mobile safe areas, screen-reader announcements, real courier operations and live production acceptance still need the relevant environment.

## Package the source

```sh
npm run package
```

Creates `artifacts/aurzen-coolify.zip` and its SHA-256 checksum. The archive has an `aurzen/` root with source, manifests, lockfile, Dockerfiles, Compose definitions, docs, tests, assets and CI. A release manifest records each included file's hash. Packaging uses an explicit source allowlist and excludes credentials, `.git`, local tooling, databases, dependencies, build outputs and test screenshots. No live catalog/orders are bundled; connect the existing database or restore an approved backup separately.

## Commerce limitations

Product offers, Dhaka scheduling, whole-taka rounding, checkout price reviews and
the automatic database upgrade are documented in [OFFERS.md](docs/OFFERS.md).

Payment is cash on delivery; online payments, courier booking, notifications and customer accounts are not integrated. Staff fulfil orders manually. Inventory is pooled per product rather than per size. The owner must supply accurate product content and business policies. These existing product limits are separate from the deployment architecture.

## Official deployment references

- [Coolify Docker Compose application configuration](https://coolify.io/docs/applications/configuration/general)
- [Coolify environment variables](https://coolify.io/docs/applications/configuration/environment-variables)
- [Coolify domains](https://coolify.io/docs/core/networking/domains)
- [Next.js standalone deployment](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
- [Next.js CSP](https://nextjs.org/docs/app/guides/content-security-policy)
