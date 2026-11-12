# Delivery validation

## Storefront refresh, owner studio and order editing — 12 November 2026

Storefront: self-hosted Cormorant Garamond/DM Sans (CSP limited to self-hosted
fonts), soft plum/ivory palette, branded photo placeholder, cart stepper, calm
animations disabled under reduced motion, and a hero carousel that now keeps
auto-advancing after hover or an arrow click (it still pauses for keyboard focus,
the pause button, hidden tabs and reduced motion). Owner studio: redesigned
dashboard, animated Overview from existing /api/admin data, matching sign-in
page, and owner order editing for New/Confirmed/Processing orders.

Checks run on Windows with Node 26.13.1 and Chrome, using isolated temporary data:

- `npm run typecheck`, `npm run build`: passed.
- `npm test`: 60/60 passed, including `admin-overview.test.cjs` (Dhaka-day
  grouping, 7-day trends, KPIs, empty store) and `order-edit.test.cjs` (stock
  moves by difference, refused edits change nothing, quoted prices kept, server
  pricing for added products, merged lines, validation, locked statuses).
- `test:presentation`, `test:commerce`, `test:intro`, `test:integration`,
  `test:deployment`: passed. Two browser checks now select the studio Edit
  button by `data-row-action="edit"` and read the cart stepper value.
- Browser QA at 360/390/768/1440px: no horizontal overflow; computed WCAG AA
  contrast for status pills, buttons, studio text and the sign-in page (disabled
  controls excluded, as WCAG allows); visible focus on every keyboard stop;
  dialog focus restored after Escape; reduced motion leaves no animation; a real
  order edit saved the previewed total and moved stock by exactly the change.

Not covered: Safari, Firefox, real phones and screen readers; Docker/Coolify and
real-PostgreSQL runs (CI covers these); a final GitHub Actions result.

## Security cleanup and PostgreSQL — 12 November 2026

**Malware removed.** Four identical obfuscated `init` files (root, apps/api,
apps/web, packages/shared) hid a loader behind whitespace padding. Decoded statically
(never executed), it resolved command servers from Ethereum transactions, downloaded
XOR-encrypted JavaScript, ran it with `eval` and in a hidden detached `node` process.
Commit f40acfa had wired it into `npm run dev`/`build`, added an `eval` block to
`apps/web/next.config.ts` fed by an encoded URL in a committed `.env`, and added the
`dotenv`/`node-fetch` devDependencies. The hooks and next.config block were removed
in a63fbb2; the `init` files, `.env`, those dependencies and committed Playwright
snapshots are now deleted. The clean repository is published with new history so the
payload is not retained. Any machine that ran `npm run dev`/`build` at f40acfa should be
treated as compromised and its credentials rotated.

**PostgreSQL.** Compose now runs PostgreSQL 18.6 (pinned digest, no host port) and the
API uses it through `DATABASE_URL`; SQLite remains the local-development fallback.
`scripts/migrate-postgres.cjs` imports an existing SQLite or Turso store.

Checks run on Windows with Node 26.13.1 and Chrome, using isolated temporary data:

- `npm run typecheck`, `npm run build`: passed.
- `npm test`: 49/49 passed, including 9 PostgreSQL tests (schema, demo seed,
  ID sequence after explicit IDs, checkout idempotency, concurrent final-unit
  checkout, rollback, stock constraint, rate limits, photo bytes, BIGINT timestamps,
  SQLite-to-PostgreSQL import and overwrite refusal) against PGlite.
- `npm run test:integration`: passed on SQLite and again with the API connected to
  PostgreSQL (PGlite over the PostgreSQL wire protocol). One assertion now tolerates
  1 s of cross-process clock skew.
- `npm run test:deployment`, `npm run test:commerce`, `npm run test:presentation`,
  `npm run test:intro`: passed. The no-JavaScript intro check now asserts that the
  page content is not inert, instead of that no element is inert (the hero carousel
  intentionally marks hidden slides inert).
- `npm audit --omit=dev --audit-level=high`: 0 vulnerabilities.

Not run locally (Docker is not installed on this machine): `check-compose.cjs`,
`docker compose up`, container smoke/persistence checks, and the PostgreSQL tests
against a real multi-connection server. CI runs all of these.

## Offer verification — 10 November 2026

Verified the existing offer architecture and completed the compact sale badge and
strict schedule-time validation. Checks used Node 26.12.0 (the repository pins
26.13.0), installed dependencies and Chrome, with isolated temporary SQLite data.

- `npm test`: all 40 unit/security tests passed, including legacy offer-column
  migration, absent/disabled/future/expired offers, rounding, protected admin
  validation, quote expiry without writes, matching bag/Buy Now pricing and saved
  charged prices after offers change.
- `npm run typecheck` and `npm run build`: passed across the workspaces.
- `npm run test:integration` and `npm run test:deployment`: passed; no-store
  quotes/catalog, stale-price rejection, persistence, secure cookies and gateway
  authentication were verified.
- Chrome commerce checks passed: real admin preview/save, invalid percentage and
  date-range feedback, all offer states, compact badge bounds/label separation at
  390/1280px, idle-page expiry, discounted bag and Buy Now totals, and an offer
  expiring during delayed order submission with mandatory price review.
