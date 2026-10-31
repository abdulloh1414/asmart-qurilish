import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const BASE = 'http://localhost:3100';
const b = await chromium.launch();
const mk = async () => { const c = await b.newContext(); return c.newPage(); };
const boss = await mk();
await boss.goto(BASE); await boss.fill('#lg-login', 'boss'); await boss.fill('#lg-pass', 'password123'); await boss.click('#login-form button'); await boss.waitForSelector('#nav a');
const mkUser = (login, role) => boss.evaluate(async ([l, r]) => (await fetch('/api/users', { method: 'POST', headers: { 'content-type': 'application/json', 'x-requested-with': 'fetch' }, body: JSON.stringify({ login: l, name: l, role: r, password: 'password123' }) })).status, [login, role]);
console.log('create', await mkUser('omborchi', 'storekeeper'), await mkUser('prorab', 'foreman'), await mkUser('hisobchi', 'accountant'));
for (const [login, expectNav] of [['omborchi', 2], ['prorab', 3], ['hisobchi', 13]]) {
  const p = await mk(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(BASE); await p.fill('#lg-login', login); await p.fill('#lg-pass', 'password123'); await p.click('#login-form button'); await p.waitForSelector('#nav a');
  const n = await p.locator('#nav a').count();
  const texts = await p.locator('#nav a').allTextContents();
  console.log(login, n === expectNav ? 'OK' : 'FAIL', n, texts.join(' | '));
  // taqiqlangan sahifaga o'tish
  await p.goto(BASE + '/#cash'); await p.waitForTimeout(300);
  const h = await p.textContent('#head h1');
  console.log('  #cash ->', h);
  if (login === 'prorab') { await p.goto(BASE + '/#objects'); await p.waitForTimeout(300); console.log('  prorab +Объект tugmasi:', await p.locator('[data-act="new"][data-t="objects"]').count()); }
  if (errs.length) console.log('  ERR', errs);
}
await b.close();
