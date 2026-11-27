import { adjustSizeStock, catalog, type Database } from './database';
import { assert, text } from './http';
import { newOrderId } from './checkout';
import { deliveryCharge } from '@aurzen/shared/site';
import { manualSources, productPricing, sizeAvailable, validColor, validOption, type Order, type OrderItem, type OrderSource } from '@aurzen/shared/catalog';
import { normalizePhone } from '@aurzen/shared/phone';

const payments = ['cod', 'bkash', 'nagad', 'advance'] as const;

/**
 * An order taken outside the website (Facebook, WhatsApp, phone, walk-in) and typed in the studio.
 * It gets its own kind of order ID (MO-482193; website orders are AZ-482193), reduces stock (per size where tracked) and then
 * behaves like any other order. Runs inside the admin write transaction; the server sets prices,
 * checks stock and works out the total.
 */
export async function createManualOrder(db: Database, d: Record<string, unknown>, now = Date.now()) {
    assert(typeof d.source === 'string' && manualSources.includes(d.source as OrderSource), 'Choose where the order came from.');
    const key = text(d.key, 16, 100, 'Order reference');
    // A double click or a retry after a slow connection returns the order already saved.
    const previous = await db.prepare('SELECT payload FROM orders WHERE idempotency=?').get('manual:' + key);
    if (previous) return JSON.parse(String(previous.payload)) as Order;

    const name = text(d.name, 2, 100, 'Name'), address = text(d.address, 5, 500, 'Address');
    const phone = normalizePhone(text(d.phone, 11, 20, 'Phone number'));
    assert(/^01[3-9]\d{8}$/.test(phone), 'Enter a valid Bangladesh mobile number.');
    assert(d.area === 'dhaka' || d.area === 'outside', 'Choose the delivery area.');
    const paymentMethod = d.paymentMethod === undefined ? 'cod' : d.paymentMethod;
    assert(payments.includes(paymentMethod as typeof payments[number]), 'Choose a payment method.');
    const blocked = await db.prepare("SELECT value FROM settings WHERE key='customers'").get();
    assert(!(blocked && JSON.parse(String(blocked.value))[phone]?.blocked), 'This phone number is blocked in Customers. Unblock it there first to add an order for it.', 403);
    assert(Array.isArray(d.items) && d.items.length > 0 && d.items.length <= 50, 'An order needs 1–50 items.');

    const { products, site } = await catalog(db);
    const lines = new Map<string, OrderItem>();
    for (const raw of d.items as Record<string, unknown>[]) {
        assert(raw && typeof raw === 'object' && Number.isSafeInteger(raw.id) && Number.isSafeInteger(raw.qty) && Number(raw.qty) > 0 && Number(raw.qty) <= 100, 'Each item needs a quantity from 1 to 100.');
        const product = products.find(p => p.id === raw.id);
        assert(product, 'A product in this order is no longer available. Remove it and try again.', 409);
        assert(typeof raw.size === 'string' && validOption(product, raw.size), `Choose a valid size or style for ${product.name}.`);
        const color = typeof raw.color === 'string' ? raw.color : '';
        assert(validColor(product, color), `Choose a valid colour for ${product.name}.`);
        const lineKey = product.id + '\u0000' + raw.size + '\u0000' + color, existing = lines.get(lineKey);
        if (existing) { existing.qty += Number(raw.qty); assert(existing.qty <= 100, 'Each item can have at most 100 pieces.'); continue; }
        lines.set(lineKey, { id: product.id, name: product.name, price: productPricing(product, now).unitPrice, qty: Number(raw.qty), size: raw.size, ...(color ? { color } : {}) });
    }
    const items = [...lines.values()];

    // Stock: per size where the product tracks it, and in total.
    const perProduct = new Map<number, number>(), perSize = new Map<string, number>();
    for (const item of items) {
        perProduct.set(item.id, (perProduct.get(item.id) || 0) + item.qty);
        const k = item.id + '\u0000' + item.size; perSize.set(k, (perSize.get(k) || 0) + item.qty);
    }
    for (const [k, qty] of perSize) {
        const [id, size] = k.split('\u0000'), p = products.find(x => x.id === Number(id))!;
        if (p.extra && Object.keys(p.extra.sizeStock).length) assert(qty <= sizeAvailable(p, size), `${p.name} (${size}): only ${sizeAvailable(p, size)} available.`, 409);
    }
    for (const [id, qty] of perProduct) { const p = products.find(x => x.id === id)!; assert(qty <= p.stock, `${p.name}: only ${p.stock} available.`, 409); }

    const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
    // Delivery: the shop's own charge for the area unless the owner typed another amount (0 = free).
    const delivery = d.delivery === undefined || d.delivery === null ? deliveryCharge(site.checkout, d.area as 'dhaka' | 'outside', subtotal) : Number(d.delivery);
    assert(Number.isSafeInteger(delivery) && delivery >= 0 && delivery <= 100000, 'Delivery charge must be a whole taka amount from 0 to 100,000.');
    const discount = d.discount === undefined || d.discount === null ? 0 : Number(d.discount);
    assert(Number.isSafeInteger(discount) && discount >= 0 && discount <= subtotal, 'Discount must be a whole taka amount, no more than the items total.');
    const note = typeof d.note === 'string' ? d.note.replace(/\s+/g, ' ').trim() : '';
    assert(note.length <= 500, 'The customer note can be at most 500 characters.');

    const date = new Date(now).toISOString();
    const order: Order = {
        source: d.source as OrderSource, paymentMethod: paymentMethod as Order['paymentMethod'],
        id: await newOrderId(db, 'MO'), name, phone, address, area: d.area as Order['area'], items,
        ...(discount ? { discount } : {}), ...(note ? { note } : {}),
        total: subtotal - discount + delivery, delivery, status: 'New', date,
        history: [{ status: 'New', date }],
        // Typed in by the owner, so it is already "seen".
        readAt: date,
    };
    for (const item of items) {
        await db.prepare('UPDATE products SET stock=stock-? WHERE id=?').run(item.qty, item.id);
        await adjustSizeStock(db, item.id, item.size, -item.qty);
    }
    await db.prepare('INSERT INTO orders VALUES(?,?,?,?)').run(order.id, 'manual:' + key, JSON.stringify(order), order.date);
    return order;
}
