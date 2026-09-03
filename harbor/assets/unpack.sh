#!/usr/bin/env bash
# Materialize Adam's approved harbor sprites into public/harbor/, then drop this payload.
set -euo pipefail
cd "$(dirname "$0")/../.."
mkdir -p public/harbor
cat harbor/assets/sprites.b64.* | tr -d '\n' | base64 -d > /tmp/harbor-sprites.tgz
test "$(md5sum /tmp/harbor-sprites.tgz | cut -d' ' -f1)" = "63105e6e5a72e6b47c8a0380e84dfb36"
tar xzf /tmp/harbor-sprites.tgz -C public/harbor
rm -rf harbor/assets
ls -la public/harbor
