import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const b = await chromium.launch(); const p = await b.newPage();
p.on('pageerror', (e) => console.log('PAGEERR', e.message)); p.on('console', (m) => console.log('CONSOLE', m.type(), m.text())); p.on('requestfailed', (r) => console.log('REQFAIL', r.url()));
p.on('response', (r) => { if (r.status() >= 400) console.log('HTTP', r.status(), r.url()); });
await p.goto('http://localhost:3101'); await p.waitForTimeout(1500);
console.log(await p.evaluate(() => [document.querySelector('#login').hidden, document.querySelector('#app').hidden, document.body.innerText.slice(0, 80)]));
await b.close();
