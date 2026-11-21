# 旋鋒對決 X-DRIVE

原創 3D 競技陀螺對戰網頁遊戲（Three.js）。組裝鋒輪・鎖芯・旋尖（46 種零件），拉繩發射，在 8 座不同的戰鬥盤挑戰 8 位 AI 對手，用金幣扭蛋收集零件，每把鋒輪都有專屬必殺技與電影化演出。

所有陀螺、零件、角色、頭像、招式名稱、圖騰、戰鬥盤與遊戲用語皆為原創設計。

## 專案結構

| 路徑 | 內容 |
|---|---|
| `index.html` | 頁面骨架、樣式與 UI 標記（遊戲程式於建置時嵌入） |
| `src/data.js` | 零件、對手、戰鬥盤、必殺技、計分規則資料 |
| `src/avatar.js` | 原創對手與玩家頭像（程式繪製 SVG） |
| `src/arena.js` | 對戰物理（純邏輯，可在 Node 中模擬） |
| `src/models.js` | 3D 零件：載入 Blender 模型，失敗時改用程式建模 |
| `src/fx.js` | 特效：撞擊、拖尾、氣焰、護盾、必殺技、後製 |
| `src/scene.js` | 渲染器、展示台與對戰盤場景 |
| `src/battle.js` | 對戰流程、發射器、必殺技觸發 |
| `src/ui.js` | 畫面切換、組裝、扭蛋、圖鑑、啟動 |
| `src/store.js` / `src/audio.js` | 存檔（claude.ai 帳號或本機）與合成音效 |
| `blender/build_parts.py` | 用 Blender (bpy) 程式化建模所有零件，輸出 GLB |
| `blender/pack.js` | 把 GLB 量化打包成 `assets/parts_{blade,ratchet,bit}.txt`（base64）+ `assets/parts.json` |
| `dist/index.html` | 建置後的單一頁面 |

## 建置

```bash
./build.sh
```

重新產生模型（需要 `pip install bpy`，Python 3.13）：

```bash
python blender/build_parts.py
node blender/pack.js
```

發布時 `dist/index.html` 與 `assets/parts_*.txt`、`assets/parts.json` 需放在同一層（頁面會用相對路徑載入 `assets/`）。

## 授權說明

- 倒數語音 `assets/voice/*.mp3`：使用開源 Piper TTS 引擎與 `en_US-joe-medium` 語音模型（訓練資料為 CC0）生成，再經 ffmpeg 音效處理。
- Three.js：MIT 授權。字型：Google Fonts（SIL Open Font License）。
