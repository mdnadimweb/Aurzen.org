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
- [ ] M5 Hero slides: already editable (Homepage tab). Not yet: per-slide LinkPicker, mobile image, schedule.
- [ ] M6 Promo banners: already editable (Homepage tab, own links, schedule, hidden). Not yet: global interval/transition/section switch.
- [~] M7 Homepage sections: trust strip, favourites row (title/button/4 or 8), mystery section, brand note are editable and can be hidden. Not yet: section reorder, product-row sources, testimonials row.
- [ ] M8 Collection cards + categories: covers/featured exist. Not yet: descriptions, SEO, card button label, size guide per category.

## Phase 3 — products and catalog
- [ ] M9 Product editor upgrades · [ ] M10 Mystery Box config · [ ] M11 Gift options · [ ] M12 Size guides

## Phase 4 — content pages and social proof
- [x] M13 Pages: About, Delivery, Returns, Size guide, Privacy, Terms seeded; add/edit/reorder/hide; `/pages/<address>/`; SEO fields; safe formatting.
- [x] M14 FAQ: groups + questions, reorder, show/hide, `/faq/`. (Product-page snippet not yet.)
- [~] M15 Reviews: admin add/edit/approve/hide/delete with photo, rating, product link. Storefront display not yet.

## Phase 5 — orders and customers
- [ ] M16 (status map already shared by UI + API; courier fields exist) · [ ] M17 · [ ] M18

## Phase 6 — marketing
- [ ] M19 Coupons · [ ] M20 Scheduled sales
- [x] M21 Popup: title/text/image/button/LinkPicker, once per N days, schedule, Esc/backdrop close. Subscribers list + CSV.

## Phase 7 — appearance, SEO, integrations
- [ ] M22 Appearance
- [~] M23 SEO: homepage title, title template, description, social image, indexing switch. Not yet: redirects manager, slug URLs, schema, canonical.
- [x] M24 Integrations: Meta Pixel (PageView, ViewContent, AddToCart, InitiateCheckout, Purchase), Google Analytics, Search Console code, WhatsApp + Messenger buttons. Scripts load after page load, only when set. CSP allows their endpoints.

## Phase 8 — operations and safety
- [ ] M25 Overview additions · [ ] M26 Users & roles (today: one owner password, no user accounts)
- [x] M27 Activity log (filter by area/date) and Backup page (products, categories, orders, customers CSV; settings JSON export/import).
- [ ] M28 Security pass

## Assumptions
- Lists live in JSON settings rows (validated per section) instead of one table each; only append-heavy data (activity, subscribers) got tables.
- Page content uses simple formatting (## headings, **bold**, lists, links) rather than an HTML editor, so nothing unsafe can be stored.
- No draft/publish yet: saves go live immediately (the old content can be restored with “Restore default”).
- Activity log actor is “Owner” until user accounts exist (M26).
