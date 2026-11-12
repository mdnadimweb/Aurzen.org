# Moving AURZÉN from Netlify to Vercel

## Prepared changes

The existing Next.js application can run on Vercel with the hosted Turso database. No catalog import or database reset is needed when reusing the existing production Turso database. Netlify configuration is retained for rollback.

- New uploads are limited to 4 MB in both the browser and server, leaving multipart overhead below Vercel's 4.5 MB request limit. The eight-photo gallery remains available. Existing images are not modified.
- Vercel refuses to initialize local SQLite when Turso is missing. It must not create a disposable database containing sample products.
- `.vercel/` is ignored by Git; local databases and environment files are excluded from CLI deployment uploads.

## Create the Vercel project

Import the existing GitHub repository, with the repository root as the project root and the Next.js framework preset. Use Node.js 22.x, `npm run build`, and the default Next.js output settings. Do not select a static export or use Netlify's `.next` publish-directory setting as a custom Vercel output override.

Choose an appropriate Vercel plan for a commercial store before launch. Do not purchase or upgrade a plan without the owner's approval.

Set these variables for Production in Vercel's project settings, then redeploy:

| Variable | Value |
| --- | --- |
| `TURSO_DATABASE_URL` | Existing production Turso `libsql://` URL. |
| `TURSO_AUTH_TOKEN` | Existing production database read/write token; mark sensitive. |
| `ADMIN_PASSWORD` | A unique password of at least 16 characters; mark sensitive. |
| `SITE_URL` | Exact HTTPS origin of the new production domain, without a path. |
| `CHECKOUT_ENABLED` | `false` for the first production verification, then `true` only when ready. |

Do not copy `NETLIFY`, Netlify deployment metadata, or `DATABASE_PATH`. Vercel supplies `VERCEL` automatically. Never use `NEXT_PUBLIC_` for credentials. Do not print or commit secret values.

Use a separate Turso database and admin password for Preview deployments. Do not give untrusted preview code access to production credentials. Keep preview checkout disabled except for controlled tests against that separate database. Set a matching preview `SITE_URL` when needed; the application also accepts the actual request URL's origin. It does not trust arbitrary forwarded-host headers or wildcard Vercel domains.

## Verify before switching traffic

1. Confirm the deployment build succeeds and runtime logs have no database errors.
2. Compare public product names, prices, stock and images with the old store. Reusing production Turso preserves the same records; do not run the import script against it.
3. Test owner login/logout and use a designated test product for upload, gallery editing and saving. These operations write to whichever database is configured.
4. In a separate staging database, verify a full COD checkout, retry behavior, stock deduction, tracking lookup and cancellation/return stock restoration.
5. Confirm the desired production hostname is allowed by `SITE_URL`. Test admin actions and upload requests from that hostname.
6. Verify real mobile layouts, gallery loading, and a small photo upload. Uploads above 4 MB must be rejected in the browser. Existing media responses must also fit Vercel's response limits.
7. Configure hosted Turso backups and monitoring; the local SQLite backup command does not back up Turso.

## Switch the public address

For a custom domain, add it in Vercel, apply the exact DNS records Vercel supplies, and wait for valid HTTPS before directing customers there. Update `SITE_URL` to that origin and redeploy. Preserve existing product URL paths.

The `aurzen.netlify.app` hostname cannot be transferred to Vercel. Use a `.vercel.app` hostname or an owned domain. After verification, configure permanent redirects from the old Netlify site to the new origin, preserving paths and query strings; avoid leaving two indexable copies. Update social/ad links and Search Console as appropriate.

Enable checkout on Vercel only when verification is complete. If the old store was accepting orders, disable its checkout for cutover and keep its deployment available for rollback. Changing checkout settings on Vercel does not change Netlify's settings. Both sites will write to the same records if both use the same Turso database.

Rollback: restore the old domain routing and Netlify checkout setting if required. Keep using the same database; do not restore an old snapshot over new orders. A new admin sign-in may be needed on the new hostname.

## References

- https://vercel.com/kb/guide/migrate-to-vercel-from-netlify
- https://vercel.com/docs/environment-variables
- https://vercel.com/docs/functions/limitations

Deployment and domain cutover remain incomplete until verified against an authenticated Vercel account.
