const bool = (v: string | undefined, d: boolean) => (v == null ? d : /^(1|true|yes)$/i.test(v));
export const config = {
  port: Number(process.env.PORT || 3000),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres@localhost:5432/triumf',
  cookieSecure: bool(process.env.COOKIE_SECURE, process.env.NODE_ENV === 'production'),
  loginRate: Number(process.env.LOGIN_RATE || 10),
  sessionDays: Number(process.env.SESSION_DAYS || 30),
  adminLogin: process.env.ADMIN_LOGIN || '',
  adminPassword: process.env.ADMIN_PASSWORD || '',
  adminName: process.env.ADMIN_NAME || 'Direktor',
  webDir: process.env.WEB_DIR || new URL('../../web/dist', import.meta.url).pathname,
};
