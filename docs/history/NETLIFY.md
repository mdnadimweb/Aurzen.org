# Netlify with Turso

The store uses Turso over HTTP when TURSO_DATABASE_URL is set. Products, categories, uploaded photo bytes, orders, sessions and sign-in limits live in the database. It does not create a local data folder in this mode. Local development keeps using data/aurzen.sqlite unless configured otherwise.

## 1. Transfer the existing catalog

1. In the Turso database dashboard, copy the database URL (libsql://...) and create a read/write authentication token.
2. Fill TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in the private .env.turso.local file. Never commit that file or paste the token into chat. Leave the existing .env.local unchanged.
3. Keep the hosted database empty until this import. A new hosted database does not receive sample products automatically.
4. In PowerShell, run:

   npm.cmd run migrate:turso

   This previews counts without writing to Turso.
5. Then run:

   npm.cmd run migrate:turso -- --apply

   This reads local SQLite without modifying it, copies images, and imports the catalog and orders. It verifies row counts and photo contents. Existing nonempty target catalogs/orders are rejected, not overwritten. Sessions and login-attempt counters are excluded; sign in again after migration. If image transfer is interrupted, matching images can be reused on retry.

The application initializes the hosted schema before import. If catalog import fails, its transaction rolls back; already copied unreferenced images may remain for a retry. Do not accept orders or edit the hosted catalog during transfer.

## 2. Set Netlify environment variables

In the project's environment-variable settings, add the following for Production. Include both Builds and Functions scopes where available:

- TURSO_DATABASE_URL: the libsql:// URL from Turso.
- TURSO_AUTH_TOKEN: the read/write token (mark secret).
- ADMIN_PASSWORD: a unique password of at least 16 characters (mark secret).
- CHECKOUT_ENABLED: false during deployment verification.

Do not configure DATABASE_PATH for Netlify. Do not use NEXT_PUBLIC_ prefixes for these values. The netlify.toml file configures npm run build, .next output and Node 22; Netlify detects Next.js automatically.

## 3. Redeploy and verify

Redeploy after the code and variables are in place. Check the homepage, /shop/, /admin/login/ and an uploaded product photo. Confirm the migrated prices, descriptions and stock. Test order placement and stock/status updates in an isolated staging database first; the repository integration tests already use isolated databases and never the hosted credentials.

Enable CHECKOUT_ENABLED=true and redeploy only when ready to accept customer orders. The current delivery charges remain BDT 80 in Dhaka and BDT 150 outside; COD totals are calculated on the server.

If Place order and the customer fields are disabled with "Ordering will open soon", edit the existing CHECKOUT_ENABLED variable to the exact value true for Production, including the Functions scope (or All scopes), and redeploy. The public /api/orders/ endpoint must then return enabled: true. A GitHub push alone does not change a variable saved in the Netlify dashboard.

The production origin https://aurzen.netlify.app is allowed by default, including when Netlify metadata is unavailable to Functions. Uploads post directly to /api/admin/images/ to avoid a trailing-slash redirect. No additional environment variable is required for this domain. If SITE_URL is already configured, set it to https://aurzen.netlify.app (or remove it to use the default). For another public domain, set SITE_URL to its exact origin and redeploy. Netlify's URL, DEPLOY_PRIME_URL and DEPLOY_URL are also accepted when NETLIFY is set. Arbitrary forwarded headers, missing origins and the literal null origin are not trusted. ADMIN_PASSWORD is the password you choose in Netlify, not the Turso token; local password settings do not transfer automatically.

## Storage and backup

Uploaded WebP photos remain in the database for this initial launch. Monitor database size and read usage against your Turso plan; a larger catalog should move photos to object storage. Netlify's request-size and execution-time limits apply to photo uploads and server requests. The app's 8 MB validation limit does not override the host's smaller request limits.

npm run backup is for the local SQLite file only. Configure and verify hosted Turso backup/export separately. Netlify deployments do not back up customer orders. Rotate a database token if exposed, then update the Netlify secret and redeploy.

## Current validation

Local checkout/concurrency and transfer tests, TypeScript, production build and API integration checks have been run. A real Turso connection and Netlify deployment still require your private credentials and must be verified after setup. No claim of a successful live migration is made before that verification.
