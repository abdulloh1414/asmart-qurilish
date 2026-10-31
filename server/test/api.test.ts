import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { makePool, migrate } from '../src/db.js';
import { buildApp } from '../src/app.js';
import { ENTITIES } from '../src/entities.js';
import { hashPassword, newId } from '../src/auth.js';

const url = process.env.TEST_DATABASE_URL || 'postgresql://postgres@localhost:5433/triumf_test?host=/tmp/pgdata';
const pool = makePool(url);
let app: Awaited<ReturnType<typeof buildApp>>;
const H = { 'x-requested-with': 'fetch', 'content-type': 'application/json' };

async function login(l: string, p: string) {
  const r = await app.inject({ method: 'POST', url: '/api/login', headers: H, payload: { login: l, password: p } });
  const c = r.cookies.find((x) => x.name === 'sid');
  return { r, cookie: c ? `sid=${c.value}` : '' };
}
const call = (cookie: string, method: 'GET' | 'POST' | 'PATCH', u: string, payload?: unknown) =>
  app.inject({ method, url: u, headers: { ...H, cookie }, payload: payload as object });

beforeAll(async () => {
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await migrate(pool);
  app = await buildApp(pool);
  for (const [login, role] of [['boss', 'owner'], ['acc', 'accountant'], ['store', 'storekeeper'], ['fore', 'foreman']]) {
    await pool.query('INSERT INTO users(id,login,name,pass_hash,role) VALUES ($1,$2,$3,$4,$5)', [newId(), login, login, await hashPassword('password123'), role]);
  }
});
afterAll(async () => { await app.close(); await pool.end(); });

describe('sxema', () => {
  it('entities.ts ustunlari bazadagi jadvallarga mos', async () => {
    for (const e of ENTITIES) {
      const r = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name=$1", [e.name]);
      const have = new Set(r.rows.map((x) => x.column_name));
      for (const c of e.cols) expect(have.has(c.c), `${e.name}.${c.c}`).toBe(true);
    }
  });
});

describe('auth', () => {
  it('noto\'g\'ri parol rad etiladi, to\'g\'risi kiritadi', async () => {
    expect((await login('boss', 'wrong')).r.statusCode).toBe(401);
    expect((await login('nobody', 'x')).r.statusCode).toBe(401);
    const ok = await login('BOSS', 'password123');
    expect(ok.r.statusCode).toBe(200);
    expect(ok.r.json().perms.views).toContain('users');
  });
  it('kirishsiz state yopiq; CSRF sarlavhasiz POST rad', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/state' })).statusCode).toBe(401);
    expect((await app.inject({ method: 'POST', url: '/api/login', payload: { login: 'a', password: 'b' } })).statusCode).toBe(403);
  });
});

