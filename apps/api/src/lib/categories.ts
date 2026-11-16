// Owner category management: main categories and one level of subcategories.
// Category names are the keys products use, so a rename updates every reference.
import { categoryLimits, type HeroSlide, type Promotion, type Storefront } from '@aurzen/shared/catalog';
import { uniqueCategorySlug, type Database } from './database';
import { assert, text } from './http';
import { imagePath } from './images';

async function validCover(db: Database, value: unknown) {
    if (value === undefined || value === null || value === '') return null;
    assert(typeof value === 'string' && value.length <= 2000, 'Invalid cover image.');
    const cover = value.trim();
    if (imagePath.test(cover)) {
        assert(await db.prepare('SELECT id FROM images WHERE id=?').get(cover.slice('/media/'.length)), 'This uploaded cover is unavailable. Upload it again.');
        return cover;
    }
    let https = false;
    try { https = new URL(cover).protocol === 'https:'; } catch { /* invalid URL */ }
    assert(https, 'Upload a cover photo or use an HTTPS image link.');
    return cover;
}
async function validParent(db: Database, value: unknown, self?: string) {
    if (value === undefined || value === null || value === '') return null;
    const parent = text(value, 1, categoryLimits.name, 'Parent category');
    assert(parent !== self, 'A category cannot be its own parent.');
    const row = await db.prepare('SELECT name,parent FROM categories WHERE name=?').get(parent);
    assert(row, 'Choose an existing main category as the parent.');
    assert(!row.parent, 'Subcategories cannot have their own subcategories. Choose a main category.');
    return parent;
}
const nameExists = async (db: Database, name: string, except?: string) =>
    (await db.prepare('SELECT name FROM categories WHERE lower(name)=lower(?)').all(name)).some(r => String(r.name) !== except);

export async function addCategory(db: Database, d: Record<string, unknown>) {
    const name = text(d.name, 2, categoryLimits.name, 'Category name');
    assert(!await nameExists(db, name), 'A category with this name already exists. Category names must be unique, including subcategories.');
    const parent = await validParent(db, d.parent);
    const cover = parent ? null : await validCover(db, d.cover);
    await db.prepare('INSERT INTO categories(name,parent,slug,cover) VALUES(?,?,?,?)').run(name, parent, await uniqueCategorySlug(db, name, parent), cover);
}

export async function editCategory(db: Database, d: Record<string, unknown>) {
    const original = text(d.original, 1, categoryLimits.name, 'Category');
    const current = await db.prepare('SELECT name,parent,slug FROM categories WHERE name=?').get(original);
    assert(current, 'Category not found.', 404);
    const name = text(d.name, 2, categoryLimits.name, 'Category name');
    assert(!await nameExists(db, name, original), 'A category with this name already exists. Category names must be unique, including subcategories.');
    const parent = await validParent(db, d.parent, original);
    if (parent) assert(!await db.prepare('SELECT name FROM categories WHERE parent=?').get(original), 'This category has subcategories, so it must stay a main category. Move its subcategories first.');
    const cover = parent ? null : d.cover === undefined ? undefined : await validCover(db, d.cover);
    const oldParent = current.parent ? String(current.parent) : null;
    // The URL stays the same unless the category moves to a different parent and its slug would clash there.
    let slug = String(current.slug || '');
    if (!slug || parent !== oldParent) {
        const clash = (await db.prepare('SELECT name,slug,parent FROM categories').all()).some(c => String(c.name) !== original && (c.parent ? String(c.parent) : null) === parent && String(c.slug) === slug);
        if (!slug || clash) slug = await uniqueCategorySlug(db, name, parent, original);
    }
    if (cover === undefined) await db.prepare('UPDATE categories SET name=?,parent=?,slug=? WHERE name=?').run(name, parent, slug, original);
    else await db.prepare('UPDATE categories SET name=?,parent=?,slug=?,cover=? WHERE name=?').run(name, parent, slug, cover, original);
    if (name !== original) await renameReferences(db, original, name);
}

export async function deleteCategory(db: Database, d: Record<string, unknown>) {
    const name = text(d.name, 1, categoryLimits.name, 'Category');
    assert(!await db.prepare('SELECT id FROM products WHERE category=?').get(name), 'Move or remove products before deleting this category.');
    assert(!await db.prepare('SELECT name FROM categories WHERE parent=?').get(name), 'Delete or move its subcategories before deleting this category.');
    await db.prepare('DELETE FROM categories WHERE name=?').run(name);
    await updateSetting<Storefront>(db, 'storefront', s => ({ ...s, featured: (s.featured || []).filter(c => c !== name), covers: Object.fromEntries(Object.entries(s.covers || {}).filter(([c]) => c !== name)) }));
}

async function updateSetting<T>(db: Database, key: string, change: (value: T) => T) {
    const row = await db.prepare('SELECT value FROM settings WHERE key=?').get(key);
    if (!row) return;
    await db.prepare('UPDATE settings SET value=? WHERE key=?').run(JSON.stringify(change(JSON.parse(String(row.value)) as T)), key);
}
async function renameReferences(db: Database, from: string, to: string) {
    await db.prepare('UPDATE products SET category=? WHERE category=?').run(to, from);
    await db.prepare('UPDATE categories SET parent=? WHERE parent=?').run(to, from);
    await updateSetting<Storefront>(db, 'storefront', s => ({
        ...s,
        featured: (s.featured || []).map(c => c === from ? to : c),
        covers: Object.fromEntries(Object.entries(s.covers || {}).map(([c, id]) => [c === from ? to : c, id])),
    }));
    await updateSetting<HeroSlide[]>(db, 'heroSlides', slides => slides.map(s => s.category === from ? { ...s, category: to } : s));
    await updateSetting<Promotion[]>(db, 'promotions', list => list.map(p => p.link.type === 'category' && p.link.value === from ? { ...p, link: { ...p.link, value: to } } : p));
}
