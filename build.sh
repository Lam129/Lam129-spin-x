#!/bin/sh
# Inlines src/*.js into index.html -> dist/index.html
set -e
cd "$(dirname "$0")"
mkdir -p dist
cat src/data.js src/store.js src/audio.js src/models.js src/arena.js src/avatar.js src/rig.js src/beasts.js src/fx.js src/scene.js src/battle.js src/online.js src/ui.js > dist/game.js
node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const j=fs.readFileSync('dist/game.js','utf8');fs.writeFileSync('dist/index.html',h.replace('/*__GAME__*/',()=>j));"
node --check dist/game.js
echo built $(wc -c < dist/index.html) bytes
