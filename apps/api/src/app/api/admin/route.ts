import { requireAdmin } from '../../../lib/auth';
import { catalog, database, orders, transaction } from '../../../lib/database';
import { assert, body, failure, json, sameOrigin, text, HttpError } from '../../../lib/http';
import { statuses, statusTransitions, statusChangeError, normalizeOffer, normalizeHeroSlides, normalizeStorefront, normalizeVariants, normalizePromotions, type Order } from '@aurzen/shared/catalog';
import { addCategory, editCategory, deleteCategory, moveProducts } from '../../../lib/categories';
import { imagePath } from '../../../lib/images';
import { editOrder } from '../../../lib/order-edit';
function productOffer(value:unknown){
    try{return normalizeOffer(value);}
    catch(error){throw new HttpError(400,error instanceof Error?error.message:'Invalid offer.');}
}
function productVariants(value:unknown,label:'size'|'colour'){
    try{return normalizeVariants(value,label);}
    catch(error){throw new HttpError(400,error instanceof Error?error.message:'Invalid '+label+' list.');}
}
export const runtime = 'nodejs';
export async function GET() { try {
    await requireAdmin();
    return json({ ...await catalog(), orders: await orders() });
}
catch (e) {
    return failure(e);
} }
export async function POST(request: Request) {
    try {
        sameOrigin(request);
        await requireAdmin();
        const d = await body(request);
        await transaction(async (db) => {
            if (d.action === 'saveProduct') {
                const name = text(d.name, 2, 100, 'Product name'), category = text(d.category, 1, 100, 'Category');
                assert(await db.prepare('SELECT name FROM categories WHERE name=?').get(category), 'Choose an existing category.');
                assert(!await db.prepare('SELECT name FROM categories WHERE parent=?').get(category), 'Choose a subcategory of ' + category + ' for this product.');
                assert(Number.isSafeInteger(d.price) && d.price > 0 && d.price <= 1000000, 'Enter a whole taka price between 1 and 1,000,000.');
                assert(Number.isSafeInteger(d.stock) && d.stock >= 0 && d.stock <= 1000000, 'Stock must be a whole number from 0 to 1,000,000.');
                if(d.id!==undefined)assert(Number.isSafeInteger(d.id)&&d.id>0,'Invalid product.');
                const previous=d.id?await db.prepare('SELECT image,images,offer,sizes,colors FROM products WHERE id=?').get(d.id):null;
                const offer=d.offer===undefined?(previous?JSON.parse(String(previous.offer||'null')):null):productOffer(d.offer);
                // Leaving sizes/colors out keeps what the product already has; [] turns the choice off.
                const sizes=d.sizes===undefined?(previous?JSON.parse(String(previous.sizes||'[]')):[]):productVariants(d.sizes,'size');
                const colors=d.colors===undefined?(previous?JSON.parse(String(previous.colors||'[]')):[]):productVariants(d.colors,'colour');
                const images:unknown=d.images===undefined?(previous?JSON.parse(String(previous.images||'[]')):[]):d.images;
                assert(Array.isArray(images)&&images.length<=8&&images.every(x=>typeof x==='string'&&x.length<=2000),'Use at most 8 product photos.');
                assert(new Set(images).size===images.length,'Remove duplicate photos.');
                const image = images[0] || d.image || 'box';
                assert(typeof image === 'string' && image.length <= 2000, 'Invalid image.');
                const description = typeof d.description === 'string' ? d.description.trim() : '';
                assert(description.length <= 3000, 'Description must be at most 3,000 characters.');
                const tag = typeof d.tag === 'string' ? d.tag.trim() : 'NEW ARRIVAL';
                assert(tag.length <= 40, 'Label must be at most 40 characters.');
                assert(image === 'box' || imagePath.test(image) || /^https:\/\//i.test(image), 'Upload a photo or use an HTTPS image URL.');
                for(const photo of new Set([image,...images])){
                    assert(photo === 'box' || imagePath.test(photo) || photo.toLowerCase().startsWith('https://'),'Invalid product photo.');
                    if(imagePath.test(photo))assert(await db.prepare('SELECT id FROM images WHERE id=?').get(photo.slice('/media/'.length)),'This uploaded photo is unavailable. Upload it again.');
                    else if(photo!=='box'){try{const url=new URL(photo);assert(url.protocol==='https:','Use HTTPS photos.');}catch{assert(false,'Invalid image URL.');}}
                }
                if (d.id) {
                    assert(Number.isSafeInteger(d.id), 'Invalid product.');
                    assert(await db.prepare('SELECT id FROM products WHERE id=?').get(d.id), 'Product not found.', 404);
                    await db.prepare('UPDATE products SET name=?,category=?,price=?,stock=?,image=?,tag=?,description=?,images=?,offer=?,sizes=?,colors=? WHERE id=?').run(name, category, d.price, d.stock, image, tag, description, JSON.stringify(images), JSON.stringify(offer), JSON.stringify(sizes), JSON.stringify(colors), d.id);
                }
                else
                    await db.prepare('INSERT INTO products(name,category,price,stock,image,tag,description,images,offer,sizes,colors) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(name, category, d.price, d.stock, image, tag, description, JSON.stringify(images), JSON.stringify(offer), JSON.stringify(sizes), JSON.stringify(colors));
            }
            else if (d.action === 'stock') {
                assert(Number.isSafeInteger(d.id) && Number.isSafeInteger(d.stock) && d.stock >= 0 && d.stock <= 1000000, 'Invalid stock.');
                assert((await db.prepare('UPDATE products SET stock=? WHERE id=?').run(d.stock, d.id)).changes, 'Product not found.', 404);
            }
            else if (d.action === 'deleteProduct') {
                assert(Number.isSafeInteger(d.id), 'Invalid product.');
                await db.prepare('DELETE FROM products WHERE id=?').run(d.id);
            }
            else if (d.action === 'addCategory') await addCategory(db, d);
            else if (d.action === 'editCategory') await editCategory(db, d);
            else if (d.action === 'deleteCategory') await deleteCategory(db, d);
            else if (d.action === 'moveProducts') await moveProducts(db, d);
            else if (d.action === 'markRead') {
                // Read status is separate from the fulfilment status and never changes it.
                const row = await db.prepare('SELECT payload FROM orders WHERE id=?').get(text(d.id, 1, 100, 'Order ID'));
                assert(row, 'Order not found.', 404);
                const order = JSON.parse(String(row.payload)) as Order;
                if (!order.readAt) { order.readAt = new Date().toISOString(); await db.prepare('UPDATE orders SET payload=? WHERE id=?').run(JSON.stringify(order), order.id); }
            }
            else if (d.action === 'savePromotions') {
                let promotions;
                try { promotions = normalizePromotions(d.promotions); }
                catch (error) { throw new HttpError(400, error instanceof Error ? error.message : 'Invalid promotions.'); }
                for (const [index, p] of promotions.entries()) {
                    for (const image of [p.image, p.mobileImage]) if (imagePath.test(image)) assert(await db.prepare('SELECT id FROM images WHERE id=?').get(image.slice('/media/'.length)), `An uploaded image on promotion ${index + 1} is unavailable. Upload it again.`);
                    if (p.link.type === 'category') assert(await db.prepare('SELECT name FROM categories WHERE name=?').get(p.link.value), `Choose an existing category for promotion ${index + 1}.`);
                    if (p.link.type === 'product') assert(/^\d+$/.test(p.link.value) && await db.prepare('SELECT id FROM products WHERE id=?').get(Number(p.link.value)), `Choose an existing product for promotion ${index + 1}.`);
                }
                await db.prepare("INSERT INTO settings(key,value) VALUES('promotions',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(JSON.stringify(promotions));
            }
            else if (d.action === 'status') {
                assert(statuses.includes(d.status), 'Invalid order status.');
                const row = await db.prepare('SELECT payload FROM orders WHERE id=?').get(text(d.id, 1, 100, 'Order ID'));
                assert(row, 'Order not found.', 404);
                const order = JSON.parse(String(row.payload)) as Order;
                assert(order.status === d.status || (statusTransitions[order.status] || []).includes(d.status), statusChangeError(order.status, d.status));
                if (order.status !== d.status && (d.status === 'Cancelled' || d.status === 'Returned'))
                    for (const item of order.items)
                        await db.prepare('UPDATE products SET stock=stock+? WHERE id=?').run(item.qty, item.id);
                if(order.status!==d.status)order.history=[...(order.history||[]),{status:d.status,date:new Date().toISOString()}];
                order.status = d.status;
                await db.prepare('UPDATE orders SET payload=? WHERE id=?').run(JSON.stringify(order), order.id);
            }
            else if(d.action==='saveHero'){
                let slides;
                try{slides=normalizeHeroSlides(d.slides);}
                catch(error){throw new HttpError(400,error instanceof Error?error.message:'Invalid homepage slides.');}
                for(const [index,slide] of slides.entries()){
                    assert(await db.prepare('SELECT name FROM categories WHERE name=?').get(slide.category),`Choose an existing category for slide ${index+1}.`);
                    if(imagePath.test(slide.image))assert(await db.prepare('SELECT id FROM images WHERE id=?').get(slide.image.slice('/media/'.length)),`The photo on slide ${index+1} is unavailable. Upload it again.`);
                }
                await db.prepare("INSERT INTO settings(key,value) VALUES('heroSlides',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(JSON.stringify(slides));
            }
            else if(d.action==='resetHero')
                await db.prepare("DELETE FROM settings WHERE key='heroSlides'").run();
            else if(d.action==='saveStorefront'){
                let storefront;
                try{storefront=normalizeStorefront(d.storefront);}
                catch(error){throw new HttpError(400,error instanceof Error?error.message:'Invalid storefront settings.');}
                for(const name of storefront.featured||[]){
                    const row=await db.prepare('SELECT parent FROM categories WHERE name=?').get(name);
                    assert(row&&!row.parent,`Featured category "${name}" must be an existing main category.`);
                }
                for(const [category,id] of Object.entries(storefront.covers)){
                    assert(await db.prepare('SELECT name FROM categories WHERE name=?').get(category),`Category "${category}" no longer exists.`);
                    assert(await db.prepare('SELECT id FROM products WHERE id=? AND (category=? OR category IN (SELECT name FROM categories WHERE parent=?))').get(id,category,category),`Choose a cover product from ${category} or its subcategories.`);
                }
                await db.prepare("INSERT INTO settings(key,value) VALUES('storefront',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(JSON.stringify(storefront));
            }
            else if(d.action==='editOrder')
                await editOrder(db,d);
            else if(d.action==='delivery'){
                const row=await db.prepare('SELECT payload FROM orders WHERE id=?').get(text(d.id,1,100,'Order ID'));
                assert(row,'Order not found.',404);
                const order=JSON.parse(String(row.payload)) as Order;
                const courier=typeof d.courier==='string'?d.courier.trim():'';
                const trackingReference=typeof d.trackingReference==='string'?d.trackingReference.trim():'';
                assert(courier.length<=80&&trackingReference.length<=120,'Delivery details are too long.');
                assert(Boolean(courier)===Boolean(trackingReference),'Provide both courier and tracking reference, or clear both.');
                order.courier=courier;order.trackingReference=trackingReference;
                await db.prepare('UPDATE orders SET payload=? WHERE id=?').run(JSON.stringify(order),order.id);
            }
            else
                assert(false, 'Unknown operation.');
        });
        return json({ ...await catalog(), orders: await orders() });
    }
    catch (e) {
        return failure(e);
    }
}
