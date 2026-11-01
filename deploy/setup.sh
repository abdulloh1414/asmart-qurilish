#!/usr/bin/env bash
# Serverda bir marta ishga tushiriladi: bash deploy/setup.sh
set -euo pipefail
DOMAIN="${DOMAIN:-triumf.asmart.uz}"
SERVER_IP="${SERVER_IP:-189.74.97.69}"
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  PG=$(openssl rand -hex 16)
  ADMIN_PW=$(openssl rand -base64 12 | tr -d '/+=' | cut -c1-14)
  cat > .env <<EOF
POSTGRES_PASSWORD=$PG
ADMIN_LOGIN=boss
ADMIN_PASSWORD=$ADMIN_PW
ADMIN_NAME=Direktor
EOF
  chmod 600 .env
  echo ">>> .env yaratildi. Kirish: boss / $ADMIN_PW   (shuni saqlab qo'ying)"
else
  echo ">>> .env mavjud, o'zgartirilmadi"
fi

echo ">>> Ilova qurilmoqda (bir necha daqiqa)..."
docker compose up -d --build
for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3010/api/health >/dev/null 2>&1; then echo ">>> Ilova ishlayapti"; break; fi
  sleep 2
  [ "$i" = 30 ] && { echo "XATO: ilova ishga tushmadi"; docker compose logs --tail 40 app; exit 1; }
done

echo ">>> nginx sozlanmoqda"
sed "s/triumf.asmart.uz/$DOMAIN/" deploy/nginx-triumf.conf > /etc/nginx/conf.d/triumf.conf
nginx -t
systemctl reload nginx

RESOLVED=$(getent hosts "$DOMAIN" | awk '{print $1}' | head -1 || true)
if [ "$RESOLVED" != "$SERVER_IP" ]; then
  echo "DIQQAT: $DOMAIN hozir '$RESOLVED' ga ishora qilyapti, kutilgan: $SERVER_IP."
  echo "DNS tarqalgach quyidagini ishga tushiring: certbot --nginx -d $DOMAIN"
  exit 0
fi

command -v certbot >/dev/null || { apt-get update -qq && apt-get install -y -qq certbot python3-certbot-nginx; }
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect
echo ">>> TAYYOR: https://$DOMAIN"
