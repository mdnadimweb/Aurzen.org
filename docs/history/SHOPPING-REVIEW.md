# AURZÉN shopping presentation review

## Existing features retained

The mobile purchase bar already observed the original controls and used the existing option-aware cart action. The persistent shopping bag already handled quantities, stock caps, unavailable products, checkout links, Escape, focus trapping/restoration and backdrop dismissal. Tracking already used a private POST lookup, shared phone normalization, database-backed rate limits, no-store responses and genuine status events. The gallery already supported single/multiple photos, thumbnails, swipe, keyboard navigation and zoom/pan. Authenticated admin uploads already supported cover selection, ordering, removal and partial-upload retries.

These implementations were reused. Server-controlled prices, inventory, delivery, checkout idempotency, order records, authentication, origin checks and uploaded image references have not been changed.

## Problems corrected

- Cards, cart photos and bag thumbnails used cropped images and had inconsistent missing/broken-image behavior. A shared photo frame now reserves space and contains the whole image. Accessories get interior space; Mystery Boxes without photography retain the existing illustration and explicitly identify it as an illustration. Missing and failed photographs have labeled fallbacks.
- Cards now use a consistent 4:5 frame, readable full names, taka prices, real badges and an explicit sold-out state. Their images and names link to the same product. A second stored photograph loads only on a fine-pointer hover; touch keeps the cover image. No colour or material variations were invented.
- Homepage category tiles now use their category's existing catalog cover instead of choosing unrelated stock images by position. The third category remains available on phones.
- Gallery thumbnails now share image fallbacks and containment. Only the initial main photo has high fetch priority; secondary photos remain deferred. Zoom controls fit small screens and have 44px targets.
- Mobile navigation had been a horizontally scrolling desktop link row. It is now an accessible menu dialog with real links, route/resize dismissal, Escape, backdrop dismissal and focus restoration. The bag remains directly accessible in the header.
- The admin product form used an overlay without modal focus handling. It now uses the shared native dialog and keeps upload/save errors inside the form. Active uploads/saves still prevent accidental dismissal.
- Cart items now show unit and line prices with per-item stock/option/unavailability feedback. Checkout and tracking fields have nearby validation, accessible descriptions, phone normalization and focus on the relevant error/result.
- Photo frames, grids, forms, image viewer, menu and admin dialogs now fit the requested widths. Controls have adequate hit areas, form content stays in normal flow, focused inputs have scroll margins, and the viewport includes safe-area and keyboard-resizing metadata. The purchase bar hides while a dialog or input is active.

## Changed files

| Area | Files |
| --- | --- |
| Shared photography and cards | `app/components/product-image.tsx` (new), `product-card.tsx`, `product-gallery.tsx`, `product-photo.tsx`, `bag-drawer.tsx` |
| Header and mobile navigation | `app/components/store-header.tsx` and `store-header.css` (new), `app/store.tsx` |
| Forms and dialogs | `app/components/checkout.tsx`, `order-tracking.tsx`, `admin-workspace.tsx` |
| Responsive styling and viewport | `app/presentation.css` (new), `app/layout.tsx` |
| Verification and owner notes | `scripts/check-presentation.cjs` (new), `scripts/check-commerce.cjs`, `package.json`, `PRODUCT-CONTENT-REVIEW.md` (new), this report |

No new dependencies, database migrations, environment variables or production configuration changes are required.

## Verification completed

- `npm run typecheck`: passed.
- `npm test`: 26 tests passed, including checkout, concurrency, migration/transfer compatibility, private tracking, rate limiting, gallery validation and status history.
- `npm run build`: passed.
- `npm run test:integration`: passed with isolated data, including authenticated uploads and admin updates, gallery ordering/cover limits, tracking privacy and checkout inventory.
- `npm run test:commerce`: passed in headless Chrome. Covers required clothing/Mystery Box options, sticky controls, bag quantities/removal/persistence/legacy carts, unavailable items, checkout navigation, keyboard focus, Escape/backdrop, single/multiple photos, zoom/pan/touch swipe, private tracking and admin multi-upload/partial retry/cover/reorder/remove/save.
- `npm run test:presentation`: passed in headless Chrome across 360, 390, 768 and 1440px. Checks 24 page/width combinations, two-column phone grids, document overflow, long names, sold-out/missing/broken photo fixtures, touch/hover behavior, navigation, focus, 44px interactive targets, search/filter/sort/product links, inline validation and admin dialog behavior. Reduced motion was enabled. Screenshots are retained locally in ignored `data/presentation-*.png` files.

Browser tests create their own temporary databases and sessions. They do not place live orders or edit production inventory. Chrome is required; `CHROME_PATH` can override its executable location.

## Verification limits

Physical iOS/Android safe areas, real on-screen keyboards and assistive-technology announcements require a real device/screen reader. Browser emulation and keyboard tests passed, but do not replace those checks. Automated screenshots block external font/Unsplash requests for deterministic tests; local photos, missing-photo fallbacks and the existing brand font fallback remain available.

This change is left in the working tree for review and GitHub deployment, as requested. No authenticated Netlify project connection is available in this session, so a production deployment has not been attempted or claimed for this review.

## Owner-supplied assets and information

See `PRODUCT-CONTENT-REVIEW.md` for all seven live products. Each currently has at most one cover and needs additional actual photographs; the Mystery Box has only an illustration. Six descriptions are blank. The names `shirt`, `formal` and `summer` need clearer garment identification after owner confirmation. Existing Unsplash covers need confirmation that they represent the actual items being sold. No replacement photos, measurements, fabric claims or descriptions were fabricated or published.
