# AURZÉN product content review

Read-only review on 5 November 2026 of `data/aurzen.sqlite` and the live public catalog at `https://aurzen.netlify.app/api/catalog/`. The live catalog contains seven products; the local database contains the four older seed products. Only product schema and public catalog fields were read. No product records, customer records, orders, or image files were changed for this review.

The local database predates the gallery column. The live catalog returned one cover per product and no additional gallery URLs. The gallery migration preserves those covers. Six live products have an empty description; the storefront currently falls back to general category text for those items.

| Product | Current photography | Content requiring owner confirmation |
| --- | --- | --- |
| The Everyday Co-ord · Clothing · ID 1 | One Unsplash cover (`photo-1539109136881-3be0616acf4b`); no additional photos recorded. | Confirm the photo shows the item being sold and identify every piece included. Provide fabric composition, available colours, actual size measurements, fit, care guidance, and any lining or fastening details. Confirm the `BESTSELLER` label is supported. |
| Signature Mystery Box · Mystery Boxes · ID 2 | Existing branded box illustration (`box`); no product photos recorded. | State the number or range of pieces, what is guaranteed, what can vary, how style selections are used, and any exclusions. Confirm packaging appearance before adding a packaging photo. Avoid presenting example contents as guaranteed contents. |
| Soft Satin Scarf · Accessories · ID 3 | One Unsplash cover (`photo-1601924994987-69e26d50dc26`); no additional photos recorded. | Confirm the cover is the actual scarf. The name mentions satin; verify that description and state the fibre composition separately. Provide dimensions, available colours or print, edge finish, care guidance, and what is included. Confirm whether `NEW ARRIVAL` is still current. |
| The Weekend Dress · Clothing · ID 4 | One Unsplash cover (`photo-1515372039744-b8f02a3ae446`); no additional photos recorded. | Confirm the image matches the actual dress. Provide fabric composition, garment length, size measurements, fit, colours, care guidance, and any lining or fastening details. Keep `EDITOR’S PICK` only if it reflects an actual owner selection. |
| shirt · Men's collection · ID 5 | One uploaded cover, `/media/93e0d8d4-e278-4ae6-8f3b-324aabba6632.webp`; no additional gallery URLs returned. | Existing description: `pure cotton and soft febricks.` The owner has supplied a cotton/softness claim; confirm composition before expanding it. Correct spelling and capitalization. Add the actual fit, measurements, sleeve and fastening details, available colours, and care guidance. |
| formal · Men's collection · ID 6 | One uploaded cover, `/media/096a283e-e9f0-4af4-a3c6-33fc375e8d31.webp`; no additional gallery URLs returned. | Empty description. Confirm the garment type before changing this broad name to something more specific. Provide its actual material, fit, measurements, colours, included pieces, and care guidance. |
| summer · Clothing · ID 7 | One uploaded cover, `/media/7f948990-ae06-4ddd-b40d-31b95f1a80cd.webp`; no additional gallery URLs returned. | Empty description. Confirm what the item is before expanding the broad seasonal name. Provide its material, garment type, size measurements, fit, colours, included pieces, and care guidance. |

Capitalization-only edits supported by the current names are `Shirt`, `Formal`, and `Summer`. More useful names should identify the actual garment or distinguishing feature after the owner supplies that information. No fabric, fit, seasonality, or quality claim should be added merely to make a name sound more premium.

For ID 5, a spelling-only draft based on the supplied description is “Pure cotton and soft fabric.” Confirm that statement before publishing. The source text does not establish a cotton percentage, fabric weight, weave, breathability, shrinkage, or care method.

## Photography to supply

For each physical product, start with a clear cover showing the complete item and its correct colour. Add a second angle, a detail photo, and a scale or fit photo where useful. Use a consistent light background, soft light, and a similar camera distance. Keep the item away from image edges so a card crop can fit it without cutting off important details.

Upload original, sharp JPG, PNG, or WebP files through the admin gallery. Prefer at least 1200 pixels on the long edge; avoid enlarging small images. The existing uploader optimizes images and removes embedded metadata. Use the cover selector and gallery ordering controls to choose the card image and the order of detail photos. The storefront preserves the selected cover and does not generate a replacement product photograph.

The Mystery Box illustration can remain until truthful packaging or representative photos are available. Label representative content photos explicitly so customers can distinguish examples from guaranteed contents.

## Description format for the owner

Use a short first sentence identifying what the customer receives, then provide only confirmed details:

1. What is included.
2. Material or fibre composition, where verified.
3. Size, measurements, and fit guidance.
4. Colour or style choices and any expected variation.
5. Care instructions.

For Mystery Boxes, replace material and fit claims with the confirmed contents policy, selection process, and exclusions. Delivery prices, cash on delivery, and the existing returns policy should remain in their dedicated storefront and checkout sections.

No replacement descriptions are published in this change: the catalog does not provide enough verified item information to write accurate material, sizing, or contents claims.
