-- Asmart-Triumf Qurilish: boshlang'ich sxema
CREATE TABLE users (
  id text PRIMARY KEY,
  login text NOT NULL UNIQUE,
  name text NOT NULL,
  pass_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner','accountant','storekeeper','foreman')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sessions (
  token_hash text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX sessions_user_idx ON sessions(user_id);
CREATE TABLE meta (key text PRIMARY KEY, val bigint NOT NULL);
INSERT INTO meta VALUES ('rev', 1);
CREATE TABLE audit (
  id bigserial PRIMARY KEY,
  at timestamptz NOT NULL DEFAULT now(),
  user_id text REFERENCES users(id) ON DELETE SET NULL,
  entity text NOT NULL,
  upserts int NOT NULL,
  deletes int NOT NULL,
  ids text[]
);

CREATE TABLE clients (
  id text PRIMARY KEY, name text NOT NULL, address text NOT NULL DEFAULT '', bank text NOT NULL DEFAULT '',
  account text NOT NULL DEFAULT '', mfo text NOT NULL DEFAULT '', inn text NOT NULL DEFAULT '', oked text NOT NULL DEFAULT '',
  head text NOT NULL DEFAULT '', contract_no text NOT NULL DEFAULT '', contract_date date, contract_sum numeric(18,2) NOT NULL DEFAULT 0,
  vat_incl text NOT NULL DEFAULT 'yes' CHECK (vat_incl IN ('yes','no'))
);
CREATE TABLE objects (
  id text PRIMARY KEY, name text NOT NULL, address text NOT NULL DEFAULT '', client text NOT NULL DEFAULT '',
  client_id text REFERENCES clients(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED,
  budget numeric(18,2) NOT NULL DEFAULT 0, status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','done')),
  start_date date, end_date date
);
CREATE TABLE works (id text PRIMARY KEY, name text NOT NULL, unit text NOT NULL DEFAULT 'м²', rate numeric(18,2) NOT NULL DEFAULT 0);
CREATE TABLE brigades (
  id text PRIMARY KEY, name text NOT NULL, leader text NOT NULL DEFAULT '', phone text NOT NULL DEFAULT '',
  work_id text REFERENCES works(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED,
  rate numeric(18,2) NOT NULL DEFAULT 0, active text NOT NULL DEFAULT 'yes' CHECK (active IN ('yes','no'))
);
CREATE TABLE plan (
  id text PRIMARY KEY,
  object_id text NOT NULL REFERENCES objects(id) DEFERRABLE INITIALLY DEFERRED,
  work_id text NOT NULL REFERENCES works(id) DEFERRABLE INITIALLY DEFERRED,
  qty numeric(18,4) NOT NULL DEFAULT 0, price numeric(18,2) NOT NULL DEFAULT 0,
  mat_by text NOT NULL DEFAULT '' CHECK (mat_by IN ('','customer','contractor')),
  UNIQUE (object_id, work_id) DEFERRABLE INITIALLY DEFERRED
);
CREATE TABLE logs (
  id text PRIMARY KEY, date date NOT NULL,
  brigade_id text NOT NULL REFERENCES brigades(id) DEFERRABLE INITIALLY DEFERRED,
  object_id text NOT NULL REFERENCES objects(id) DEFERRABLE INITIALLY DEFERRED,
  work_id text NOT NULL REFERENCES works(id) DEFERRABLE INITIALLY DEFERRED,
  qty numeric(18,4) NOT NULL DEFAULT 0, rate numeric(18,2) NOT NULL DEFAULT 0, zone text NOT NULL DEFAULT ''
);
CREATE INDEX logs_date_idx ON logs(date);
CREATE INDEX logs_brigade_idx ON logs(brigade_id);
CREATE INDEX logs_object_idx ON logs(object_id);
CREATE TABLE materials (
  id text PRIMARY KEY, name text NOT NULL, unit text NOT NULL DEFAULT 'шт',
  min numeric(18,4) NOT NULL DEFAULT 0, price numeric(18,2) NOT NULL DEFAULT 0
);
CREATE TABLE suppliers (id text PRIMARY KEY, name text NOT NULL, phone text NOT NULL DEFAULT '', note text NOT NULL DEFAULT '');
CREATE TABLE moves (
  id text PRIMARY KEY, type text NOT NULL CHECK (type IN ('in','out')), date date NOT NULL,
  material_id text NOT NULL REFERENCES materials(id) DEFERRABLE INITIALLY DEFERRED,
  qty numeric(18,4) NOT NULL DEFAULT 0, price numeric(18,2) NOT NULL DEFAULT 0,
  object_id text REFERENCES objects(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED,
  brigade_id text REFERENCES brigades(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED,
  receiver text NOT NULL DEFAULT '', supplier text NOT NULL DEFAULT '',
  supplier_id text REFERENCES suppliers(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED,
  note text NOT NULL DEFAULT ''
);
CREATE INDEX moves_material_idx ON moves(material_id);
CREATE INDEX moves_date_idx ON moves(date);
CREATE INDEX moves_object_idx ON moves(object_id);
CREATE INDEX moves_supplier_idx ON moves(supplier_id);
CREATE TABLE cash (
  id text PRIMARY KEY, date date NOT NULL, type text NOT NULL CHECK (type IN ('in','out')), cat text NOT NULL,
  amount numeric(18,2) NOT NULL DEFAULT 0,
  object_id text REFERENCES objects(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED,
  brigade_id text REFERENCES brigades(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED,
  work_id text REFERENCES works(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED,
  supplier_id text REFERENCES suppliers(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED,
  note text NOT NULL DEFAULT ''
);
CREATE INDEX cash_date_idx ON cash(date);
CREATE TABLE debts (
  id text PRIMARY KEY, kind text NOT NULL CHECK (kind IN ('owe','owed')), party text NOT NULL,
  amount numeric(18,2) NOT NULL DEFAULT 0, paid numeric(18,2) NOT NULL DEFAULT 0, due date,
  object_id text REFERENCES objects(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED, note text NOT NULL DEFAULT ''
);
CREATE TABLE contracts (
  id text PRIMARY KEY, no text NOT NULL, date date NOT NULL, fio text NOT NULL,
  passport text NOT NULL DEFAULT '', pass_date date, pass_by text NOT NULL DEFAULT '', pinfl text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '', address text NOT NULL DEFAULT '', card text NOT NULL DEFAULT '', bank text NOT NULL DEFAULT '',
  position text NOT NULL DEFAULT '',
  object_id text REFERENCES objects(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED,
  obj_addr text NOT NULL DEFAULT '', place text NOT NULL DEFAULT '',
  term_type text NOT NULL DEFAULT 'open' CHECK (term_type IN ('open','fixed')),
  hire_date date, term_from date, term_to date, pay_note text NOT NULL DEFAULT ''
);
