# AI 新聞雷達

隨時取得最新 AI 科技新聞的 App，一次彙整「產業動態、研究與知識、官方公告、中文媒體」四大類共 18 個公開 RSS / Atom 來源。

可以在電腦瀏覽器使用，也能在手機上「加入主畫面」當成 App（PWA）。

## 功能

- 📰 **自動聚合**：同時抓取多個新聞來源，去除重複文章，依時間由新到舊排列
- 🗂️ **分類瀏覽**：全部／產業動態／研究與知識／官方公告／中文媒體
- 🔍 **關鍵字搜尋**：搜尋標題與摘要（多個關鍵字以空白分隔，需全部符合）
- ⟳ **即時更新**：伺服器每 15 分鐘快取一次；按右上角 ⟳ 可強制重新抓取；頁面開著時每 15 分鐘自動更新
- ★ **收藏**：喜歡的文章可以收藏（存在你的瀏覽器裡）
- 📤 **分享**：手機上呼叫系統分享選單，電腦上複製連結
- ⓘ **來源狀態**：顯示每個來源是否抓取成功、抓到幾則
- 🌙 **深色模式**：跟隨系統設定
- 📱 **可安裝**：支援 PWA，離線時仍可看到上次載入的內容

## 快速開始

需求：[Node.js](https://nodejs.org/) 21 以上（不需要安裝任何套件）。

```bash
npm start
```

然後用瀏覽器打開 <http://localhost:3000>。

可用環境變數：

| 變數 | 預設 | 說明 |
| --- | --- | --- |
| `PORT` | `3000` | 伺服器埠號 |
| `CACHE_TTL_MINUTES` | `15` | 每個來源的快取分鐘數 |

### 在手機上使用

1. 電腦與手機連同一個 Wi-Fi，用手機瀏覽器打開 `http://<電腦的區網 IP>:3000`
2. 選「加入主畫面」即可（注意：Service Worker 離線功能需要 HTTPS 或 localhost，部署到雲端後才會完整啟用）

## 新聞來源

全部定義在 [`src/sources.js`](src/sources.js)，想加新的來源只要加一行：

```js
{ id: 'my-feed', name: '顯示名稱', category: 'industry', url: 'https://example.com/feed.xml' },
```

| 分類 | 來源 |
| --- | --- |
| 產業動態 | TechCrunch AI、The Verge AI、VentureBeat AI、Ars Technica AI、Hacker News（AI 熱門） |
| 研究與知識 | MIT Technology Review AI、arXiv cs.AI、arXiv cs.CL、Berkeley AI Research、Simon Willison |
| 官方公告 | OpenAI News、Google AI Blog、Google DeepMind、Hugging Face Blog、NVIDIA Blog |
| 中文媒體 | 科技新報 AI、iThome、INSIDE |

> 網站可能隨時更改 RSS 網址。若某個來源失效，App 不會整個壞掉，只會在 ⓘ「來源狀態」裡顯示錯誤，其他來源照常顯示。

## API

| 路徑 | 說明 |
| --- | --- |
| `GET /api/news` | 取得新聞。參數：`category`（industry / research / official / zh）、`source`（來源 id）、`q`（關鍵字）、`limit`（預設 200，上限 500）、`refresh=1`（略過快取） |
| `GET /api/sources` | 取得分類與來源清單 |

## 專案結構

```
server.js            HTTP 伺服器（API + 靜態檔案）
src/sources.js       新聞來源清單
src/feedParser.js    RSS / Atom 解析器（零依賴）
src/aggregator.js    抓取、快取、去重、排序、搜尋
public/              前端（HTML / CSS / JS / PWA）
test/                單元測試
```

## 測試

```bash
npm test
```
