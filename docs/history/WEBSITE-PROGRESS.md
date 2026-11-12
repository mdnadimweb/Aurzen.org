# AURZÉN — Website Progress Report

Prepared: 7 November 2026  
Purpose: A plain-language record of what we have already built and what remains to prepare for launch.

## Overview

AURZÉN is a Bangladesh-focused online fashion store for clothing, accessories and Mystery Boxes. We have built the customer shopping experience, a protected owner dashboard and the backend needed to manage products, stock and cash-on-delivery orders.

The project has moved beyond a visual demonstration: products and orders are stored in a database, prices and stock are checked by the server, and the owner can manage the store through the website.

This report is based on the current repository and its existing review records. It does not certify the current production deployment, checkout setting or live inventory. No customer orders or product records were changed while preparing it.

## 1. Brand and website design

- AURZÉN branding, logo and animated brand introduction.
- A fashion-focused homepage with a hero banner, collection links, featured products, a Mystery Box section and brand story.
- Refined typography, spacing, product cards and photography layouts.
- Responsive layouts for phones, tablets and desktop screens.
- Mobile navigation with an accessible menu and a shopping bag shortcut.
- Loading, error, unavailable-product and page-not-found experiences.
- Motion effects and reduced-motion handling.

## 2. Product browsing

- A shop page displaying the available catalog.
- Category filtering and category links from the homepage and navigation.
- Product search by name or category.
- Sorting by featured order, price and name.
- Individual product pages with names, descriptions, prices, availability and purchase options.
- Clothing size selection for the Clothing category and style selection for Mystery Boxes.
- Product labels and clear sold-out states.

Stock is currently tracked as one total per product. Separate stock quantities for each size or colour have not been implemented. Size selection is currently tied to the Clothing category; other categories do not automatically receive clothing size controls.

## 3. Product photos and galleries

- Product photo uploads through the owner dashboard.
- Support for JPG, PNG and WebP, with an application upload limit of 8 MB per image; hosting limits may be lower.
- Automatic image optimization to WebP.
- Up to eight photos per product, with cover selection, reordering and removal from the gallery.
- Product galleries with thumbnails, touch swipe and a full-screen zoom viewer.
- Keyboard navigation and zoom/pan controls.
- Consistent photo frames that show the whole image, with labeled fallbacks for missing or failed photos.
- A second stored image on product-card hover where supported.
- An identified illustration for Mystery Boxes without product photography.

Uploaded images are stored in the database. Removing a photo from a gallery does not delete its stored image bytes.

## 4. Shopping bag and mobile purchasing

- Add products with the required size or style.
- A shopping bag drawer available across the storefront.
- Quantity changes, item removal and stock-limit feedback.
- A cart saved in the customer's browser between visits.
- Unit prices, item totals and unavailable-item warnings.
- A mobile purchase bar on product pages.
- Keyboard focus handling, Escape dismissal and focus restoration for shopping dialogs.

## 5. Cash-on-delivery checkout

- Checkout collects the customer's name, Bangladesh mobile number, delivery address and delivery area.
- Cash on delivery is the implemented payment method.
- Current delivery charges are BDT 80 within Dhaka city and BDT 150 outside Dhaka.
- The server calculates product prices, delivery charges and the final total.
- Customer details, product options and available stock are validated before accepting an order.
- Stock deduction and order creation are transactional to protect inventory.
- Retry protection helps prevent duplicate orders when the same submission is repeated.
- Successful checkout displays an order reference, total and order-tracking link.
- An environment setting lets the owner keep ordering disabled until the store is ready.

The storefront states that returns are accepted if the delivered item does not match the order. The full reporting window, return charges and resolution process still need to be confirmed.

## 6. Private order tracking

- A dedicated tracking page.
- Lookup using an order reference and matching Bangladesh mobile number.
- Order status and genuine recorded status events.
- Courier name and tracking reference when staff have entered both.
- Tracking responses exclude customer names, addresses, phone numbers, prices and payment details.
- Database-backed request limits and non-cached responses.

Courier information is entered manually. The website does not book shipments or retrieve live courier updates automatically.

## 7. Owner dashboard

The protected studio includes an overview and areas for products, categories, orders and customers.

| Area | What has been built |
| --- | --- |
| Products | Add, edit and delete products; manage prices, descriptions, labels, stock and photos. |
| Categories | Add and remove categories and view their product counts. |
| Orders | Review customer details, ordered items, delivery charges, totals and COD payment method. |
| Fulfilment | Update order status and record courier details. |
| Customers | View customer summaries derived from order records, including order counts and order value. |

