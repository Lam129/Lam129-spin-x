# 陀螺對決 公開版後端

Cloudflare Workers + D1（SQLite）+ Durable Objects，全部在 Cloudflare 免費方案內。

| 功能 | 路徑 |
|---|---|
| 建立訪客帳號 | `POST /api/guest` |
| 讀取／儲存進度 | `GET` / `PUT /api/profile` |
| 生存模式排行榜 | `GET` / `POST /api/leaderboard` |
| 線上對戰房間 | `POST /api/rooms`、WebSocket `GET /api/rooms/:code` |

**流量保護**：每個 IP 每分鐘最多 90 次請求，每天最多 8 萬次寫入（都可在 `wrangler.toml` 調整）。超過時回傳 503 `{"error":"busy","message":"目前流量過大，請稍後再試"}`，遊戲會顯示提示並先把進度存在玩家的電腦上。

## 第一次部署（約 10 分鐘）

1. 註冊 Cloudflare 帳號（免費）：https://dash.cloudflare.com/sign-up
2. 在電腦上安裝 Node.js 22 後執行：

```bash
cd server
npx wrangler login
npx wrangler d1 create spin-duel
```

3. 把上一步印出的 `database_id` 貼到 `wrangler.toml` 的 `database_id`。
4. 建立資料表並部署：

```bash
npx wrangler d1 execute spin-duel --remote --file schema.sql
npx wrangler deploy
```

5. 部署完成會印出網址，例如 `https://spin-duel-api.你的子網域.workers.dev`。
6. 到 GitHub 儲存庫 → Settings → Secrets and variables → Actions → Variables，新增 `SPIN_API_URL`，值填上一步的網址。
7. 到 Settings → Pages，Source 選「GitHub Actions」。之後每次推送 `main`，遊戲就會自動部署到 `https://<帳號>.github.io/<儲存庫>/`。
8. 建議把 `wrangler.toml` 的 `ALLOWED_ORIGINS` 改成你的 Pages 網址（例如 `https://lam129.github.io`），再執行一次 `npx wrangler deploy`。

## 本機測試

```bash
node --experimental-sqlite server/test.mjs
```

## 免費額度（2025 年的公開資料，實際以 Cloudflare 官網為準）

- Workers：每天 10 萬次請求
- D1：5 GB 儲存、每天 500 萬次讀取、10 萬次寫入
- Durable Objects：免費方案可用（SQLite 儲存），有每日請求上限

超過額度時 Cloudflare 會拒絕請求，遊戲一樣會顯示「目前流量過大」。如果玩家多到經常超過，Workers 付費方案是每月 5 美元起。
