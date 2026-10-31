import { buildApp } from './app.js';
import { config } from './config.js';
import { ensureAdmin } from './auth.js';
import { makePool, migrate } from './db.js';

const pool = makePool();
await migrate(pool);
const app = await buildApp(pool, { logger: true });
await ensureAdmin(pool, app.log);
await app.listen({ port: config.port, host: '0.0.0.0' });
const stop = async () => { await app.close(); await pool.end(); process.exit(0); };
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
