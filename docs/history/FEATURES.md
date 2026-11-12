# Shopping and order updates

The storefront now includes a mobile purchase bar, shopping bag drawer, private order tracking, and a product photo gallery with a full-screen zoom viewer. Existing cart entries keep the same `id`, `qty`, and `size` structure; Mystery Box styles continue to use the existing option field.

## Data compatibility

- Database initialization automatically adds `products.images` as JSON text with an empty array default. Existing `products.image` values remain the cover photo. No product or image assets are deleted by this migration or by gallery removal.
- Saving a gallery keeps its selected cover in `products.image`, so existing cards and other cover consumers continue to work. A product supports up to eight photos. The existing authenticated upload endpoint accepts still JPG, PNG, and WebP files up to 8 MB and re-encodes them to WebP.
- New orders record their initial status timestamp. Subsequent admin status changes record real events in the order JSON. Older orders retain their current status without fabricated history.
- Courier name and tracking reference are optional order JSON fields. The tracking page shows them only when both have been recorded through the authenticated admin workflow.
- Tracking requires an order reference and matching Bangladesh mobile number. Responses contain the order reference, creation date, item names/options/quantities, status, real status events, and available courier reference. Customer names, addresses, phone numbers, prices, and payment details are excluded.
- Tracking uses the existing database `rate_limits` table rather than process memory, making limits shared by Netlify function instances. Tracking request bodies use POST; phone numbers are not put into links. Tracking responses and failures use `Cache-Control: no-store`, and the tracking page requests no search indexing.

## Deployment

No new dependencies or environment variables are required. Retain the existing Netlify configuration and server-side variables, particularly `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `ADMIN_PASSWORD`, `SITE_URL`, and `CHECKOUT_ENABLED`. Keep secrets in Netlify environment configuration with the Functions runtime scope; do not commit them.

1. Run `npm run typecheck`, `npm test`, `npm run build`, `npm run test:integration`, and `npm run test:commerce` in the existing checkout. The browser checks require installed Chrome (or `CHROME_PATH`) and use isolated data.
2. Commit and push the completed changes to the GitHub branch connected to Netlify (currently `main`). Netlify runs the existing `npm run build` configuration and publishes `.next`.
3. The schema upgrade runs automatically when the deployed app first initializes its existing database; no manual SQL or catalog import is needed. Take an ordinary database backup before deployment if your operations process requires one.
4. Check the production deploy log and visit `https://aurzen.netlify.app/`, a product page, `/cart/`, and `/tracking/` after the deploy completes.
5. In the studio, upload/reorder photos and enter courier information for real orders as needed. These features do not automatically integrate with a courier API.

## Verification scope

`tests/features.test.cjs` uses an isolated temporary SQLite database. It covers legacy cover preservation and gallery serialization, shared phone normalization, private matching lookup, generic failures, response minimization, older/cancelled/returned orders, genuine status events, courier details, origin restrictions, no-store responses, and durable rate limiting. Existing checkout tests continue to cover server-controlled prices, delivery, options, inventory, rollback, and idempotency.

The production build, all 26 automated tests, and authenticated API integration checks passed. `scripts/check-commerce.cjs` also passed in headless Chrome with isolated data: mobile purchase controls, required options, bag focus trapping and dismissal, stock limits, saved and legacy carts, removed products, Mystery Box styles, single/multiple photos, zoom, keyboard pan/navigation, mobile touch swipe, tracking links/privacy metadata, failed and successful tracking lookups for an older cancelled order, and authenticated admin upload/cover/reorder/remove/save flows including partial upload failure and retry. Tests do not place live orders or alter real customer data. Real-device safe-area behavior and a real courier delivery remain manual checks.
