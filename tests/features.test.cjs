require('../scripts/test-environment.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'aurzen-features-'));
process.env.DATABASE_PATH = path.join(directory, 'test.sqlite');
process.env.CHECKOUT_ENABLED = 'true';
process.env.SEED_DEMO='true';
delete process.env.TURSO_DATABASE_URL;
delete process.env.TURSO_AUTH_TOKEN;
delete process.env.NETLIFY;
const { DatabaseSync } = require('node:sqlite');
const legacy = new DatabaseSync(process.env.DATABASE_PATH);
legacy.exec("CREATE TABLE products(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,category TEXT NOT NULL,price INTEGER NOT NULL CHECK(price>0),stock INTEGER NOT NULL CHECK(stock>=0),image TEXT NOT NULL,tag TEXT NOT NULL)");
legacy.prepare('INSERT INTO products VALUES(?,?,?,?,?,?,?)').run(100, 'Legacy photo', 'Accessories', 250, 3, 'https://example.com/legacy.jpg', 'ORIGINAL');
legacy.close();
const { catalog, database } = require('../apps/api/dist/lib/database.js');
const { placeOrder: submitOrder, quoteOrder } = require('../apps/api/dist/lib/checkout.js');
// Legitimate test clients review server pricing once and retain it for retries.
async function placeOrder(request){
  if(!request.quote)request.quote=(await quoteOrder(request)).quote;
  return submitOrder(request);
}
const { publicOrder, trackOrder } = require('../apps/api/dist/lib/tracking.js');
const { normalizePhone } = require('@aurzen/shared/phone');
const { rateLimit } = require('../apps/api/dist/lib/auth.js');
const { POST } = require('../apps/api/dist/app/api/tracking/route.js');
const oldOrder = (extra = {}) => ({ id: 'AZ-' + randomUUID(), name: 'Private Customer', phone: '01712345678', address: 'Private delivery address', area: 'dhaka', items: [{ id: 1, name: 'Legacy item', qty: 1, size: 'M', price: 100 }], total: 180, delivery: 80, status: 'Confirmed', date: '2025-06-01T00:00:00.000Z', ...extra });
async function store(order) { await (await database()).prepare('INSERT INTO orders VALUES(?,?,?,?)').run(order.id, randomUUID(), JSON.stringify(order), order.date); return order; }
function request(data, origin = 'https://aurzen.netlify.app') { return new Request('https://aurzen.netlify.app/api/tracking/', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); }
test.after(async () => {
  (await database()).close();
  const relative = path.relative(path.resolve(os.tmpdir()), path.resolve(directory));
  assert(relative && !relative.startsWith('..') && !path.isAbsolute(relative));
  fs.rmSync(directory, { recursive: true, force: true });
});

test('Vercel without Turso rejects initialization instead of creating local records', async () => {
  const previous = process.env.VERCEL;
  try {
    process.env.VERCEL = '1';
    await assert.rejects(database(), /TURSO_DATABASE_URL.*TURSO_AUTH_TOKEN/);
  } finally {
    if (previous === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = previous;
  }
});

test('uploads reject files above the Vercel-safe limit before decoding or storage', async () => {
  const { saveImage, uploadForm } = require('../apps/api/dist/lib/images.js');
  const { maxImageBytes } = require('../packages/shared/dist/upload-limits.js');
  assert.equal(maxImageBytes, 4 * 1024 * 1024);
  await assert.rejects(saveImage(new File([Buffer.alloc(maxImageBytes + 1)], 'large.jpg', { type: 'image/jpeg' })), error => error.status === 413);
  const request = new Request('https://store.example/api/admin/images/', {
    method: 'POST',
    headers: { 'Content-Type': 'multipart/form-data; boundary=test', 'Content-Length': String(maxImageBytes + 65537) },
    body: 'test',
  });
  await assert.rejects(uploadForm(request), error => error.status === 413);
});

test('gallery migration preserves a legacy cover and accepts ordered additional photos', async () => {
  let product = (await catalog()).products.find(product => product.id === 100);
  assert.equal(product.image, 'https://example.com/legacy.jpg');
  assert.deepEqual(product.images, []);
  const photos = ['https://example.com/cover.jpg', 'https://example.com/second.jpg'];
  await (await database()).prepare('UPDATE products SET image=?,images=? WHERE id=100').run(photos[0], JSON.stringify(photos));
  product = (await catalog()).products.find(product => product.id === 100);
  assert.equal(product.image, photos[0]);
  assert.deepEqual(product.images, photos);
});

test('tracking and checkout share Bangladesh phone normalization', async () => {
  for (const phone of ['01712345678', '+8801712345678', '8801712345678', '+880 (1712) 345-678']) assert.equal(normalizePhone(phone), '01712345678');
  const receipt = await placeOrder({ key: randomUUID(), name: 'Checkout Customer', phone: '+8801712345678', address: 'House 10, Road 2, Dhaka', area: 'dhaka', items: [{ id: 1, qty: 1, size: 'M' }] });
  const result = await trackOrder(receipt.id, '01712-345678');
  assert.equal(result.id, receipt.id);
  assert.equal(result.status, 'New');
  assert.equal(result.history.length, 1);
  assert.equal(result.history[0].date, result.date);
});

test('lookup requires matching reference and phone and uses one generic failure', async () => {
  const order = await store(oldOrder());
  assert.equal((await trackOrder(order.id, '+8801712345678')).id, order.id);
  const messages = [];
  for (const [reference, phone] of [[order.id, '01812345678'], ['AZ-missing', order.phone], [order.id, 'invalid'], [null, order.phone]]) {
    await assert.rejects(trackOrder(reference, phone), error => { assert.equal(error.status, 404); messages.push(error.message); return true; });
  }
  assert.equal(new Set(messages).size, 1);
  assert(!messages[0].includes(order.phone));
});

test('public tracking exposes only required item details and no customer or payment fields', () => {
  const order = oldOrder({ paymentMethod: 'cod' });
  const result = JSON.parse(JSON.stringify(publicOrder(order)));
  assert.deepEqual(Object.keys(result).sort(), ['date', 'id', 'items', 'status']);
  assert.deepEqual(result.items, [{ name: 'Legacy item', qty: 1, size: 'M' }]);
  const serialized = JSON.stringify(result);
  for (const sensitive of [order.name, order.phone, order.address, 'paymentMethod', 'price', 'total']) assert(!serialized.includes(sensitive));
  const history=publicOrder({...order,history:[{status:'Confirmed',date:order.date,phone:order.phone},{status:'New',date:'invalid'}]}).history;
  assert.deepEqual(history,[{status:'Confirmed',date:order.date}]);
});

test('legacy orders have no invented history and terminal statuses remain clear', async () => {
  for (const status of ['Cancelled', 'Returned']) {
    const order = await store(oldOrder({ status }));
    const result = await trackOrder(order.id, order.phone);
    assert.equal(result.status, status);
    assert.equal(result.history, undefined);
  }
  const result = publicOrder(oldOrder({ history: [{ status: 'Processing', date: '2026-11-04T10:00:00.000Z' }] }));
  assert.deepEqual(result.history, [{ status: 'Processing', date: '2026-11-04T10:00:00.000Z' }]);
});

test('courier information appears only with both real stored values', () => {
  for (const extra of [{}, { courier: 'Courier' }, { trackingReference: 'ABC123' }]) {
    const result = publicOrder(oldOrder(extra));
    assert.equal(result.courier, undefined);
    assert.equal(result.trackingReference, undefined);
  }
  const result = publicOrder(oldOrder({ courier: 'Courier', trackingReference: 'ABC123' }));
  assert.equal(result.courier, 'Courier');
  assert.equal(result.trackingReference, 'ABC123');
});

test('tracking API rejects cross-origin requests and does not cache private responses or failures', async () => {
  const order = await store(oldOrder());
  const denied = await POST(request({ reference: order.id, phone: order.phone }, 'https://untrusted.example'));
  assert.equal(denied.status, 403);
  assert.match(denied.headers.get('cache-control'), /no-store/);
  const response = await POST(request({ reference: order.id, phone: order.phone }));
  assert.equal(response.status, 200);
  assert.match(response.headers.get('cache-control'), /no-store/);
  const data = await response.json();
  assert.equal(data.id, order.id);
  assert.equal(data.phone, undefined);
  const failed = await POST(request({ reference: order.id, phone: '01812345678' }));
  assert.equal(failed.status, 404);
  assert.match(failed.headers.get('cache-control'), /no-store/);
  assert.deepEqual(await failed.json(), { error: 'We could not find an order matching those details.' });
});

test('database-backed limit counts persist and an expired window resets', async () => {
  const key = 'feature-limit-' + randomUUID();
  await rateLimit(key, 2, 60000);
  await rateLimit(key, 2, 60000);
  const saved = await (await database()).prepare('SELECT count FROM rate_limits WHERE key=?').get(key);
  assert.equal(Number(saved.count), 2);
  await assert.rejects(rateLimit(key, 2, 60000), error => error.status === 429);
  await (await database()).prepare('UPDATE rate_limits SET expires=0 WHERE key=?').run(key);
  await rateLimit(key, 2, 60000);
  assert.equal(Number((await (await database()).prepare('SELECT count FROM rate_limits WHERE key=?').get(key)).count), 1);
});

test('tracking endpoint enforces its shared durable attempt limit', async () => {
  const db = await database();
  await db.prepare("DELETE FROM rate_limits WHERE key LIKE 'tracking-%'").run();
  for (let attempt = 0; attempt < 30; attempt++) assert.equal((await POST(request({ reference: 'AZ-missing', phone: '01712345678' }))).status, 404);
  const response = await POST(request({ reference: 'AZ-missing', phone: '01712345678' }));
  assert.equal(response.status, 429);
  assert.match(response.headers.get('cache-control'), /no-store/);
});

test('admin gallery validates photo limits, preserves old clients, and never deletes shared assets', async () => {
  const auth = require('../apps/api/dist/lib/auth.js');
  const requireAdmin = auth.requireAdmin;
  const { POST: admin } = require('../apps/api/dist/app/api/admin/route.js');
  const previousPassword = process.env.ADMIN_PASSWORD;
  delete process.env.ADMIN_PASSWORD;
  const payload = { action: 'saveProduct', id: 100, name: 'Gallery product', category: 'Accessories', price: 250, stock: 3, tag: 'TEST', image: 'https://example.com/legacy.jpg' };
  const adminRequest = data => new Request('https://aurzen.netlify.app/api/admin/', { method: 'POST', headers: { Origin: 'https://aurzen.netlify.app', 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  try {
    assert.equal((await admin(adminRequest(payload))).status, 401);
    // Exercise authenticated handler behavior without creating production sessions.
    auth.requireAdmin = async () => {};
    const photos = ['https://example.com/front.jpg', 'https://example.com/back.jpg'];
    assert.equal((await admin(adminRequest({ ...payload, images: photos }))).status, 200);
    assert.equal((await catalog()).products.find(p => p.id === 100).image, photos[0]);
    assert.deepEqual((await catalog()).products.find(p => p.id === 100).images, photos);
    assert.equal((await admin(adminRequest({ ...payload, name: 'Legacy client edit' }))).status, 200);
    assert.deepEqual((await catalog()).products.find(p => p.id === 100).images, photos);
    for (const images of [Array.from({ length: 9 }, (_, i) => `https://example.com/${i}.jpg`), [photos[0], photos[0]], ['javascript:alert(1)'], ['/media/00000000-0000-0000-0000-000000000000.webp']]) {
      const result = await admin(adminRequest({ ...payload, images }));
      assert.equal(result.status, 400, JSON.stringify(await result.json()));
      assert.deepEqual((await catalog()).products.find(p => p.id === 100).images, photos);
    }
    const id = randomUUID() + '.webp', url = '/media/' + id;
    await (await database()).prepare('INSERT INTO images VALUES(?,?)').run(id, Buffer.from('isolated asset fixture'));
    assert.equal((await admin(adminRequest({ ...payload, images: [url] }))).status, 200);
    assert.equal((await admin(adminRequest({ ...payload, id: 3, images: [url] }))).status, 200);
    assert.equal((await admin(adminRequest({ ...payload, images: [], image: 'box' }))).status, 200);
    assert(await (await database()).prepare('SELECT id FROM images WHERE id=?').get(id));
    assert.equal((await catalog()).products.find(p => p.id === 3).image, url);
  } finally {
    auth.requireAdmin = requireAdmin;
    if (previousPassword === undefined) delete process.env.ADMIN_PASSWORD; else process.env.ADMIN_PASSWORD = previousPassword;
  }
});

test('admin records only real status changes and requires paired courier fields', async () => {
  const auth = require('../apps/api/dist/lib/auth.js'), requireAdmin = auth.requireAdmin;
  const { POST: admin } = require('../apps/api/dist/app/api/admin/route.js');
  const order = await store(oldOrder({ status: 'New' }));
  const change = data => admin(new Request('https://aurzen.netlify.app/api/admin/', { method: 'POST', headers: { Origin: 'https://aurzen.netlify.app', 'Content-Type': 'application/json' }, body: JSON.stringify({ id: order.id, ...data }) }));
  auth.requireAdmin = async () => {};
  try {
    const before = Date.now();
    assert.equal((await change({ action: 'status', status: 'Confirmed' })).status, 200);
    let result = await trackOrder(order.id, order.phone);
    assert.equal(result.history.length, 1);
    assert.equal(result.history[0].status, 'Confirmed');
    assert(Date.parse(result.history[0].date) >= before);
    assert.equal((await change({ action: 'status', status: 'Confirmed' })).status, 200);
    assert.equal((await trackOrder(order.id, order.phone)).history.length, 1);
    assert.equal((await change({ action: 'delivery', courier: 'Test Courier', trackingReference: '' })).status, 400);
    assert.equal((await change({ action: 'delivery', courier: 'Test Courier', trackingReference: 'TEST-001' })).status, 200);
    result = await trackOrder(order.id, order.phone);
    assert.equal(result.courier, 'Test Courier');
    assert.equal(result.trackingReference, 'TEST-001');
    assert.equal((await change({ action: 'status', status: 'Cancelled' })).status, 200);
    result = await trackOrder(order.id, order.phone);
    assert.equal(result.status, 'Cancelled');
    assert.deepEqual(result.history.map(event => event.status), ['Confirmed', 'Cancelled']);
  } finally { auth.requireAdmin = requireAdmin; }
});
