import { randomUUID,createHash } from 'node:crypto';
import { catalog, transaction,type Database } from './database';
import { assert, text } from './http';
import { validOption,productPricing,type CheckoutQuote,type Order,type OrderItem } from '@aurzen/shared/catalog';
import { normalizePhone } from '@aurzen/shared/phone';
export function deliverySettings() {
    const enabled = process.env.CHECKOUT_ENABLED === 'true';
    return { enabled, dhaka: 80, outside: 150 };
}
async function calculateQuote(d:Record<string,unknown>,db?:Database):Promise<CheckoutQuote>{
    const settings=deliverySettings();
    assert(settings.enabled,'Ordering will open soon. Please check back later.',503);
    assert(d.area==='dhaka'||d.area==='outside','Choose your delivery area.');
    assert(Array.isArray(d.items)&&d.items.length>0&&d.items.length<=50,'Your bag must contain 1–50 items.');
    const {products}=await catalog(db),quantities=new Map<number,number>(),items:OrderItem[]=[],serverNow=Date.now();
    for(const item of d.items as Record<string,unknown>[]){
        assert(item&&typeof item==='object'&&Number.isSafeInteger(item.id)&&Number.isSafeInteger(item.qty)&&Number(item.qty)>0&&Number(item.qty)<=100,'Invalid bag item.');
        const product=products.find(p=>p.id===item.id);
        assert(product,'An item is no longer available. Please refresh your bag.',409);
        assert(typeof item.size==='string'&&validOption(product,item.size),'Choose a valid product size or style.');
        quantities.set(product.id,(quantities.get(product.id)||0)+Number(item.qty));
        items.push({id:product.id,name:product.name,price:productPricing(product,serverNow).unitPrice,qty:Number(item.qty),size:item.size});
    }
    for(const [id,qty]of quantities){const p=products.find(p=>p.id===id)!;assert(qty<=p.stock,`${p.name}: only ${p.stock} available.`,409);}
    const subtotal=items.reduce((sum,item)=>sum+item.price*item.qty,0),delivery=settings[d.area as 'dhaka'|'outside'],total=subtotal+delivery;
    // Binds review to the exact charged units, options, quantities and delivery.
    // A customer may supply a token, but all prices are still recomputed here.
    const quote=createHash('sha256').update(JSON.stringify({items,delivery,total})).digest('hex');
    return {items,subtotal,delivery,total,quote,serverNow};
}
export const quoteOrder=(d:Record<string,unknown>)=>calculateQuote(d);
export async function placeOrder(d: Record<string, unknown>) {
    const settings = deliverySettings();
    assert(settings.enabled, 'Ordering will open soon. Please check back later.', 503);
    assert(d.paymentMethod === undefined || d.paymentMethod === 'cod', 'Only cash on delivery is available.');
    const key = text(d.key, 16, 100, 'Checkout reference');
    const name = text(d.name, 2, 100, 'Name'), address = text(d.address, 10, 500, 'Address');
    const phone = normalizePhone(text(d.phone, 11, 20, 'Phone number'));
    assert(/^01[3-9]\d{8}$/.test(phone), 'Enter a valid Bangladesh mobile number.');
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
        const {items,delivery,total}=current;
        const order: Order = { paymentMethod: 'cod', id: 'AZ-' + randomUUID(), name, phone, address, area: d.area as 'dhaka' | 'outside', items, total, delivery, status: 'New', date: new Date().toISOString() };
        order.history = [{status:'New',date:order.date}];
        for (const item of items)
            await db.prepare('UPDATE products SET stock=stock-? WHERE id=?').run(item.qty,item.id);
        await db.prepare('INSERT INTO orders VALUES(?,?,?,?)').run(order.id, key, JSON.stringify(order), order.date);
        return { id: order.id, total: order.total };
    });
}
