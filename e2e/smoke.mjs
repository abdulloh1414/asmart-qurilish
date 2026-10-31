import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
import { readdirSync } from 'node:fs';
const BASE = process.env.BASE || 'http://localhost:3100';
const dir = '/mnt/user-data/attachments/b30fb89a-4974-508a-9828-6a77d7724a79/';
const fx = readdirSync(dir).filter((f) => f.endsWith('.xlsx'));
const pick = (s) => dir + fx.find((f) => f.includes(s));
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERR ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/401/.test(m.text())) errors.push('CONSOLE ' + m.text()); });
const ok = (c, msg) => { console.log((c ? 'OK   ' : 'FAIL ') + msg); if (!c) process.exitCode = 1; };

await page.goto(BASE);
await page.waitForSelector('#login:not([hidden])');
await page.fill('#lg-login', 'boss'); await page.fill('#lg-pass', 'wrong'); await page.click('#login-form button');
await page.waitForFunction(() => document.querySelector('#lg-err').textContent.length > 0);
ok(true, 'noto\'g\'ri parol xato ko\'rsatdi');
await page.fill('#lg-pass', 'password123'); await page.click('#login-form button');
await page.waitForSelector('#app:not([hidden])');
await page.waitForSelector('#nav a');
const navCount = await page.locator('#nav a').count();
ok(navCount === 14, 'owner 14 bo\'lim ko\'radi: ' + navCount);

// objekt qo'shish
await page.goto(BASE + '/#objects');
await page.click('[data-act="new"][data-t="objects"]');
await page.fill('#f_name', '35-дом'); await page.click('.sheet .btn.primary');
await page.waitForFunction(() => document.querySelector('#sync span').textContent === 'Сақланган');
ok((await page.textContent('#view')).includes('35-дом'), 'obyekt qo\'shildi');

// Excel import (stock)
await page.goto(BASE + '/#stock');
const importFile = async (path) => {
  await page.setInputFiles('#xl', path);
  await page.waitForSelector('.sheet [data-yes]', { timeout: 20000 });
  console.log('   dialog:', (await page.textContent('.sheet p')).slice(0, 160));
  await page.click('.sheet [data-yes]');
  await page.waitForFunction(() => document.querySelector('#sync span').textContent === 'Сақланган', null, { timeout: 60000 });
  await page.waitForTimeout(500);
  const dlg = page.locator('.sheet [data-close]');
  if (await dlg.count()) await dlg.first().click();
};
await importFile(pick('TRIUMF'));
await importFile(pick('2026_2'));
const st = await page.evaluate(async () => (await (await fetch('/api/state')).json()));
const n = Object.fromEntries(Object.entries(st.data).map(([k, v]) => [k, v.length]));
console.log('   server counts', JSON.stringify(n));
ok(n.moves > 20000 && n.materials > 1000 && n.brigades >= 10 && n.suppliers >= 10, 'import serverga yozildi');

// qayta yuklash — ma'lumot saqlanganmi
await page.reload(); await page.waitForSelector('#nav a');
await page.goto(BASE + '/#suppliers'); await page.waitForTimeout(500);
ok((await page.textContent('#view')).length > 300, 'qayta yuklangandan keyin etkazuvchilar ko\'rinadi');

// barcha bo'limlar xatosiz
for (const v of ['dashboard', 'objects', 'plan', 'brigades', 'logs', 'payroll', 'stock', 'suppliers', 'acts', 'contracts', 'cash', 'debts', 'reports', 'users']) {
  await page.goto(BASE + '/#' + v); await page.waitForTimeout(250);
  const html = await page.textContent('#view');
  ok(!/undefined|NaN/.test(html) && html.length > 20, 'bo\'lim: ' + v);
}
// shartnoma yaratish + Word yuklash
await page.goto(BASE + '/#contracts');
await page.click('[data-act="new"][data-t="contracts"]');
await page.fill('#f_fio', 'Karimov Aziz'); await page.fill('#f_position', 'Kafelchi'); await page.click('.sheet .btn.primary');
await page.waitForSelector('[data-act="ct-view"]');
await page.click('[data-act="ct-view"]');
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), page.click('[data-word]')]);
ok(/\.docx$/.test(dl.suggestedFilename()), 'Word fayl yuklandi: ' + dl.suggestedFilename());
await dl.saveAs('/tmp/e2e-contract.docx');
await page.keyboard.press('Escape');
// akt Excel
await page.goto(BASE + '/#acts');
const [dl2] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), page.click('[data-act="act-xls"][data-id="all"]')]);
ok(/\.xlsx$/.test(dl2.suggestedFilename()), 'Excel yuklandi: ' + dl2.suggestedFilename());
await page.screenshot({ path: '/tmp/e2e-acts.png' });

ok(errors.length === 0, 'brauzer xatolari yo\'q ' + errors.slice(0, 3).join(' | '));
await browser.close();
