import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import compress from '@fastify/compress';
import rateLimit from '@fastify/rate-limit';
import fstatic from '@fastify/static';
import bcrypt from 'bcryptjs';
import { existsSync } from 'node:fs';
import { z } from 'zod';
import type { Pool } from 'pg';
import { config } from './config.js';
import { authenticate, createSession, destroySession, hashPassword, newId, setCookie } from './auth.js';
import { ENTITIES, ROLES, VIEWS_BY_ROLE, type Role } from './entities.js';
import { applySync, loadState, SyncError, syncBody } from './sync.js';

const DUMMY_HASH = bcrypt.hashSync('dummy-password', 12);

export async function buildApp(pool: Pool, opts: { logger?: boolean } = {}) {
  const app = Fastify({ logger: opts.logger ?? false, bodyLimit: 30 * 1024 * 1024, trustProxy: true });
  await app.register(cookie);
  await app.register(compress, { global: true });
  await app.register(rateLimit, { global: false });

  app.addHook('onSend', async (_req, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Referrer-Policy', 'same-origin');
    reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    reply.header('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
    if (config.cookieSecure) reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  });

  // CSRF: o'zgartiruvchi so'rovlar faqat bizning klientdan
  app.addHook('preHandler', async (req, reply) => {
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.url.startsWith('/api/') && req.headers['x-requested-with'] !== 'fetch') {
      return reply.code(403).send({ error: 'Taqiqlangan so\'rov' });
    }
  });

  const needUser = async (req: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => {
    const u = await authenticate(pool, req);
    if (!u) return reply.code(401).send({ error: 'Kirish talab qilinadi' });
    req.user = u;
  };
  const needOwner = async (req: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => {
    await needUser(req, reply);
    if (reply.sent) return;
    if (req.user!.role !== 'owner') return reply.code(403).send({ error: 'Faqat egasi uchun' });
  };

  const perms = (role: Role) => ({
    read: ENTITIES.filter((e) => e.read.includes(role)).map((e) => e.name),
    write: ENTITIES.filter((e) => e.write.includes(role)).map((e) => e.name),
    views: VIEWS_BY_ROLE[role],
  });

  app.get('/api/health', async () => {
    await pool.query('SELECT 1');
    return { ok: true };
  });

  app.post('/api/login', { config: { rateLimit: { max: config.loginRate, timeWindow: '1 minute' } } }, async (req, reply) => {
    const b = z.object({ login: z.string().min(1).max(100), password: z.string().min(1).max(200) }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: 'Login va parolni kiriting' });
    const r = await pool.query('SELECT id,login,name,role,pass_hash,active FROM users WHERE login=$1', [b.data.login.trim().toLowerCase()]);
    const u = r.rows[0];
    const ok = await bcrypt.compare(b.data.password, u ? u.pass_hash : DUMMY_HASH);
    if (!u || !ok || !u.active) return reply.code(401).send({ error: 'Login yoki parol noto\'g\'ri' });
    setCookie(reply, await createSession(pool, u.id));
    return { user: { id: u.id, login: u.login, name: u.name, role: u.role }, perms: perms(u.role) };
  });

  app.post('/api/logout', async (req, reply) => {
    await destroySession(pool, req.cookies?.sid);
    reply.clearCookie('sid', { path: '/' });
    return { ok: true };
  });

  app.get('/api/me', { preHandler: needUser }, async (req) => ({ user: req.user, perms: perms(req.user!.role) }));

  app.post('/api/me/password', { preHandler: needUser, config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (req, reply) => {
    const b = z.object({ old: z.string().min(1).max(200), next: z.string().min(8).max(200) }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: 'Yangi parol kamida 8 belgi bo\'lsin' });
    const r = await pool.query('SELECT pass_hash FROM users WHERE id=$1', [req.user!.id]);
    if (!(await bcrypt.compare(b.data.old, r.rows[0].pass_hash))) return reply.code(400).send({ error: 'Eski parol noto\'g\'ri' });
    await pool.query('UPDATE users SET pass_hash=$1 WHERE id=$2', [await hashPassword(b.data.next), req.user!.id]);
    return { ok: true };
  });

  app.get('/api/state', { preHandler: needUser }, async (req) => loadState(pool, req.user!.role));
  app.get('/api/rev', { preHandler: needUser }, async () => {
    const r = await pool.query("SELECT val FROM meta WHERE key='rev'");
    return { rev: r.rows[0].val };
  });

  app.post('/api/sync', { preHandler: needUser }, async (req, reply) => {
    const b = syncBody.safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: 'Noto\'g\'ri so\'rov' });
    try {
      const rev = await applySync(pool, req.user!.id, req.user!.role, b.data);
      return { ok: true, rev };
    } catch (e) {
      if (e instanceof SyncError) return reply.code(e.status).send({ error: e.message });
      throw e;
    }
  });

  // --- foydalanuvchilar (faqat egasi) ---
  app.get('/api/users', { preHandler: needOwner }, async () => {
    const r = await pool.query('SELECT id,login,name,role,active FROM users ORDER BY created_at');
    return { users: r.rows };
  });
  const userBody = z.object({
    login: z.string().min(3).max(40).regex(/^[a-z0-9._-]+$/i),
    name: z.string().min(1).max(100),
    role: z.enum(ROLES as [Role, ...Role[]]),
    password: z.string().min(8).max(200),
  });
  app.post('/api/users', { preHandler: needOwner }, async (req, reply) => {
    const b = userBody.safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: 'Login (lotin harf/raqam), ism, rol va kamida 8 belgili parol kerak' });
    try {
      await pool.query('INSERT INTO users(id,login,name,pass_hash,role) VALUES ($1,$2,$3,$4,$5)', [newId(), b.data.login.toLowerCase(), b.data.name, await hashPassword(b.data.password), b.data.role]);
    } catch (e) {
      if ((e as { code?: string }).code === '23505') return reply.code(409).send({ error: 'Bunday login mavjud' });
      throw e;
    }
    return { ok: true };
  });
  app.patch('/api/users/:id', { preHandler: needOwner }, async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const b = z.object({ name: z.string().min(1).max(100).optional(), role: z.enum(ROLES as [Role, ...Role[]]).optional(), active: z.boolean().optional(), password: z.string().min(8).max(200).optional() }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: 'Noto\'g\'ri so\'rov' });
    const cur = await pool.query('SELECT id,role,active FROM users WHERE id=$1', [id]);
    if (!cur.rowCount) return reply.code(404).send({ error: 'Topilmadi' });
    const willOwner = (b.data.role ?? cur.rows[0].role) === 'owner' && (b.data.active ?? cur.rows[0].active);
    if (!willOwner && cur.rows[0].role === 'owner' && cur.rows[0].active) {
      const n = await pool.query("SELECT count(*)::int AS n FROM users WHERE role='owner' AND active AND id<>$1", [id]);
      if (n.rows[0].n === 0) return reply.code(400).send({ error: 'Kamida bitta faol egasi qolishi kerak' });
    }
    if (b.data.name != null) await pool.query('UPDATE users SET name=$1 WHERE id=$2', [b.data.name, id]);
    if (b.data.role != null) await pool.query('UPDATE users SET role=$1 WHERE id=$2', [b.data.role, id]);
    if (b.data.active != null) {
      await pool.query('UPDATE users SET active=$1 WHERE id=$2', [b.data.active, id]);
      if (!b.data.active) await pool.query('DELETE FROM sessions WHERE user_id=$1', [id]);
    }
    if (b.data.password != null) {
      await pool.query('UPDATE users SET pass_hash=$1 WHERE id=$2', [await hashPassword(b.data.password), id]);
      await pool.query('DELETE FROM sessions WHERE user_id=$1 AND true', [id]);
    }
    return { ok: true };
  });

  app.setErrorHandler((err, _req, reply) => {
    const code = (err as { statusCode?: number }).statusCode;
    if (code && code >= 400 && code < 500) {
      return reply.code(code).send({ error: code === 429 ? 'Juda ko\'p urinish. Bir daqiqadan keyin qayta urining.' : 'Noto\'g\'ri so\'rov' });
    }
    app.log.error(err);
    reply.code(500).send({ error: 'Server xatosi' });
  });

  // --- statik frontend ---
  if (existsSync(config.webDir)) {
    await app.register(fstatic, { root: config.webDir, wildcard: false, setHeaders: (res, path) => {
      if (/\/assets\//.test(path)) res.header('Cache-Control', 'public, max-age=31536000, immutable');
      else res.header('Cache-Control', 'no-cache');
    } });
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith('/api/')) return reply.code(404).send({ error: 'Topilmadi' });
      return reply.sendFile('index.html');
    });
  }
  return app;
}
