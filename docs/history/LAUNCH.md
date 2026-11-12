# AURZÉN launch progress

## Implemented locally

- Shared SQLite catalog, categories and orders instead of browser-only business records.
- Server-protected admin page and API, password sign-in, expiring HTTP-only sessions, logout, login throttling and origin checks.
- Product creation, editing, descriptions, labels, image URLs, deletion and inventory updates.
- Product URLs and titles, category links, search, sorting, persisted cart and order receipt.
- Server-side customer validation, canonical pricing, atomic inventory deduction, stock checks across sizes and retry-safe order creation.
- Delivery area selection: Dhaka city **৳80**, outside Dhaka **৳150**. No free-delivery threshold.
- Order status management; cancelled and returned orders restore inventory once. Invalid status transitions are rejected.
- Consistent database backup command, error/loading/not-found pages and responsive styles.
- Checkout unit tests and production-server integration checks with isolated temporary databases.

## Before taking customer orders

1. Replace all sample catalog records and stock counts with real products. Upload your own JPG, PNG or WebP photos (up to 8 MB) in the product form. Photos are optimized and stored in the database, included in database backups. Unattached uploads are retained when a form is cancelled or a product photo is replaced.
2. Add materials, measurements, available sizes, care information and accurate contents for mystery boxes. Inventory currently uses one total per product; size-specific stock needs a separate model if required. Clothing currently offers S/M/L/XL.
3. Supply your business name/address, support email/phone, delivery coverage and times, return/exchange rules and privacy requirements. Public policy pages will be written once these are confirmed.
4. Confirm cash on delivery as the first payment method. Online payments, courier booking, SMS/email notifications and customer accounts are not connected. Staff must monitor the admin dashboard and arrange fulfilment manually.
5. Select a domain and hosting that runs a Node.js server with a persistent disk. This SQLite implementation is intended for one application instance; it is not suitable for static hosting, ephemeral functions or multiple application instances sharing stock. Migrate to a managed database if choosing that architecture.
6. Configure a production admin password, HTTPS, backups kept off the application disk, monitoring and an order-processing routine. Current admin is a single shared owner account; multiple staff roles, password recovery and MFA require an identity provider.
7. Perform a real mobile/browser acceptance test and verify the deployed delivery flow. HTTP tests do not verify layout, keyboard focus or courier operations.
8. Set `CHECKOUT_ENABLED=true` in the hosting environment and restart/rebuild only after the above is ready. The default is disabled. Search indexing is disabled while ordering is disabled; configure the real domain, canonical URLs and sitemap when deploying.

## Local admin access

Open `.env.local` privately in your editor and copy `ADMIN_PASSWORD`. Visit http://localhost:3000/admin/ and sign in. The file is ignored by Git. Do not send the password in chat or commit it. `npm run setup` creates this file only if it does not already exist.

Existing browser-only demo records were not imported into the database. They are kept separate from real server records. Only the cart is stored in the browser now.
