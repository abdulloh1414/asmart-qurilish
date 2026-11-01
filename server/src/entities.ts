export type Role = 'owner' | 'accountant' | 'storekeeper' | 'foreman';
export const ROLES: Role[] = ['owner', 'accountant', 'storekeeper', 'foreman'];

export type Col = {
  k: string; // JSON kalit (frontend bilan bir xil)
  c: string; // SQL ustun
  t: 'text' | 'num' | 'date';
  req?: boolean; // bo'sh bo'lishi mumkin emas
  oneOf?: string[];
  ref?: string; // bog'langan jadval
  max?: number;
};
export type Ent = { name: string; cols: Col[]; read: Role[]; write: Role[] };

const T = (k: string, o: Partial<Col> = {}): Col => ({ k, c: k, t: 'text', ...o });
const N = (k: string, o: Partial<Col> = {}): Col => ({ k, c: k, t: 'num', ...o });
const D = (k: string, c = k, o: Partial<Col> = {}): Col => ({ k, c, t: 'date', ...o });
const R = (k: string, c: string, ref: string, req = false): Col => ({ k, c, t: 'text', ref, req });
const ALL: Role[] = ['owner', 'accountant', 'storekeeper', 'foreman'];
const OA: Role[] = ['owner', 'accountant'];

const camelToSnake = (s: string) => s.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase());
const fix = (c: Col) => (c.c === c.k ? { ...c, c: camelToSnake(c.k) } : c);

export const ENTITIES: Ent[] = ([
  { name: 'clients', read: OA, write: OA, cols: [T('name', { req: true }), T('address'), T('bank'), T('account'), T('mfo'), T('inn'), T('oked'), T('head'), T('contractNo'), D('contractDate'), N('contractSum'), T('vatIncl', { oneOf: ['yes', 'no'] })] },
  { name: 'objects', read: ALL, write: OA, cols: [T('name', { req: true }), T('address'), T('client'), R('clientId', 'client_id', 'clients'), N('budget'), T('status', { oneOf: ['active', 'paused', 'done'] }), D('start', 'start_date'), D('end', 'end_date')] },
  { name: 'works', read: ALL, write: ['owner'], cols: [T('name', { req: true }), T('unit', { req: true }), N('rate')] },
  { name: 'brigades', read: ['owner', 'accountant', 'foreman'], write: OA, cols: [T('name', { req: true }), T('leader'), T('phone'), R('workId', 'work_id', 'works'), N('rate'), T('active', { oneOf: ['yes', 'no'] })] },
  { name: 'plan', read: ['owner', 'accountant', 'foreman'], write: OA, cols: [R('objectId', 'object_id', 'objects', true), R('workId', 'work_id', 'works', true), N('qty'), N('price'), T('matBy', { oneOf: ['', 'customer', 'contractor'] })] },
  { name: 'logs', read: ['owner', 'accountant', 'foreman'], write: ['owner', 'accountant', 'foreman'], cols: [D('date', 'date', { req: true }), R('brigadeId', 'brigade_id', 'brigades', true), R('objectId', 'object_id', 'objects', true), R('workId', 'work_id', 'works', true), N('qty'), N('rate'), T('zone')] },
  { name: 'materials', read: ALL, write: ['owner', 'accountant', 'storekeeper'], cols: [T('name', { req: true }), T('unit', { req: true }), N('min'), N('price')] },
  { name: 'suppliers', read: ['owner', 'accountant', 'storekeeper'], write: ['owner', 'accountant', 'storekeeper'], cols: [T('name', { req: true }), T('phone'), T('note')] },
  { name: 'moves', read: ALL, write: ['owner', 'accountant', 'storekeeper'], cols: [T('type', { req: true, oneOf: ['in', 'out'] }), D('date', 'date', { req: true }), R('materialId', 'material_id', 'materials', true), N('qty'), N('price'), R('objectId', 'object_id', 'objects'), R('brigadeId', 'brigade_id', 'brigades'), T('receiver'), T('supplier'), R('supplierId', 'supplier_id', 'suppliers'), T('note')] },
  { name: 'cash', read: OA, write: OA, cols: [D('date', 'date', { req: true }), T('type', { req: true, oneOf: ['in', 'out'] }), T('cat', { req: true, oneOf: ['client', 'other', 'material', 'supplier', 'advance', 'wage', 'equip', 'transport', 'sub'] }), N('amount'), R('objectId', 'object_id', 'objects'), R('brigadeId', 'brigade_id', 'brigades'), R('workId', 'work_id', 'works'), R('supplierId', 'supplier_id', 'suppliers'), T('note')] },
  { name: 'debts', read: OA, write: OA, cols: [T('kind', { req: true, oneOf: ['owe', 'owed'] }), T('party', { req: true }), N('amount'), N('paid'), D('due'), R('objectId', 'object_id', 'objects'), T('note')] },
  { name: 'contracts', read: OA, write: OA, cols: [T('no', { req: true }), D('date', 'date', { req: true }), T('fio', { req: true }), T('passport'), D('passDate', 'pass_date'), T('passBy', { c: 'pass_by' }), T('pinfl'), T('phone'), T('address'), T('card'), T('bank'), T('position'), R('objectId', 'object_id', 'objects'), T('objAddr', { c: 'obj_addr' }), T('place'), T('termType', { c: 'term_type', oneOf: ['open', 'fixed'] }), D('hireDate', 'hire_date'), D('from', 'term_from'), D('to', 'term_to'), T('payNote', { c: 'pay_note' })] },
] as Ent[]).map((e) => ({ ...e, cols: e.cols.map(fix) }));

export const BY_NAME: Record<string, Ent> = Object.fromEntries(ENTITIES.map((e) => [e.name, e]));
// Jadvallar tartibi: ota jadvallar oldin
export const ORDER = ENTITIES.map((e) => e.name);

// Rolga ko'ra ko'rinadigan sahifalar
export const VIEWS_BY_ROLE: Record<Role, string[]> = {
  owner: ['dashboard', 'objects', 'plan', 'brigades', 'logs', 'payroll', 'stock', 'suppliers', 'acts', 'contracts', 'cash', 'debts', 'reports', 'users', 'history'],
  accountant: ['dashboard', 'objects', 'plan', 'brigades', 'logs', 'payroll', 'stock', 'suppliers', 'acts', 'contracts', 'cash', 'debts', 'reports'],
  storekeeper: ['stock', 'suppliers'],
  foreman: ['objects', 'plan', 'logs'],
};