describe('sync', () => {
  let boss = '', acc = '', store = '', fore = '';
  beforeAll(async () => {
    boss = (await login('boss', 'password123')).cookie; acc = (await login('acc', 'password123')).cookie;
    store = (await login('store', 'password123')).cookie; fore = (await login('fore', 'password123')).cookie;
  });
  it('yozish, o\'qish va o\'chirish', async () => {
    const up = {
      works: [{ id: 'w1', name: 'Kafel', unit: 'м²', rate: 70000 }],
      objects: [{ id: 'o1', name: '35-дом', address: '', client: '', clientId: '', budget: 0, status: 'active', start: '2026-06-01', end: '' }],
      brigades: [{ id: 'b1', name: 'Sardor', leader: 'Sardor', phone: '', workId: 'w1', rate: 72000, active: 'yes' }],
      logs: [{ id: 'l1', date: '2026-10-01', brigadeId: 'b1', objectId: 'o1', workId: 'w1', qty: 12.5, rate: 72000, zone: '' }],
    };
    const r = await call(boss, 'POST', '/api/sync', { upserts: up });
    expect(r.statusCode, r.body).toBe(200);
    const st = (await call(boss, 'GET', '/api/state')).json();
    expect(st.data.logs[0]).toMatchObject({ id: 'l1', qty: 12.5, date: '2026-10-01', zone: '' });
    expect(st.data.objects[0]).toMatchObject({ clientId: '', end: '', start: '2026-06-01' });
    expect(st.rev).toBeGreaterThan(1);
  });
  it('bog\'langan ota yozuvni o\'chirish rad etiladi va hech narsa o\'zgarmaydi', async () => {
    const r = await call(boss, 'POST', '/api/sync', { deletes: { objects: ['o1'] } });
    expect(r.statusCode).toBe(409);
    const st = (await call(boss, 'GET', '/api/state')).json();
    expect(st.data.objects.length).toBe(1);
  });
  it('bola va otani birga o\'chirish ishlaydi (tartib muhim emas)', async () => {
    const r = await call(boss, 'POST', '/api/sync', { deletes: { objects: ['o1'], logs: ['l1'] } });
    expect(r.statusCode, r.body).toBe(200);
  });
  it('ixtiyoriy havola o\'chirilganda bo\'shatiladi', async () => {
    await call(boss, 'POST', '/api/sync', { upserts: { objects: [{ id: 'o2', name: 'x', address: '', client: '', clientId: '', budget: 0, status: 'active', start: '', end: '' }], suppliers: [{ id: 's1', name: 'S', phone: '', note: '' }], materials: [{ id: 'm1', name: 'Sement', unit: 'kg', min: 0, price: 0 }] } });
    await call(boss, 'POST', '/api/sync', { upserts: { moves: [{ id: 'v1', type: 'in', date: '2026-10-01', materialId: 'm1', qty: 5, price: 10, objectId: 'o2', brigadeId: '', receiver: '', supplier: 'S', supplierId: 's1', note: '' }] } });
    const d = await call(boss, 'POST', '/api/sync', { deletes: { suppliers: ['s1'] } });
    expect(d.statusCode, d.body).toBe(200);
    const st = (await call(boss, 'GET', '/api/state')).json();
    expect(st.data.moves[0].supplierId).toBe('');
  });
  it('noto\'g\'ri qiymatlar rad etiladi', async () => {
    const bad = (u: object) => call(boss, 'POST', '/api/sync', { upserts: u });
    expect((await bad({ cash: [{ id: 'c1', date: '2026-13-99x', type: 'in', cat: 'client', amount: 1 }] })).statusCode).toBe(400);
    expect((await bad({ cash: [{ id: 'c1', date: '2026-10-01', type: 'zzz', cat: 'client', amount: 1 }] })).statusCode).toBe(400);
    expect((await bad({ cash: [{ id: 'c1', date: '2026-10-01', type: 'in', cat: 'client', amount: 'abc' }] })).statusCode).toBe(400);
    expect((await bad({ nope: [{ id: 'x' }] })).statusCode).toBe(400);
    expect((await bad({ works: [{ id: "a'; drop table users;--", name: 'x', unit: 'm', rate: 1 }] })).statusCode).toBe(400);
  });
  it('rollar: omborchi kassaga yoza olmaydi va kassani ko\'rmaydi; prorab shartnomani ko\'rmaydi', async () => {
    const cashRow = { id: 'c9', date: '2026-10-01', type: 'in', cat: 'client', amount: 5, objectId: '', brigadeId: '', workId: '', supplierId: '', note: '' };
    expect((await call(store, 'POST', '/api/sync', { upserts: { cash: [cashRow] } })).statusCode).toBe(403);
    expect((await call(acc, 'POST', '/api/sync', { upserts: { cash: [cashRow] } })).statusCode).toBe(200);
    expect(Object.keys((await call(store, 'GET', '/api/state')).json().data)).not.toContain('cash');
    expect(Object.keys((await call(fore, 'GET', '/api/state')).json().data)).not.toContain('contracts');
    expect((await call(store, 'GET', '/api/users')).statusCode).toBe(403);
  });
  it('katta paket (5000 qator) tez yoziladi', async () => {
    const rows = Array.from({ length: 5000 }, (_, i) => ({ id: 'bulk' + i, type: 'out', date: '2026-09-01', materialId: 'm1', qty: i + 1, price: 1.5, objectId: 'o2', brigadeId: '', receiver: 'x', supplier: '', supplierId: '', note: '' }));
    const t = Date.now();
    const r = await call(boss, 'POST', '/api/sync', { upserts: { moves: rows } });
    expect(r.statusCode, r.body).toBe(200);
    expect(Date.now() - t).toBeLessThan(5000);
  });
});

describe('foydalanuvchilar', () => {
  it('egasi yaratadi, oxirgi egasini o\'chirib bo\'lmaydi, o\'chirilgan kira olmaydi', async () => {
    const boss = (await login('boss', 'password123')).cookie;
    expect((await call(boss, 'POST', '/api/users', { login: 'new1', name: 'Yangi', role: 'storekeeper', password: 'abcdefgh1' })).statusCode).toBe(200);
    expect((await call(boss, 'POST', '/api/users', { login: 'new1', name: 'Yangi', role: 'storekeeper', password: 'abcdefgh1' })).statusCode).toBe(409);
    expect((await login('new1', 'abcdefgh1')).r.statusCode).toBe(200);
    const list = (await call(boss, 'GET', '/api/users')).json().users;
    const bossId = list.find((u: { login: string }) => u.login === 'boss').id;
    expect((await call(boss, 'PATCH', `/api/users/${bossId}`, { active: false })).statusCode).toBe(400);
    const nid = list.find((u: { login: string }) => u.login === 'new1').id;
    await call(boss, 'PATCH', `/api/users/${nid}`, { active: false });
    expect((await login('new1', 'abcdefgh1')).r.statusCode).toBe(401);
  });
});

describe('statik', () => {
  it('SPA index.html beradi, noma\'lum /api 404', async () => {
    expect((await app.inject({ method: 'GET', url: '/some/page' })).statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: '/api/nothing' })).statusCode).toBe(404);
    expect((await app.inject({ method: 'GET', url: '/api/health' })).json().ok).toBe(true);
  });
});
