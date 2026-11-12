import { catalog, type Database } from './database';
import { assert, text } from './http';
import { deliveryFees, editableStatuses, productPricing, validOption, type Order, type OrderItem } from '@aurzen/shared/catalog';
import { normalizePhone } from '@aurzen/shared/phone';

/**
 * Owner correction of an order that has not shipped yet. Runs inside the admin
 * write transaction: customer details, delivery area and items are validated
 * here, stock moves by the difference only, and the total is recalculated.
 * Lines for products already in the order keep the price the customer was quoted;
 * newly added products use today's server price (including any active offer).
 */
export async function editOrder(db: Database, d: Record<string, unknown>, now = Date.now()) {
    const row = await db.prepare('SELECT payload FROM orders WHERE id=?').get(text(d.id, 1, 100, 'Order ID'));
    assert(row, 'Order not found.', 404);
    const order = JSON.parse(String(row.payload)) as Order;
    assert(editableStatuses.includes(order.status), 'Only New, Confirmed or Processing orders can be edited.', 409);

    const name = text(d.name, 2, 100, 'Name'), address = text(d.address, 10, 500, 'Address');
    const phone = normalizePhone(text(d.phone, 11, 20, 'Phone number'));
    assert(/^01[3-9]\d{8}$/.test(phone), 'Enter a valid Bangladesh mobile number.');
    assert(d.area === 'dhaka' || d.area === 'outside', 'Choose the delivery area.');
    assert(Array.isArray(d.items) && d.items.length > 0 && d.items.length <= 50, 'An order needs 1–50 items. To remove everything, cancel the order instead.');

    const { products } = await catalog(db);
    const previousQty = new Map<number, number>();
    for (const item of order.items) previousQty.set(item.id, (previousQty.get(item.id) || 0) + item.qty);

    // Merge repeated product/option lines so each appears once.
    const lines = new Map<string, OrderItem>();
    for (const raw of d.items as Record<string, unknown>[]) {
        assert(raw && typeof raw === 'object' && Number.isSafeInteger(raw.id) && Number.isSafeInteger(raw.qty) && Number(raw.qty) > 0 && Number(raw.qty) <= 100, 'Each item needs a quantity from 1 to 100.');
        assert(typeof raw.size === 'string' && raw.size.length <= 100, 'Choose a size or style for each item.');
        const id = Number(raw.id), size = raw.size as string, qty = Number(raw.qty);
        const product = products.find(p => p.id === id);
        const original = order.items.find(item => item.id === id && item.size === size) || order.items.find(item => item.id === id);
        assert(product || original, 'A product in this order is no longer available.', 409);
        if (product) assert(validOption(product, size) || (original?.size === size), `Choose a valid size or style for ${product.name}.`);
        const key = id + '\u0000' + size, existing = lines.get(key);
        if (existing) { existing.qty += qty; assert(existing.qty <= 100, 'Each item can have at most 100 pieces.'); continue; }
        lines.set(key, { id, size, qty, name: original?.name || product!.name, price: original ? original.price : productPricing(product!, now).unitPrice });
    }
    const items = [...lines.values()];

    // Stock moves by the difference per product; a removed product can only be reduced.
    const nextQty = new Map<number, number>();
    for (const item of items) nextQty.set(item.id, (nextQty.get(item.id) || 0) + item.qty);
    for (const id of new Set([...previousQty.keys(), ...nextQty.keys()])) {
        const change = (nextQty.get(id) || 0) - (previousQty.get(id) || 0);
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

    const delivery = d.area === order.area ? order.delivery : deliveryFees[d.area as 'dhaka' | 'outside'];
    Object.assign(order, { name, phone, address, area: d.area, items, delivery, total: items.reduce((sum, item) => sum + item.price * item.qty, 0) + delivery, editedAt: new Date(now).toISOString() });
    await db.prepare('UPDATE orders SET payload=? WHERE id=?').run(JSON.stringify(order), order.id);
    return order;
}
