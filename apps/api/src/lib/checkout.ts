import { randomInt,randomUUID,createHash } from 'node:crypto';
import { adjustSizeStock, catalog, database, transaction,type Database } from './database';
import { assert, text } from './http';
import { deliveryCharge, applyCoupon, giftEligible, type Coupon } from '@aurzen/shared/site';
import { sizeAvailable,categoryFamily,validOption,validColor,productPricing,deliveryFees,type CheckoutQuote,type Order,type OrderItem } from '@aurzen/shared/catalog';
import { normalizePhone } from '@aurzen/shared/phone';
export async function checkoutSettings() {
    const {site} = await catalog();
    return { ...deliverySettings(), dhaka: site.checkout.dhaka, outside: site.checkout.outside };
}
export function deliverySettings() {
    const enabled = process.env.CHECKOUT_ENABLED === 'true';
    return { enabled, ...deliveryFees };
}
async function calculateQuote(d:Record<string,unknown>,db?:Database):Promise<CheckoutQuote>{
    const settings=deliverySettings();
    assert(settings.enabled,'Ordering will open soon. Please check back later.',503);
    assert(d.area==='dhaka'||d.area==='outside','Choose your delivery area.');
    assert(Array.isArray(d.items)&&d.items.length>0&&d.items.length<=50,'Your bag must contain 1–50 items.');
    const {products,site,categoryDetails}=await catalog(db),quantities=new Map<number,number>(),sizeQuantities=new Map<string,number>(),items:OrderItem[]=[],serverNow=Date.now();
    for(const item of d.items as Record<string,unknown>[]){
        assert(item&&typeof item==='object'&&Number.isSafeInteger(item.id)&&Number.isSafeInteger(item.qty)&&Number(item.qty)>0&&Number(item.qty)<=100,'Invalid bag item.');
        const product=products.find(p=>p.id===item.id);
        assert(product,'An item is no longer available. Please refresh your bag.',409);
        assert(typeof item.size==='string'&&validOption(product,item.size),'Choose a valid product size or style.');
        const color=typeof item.color==='string'?item.color:'';
        assert(validColor(product,color),product.colors?.length?'Choose a colour for '+product.name+'.':'Invalid product colour.');
        quantities.set(product.id,(quantities.get(product.id)||0)+Number(item.qty));
        const sizeKey=JSON.stringify([product.id,item.size]);sizeQuantities.set(sizeKey,(sizeQuantities.get(sizeKey)||0)+Number(item.qty));
        items.push({id:product.id,name:product.name,price:productPricing(product,serverNow).unitPrice,qty:Number(item.qty),size:item.size,...(color?{color}:{})});
    }
    // Products with stock per size: each size has its own limit.
    for(const [key,qty]of sizeQuantities){const [id,size]=JSON.parse(key) as [number,string];const p=products.find(p=>p.id===Number(id))!;if(p.extra&&Object.keys(p.extra.sizeStock).length)assert(qty<=sizeAvailable(p,size),`${p.name} (${size}): only ${sizeAvailable(p,size)} available.`,409);}
    for(const [id,qty]of quantities){const p=products.find(p=>p.id===id)!;assert(qty<=p.stock,`${p.name}: only ${p.stock} available.`,409);}
    const subtotal=items.reduce((sum,item)=>sum+item.price*item.qty,0);
    assert(subtotal>=site.checkout.minOrder,'The minimum order is ৳'+site.checkout.minOrder.toLocaleString('en-BD')+'. Add a little more to your bag.');
    let delivery=deliveryCharge(site.checkout,d.area as 'dhaka'|'outside',subtotal),discount=0,coupon='',couponError='';
    // Coupon codes are checked here only; the list never leaves the server.
    if(typeof d.coupon==='string'&&d.coupon.trim()){
        const code=d.coupon.trim().toUpperCase().slice(0,30);
        const conn=db||await database();
        const [couponRow,orderRows]=await Promise.all([conn.prepare("SELECT value FROM settings WHERE key='coupons'").get(),conn.prepare('SELECT payload FROM orders').all()]);
        const found=(couponRow?JSON.parse(String(couponRow.value)) as Coupon[]:[]).find(c=>c.code===code);
        const usedOrders=orderRows.map(r=>JSON.parse(String(r.payload)) as Order).filter(o=>o.coupon===code&&o.status!=='Cancelled');
        const phone=typeof d.phone==='string'?normalizePhone(d.phone):'';
        const result=applyCoupon(found,{items:items.map(i=>({...i,category:products.find(p=>p.id===i.id)!.category})),subtotal,delivery,family:name=>categoryFamily(categoryDetails,name),used:usedOrders.length,usedByPhone:phone?usedOrders.filter(o=>o.phone===phone).length:0,now:serverNow});
        if('error' in result)couponError=result.error;
        else{coupon=code;discount=result.discount;if(result.freeDelivery)delivery=0;}
    }
    // Gift wrap and message card (Studio → Gift options), only for eligible items.
    const giftInput=(d.gift&&typeof d.gift==='object'?d.gift:{}) as Record<string,unknown>;
    const giftable=items.some(i=>{const p=products.find(x=>x.id===i.id)!;return giftEligible(site,categoryDetails,p.category,p.extra?.gift);});
    const wrap=giftable&&site.gifts.wrap&&giftInput.wrap===true;
    const message=giftable&&site.gifts.card&&typeof giftInput.message==='string'?giftInput.message.replace(/\s+/g,' ').trim():'';
    assert(message.length<=site.gifts.cardLimit,'Your gift message can be at most '+site.gifts.cardLimit+' characters.');
    const giftWrap=wrap?site.gifts.wrapPrice:0;
    const total=subtotal-discount+delivery+giftWrap;
    // Binds review to the exact charged units, options, quantities, discount and delivery.
    // A customer may supply a token, but all prices are still recomputed here.
    const quote=createHash('sha256').update(JSON.stringify({items,delivery,total,discount,coupon,giftWrap})).digest('hex');
    return {items,subtotal,delivery,total,quote,serverNow,giftable,...(wrap||message?{gift:{wrap,message,price:giftWrap}}:{}),...(coupon?{coupon,discount}:{}),...(couponError?{couponError}:{})};
}
export const quoteOrder=(d:Record<string,unknown>)=>calculateQuote(d);
// Short, easy-to-read order references such as AZ-482193 (6 random digits).
// Random rather than sequential so order numbers don't reveal how many orders the shop gets.
// Tracking still needs the customer's phone number as well, so a short reference is not
// enough on its own to look an order up.
export const orderIdPattern=/^AZ-\d{6}$/;
async function newOrderId(db:Database){
    for(let attempt=0;attempt<25;attempt++){
        const id='AZ-'+randomInt(100000,1000000);
        if(!await db.prepare('SELECT id FROM orders WHERE id=?').get(id))return id;
    }
    // Practically unreachable before hundreds of thousands of orders; keeps checkout working regardless.
    return 'AZ-'+randomUUID().slice(0,8).toUpperCase();
}
export async function placeOrder(d: Record<string, unknown>) {
    const settings = deliverySettings();
    assert(settings.enabled, 'Ordering will open soon. Please check back later.', 503);
    const {site} = await catalog(), pay = site.checkout;
    const paymentMethod = d.paymentMethod === undefined ? 'cod' : d.paymentMethod;
    assert((paymentMethod === 'cod' && pay.cod) || ((paymentMethod === 'bkash' || paymentMethod === 'nagad' || paymentMethod === 'advance') && pay[paymentMethod].enabled), pay.cod && !pay.bkash.enabled && !pay.nagad.enabled && !pay.advance.enabled ? 'Only cash on delivery is available.' : 'Choose an available payment method.');
    const email = typeof d.email === 'string' ? d.email.trim().toLowerCase() : '';
    assert(pay.email !== 'required' || email, 'Email is required.');
    assert(!email || (pay.email !== 'hidden' && email.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)), 'Enter a valid email address.');
    const note = pay.note && typeof d.note === 'string' ? d.note.replace(/\s+/g, ' ').trim().slice(0, 500) : '';
    const key = text(d.key, 16, 100, 'Checkout reference');
    const name = text(d.name, 2, 100, 'Name'), address = text(d.address, 10, 500, 'Address');
    const phone = normalizePhone(text(d.phone, 11, 20, 'Phone number'));
    assert(/^01[3-9]\d{8}$/.test(phone), 'Enter a valid Bangladesh mobile number.');
    // Studio → Customers can block a phone number from ordering.
    const blockedRow = await (await database()).prepare("SELECT value FROM settings WHERE key='customers'").get();
    assert(!(blockedRow && JSON.parse(String(blockedRow.value))[phone]?.blocked), 'We could not place this order. Please contact us directly.', 403);
    assert(d.area === 'dhaka' || d.area === 'outside', 'Choose your delivery area.');
    assert(Array.isArray(d.items) && d.items.length > 0 && d.items.length <= 50, 'Your bag must contain 1–50 items.');
    return transaction(async (db) => {
        const previous = await db.prepare('SELECT payload FROM orders WHERE idempotency=?').get(key);
        // Return only a receipt reference; customer details stay in the protected admin API.
        if (previous) {
            const order = JSON.parse(String(previous.payload)) as Order;
            return { id: order.id, total: order.total };
        }
        const current=await calculateQuote(d,db);
        assert(typeof d.quote==='string'&&d.quote===current.quote,'Prices or delivery charges changed. Review the updated total before placing your order.',409);
        const {items,delivery,total,coupon,discount,gift}=current;
        const order: Order = { paymentMethod: paymentMethod as Order['paymentMethod'], ...(coupon ? { coupon, discount } : {}), ...(gift ? { gift } : {}), ...(email ? { email } : {}), ...(note ? { note } : {}), id: await newOrderId(db), name, phone, address, area: d.area as 'dhaka' | 'outside', items, total, delivery, status: 'New', date: new Date().toISOString() };
        order.history = [{status:'New',date:order.date}];
        for (const item of items)
            {await db.prepare('UPDATE products SET stock=stock-? WHERE id=?').run(item.qty,item.id);await adjustSizeStock(db,item.id,item.size,-item.qty);}
        await db.prepare('INSERT INTO orders VALUES(?,?,?,?)').run(order.id, key, JSON.stringify(order), order.date);
        return { id: order.id, total: order.total };
    });
}
