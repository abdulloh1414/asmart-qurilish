import { createHash, randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { Pool } from 'pg';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { config } from './config.js';
import type { Role } from './entities.js';

export type User = { id: string; login: string; name: string; role: Role };
declare module 'fastify' {
  interface FastifyRequest { user?: User }
}

const hash = (t: string) => createHash('sha256').update(t).digest('hex');
export const newId = () => randomUUID().replace(/-/g, '').slice(0, 12);
export const hashPassword = (p: string) => bcrypt.hash(p, 12);

export async function createSession(pool: Pool, userId: string) {
  const token = randomBytes(32).toString('base64url');
  await pool.query('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES ($1,$2, now() + ($3 || \' days\')::interval)', [hash(token), userId, String(config.sessionDays)]);
  return token;
}

export function setCookie(reply: FastifyReply, token: string) {
  reply.setCookie('sid', token, { httpOnly: true, sameSite: 'strict', secure: config.cookieSecure, path: '/', maxAge: config.sessionDays * 86400 });
}

export async function authenticate(pool: Pool, req: FastifyRequest): Promise<User | null> {
  const t = req.cookies?.sid;
  if (!t) return null;
  const r = await pool.query(
    `SELECT u.id,u.login,u.name,u.role FROM sessions s JOIN users u ON u.id=s.user_id
     WHERE s.token_hash=$1 AND s.expires_at>now() AND u.active`, [hash(t)]);
  return (r.rows[0] as User) || null;
}

export async function destroySession(pool: Pool, token: string | undefined) {
  if (token) await pool.query('DELETE FROM sessions WHERE token_hash=$1', [hash(token)]);
}

export async function ensureAdmin(pool: Pool, log: { info: (m: string) => void }) {
  const n = await pool.query('SELECT count(*)::int AS n FROM users');
  if (n.rows[0].n > 0) return;
  if (!config.adminLogin || config.adminPassword.length < 8) {
    log.info('Foydalanuvchi yo\'q. ADMIN_LOGIN va ADMIN_PASSWORD (kamida 8 belgi) bering.');
    return;
  }
  await pool.query('INSERT INTO users(id,login,name,pass_hash,role) VALUES ($1,$2,$3,$4,\'owner\')',
    [newId(), config.adminLogin.toLowerCase(), config.adminName, await hashPassword(config.adminPassword)]);
  log.info(`Birinchi egasi yaratildi: ${config.adminLogin}`);
}
