# Асмарт-Триумф Қурилиш

TRIUMF ENGINEERING uchun qurilish boshqaruvi dasturi: obyektlar, ish rejasi, brigadalar, bajarilgan hajm bo'yicha ish haqi, ombor, yetkazib beruvchilar qarzi, mehnat shartnomalari va buyurtmachi hisobotlari.

## Tuzilishi
- `server/` — Fastify + TypeScript + PostgreSQL (`pg`), sessiya orqali kirish, rollar
- `web/` — Vite + vanilla JS
- `deploy/` — `nginx-triumf.conf` (nginx uchun), `docker-compose.yml` — db, app, kunlik zaxira
- `e2e/` — Playwright tekshiruvlari

## Rollar
owner (direktor), accountant (hisobchi), storekeeper (omborchi), foreman (prorab).

## Mahalliy ishga tushirish
```
cd server && npm i && DATABASE_URL=postgres://... ADMIN_LOGIN=boss ADMIN_PASSWORD=... npm run dev
cd web && npm i && npm run dev
```
Testlar: `cd server && npm test`.

## Serverga joylash
1. Subdomen A yozuvini server IP'siga yo'naltiring.
2. `cp .env.example .env` va `POSTGRES_PASSWORD`, `ADMIN_*` ni to'ldiring (kuchli parol!).
3. `docker compose up -d --build` — ilova `127.0.0.1:3010` da ishlaydi.
4. `deploy/nginx-triumf.conf` ni `/etc/nginx/conf.d/` ga qo'ying, `nginx -t && systemctl reload nginx`, so'ng `certbot --nginx -d <subdomen>`.
5. Zaxira nusxalar `./backups` ichida (14 kun).
6. Avtomatik joylash: GitHub Secrets — `SSH_HOST`, `SSH_USER`, `SSH_KEY`, `APP_DIR`.
