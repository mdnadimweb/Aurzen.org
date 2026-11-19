import { assert, text, HttpError } from './http';
import { slugify, type ProductExtra } from '@aurzen/shared/catalog';
import type { Database } from './database';

const leafCategory = async (db: Database, name: string) => {
    assert(await db.prepare('SELECT name FROM categories WHERE name=?').get(name), `Category "${name}" does not exist.`);
    assert(!await db.prepare('SELECT name FROM categories WHERE parent=?').get(name), `Choose a subcategory of ${name}.`);
};
const ids = (value: unknown) => {
    assert(Array.isArray(value) && value.length > 0 && value.length <= 500 && value.every(n => Number.isSafeInteger(n) && n > 0), 'Choose 1–500 products.');
    return value as number[];
};
async function updateExtra(db: Database, id: number, change: (extra: ProductExtra) => void) {
    const row = await db.prepare('SELECT extra FROM products WHERE id=?').get(id);
    assert(row, 'Product not found.', 404);
    const extra = { status: 'active', ...JSON.parse(String(row!.extra || '{}')) } as ProductExtra;
    change(extra);
    await db.prepare('UPDATE products SET extra=? WHERE id=?').run(JSON.stringify(extra), id);
}
/** Studio → Products bulk bar: status, price change in %, move to a category. */
export async function bulkProducts(db: Database, d: Record<string, any>) {
    const list = ids(d.ids);
    if (d.op === 'status') {
        assert(['active', 'draft', 'hidden'].includes(d.value), 'Choose Active, Draft or Hidden.');
        for (const id of list) await updateExtra(db, id, e => { e.status = d.value; });
    } else if (d.op === 'price') {
        assert(Number.isInteger(d.value) && d.value >= -90 && d.value <= 300 && d.value !== 0, 'Change prices by a whole percentage from -90 to 300.');
        for (const id of list) {
            const row = await db.prepare('SELECT price FROM products WHERE id=?').get(id);
            assert(row, 'Product not found.', 404);
            const price = Math.max(1, Math.round(Number(row!.price) * (100 + d.value) / 100));
            assert(price <= 1000000, 'A new price would be above ৳1,000,000.');
            await db.prepare('UPDATE products SET price=? WHERE id=?').run(price, id);
        }
    } else if (d.op === 'category') {
        const category = text(d.value, 1, 100, 'Category');
        await leafCategory(db, category);
        for (const id of list) await db.prepare('UPDATE products SET category=? WHERE id=?').run(category, id);
    } else assert(false, 'Unknown bulk action.');
    return list.length;
}
/** A copy saved as a Draft, so it never appears in the shop by accident. */
export async function duplicateProduct(db: Database, id: unknown) {
    assert(Number.isSafeInteger(id), 'Invalid product.');
    const p = await db.prepare('SELECT * FROM products WHERE id=?').get(id as number);
    assert(p, 'Product not found.', 404);
    const extra = { ...JSON.parse(String(p!.extra || '{}')), status: 'draft', sku: '' };
    await db.prepare('INSERT INTO products(name,category,price,stock,image,tag,description,images,offer,sizes,colors,extra) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)')
        .run((String(p!.name) + ' (copy)').slice(0, 100), p!.category, p!.price, p!.stock, p!.image, p!.tag, p!.description || '', p!.images || '[]', p!.offer || 'null', p!.sizes || '[]', p!.colors || '[]', JSON.stringify(extra));
}
/** CSV import (already previewed in the studio). Rows with an existing ID update it; others are added as Drafts. */
export async function importProducts(db: Database, rows: unknown) {
    assert(Array.isArray(rows) && rows.length > 0 && rows.length <= 1000, 'Import 1–1,000 rows at a time.');
    let added = 0, updated = 0;
    for (const [index, input] of (rows as Record<string, unknown>[]).entries()) {
        const at = ` (row ${index + 2})`;
        try {
            assert(input && typeof input === 'object', 'Invalid row.');
            const name = text(input.name, 2, 100, 'Name'), category = text(input.category, 1, 100, 'Category');
            await leafCategory(db, category);
            const price = Number(input.price), stock = Number(input.stock);
            assert(Number.isSafeInteger(price) && price > 0 && price <= 1000000, 'Price must be a whole taka amount.');
            assert(Number.isSafeInteger(stock) && stock >= 0 && stock <= 1000000, 'Stock must be a whole number.');
            const tag = typeof input.tag === 'string' ? input.tag.trim().slice(0, 40) : '';
            const description = typeof input.description === 'string' ? input.description.trim().slice(0, 3000) : '';
            const sku = typeof input.sku === 'string' ? input.sku.trim().slice(0, 60) : '';
            const status = ['active', 'draft', 'hidden'].includes(String(input.status)) ? String(input.status) : '';
            const id = input.id === '' || input.id === undefined || input.id === null ? null : Number(input.id);
            if (id !== null) {
                assert(Number.isSafeInteger(id) && id > 0, 'Invalid ID.');
                const row = await db.prepare('SELECT extra FROM products WHERE id=?').get(id);
                assert(row, `Product ${id} does not exist; leave the ID empty to add it.`);
                const extra = { ...JSON.parse(String(row!.extra || '{}')), ...(sku ? { sku } : {}), ...(status ? { status } : {}) };
                await db.prepare('UPDATE products SET name=?,category=?,price=?,stock=?,tag=?,description=?,extra=? WHERE id=?').run(name, category, price, stock, tag, description, JSON.stringify(extra), id);
                updated++;
            } else {
                await db.prepare("INSERT INTO products(name,category,price,stock,image,tag,description,images,offer,sizes,colors,extra) VALUES(?,?,?,?,'box',?,?,'[]','null','[]','[]',?)").run(name, category, price, stock, tag, description, JSON.stringify({ sku, status: status || 'draft' }));
                added++;
            }
        } catch (error) { throw new HttpError(400, (error instanceof Error ? error.message : 'Invalid row.') + at); }
    }
    return { added, updated };
}
export const productSlug = (name: string) => slugify(name);
