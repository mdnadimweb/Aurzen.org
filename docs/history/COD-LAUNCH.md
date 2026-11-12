# Cash-on-delivery launch handover

Cash on delivery is confirmed as the launch payment method. New orders store `paymentMethod: cod`; older orders were also COD. Customers pay the order total including delivery on arrival. Staff must arrange delivery and collection manually; no courier booking or notifications are connected.

## Details still needed from the owner

- Public business name, support phone/WhatsApp, email, business/return address.
- Confirm delivery charges (currently Dhaka city BDT 80, outside Dhaka BDT 150), coverage and delivery estimates.
- Return/exchange eligibility, window, charges, and parcel inspection rules.
- Real products, images, prices, descriptions, sizes and stock; decide whether inventory must be tracked per size. Current stock is pooled per product.
- Domain and hosting account. Do not send passwords in chat; configure secrets in the host.

## Preparation status

- COD checkout, server-calculated totals, Bangladesh phone validation, transactional stock deduction and retry protection are implemented.
- COD is visible in the admin order tables.
- Nine checkout tests, TypeScript validation via production build, production build and API integration checks passed during preparation.
- Public checkout remains disabled pending the real catalog, business policies and deployment.
- Policy pages, final domain metadata, deployment, off-server backup schedule and a deployed browser test remain outstanding.

## Opening day sequence

1. Deploy one Node.js application instance with persistent SQLite storage, HTTPS and a unique ADMIN_PASSWORD. Follow DEPLOYMENT.md.
2. Keep CHECKOUT_ENABLED=false while replacing sample products and completing the business/policy pages.
3. Set up and test off-server database backups. Product uploads and customer records are in SQLite. Never expose backups publicly.
4. In a staging environment, test a full COD order on desktop and mobile, verify prices, delivery and stock, and walk through confirmation, dispatch, delivery and cancellation in Admin.
5. Set CHECKOUT_ENABLED=true on the production host and restart/rebuild. Verify the first controlled real order before advertising the store.

## Daily fulfilment

- Check Admin > Orders regularly. The dashboard does not send automatic notifications or refresh order data automatically; reload to see new orders.
- Call the customer to confirm address, items and COD total; mark Confirmed.
- Pack the order and mark Processing. Book the courier manually with the full COD total, including delivery, then mark Shipped.
- Mark Delivered only after delivery is confirmed. Reconcile the courier's payment separately; order status does not track remittance.
- Cancel before dispatch when appropriate. Cancellation restores inventory once. Mark Returned only when returned items have arrived and are fit to resell, because this also restores stock.
## Owner confirmations

- Current products are real; preserve the catalog.
- Delivery charges confirmed: Dhaka city BDT 80, outside Dhaka BDT 150.
- Returns accepted if the delivered item does not match the order.
- Contact phone, WhatsApp and email will be supplied later.
- Still pending: delivery estimates, return reporting channel/window, return shipping and resolution process, domain/hosting and size-level stock decision.