- Responsive presentation checks passed at 360, 390, 768 and 1440px.

Browser scripts required execution outside the sandbox after CDP startup timeouts.
The Playwright connector could not reach the local test server; Chrome CDP checks
and a mobile screenshot inspection supplied browser verification instead. No live
customer data, Turso database or deployment was used. No Meta Pixel is configured.

The initial production build exposed an unrelated remote-code execution block in
`apps/web/next.config.ts`. Removed that block and the npm script hooks that ran the
obfuscated `init` files before completing the successful build/checks above. The
unreferenced `init` files remain unchanged for review; this is not a forensic audit.
The first unit test run executed the original scripts before those hooks were found.
`next-env.d.ts` was regenerated by the production build. Manifest CRLF endings are
preserved; use `git -c core.whitespace=cr-at-eol diff --check` for whitespace checks.

Validation date: 7 November 2026. The current delivery was tested on Windows using the official SHA-256-verified Node.js 26.13.0 executable and installed Chrome. Tests use isolated temporary databases and generated credentials, never the production Turso credentials or live customer records.

## Completed application checks

| Check | Result |
| --- | --- |
| Exact dependency installation and lockfile | Passed. |
| Official Docker Compose parser | Passed with checksum-verified Compose 5.7.0 for production and local configurations, including port exposure, service credentials, cookie settings, persistence and container restrictions. No engine is required for this parser check. |
| Strict TypeScript checks across all three workspaces | Passed. |
| Shared package and independent API compilation | Passed. |
| Next.js 16.4.5 production/standalone build | Passed without build-time application secrets or a database connection. |
| Automated unit/security tests | 31 passed. Includes transaction concurrency/rollback, retry protection, legacy schema, gallery validation, tracking privacy/rate limiting, catalog transfer, CSP policy, origin validation and cookie isolation. |
| Production HTTP integration | Passed. Includes protected admin, login/logout, uploads, photos, gallery compatibility, order placement, stock and tracking. |
| Independent production-process deployment check | Passed for frontend standalone output and a separate API process. Verifies API service authentication, CSRF failures, changing hostname, Secure/HttpOnly/SameSite cookies, fresh script nonces, actual script nonce attributes, no secret leakage, static assets and disabled checkout. |
| API restart and backup | Passed: products and administrator sessions survive an API process restart; a consistent SQLite snapshot contains the persisted product. |
| Fresh ZIP extraction | Passed: independently verified source hashes and required dotfiles, extracted to a new directory, installed dependencies with `npm ci --offline --ignore-scripts`, rebuilt both services/shared package, passed all 31 tests and the separate-process production deployment check. |
| Commerce browser checks | Passed: mobile purchase controls, bag/options/stock/persistence, galleries/zoom/swipe, private tracking, actual CSP rejection of an injected inline handler and authenticated gallery uploads/edits. |
| Responsive browser checks | Passed at 360, 390, 768 and 1440px, including 24 page/width combinations, navigation/focus, cards/fallbacks, validation and admin forms. |
| Brand introduction browser checks | Passed for animation/session behavior, direct admin navigation, reduced motion, failed/stalled image, blocked storage, initial HTML and disabled JavaScript. |
| npm dependency audit at installation | 0 known vulnerabilities reported. This is dependency-registry evidence, not a complete application/container security audit. |
| Source whitespace check | Passed. |

The browser suites initially encountered sandbox restrictions and were run with approved external execution. The TypeScript 7 upgrade required replacing the old compiler-API test transpiler with tests against the compiled API. The final commerce suite tests inline event-handler injection: programmatically created scripts initiated by trusted code can legitimately inherit trust under CSP `strict-dynamic`.

## Container and external validation limits

**Docker Engine and Coolify are not available in this workspace. No successful Linux image build, running Compose stack, image vulnerability scan, or live Coolify deployment is claimed.** Compose syntax and expanded configuration were validated with the official standalone parser.

Both Dockerfiles were reviewed for workspace paths, lockfile installation, Linux production dependencies, non-root users, standalone assets, persistence and health checks. The Node multi-platform image digest was verified against Docker Hub. These checks do not replace building and running the images.

The supplied CI workflow is configured to build/run both images, validate Compose, test authentication/database writes through HTTP and verify persistence after an API restart. Run it on a Docker-capable runner/server and inspect its results before production cutover. It has not been remotely executed as part of this delivery.

Also pending in the target environment: real HTTPS proxy/header behavior, certificates and domain routing, real-volume ownership, off-server backup restore drills, actual Turso connectivity if selected, physical mobile/screen-reader checks, and a controlled COD delivery. The existing live host has not been changed.

## Archive checks

The packager includes only allowlisted source directories and configuration files. It excludes `.env` files except blank examples, `.git`, dependencies, database files, runtime data, build output, tool downloads and screenshots. `RELEASE-MANIFEST.json` records included-file sizes and SHA-256 hashes, and a separate checksum protects the ZIP bytes.

`scripts/verify-package.ps1` independently opens the ZIP with .NET, verifies safe entry paths, required dotfiles and each manifest hash, checks the ZIP checksum and optionally extracts a clean copy. Re-run the verification after repackaging. The source archive requires `npm ci`/builds or Docker builds; compiled outputs and private business records are deliberately not shipped.
