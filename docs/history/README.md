# AURZÉN

Next.js and TypeScript storefront with a local SQLite backend, protected owner dashboard and cash-on-delivery checkout foundation.

## Development on Windows

Use Node.js 22.13 or newer. In PowerShell:

```powershell
npm.cmd ci
npm.cmd run setup
npm.cmd run dev
```

Open http://localhost:3000. For the owner dashboard, open http://localhost:3000/admin/ and use `ADMIN_PASSWORD` from your ignored `.env.local` file. The setup command creates a unique password without printing it. On shells without PowerShell's script restriction, `npm` also works.

## Commands

```text
npm run typecheck
npm test
npm run build
npm run test:integration
npm run start
npm run backup
```

Run the production build before integration checks. Tests use isolated temporary databases and do not change your catalog or orders. The integration runner temporarily starts a production server on port 3101 and stops it afterwards.

## Configuration

See `.env.example`. `DATABASE_PATH` defaults to `data/aurzen.sqlite`. This directory and credentials are ignored by Git. Products and categories are seeded once with sample records; deleting all products does not seed them again.

Ordering defaults to disabled. Delivery is ৳80 inside Dhaka city and ৳150 outside Dhaka, calculated on the server. No online payment or courier integration is configured.

## Structure

- `app/store.tsx`: storefront composition and browsing.
- `app/components/`: checkout, protected admin workspace, product cards and box artwork.
- `app/providers.tsx`: shared catalog/cart state; only the cart persists in browser storage.
- `app/api/`: public catalog/checkout and authenticated admin operations.
- Product photos: upload JPG/PNG/WebP files (up to 4 MB) in Admin → Products → Add/Edit. Images are optimized to WebP and stored in the database with the catalog. The logo is in `public/brand/aurzen-logo.png`.
- `lib/`: catalog types, database, authentication, validation and transactional ordering.
- `tests/` and `scripts/integration-test.cjs`: checkout and production API verification.

Read [LAUNCH.md](LAUNCH.md) for completed work and outstanding business requirements, and [DEPLOYMENT.md](DEPLOYMENT.md) before hosting. This is a local launch foundation; the sample catalog and missing business policies must be completed before accepting customers.
