<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AURZÉN repository guide

## Project and structure
- Bangladesh fashion storefront with catalog, galleries, cart, cash-on-delivery (COD)
  checkout, owner studio, inventory editing, and private order-status tracking.
- Online payments, automated courier booking, notifications, and customer accounts
  are not integrated. Stock is pooled per product, not per size. Do not imply otherwise.
- npm workspaces: Node 26.13.0, npm 11.20.0, TypeScript 7.0.2; manifests and
  package-lock.json pin Next.js 16.4.5, React 19.3.1, and Motion 14.10.1.
- apps/web/: Next.js App Router pages, app/components/, CSS, public assets,
  server/backend.ts and server/gateway.ts; proxy.ts sets nonce-based CSP.
- apps/api/src/: independent Node HTTP server (not a Next.js runtime), route
  handlers under app/, and database/authentication/checkout/image logic under lib/.
- packages/shared/src/: catalog/order types, options, phone validation, security,
  upload limits, and order-tracking helpers. This tracking means delivery status.
- tests/: node:test CommonJS tests; scripts/: build support, browser/integration
  checks, backups, migration, and packaging. docs/VALIDATION.md records past checks.
- compose.yaml and both Dockerfiles target Coolify; compose.local.yaml is a local
  HTTP override. docs/history/ contains superseded hosting notes. Configuration
  and historical test records do not establish that a live deployment is verified.

## Development and checks
Run from the repository root; on Windows use npm.cmd if PowerShell blocks npm.
- Install: npm ci --ignore-scripts. Local initialization: npm run setup (creates
  development settings without replacing an existing .env). Never run on production.
- Develop: npm run dev (web :3000, API :4000 by default). API/shared code compiles
  at startup; restart after changing it or environment settings.
- Build: npm run build (shared, API, then web). Type checking: npm run typecheck.
- Unit/security tests: npm test (builds shared/API, then tests/*.test.cjs).
- After npm run build: npm run test:integration and npm run test:deployment;
  browser checks: npm run test:commerce, npm run test:presentation, npm run test:intro.
  Browser scripts use Chrome/CDP; set CHROME_PATH if discovery needs help.
- No lint or formatter script is configured. Do not invent one or install a tool
  just to supply a missing check.
- npm run backup, npm run migrate:turso, and npm run package exist; inspect their
  targets and prerequisites before use. Migration/backup scripts are not routine tests.

## Implementation conventions
- Check git status and applicable instructions before editing; preserve unrelated
  changes, including generated files. Keep changes focused; avoid broad refactors,
  mass formatting, and unnecessary dependencies. Match each file's existing style.
- Keep UI in web, business/data logic in API, and reusable contracts in shared.
  Reuse existing components, StoreProvider/useStore, and gateway/backend helpers.
- Follow current naming and plain CSS/token patterns; do not add a styling framework.
  Preserve established public paths, trailing-slash behavior, and HTTP contracts.
- Production uses PostgreSQL (DATABASE_URL, postgres-database.ts); local development and
  most unit tests fall back to node:sqlite (WAL); hosted Turso/libSQL remains supported.
  Write SQL that runs on both PostgreSQL and SQLite (Database.dialect for the rare
  difference). Use the asynchronous Database prepare/get/all/run and transaction helpers;
  parameterize queries and preserve schema/data compatibility when changing storage.
  Write transactions take a PostgreSQL advisory lock so checkout stays serialized.
  tests/postgres.test.cjs covers PostgreSQL (PGlite locally, a real server in CI).
- Schema includes settings, categories, products, images (stored bytes), orders
  (JSON payload plus unique idempotency key), sessions, and rate_limits. Initialization
  also upgrades legacy product columns; review database.ts before schema changes.
- Compose runs PostgreSQL on the postgres-data volume with no host port; store-data at
  /data only serves the one-time scripts/migrate-postgres.cjs import. Back up with
  pg_dump. Never casually delete volumes or copy a live SQLite file.
- API owns database credentials and ADMIN_PASSWORD. The server-side web gateway
  uses INTERNAL_API_TOKEN; that service token does not replace admin authorization.
  Existing admin sessions use hashed database tokens and HttpOnly cookies.
- Identify variables from .env.example; never read/copy secret values from .env files.
  Keep credentials, customer records, database files, and runtime artifacts out of Git.

## Storefront
- Preserve AURZÉN's logo, plum/ivory palette, typography, imagery, and existing
  visual hierarchy; reuse CSS variables and established responsive styles.
- Verify affected pages on mobile and desktop, including navigation and cart controls.
  Maintain labels, keyboard access, focus visibility, image alternatives, reduced
  motion support, and useful loading, empty, validation, and error states.

## Ecommerce requirements for future changes
These are requirements to verify, not a claim of complete implementation or audit.
- Validate prices, discounts (if added), stock, options, and delivery charges on the
  server; never trust browser totals. Preserve atomic order/inventory transactions.
- Enforce server-side authentication and authorization for protected reads/writes;
  preserve origin checks, secure sessions, request limits, and tracking privacy.
- Handle repeated checkout submissions without duplicate orders or stock deductions.
- Keep secrets and sensitive customer information out of frontend code and logs.
- Treat add-to-cart, checkout, order creation, and payment confirmation as distinct
  events. A COD order receipt does not confirm payment has been collected.
- Fire purchase-related analytics only at the explicitly agreed successful conversion
  point, with duplicate-event prevention. Do not assume order tracking is analytics
  or invent a payment provider/conversion definition.

## Tools, verification, and boundaries
- Use Context7 when library/API documentation is needed, matching installed versions;
  also follow the preserved Next.js local-documentation instructions above.
- Use Playwright for affected user flows and responsive verification. Use Chrome
  DevTools for console errors, failed requests, and performance investigations when
  relevant. Do not call every tool for every task; report unavailable tools honestly.
- Run checks appropriate to the change. Add/update meaningful tests for important
  behavior changes, especially authentication, checkout, inventory, and payments.
  Use isolated test data/sandbox services; never exercise mutations on live customers.
- Verify UI changes in a browser when possible. Documentation-only changes normally
  need content/diff checks, not the entire application suite.
- Proceed with routine local implementation/verification within the requested scope.
  Ask before production deployment, destructive database changes, paid services,
  real payments, or external actions outside that scope.
- Finish with a short report of changes, checks actually run, results, and limitations.
  Never claim a check passed because a script exists or a previous report says so.
