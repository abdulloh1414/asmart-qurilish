import type { Pool, PoolClient } from 'pg';
import { z } from 'zod';
import { BY_NAME, ENTITIES, ORDER, type Col, type Ent, type Role } from './entities.js';

const q = (s: string) => '"' + s + '"';

export function rowSchema(e: Ent) {
  const shape: Record<string, z.ZodTypeAny> = { id: z.string().min(1).max(40).regex(/^[A-Za-z0-9_-]+$/) };
  for (const c of e.cols) {
    let s: z.ZodTypeAny;
    if (c.t === 'num') s = z.preprocess((v) => (v == null || v === '' ? 0 : v), z.number().finite().min(-1e15).max(1e15));
    else if (c.t === 'date') s = c.req ? z.string().regex(/^\d{4}-\d{2}-\d{2}$/) : z.union([z.literal(''), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]);
    else if (c.oneOf) s = z.enum(c.oneOf as [string, ...string[]]);
    else s = z.string().max(c.ref ? 40 : 2000);
    if (c.t === 'text' && c.req && !c.oneOf) s = (s as z.ZodString).min(1);
    shape[c.k] = c.req || c.t === 'num' ? s : s.optional().default(c.t === 'date' || c.ref ? '' : c.oneOf ? c.oneOf[0] : '');
  }
  return z.object(shape).strip();
}
const SCHEMAS = Object.fromEntries(ENTITIES.map((e) => [e.name, rowSchema(e)]));

export const syncBody = z.object({
  upserts: z.record(z.string(), z.array(z.unknown())).default({}),
  deletes: z.record(z.string(), z.array(z.string())).default({}),
});

export class SyncError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

const pgType = (c: Col) => 'text';
function castExpr(c: Col) {
  const x = `x.${q(c.k)}`;
  if (c.t === 'num') return `COALESCE(NULLIF(${x},'')::numeric,0)`;
  if (c.t === 'date' || c.ref) return c.req ? `${x}` : `NULLIF(${x},'')` + (c.t === 'date' ? '::date' : '');
  return x;
}
function upsertSql(e: Ent) {
  const cols = e.cols;
  const rec = ['id text', ...cols.map((c) => `${q(c.k)} ${pgType(c)}`)].join(', ');
  const names = ['id', ...cols.map((c) => q(c.c))].join(', ');
  const sel = ['x.id', ...cols.map((c) => (c.t === 'date' && c.req ? `${q('x')}.${q(c.k)}::date` : castExpr(c)))].join(', ');
  const upd = cols.map((c) => `${q(c.c)}=EXCLUDED.${q(c.c)}`).join(', ');
  return `INSERT INTO ${q(e.name)} (${names}) SELECT ${sel} FROM jsonb_to_recordset($1::jsonb) AS x(${rec}) ON CONFLICT (id) DO UPDATE SET ${upd}`;
}
const UPSERT = Object.fromEntries(ENTITIES.map((e) => [e.name, upsertSql(e)]));

export const selectSql = (e: Ent) => `SELECT id, ${e.cols.map((c) => `${q(c.c)} AS ${q(c.k)}`).join(', ')} FROM ${q(e.name)}`;

export function normalizeRow(e: Ent, r: Record<string, unknown>) {
  const o: Record<string, unknown> = { id: r.id };
  for (const c of e.cols) {
    const v = r[c.k];
    o[c.k] = v == null ? (c.t === 'num' ? 0 : '') : v;
  }
  return o;
}

export async function loadState(pool: Pool, role: Role) {
  const data: Record<string, unknown[]> = {};
  const rev = await pool.query("SELECT val FROM meta WHERE key='rev'");
  for (const e of ENTITIES) {
    if (!e.read.includes(role)) continue;
    const r = await pool.query(selectSql(e) + ' ORDER BY id');
    data[e.name] = r.rows.map((x) => normalizeRow(e, x));
  }
  return { rev: rev.rows[0].val as number, data };
}

export async function applySync(pool: Pool, userId: string, role: Role, body: z.infer<typeof syncBody>) {
  for (const name of [...Object.keys(body.upserts), ...Object.keys(body.deletes)]) {
    const e = BY_NAME[name];
    if (!e) throw new SyncError(400, `Noma'lum jadval: ${name}`);
    if (!e.write.includes(role)) throw new SyncError(403, `«${name}» bo'yicha o'zgartirish huquqi yo'q`);
  }
  const client: PoolClient = await pool.connect();
  try {
    await client.query('BEGIN');
    const touched: { entity: string; up: number; del: number; ids: string[] }[] = [];
    for (const name of ORDER) {
      const e = BY_NAME[name];
      const rows = (body.upserts[name] || []) as unknown[];
      const dels = body.deletes[name] || [];
      if (!rows.length && !dels.length) continue;
      const parsed: unknown[] = [];
      for (const r of rows) {
        const p = SCHEMAS[name].safeParse(r);
        if (!p.success) {
          const iss = p.error.issues[0];
          throw new SyncError(400, `«${name}»: noto'g'ri qiymat (${iss.path.join('.') || 'qator'})`);
        }
        parsed.push(p.data);
      }
      for (let i = 0; i < parsed.length; i += 2000) {
        await client.query(UPSERT[name], [JSON.stringify(parsed.slice(i, i + 2000))]);
      }
      for (let i = 0; i < dels.length; i += 5000) {
        await client.query(`DELETE FROM ${q(name)} WHERE id = ANY($1::text[])`, [dels.slice(i, i + 5000)]);
      }
      touched.push({ entity: name, up: parsed.length, del: dels.length, ids: [...parsed.map((p) => (p as { id: string }).id), ...dels].slice(0, 30) });
    }
    await client.query('SET CONSTRAINTS ALL IMMEDIATE');
    for (const t of touched) {
      await client.query('INSERT INTO audit(user_id,entity,upserts,deletes,ids) VALUES ($1,$2,$3,$4,$5)', [userId, t.entity, t.up, t.del, t.ids]);
    }
    const rev = await client.query("UPDATE meta SET val=val+1 WHERE key='rev' RETURNING val");
    await client.query('COMMIT');
    return rev.rows[0].val as number;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    const code = (err as { code?: string }).code;
    if (code === '23503') throw new SyncError(409, 'Бу ёзув бошқа маълумотларга боғланган. Аввал боғланган ёзувларни ўчиринг.');
    if (code && code.startsWith('22')) throw new SyncError(400, 'Нотўғри қиймат киритилган.');
    if (code === '23505') throw new SyncError(409, 'Бундай ёзув аллақачон мавжуд.');
    throw err;
  } finally {
    client.release();
  }
}
