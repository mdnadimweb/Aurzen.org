import { requireAdmin, currentUser, hashPassword, checkNewPassword, verifyPassword, endSessionsOf, newUserId, type Staff } from '../../../lib/auth';
import { catalog, content, database, logActivity, orders, saveSetting, transaction } from '../../../lib/database';
import { normalizeSiteSection, normalizeContentSection, normalizeCustomer, normalizeCoupons, siteSections } from '@aurzen/shared/site';
import type { Database } from '../../../lib/database';
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
/** What staff accounts may do: orders, products (not prices) and customers. Everything else is owner-only. */
const staffActions=new Set(['saveProduct','stock','markRead','status','bulkStatus','editOrder','delivery','orderNotes','saveCustomer','changePassword']);
const areas:Record<string,string>={saveProduct:'Products',stock:'Products',deleteProduct:'Products',addCategory:'Categories',editCategory:'Categories',deleteCategory:'Categories',moveProducts:'Categories',markRead:'Orders',status:'Orders',editOrder:'Orders',delivery:'Orders',savePromotions:'Storefront',saveHero:'Storefront',resetHero:'Storefront',saveStorefront:'Storefront',saveSite:'Settings',resetSite:'Settings',saveContent:'Content',deleteSubscriber:'Marketing',bulkStatus:'Orders',orderNotes:'Orders',saveCustomer:'Customers',saveCoupons:'Marketing',saveUser:'Users',resetUserPassword:'Users',deleteUser:'Users',changePassword:'Users'};
const activityArea=(d:Record<string,any>)=>areas[d.action]||'Other';
function activityDetail(d:Record<string,any>){
    const what=(x:unknown)=>typeof x==='string'||typeof x==='number'?String(x).slice(0,80):'';
    switch(d.action){
        case 'saveProduct':return (d.id?'Edited product ':'Added product ')+what(d.name);
        case 'stock':return 'Stock of product #'+what(d.id)+' set to '+what(d.stock);
        case 'deleteProduct':return 'Removed product #'+what(d.id);
        case 'status':return 'Order '+what(d.id)+' → '+what(d.status)+(d.reason?' ('+what(d.reason)+')':'');
        case 'bulkStatus':return (Array.isArray(d.ids)?d.ids.length:0)+' orders → '+what(d.status);
        case 'orderNotes':return 'Notes on order '+what(d.id);
        case 'saveCustomer':return 'Customer '+what(d.phone);
        case 'saveUser':return (d.id?'Edited account ':'Added account ')+what(d.username)+(d.role?' ('+what(d.role)+')':'')+(d.disabled===true?' — disabled':'');
        case 'resetUserPassword':return 'Reset a password';
        case 'deleteUser':return 'Removed an account';
        case 'changePassword':return 'Changed own password';
        case 'saveCoupons':return 'Saved coupons ('+(Array.isArray(d.coupons)?d.coupons.length:0)+')';
        case 'editOrder':return 'Edited order '+what(d.id);
        case 'delivery':return 'Courier details for order '+what(d.id);
        case 'markRead':return 'Opened order '+what(d.id);
        case 'saveSite':return 'Saved settings: '+what(d.section);
        case 'resetSite':return 'Reset settings to default: '+what(d.section);
        case 'saveContent':return 'Saved '+what(d.section);
        default:return String(d.action||'Change')+(d.name?' '+what(d.name):'');
    }
}
async function adminData(user:Staff){
    const db=await database();
    const [base,list,pages,subscribers,activity,customerRow,couponRow]=await Promise.all([catalog(db,{raw:true}),orders(),content(db),db.prepare('SELECT contact,created FROM subscribers ORDER BY created DESC LIMIT 5000').all(),db.prepare('SELECT at,actor,area,detail FROM activity ORDER BY id DESC LIMIT 300').all(),db.prepare("SELECT value FROM settings WHERE key='customers'").get(),db.prepare("SELECT value FROM settings WHERE key='coupons'").get()]);
    const users=user.role==='owner'?(await db.prepare('SELECT id,username,name,role,disabled,must_reset,created FROM users ORDER BY created').all()).map(u=>({id:String(u.id),username:String(u.username),name:String(u.name),role:String(u.role),disabled:!!Number(u.disabled),mustReset:!!Number(u.must_reset),created:String(u.created)})):[];
    const data={...base,me:user,users,coupons:couponRow?JSON.parse(String(couponRow.value)):[],customers:customerRow?JSON.parse(String(customerRow.value)):{},orders:list,content:pages,subscribers:subscribers.map(s=>({contact:String(s.contact),created:String(s.created)})),activity:activity.map(a=>({at:String(a.at),actor:String(a.actor),area:String(a.area),detail:String(a.detail)}))};
    // Staff do not see marketing lists, coupons, the activity log or other accounts.
    if(user.role!=='owner')return {...data,coupons:[],subscribers:[],activity:[]};
    return data;
}
export const runtime = 'nodejs';
export async function GET() { try {
    const user=await requireAdmin();
    return json(await adminData(user));
}
catch (e) {
    return failure(e);
} }
export async function POST(request: Request) {
    try {
        sameOrigin(request);
        const user=await requireAdmin();
        const d0=await body(request);
        assert(!user.mustReset||d0.action==='changePassword','Choose a new password before continuing.',403);
        assert(user.role==='owner'||staffActions.has(d0.action),'Only an owner can do this.',403);
        const d = d0;
        await transaction(async (db) => {
            if (d.action === 'saveProduct') {
                const name = text(d.name, 2, 100, 'Product name'), category = text(d.category, 1, 100, 'Category');
                assert(await db.prepare('SELECT name FROM categories WHERE name=?').get(category), 'Choose an existing category.');
                assert(!await db.prepare('SELECT name FROM categories WHERE parent=?').get(category), 'Choose a subcategory of ' + category + ' for this product.');
                assert(Number.isSafeInteger(d.price) && d.price > 0 && d.price <= 1000000, 'Enter a whole taka price between 1 and 1,000,000.');
                assert(Number.isSafeInteger(d.stock) && d.stock >= 0 && d.stock <= 1000000, 'Stock must be a whole number from 0 to 1,000,000.');
                if(d.id!==undefined)assert(Number.isSafeInteger(d.id)&&d.id>0,'Invalid product.');
                const previous=d.id?await db.prepare('SELECT image,images,offer,sizes,colors,price FROM products WHERE id=?').get(d.id):null;
                // Staff may edit products but not prices or offers.
                if(user.role!=='owner')assert(previous?Number(previous.price)===d.price&&(d.offer===undefined||JSON.stringify(d.offer)===String(previous.offer)):true,'Only an owner can change prices or offers.',403);
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
            else if (d.action === 'status') await changeStatus(db, text(d.id, 1, 100, 'Order ID'), d.status, d.reason, d.restock !== false);
            else if (d.action === 'bulkStatus') {
                assert(Array.isArray(d.ids) && d.ids.length > 0 && d.ids.length <= 200, 'Choose 1–200 orders.');
                for (const id of d.ids) await changeStatus(db, text(id, 1, 100, 'Order ID'), d.status, d.reason, d.restock !== false);
            }
            else if (d.action === 'orderNotes') {
                const row = await db.prepare('SELECT payload FROM orders WHERE id=?').get(text(d.id, 1, 100, 'Order ID'));
                assert(row, 'Order not found.', 404);
                const order = JSON.parse(String(row.payload)) as Order;
                const notes = typeof d.notes === 'string' ? d.notes.trim() : '';
                assert(notes.length <= 2000, 'Notes must be at most 2,000 characters.');
                order.notes = notes;
                await db.prepare('UPDATE orders SET payload=? WHERE id=?').run(JSON.stringify(order), order.id);
            }
            else if (d.action === 'saveUser') {
                const name = text(d.name, 2, 60, 'Name'), username = text(d.username, 3, 40, 'Username').toLowerCase();
                assert(/^[a-z0-9._-]+$/.test(username), 'Usernames use lowercase letters, numbers, dots, dashes or underscores.');
                assert(d.role === 'owner' || d.role === 'staff', 'Choose a role.');
                const taken = await db.prepare('SELECT id FROM users WHERE username=?').get(username);
                if (d.id) {
                    assert(await db.prepare('SELECT id FROM users WHERE id=?').get(String(d.id)), 'Account not found.', 404);
                    assert(!taken || String(taken.id) === String(d.id), 'That username is already used.');
                    await db.prepare('UPDATE users SET name=?,username=?,role=?,disabled=? WHERE id=?').run(name, username, d.role, d.disabled === true ? 1 : 0, String(d.id));
                    if (d.disabled === true) await endSessionsOf(String(d.id), db);
                } else {
                    assert(!taken, 'That username is already used.');
                    await db.prepare('INSERT INTO users(id,username,name,role,hash,disabled,must_reset,created) VALUES(?,?,?,?,?,0,1,?)').run(newUserId(), username, name, d.role, hashPassword(checkNewPassword(d.password)), new Date().toISOString());
                }
            }
            else if (d.action === 'resetUserPassword') {
                const id = text(d.id, 1, 100, 'Account');
                assert((await db.prepare('UPDATE users SET hash=?,must_reset=1 WHERE id=?').run(hashPassword(checkNewPassword(d.password)), id)).changes, 'Account not found.', 404);
                await endSessionsOf(id, db);
            }
            else if (d.action === 'deleteUser') {
                const id = text(d.id, 1, 100, 'Account');
                await endSessionsOf(id, db);
                await db.prepare('DELETE FROM users WHERE id=?').run(id);
            }
            else if (d.action === 'changePassword') {
                assert(user.id, 'The owner password is set in the hosting settings (ADMIN_PASSWORD).');
                const row = await db.prepare('SELECT hash FROM users WHERE id=?').get(user.id);
                assert(row && typeof d.current === 'string' && verifyPassword(d.current, String(row.hash)), 'Your current password is not correct.');
                const next = checkNewPassword(d.password);
                assert(next !== d.current, 'Choose a different password.');
                await db.prepare('UPDATE users SET hash=?,must_reset=0 WHERE id=?').run(hashPassword(next), user.id);
            }
            else if (d.action === 'saveCoupons') {
                let coupons;
                try { coupons = normalizeCoupons(d.coupons); } catch (error) { throw new HttpError(400, error instanceof Error ? error.message : 'Invalid coupons.'); }
                await saveSetting(db, 'coupons', coupons);
            }
            else if (d.action === 'saveCustomer') {
                const phone = text(d.phone, 6, 20, 'Phone');
                let info;
                try { info = normalizeCustomer(d.info); } catch (error) { throw new HttpError(400, error instanceof Error ? error.message : 'Invalid customer.'); }
                const row = await db.prepare("SELECT value FROM settings WHERE key='customers'").get();
                const all = row ? JSON.parse(String(row.value)) : {};
                if (!info.note && !info.tags.length && !info.blocked) delete all[phone]; else all[phone] = info;
                await saveSetting(db, 'customers', all);
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
                // The older homepage editor and Menus & text share the first announcement message.
                const siteRow=await db.prepare("SELECT value FROM settings WHERE key='site'").get();
                const savedSite=siteRow?JSON.parse(String(siteRow.value)):null;
                if(savedSite?.announcement?.items?.length){savedSite.announcement.items[0]={...savedSite.announcement.items[0],text:storefront.announcement.message,detail:storefront.announcement.detail};await saveSetting(db,'site',savedSite);}
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
            else if(d.action==='saveSite'){
                assert(siteSections.includes(d.section),'Unknown settings section.');
                let value;
                try{value=normalizeSiteSection(d.section,d.value);}
                catch(error){throw new HttpError(400,error instanceof Error?error.message:'Invalid settings.');}
                const row=await db.prepare("SELECT value FROM settings WHERE key='site'").get();
                const saved=row?JSON.parse(String(row.value)):{};
                await saveSetting(db,'site',{...saved,[d.section]:value});
                if(d.section==='announcement'){const first=(value as {items:{text:string;detail:string}[]}).items[0];const row=await db.prepare("SELECT value FROM settings WHERE key='storefront'").get();if(first&&row){const sf=JSON.parse(String(row.value));sf.announcement={message:first.text,detail:first.detail};await saveSetting(db,'storefront',sf);}}
            }
            else if(d.action==='resetSite'){
                assert(siteSections.includes(d.section),'Unknown settings section.');
                const row=await db.prepare("SELECT value FROM settings WHERE key='site'").get();
                const saved=row?JSON.parse(String(row.value)):{};delete saved[d.section];
                await saveSetting(db,'site',saved);
            }
            else if(d.action==='saveContent'){
                assert(['pages','faq','reviews'].includes(d.section),'Unknown content section.');
                let value;
                try{value=normalizeContentSection(d.section,d.value);}
                catch(error){throw new HttpError(400,error instanceof Error?error.message:'Invalid content.');}
                const current=await content(db);
                await saveSetting(db,'content',{...current,[d.section]:value});
            }
            else if(d.action==='deleteSubscriber')
                await db.prepare('DELETE FROM subscribers WHERE contact=?').run(text(d.contact,1,200,'Subscriber'));
            else
                assert(false, 'Unknown operation.');
            if(d.action!=='markRead')await logActivity(db,activityArea(d),activityDetail(d),user.name);
        });
        // Re-read: a password change or role edit in this request changes what the studio shows.
        return json(await adminData(await currentUser()||user));
    }
    catch (e) {
        return failure(e);
    }
}
/** One status change: allowed transitions only, optional restock on cancel/return, history and reason recorded. */
async function changeStatus(db:Database,id:string,status:unknown,reason:unknown,restock:boolean){
    assert(statuses.includes(status as Order['status']), 'Invalid order status.');
    const next=status as Order['status'];
    const row = await db.prepare('SELECT payload FROM orders WHERE id=?').get(id);
    assert(row, 'Order not found.', 404);
    const order = JSON.parse(String(row.payload)) as Order;
    assert(order.status === next || (statusTransitions[order.status] || []).includes(next), order.id+': '+statusChangeError(order.status, next));
    if (order.status === next) return;
    if (restock && (next === 'Cancelled' || next === 'Returned'))
        for (const item of order.items)
            await db.prepare('UPDATE products SET stock=stock+? WHERE id=?').run(item.qty, item.id);
    if (next === 'Cancelled' && typeof reason === 'string' && reason.trim()) order.cancelReason = reason.trim().slice(0, 300);
    order.history = [...(order.history || []), { status: next, date: new Date().toISOString() }];
    order.status = next;
    await db.prepare('UPDATE orders SET payload=? WHERE id=?').run(JSON.stringify(order), order.id);
}