Order statuses are New, Confirmed, Processing, Shipped, Delivered, Cancelled and Returned. Invalid status transitions are rejected. Cancellation and return handling restore inventory once, so staff must use these actions carefully.

Customer summaries are an owner feature; customer sign-in accounts have not been built. Staff must reload the dashboard to see new order data.

## 8. Backend, security and hosting preparation

- Built with Next.js, React and TypeScript.
- Database storage for catalog records, categories, uploaded photos, orders and administrator sessions.
- Local SQLite support for development and persistent-disk hosting.
- Hosted Turso database support for Netlify.
- A catalog/order transfer tool with preview, validation and protection against overwriting a nonempty target catalog or order database.
- Protected admin pages and APIs, password sign-in, expiring HTTP-only sessions and logout.
- Login throttling and request-origin checks for protected operations.
- Server-side validation for checkout and administrative changes.
- A local SQLite backup command and deployment/setup documentation.
- Netlify build configuration and production environment guidance.

The public address recorded in the project notes is https://aurzen.netlify.app/. Its current deployment and configuration were not rechecked for this report. Hosted Turso backups need their own setup; the local backup command does not back up the hosted database.

## 9. Testing already recorded

The latest shopping presentation review records these successful checks:

| Check | Recorded result |
| --- | --- |
| TypeScript validation | Passed. |
| Automated tests | 26 tests passed, including checkout, inventory concurrency, tracking privacy, galleries and transfer compatibility. |
| Production build | Passed. |
| API integration checks | Passed with isolated data, including checkout and authenticated admin operations. |
| Shopping browser checks | Passed for bag behavior, purchase options, galleries, tracking and admin photo workflows. |
| Responsive presentation checks | Passed across 360, 390, 768 and 1440 pixel widths, covering 24 page/width combinations. |

These are previously recorded results, not a new test run for this document. Physical mobile devices, real screen-reader behavior and actual courier delivery still require manual acceptance checks.

## 10. Remaining work and owner decisions

1. **Finish product content.** Confirm accurate names, descriptions, materials, measurements, sizing, care instructions and Mystery Box contents. The owner previously confirmed that the current products are real and should be preserved.
2. **Supply complete photography.** The 5 November catalog review recorded seven live products, six blank descriptions and no additional gallery photos. Confirm existing covers represent the actual goods and add genuine product photos. That count is a dated observation, not a current inventory check.
3. **Provide public business details.** Confirm the support phone/WhatsApp, email and business/return address.
4. **Complete policies.** Confirm delivery coverage and estimates, return reporting window, return shipping responsibility, resolution process and privacy information; then publish the policy pages.
5. **Confirm inventory needs.** Decide whether separate size-level stock is required.
6. **Complete production checks.** Verify the deployed version, database connection, ordering setting, uploaded photos and a controlled end-to-end COD order.
7. **Set up operations.** Verify hosted backups and restoration, monitoring, and a daily order-processing routine.
8. **Finish the public domain setup.** Confirm the final domain, canonical metadata and sitemap before broader promotion.

Online payments, automatic courier booking, SMS/email notifications, customer accounts, multiple staff roles, password recovery and multi-factor authentication have not been implemented. These are possible future additions rather than completed features.

## 11. How orders are handled today

Once ordering is enabled, the customer chooses products, selects the required options, submits a COD order and receives a reference. Staff review the order in the dashboard, contact the customer, pack it, book the courier manually and update its status. The customer can check the recorded progress using the order reference and phone number. Courier cash collection and remittance reconciliation remain manual.

## Reference documents

- [README.md](README.md): local setup and commands.
- [FEATURES.md](FEATURES.md): gallery, shopping bag and tracking details.
- [SHOPPING-REVIEW.md](SHOPPING-REVIEW.md): presentation changes and recorded verification.
- [PRODUCT-CONTENT-REVIEW.md](PRODUCT-CONTENT-REVIEW.md): dated product-by-product content review.
- [COD-LAUNCH.md](COD-LAUNCH.md): COD workflow and owner confirmations.
- [NETLIFY.md](NETLIFY.md): Netlify and hosted Turso setup.
- [DEPLOYMENT.md](DEPLOYMENT.md): persistent-disk hosting and local backup guidance.

Some earlier launch notes describe an older local-only stage. For the current hosting options, use the Netlify/Turso guidance alongside the present source code.
