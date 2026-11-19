# Admin CMS progress (branch `feat/admin-cms`)

Resume by reading this file. Tick = shipped and tested (typecheck, 86 unit tests, build,
integration/commerce/presentation/intro browser checks, manual check on a disposable local shop).

## How it is built (foundation)
- `packages/shared/src/site.ts`: typed `SiteSettings` (one `site` settings row, saved per section),
  `Content` (pages, FAQ, reviews in one `content` row), defaults = the old hard-coded storefront,
  validators (`normalizeSiteSection`, `normalizeContentSection`), `linkHref` (LinkPicker targets),
  safe Markdown renderer for pages.
- API: `saveSite` / `resetSite` / `saveContent` / `deleteSubscriber` admin actions (server-side auth +
  validation), public `GET /api/content` (published only) and `POST /api/subscribe` (rate-limited).
- New tables: `activity` (activity log), `subscribers`. Created with `IF NOT EXISTS`; nothing migrated or deleted.
- Admin UI: `components/admin/editable-card.tsx` (collapsed cards, one open at a time, Save/Cancel,
  discard prompt, Esc, leave-page warning), `link-picker.tsx`, `site-settings.tsx`, `backup.tsx`.
- Storefront reads `site` from the cached catalog; admin saves expire the cache (existing `catalogChanged`).

## Phase 1 — core settings and chrome
- [x] M1 General settings: brand, tagline, footer text, dark logo, favicon, contact, social, business info; site title/description/OG/favicon from settings.
- [x] M2 Announcement bar: many messages, link, active, start/end, seconds per message, master switch, slow fade.
- [x] M3 Navigation + footer: menu editor (reorder/show/hide/LinkPicker, automatic categories), new purple/gold footer (4 columns, accordions on phones), bottom bar, payment labels, newsletter signup + subscribers list + CSV. Public “Enter the studio” link removed.
- [x] M4 Checkout & delivery: Dhaka/outside charge, free threshold, minimum order, COD on/off + fee, bKash/Nagad/advance with instructions (recorded on the order), email field hidden/optional/required, order note, confirmation text, tracking intro, delivery estimate. Enforced by the API.
  - Note: editing an existing order’s delivery area in the order editor still uses the default ৳80/৳150.

## Phase 2 — homepage and banners
- [x] M5 Hero slides: existing editor plus per-slide link (LinkPicker; default = its category page, no more /shop/?category= links), start/end dates and show/hide. Not done: a separate mobile image per slide.
- [x] M6 Promo banners: own links, schedule, hidden (existing) plus section on/off, seconds per banner and slide/fade.
- [x] M7 Homepage sections: reorder and show/hide every block below the hero (trust strip, collections, banners, favourites, category rows, mystery, reviews, brand note); favourites row source = first / newest / best sellers (90 days) / on sale / a category / hand-picked, 4 or 8; never repeated in the category rows.
- [x] M8 Categories: per category/subcategory card button (Choose your size / Add to bag / Reveal your box / Available; Mystery Box never says “Choose your size”), description under the title, SEO title/description. Alt text fixed (“Men’s collection collection”). Not yet: size guide per category (needs M12).

## Phase 3 — products and catalog
- [x] M9 Product editor: status Active/Draft/Hidden (draft and hidden never reach the shop or checkout), SKU, fabric/material, care, featured, low-stock level, stock per size (checked at checkout, reduced by orders, restored on cancel/return; sold-out sizes greyed out), SEO title/description, related products, one badge with presets. List: select + bulk status / price % / move category, duplicate (as Draft), CSV export, CSV import with preview (new rows become Drafts, nothing deleted, all-or-nothing). Not done: slug-style product addresses, rich text, related products shown on the product page.
- [x] M10 Mystery Box details: what’s guaranteed, “worth at least ৳X”, how-it-works steps, no-spoiler note on Mystery Box pages (Categories tab). Style choices stay the built-in list.
- [x] M11 Gift options: gift wrap (price) and message card (length limit) at checkout for chosen categories (default Mystery Box + Love & Care); charged and checked by the server; shown on the order and invoice. (Per category, not per product.)
- [x] M12 Size guides: reusable tables (any columns/rows, note), attached to categories, subcategories or single products; “Size guide” pop-up on product pages. One clothing guide seeded but not attached.

