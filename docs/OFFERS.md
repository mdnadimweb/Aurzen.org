# Product offers

In the owner studio, edit a product and use **Offer**. The regular price remains
the base price. Enable an integer discount from 1–99%, optionally choose start/end
times, and review the regular price, offer price, and savings before saving.

Times are entered as **Asia/Dhaka (UTC+06:00)** and stored as UTC ISO timestamps.
Start is inclusive; end is exclusive. Blank start means immediately; blank end
means no expiry. Disabled, future, expired, and absent offers use the base price.
Discounted unit prices round to the nearest whole BDT, with a minimum of ৳1;
quantities multiply that rounded unit price. A ৳1,250 item at 20% is ৳1,000.

Active cards and product galleries show a compact plum **20% OFF** badge, derived
from the saved percentage. Existing product labels sit below it, and gallery
controls remain clear. The badge disappears at the end boundary without reloading.
Impossible calendar dates and times such as `24:00` are rejected by the API.

## Database upgrade

The API's existing initializer automatically adds `products.offer TEXT NOT NULL
DEFAULT 'null'` inside its schema transaction on first database access. The same
initializer supports local SQLite and Turso. Existing products have no offer;
base prices, stock, images, orders, and sessions are retained. No manual SQL or
separate migration command is required. Back up the business database using the
existing backup procedure before deploying an upgrade. Restart the API with the
updated build; normal startup health checks trigger initialization.

Deploy matching frontend and API builds together. Order submission now requires
a price-review token from `POST /api/orders/` with `{action:'quote',items,area}`.
An older open browser tab may need reloading. The server recalculates the quote
inside the order transaction; a changed/missing review returns 409 without order
or inventory writes. Both bag and Buy Now use this flow, with an explicit review
step after price changes. Each saved order item retains its actual charged price.

Catalogs and quotes use no-store responses. The UI uses a server-adjusted clock
to update visible offers at schedule boundaries and refreshes data on focus and
periodically. A suspended/offline page can lag until resumed; the server still
enforces current prices before saving an order. No Meta Pixel is configured.
