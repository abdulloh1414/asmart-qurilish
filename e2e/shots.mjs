import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const BASE = process.env.BASE || 'http://localhost:3100';
const out = process.env.OUT || '/tmp/shots';
import { mkdirSync } from 'node:fs'; mkdirSync(out, { recursive: true });
const views = (process.env.VIEWS || 'login,dashboard,payroll,stock,acts,contracts').split(',');
const w = Number(process.env.W || 1360);
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: w, height: 900 } });
const p = await c.newPage();
await p.goto(BASE); await p.waitForSelector('#login:not([hidden])');
if (views.includes('login')) await p.screenshot({ path: `${out}/login-${w}.png` });
await p.fill('#lg-login', 'boss'); await p.fill('#lg-pass', 'password123'); await p.click('#login-form button'); await p.waitForSelector('#nav a');
for (const v of views.filter((x) => x !== 'login')) { await p.goto(BASE + '#' + v); await p.waitForTimeout(500); await p.screenshot({ path: `${out}/${v}-${w}.png` }); }
await b.close();
