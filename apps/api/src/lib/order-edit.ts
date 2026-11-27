import { adjustSizeStock, catalog, type Database } from './database';
import { assert, text } from './http';
import { editableStatuses, productPricing, sizeAvailable, validOption, validColor, sameLine, type Order, type OrderItem } from '@aurzen/shared/catalog';
import { deliveryCharge } from '@aurzen/shared/site';
import { normalizePhone } from '@aurzen/shared/phone';

/**
 * Owner correction of an order that has not shipped yet. Runs inside the admin
 * write transaction: customer details, delivery area and items are validated
 * here, stock moves by the difference only (per size where the product tracks it),
 * and the total is recalculated with the order's discount, gift wrap and delivery.
 * Lines for products already in the order keep the price the customer was quoted;
 * newly added products use today's server price (including any active offer).
 * Delivery: unchanged area keeps the charge, a new area uses the shop's charge from
 * Settings; the owner may also type a charge (`delivery`, 0 = free).
 */
export async function editOrder(db: Database, d: Record<string, unknown>, now = Date.now()) {
    const row = await db.prepare('SELECT payload FROM orders WHERE id=?').get(text(d.id, 1, 100, 'Order ID'));
    assert(row, 'Order not found.', 404);
    const order = JSON.parse(String(row.payload)) as Order;
    assert(editableStatuses.includes(order.status), 'Only New, Confirmed or Processing orders can be edited.', 409);

    const name = text(d.name, 2, 100, 'Name'), address = text(d.address, 5, 500, 'Address');
    const phone = normalizePhone(text(d.phone, 11, 20, 'Phone number'));
    assert(/^01[3-9]\d{8}$/.test(phone), 'Enter a valid Bangladesh mobile number.');
    assert(d.area === 'dhaka' || d.area === 'outside', 'Choose the delivery area.');
    assert(Array.isArray(d.items) && d.items.length > 0 && d.items.length <= 50, 'An order needs 1–50 items. To remove everything, cancel the order instead.');

    const { products, site } = await catalog(db);

    // Merge repeated product/option lines so each appears once.
    const lines = new Map<string, OrderItem>();
    for (const raw of d.items as Record<string, unknown>[]) {
        assert(raw && typeof raw === 'object' && Number.isSafeInteger(raw.id) && Number.isSafeInteger(raw.qty) && Number(raw.qty) > 0 && Number(raw.qty) <= 100, 'Each item needs a quantity from 1 to 100.');
        assert(typeof raw.size === 'string' && raw.size.length <= 100, 'Choose a size or style for each item.');
        assert(raw.color === undefined || (typeof raw.color === 'string' && raw.color.length <= 100), 'Invalid colour.');
        const id = Number(raw.id), size = raw.size as string, color = (raw.color as string | undefined) || '', qty = Number(raw.qty);
        const product = products.find(p => p.id === id);
        const original = order.items.find(item => sameLine(item, { id, size, color })) || order.items.find(item => item.id === id);
        assert(product || original, 'A product in this order is no longer available.', 409);
        if (product) assert(validOption(product, size) || (original?.size === size), `Choose a valid size or style for ${product.name}.`);
        // A colour the owner has since removed stays valid on a line that already had it.
        if (product) assert(validColor(product, color) || ((original?.color || '') === color && original?.size === size), `Choose a valid colour for ${product.name}.`);
        const key = id + '\u0000' + size + '\u0000' + color, existing = lines.get(key);
        if (existing) { existing.qty += qty; assert(existing.qty <= 100, 'Each item can have at most 100 pieces.'); continue; }
        lines.set(key, { id, size, ...(color ? { color } : {}), qty, name: original?.name || product!.name, price: original ? original.price : productPricing(product!, now).unitPrice });
    }
    const items = [...lines.values()];

    // Stock moves by the difference: per product (total stock) and per size where the product tracks sizes.
    const tally = (list: OrderItem[], key: (i: OrderItem) => string) => { const m = new Map<string, number>(); for (const i of list) m.set(key(i), (m.get(key(i)) || 0) + i.qty); return m; };
    const byProduct = (i: OrderItem) => String(i.id), bySize = (i: OrderItem) => i.id + '\u0000' + i.size;
    const beforeQty = tally(order.items, byProduct), afterQty = tally(items, byProduct);
    const beforeSize = tally(order.items, bySize), afterSize = tally(items, bySize);
    for (const key of new Set([...beforeSize.keys(), ...afterSize.keys()])) {
        const change = (afterSize.get(key) || 0) - (beforeSize.get(key) || 0);
        if (change <= 0) continue;
        const [id, size] = key.split('\u0000'), product = products.find(p => p.id === Number(id));
        assert(product, 'A removed product cannot be increased.', 409);
        if (product!.extra && Object.keys(product!.extra.sizeStock).length)
            assert(sizeAvailable(product!, size) >= change, `${product!.name} (${size}): only ${sizeAvailable(product!, size)} more available.`, 409);
    }
    for (const key of new Set([...beforeQty.keys(), ...afterQty.keys()])) {
        const id = Number(key), change = (afterQty.get(key) || 0) - (beforeQty.get(key) || 0);
        if (!change) continue;
        const product = products.find(p => p.id === id);
        if (change > 0) {
            assert(product, 'A removed product cannot be increased.', 409);
            assert(product!.stock >= change, `${product!.name}: only ${product!.stock} more available.`, 409);
            const updated = await db.prepare('UPDATE products SET stock=stock-? WHERE id=? AND stock>=?').run(change, id, change);
            assert(updated.changes, `${product!.name}: only ${product!.stock} more available.`, 409);
        }
        else if (product) await db.prepare('UPDATE products SET stock=stock+? WHERE id=?').run(-change, id);
    }
    for (const key of new Set([...beforeSize.keys(), ...afterSize.keys()])) {
        const change = (afterSize.get(key) || 0) - (beforeSize.get(key) || 0);
        if (!change) continue;
        const [id, size] = key.split('\u0000');
        await adjustSizeStock(db, Number(id), size, -change);
    }

    const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
    let delivery: number;
    if (d.delivery !== undefined && d.delivery !== null) {
        delivery = Number(d.delivery);
        assert(Number.isSafeInteger(delivery) && delivery >= 0 && delivery <= 100000, 'Delivery charge must be a whole taka amount from 0 to 100,000.');
    }
    else delivery = d.area === order.area ? order.delivery : deliveryCharge(site.checkout, d.area as 'dhaka' | 'outside', subtotal);
    // The discount given at checkout stays, but never more than the items are now worth.
    const discount = Math.min(order.discount || 0, subtotal);
    const giftWrap = order.gift?.wrap ? order.gift.price || 0 : 0;
    Object.assign(order, { name, phone, address, area: d.area, items, delivery, ...(order.discount ? { discount } : {}), total: subtotal - discount + delivery + giftWrap, editedAt: new Date(now).toISOString() });
    await db.prepare('UPDATE orders SET payload=? WHERE id=?').run(JSON.stringify(order), order.id);
    return order;
}
