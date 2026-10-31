#!/bin/sh
set -eu
cd "$(dirname "$0")"
git init
git branch -M main
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/ism46999937/Eurovision-Hub.git
git add .
git commit -m 'Publicar Eurovision Hub' || true
git push -u origin main
