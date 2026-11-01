#!/usr/bin/env bash
# Serverda yangilash: bash /opt/asmart/deploy/update.sh
set -euo pipefail
cd "$(dirname "$0")/.."
git pull --ff-only
docker compose up -d --build
echo ">>> Yangilandi"