## Phase 4 — content pages and social proof
- [x] M13 Pages: About, Delivery, Returns, Size guide, Privacy, Terms seeded; add/edit/reorder/hide; `/pages/<address>/`; SEO fields; safe formatting.
- [x] M14 FAQ: groups + questions, reorder, show/hide, `/faq/`. (Product-page snippet not yet.)
- [x] M15 Reviews: admin add/edit/approve/hide/delete with photo, rating, product link; approved reviews show as homepage testimonials and on the linked product page with the average rating. (Customer submission not yet.)

## Phase 5 — orders and customers
- [x] M16 Orders: filters by payment/courier (plus existing search/status/dates), select + bulk status (allowed moves only), internal notes, status timeline, cancel reason, restock on cancel/return, courier suggestions (Pathao/Steadfast/RedX…), print invoices and shipping labels, CSV of the filtered list, duplicate / many-cancellations flag, payment method, customer note and coupon shown. Not yet: editing items is the existing editor (unchanged).
- [x] M17 Customers: search, tag filter, tags (VIP, Risky, Wholesale, Repeat), private notes, order history, total spent, CSV, block a phone from ordering (enforced by the API).
- [~] M18 Messages: editable WhatsApp/SMS templates per status with placeholders; buttons on each order open WhatsApp or SMS ready to send. Courier API parcel creation not built (needs your Pathao/Steadfast API keys; fields + links only for now).

## Phase 6 — marketing
- [x] M19 Coupons: percent / fixed / free delivery, minimum order, total and per-phone limits, dates, whole order / category / product, on/off; checked only by the server at quote and order; usage and discount totals per code; stored on orders and invoices.
- [x] M20 Scheduled sales: % off everything / a category (with subcategories) / chosen products for a date range, auto start/end, product’s own offer wins; applied by the server so shop and checkout agree. Sale page title, eyebrow, intro and banner editable.
- [x] M21 Popup: title/text/image/button/LinkPicker, once per N days, schedule, Esc/backdrop close. Subscribers list + CSV.

## Phase 7 — appearance, SEO, integrations
- [x] M22 Appearance: 4 colours, heading/body font (from fonts already loaded or the phone’s own), button shape/style, product photo shape, labels and savings text on/off, animation normal/slow/off (reduced-motion always respected), maintenance mode, page-not-found text, Restore default. Nothing changes until saved.
- [~] M23 SEO: homepage title, title template, description, social image, indexing switch, redirects manager (301, keeps utm/fbclid; seeded for the two old collection addresses), canonical tag and Product schema (price, stock, rating) on product pages. Not done: slug-style product addresses (would change every product link and existing shared links; kept numeric).
- [x] M24 Integrations: Meta Pixel (PageView, ViewContent, AddToCart, InitiateCheckout, Purchase), Google Analytics, Search Console code, WhatsApp + Messenger buttons. Scripts load after page load, only when set. CSP allows their endpoints.

## Phase 8 — operations and safety
- [x] M25 Overview: today / 7 / 30-day orders and revenue, pending orders, top products (30 days), low stock, subscribers — above the existing charts.
- [x] M26 Users & roles: owner keeps the ADMIN_PASSWORD sign-in; owners add staff or other owners with a username + temporary password (scrypt-hashed), forced password change at first sign-in, disable/remove ends sessions immediately. Staff: orders, products (no price/offer changes), customers only — enforced on the server; staff never receive coupons, subscribers, activity log or accounts. Activity log shows who. Per-username login limits.
- [x] M27 Activity log (filter by area/date) and Backup page (products, categories, orders, customers CSV; settings JSON export/import).
- [x] M28 Security pass — findings:
  - OK: every admin read/write calls requireAdmin on the API (admin, images); public routes expose only published content, approved reviews and redirects; coupons, customers, orders stay private; no secrets in browser code; all owner input validated on the server; page text is escaped (safe formatting only).
  - Fixed: placing orders had no rate limit (now 300 per 15 min shop-wide and 10 per hour per phone; price checks 20,000 per 15 min); /admin and /api now send X-Robots-Tag noindex; robots.txt + sitemap.xml added (block everything unless ordering is open and indexing is on).
  - Known: the login limit is shop-wide (20 tries / 15 min), so someone guessing passwords can briefly lock the owner out; per-person limits need user accounts (M26).

## Assumptions
- Lists live in JSON settings rows (validated per section) instead of one table each; only append-heavy data (activity, subscribers) got tables.
- Page content uses simple formatting (## headings, **bold**, lists, links) rather than an HTML editor, so nothing unsafe can be stored.
- No draft/publish yet: saves go live immediately (the old content can be restored with “Restore default”).
- Activity log actor is “Owner” until user accounts exist (M26).
