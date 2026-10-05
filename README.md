# AI 新聞雷達

隨時取得最新 AI 科技新聞的 App，包含四大功能：

| 分頁 | 做什麼 |
| --- | --- |
| 📰 新聞 | 彙整「產業動態、研究與知識、官方公告、中文媒體」四大類共 18 個 RSS / Atom 來源 |
| 🔥 工具雷達 | 掃描 GitHub 近期竄紅的 AI 專案（Skills、MCP、Agent、提示詞）與 Reddit、Hacker News 熱議，一鍵用 AI 解析成「步驟教學＋流程圖」 |
| 📚 技巧指令庫 | 人工整理的提示詞捷徑（/cheatsheet、/blueprint、/flashcards、/mindmap…）與 ChatGPT、Claude、Gemini 實用技巧，每招都附操作流程圖與可複製的提示詞 |
| ✨ AI 工作室 | 輸入任何主題，直接生成一頁式筆記、主題藍圖、可翻面學習卡片、心智圖，可列印或存成 PDF |

> 關於 /cheatsheet、/mindmap 這類「斜線捷徑」：它們是社群流行的提示詞寫法，**不是** ChatGPT、Claude 或 Gemini 的官方指令。AI 只是把斜線後的文字當成一般指示來理解。

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

需求：[Node.js](https://nodejs.org/) 21 以上。

```bash
npm install
npm start
```

然後用瀏覽器打開 <http://localhost:3000>。

可用環境變數：

| 變數 | 預設 | 說明 |
| --- | --- | --- |
| `PORT` | `3000` | 伺服器埠號 |
| `CACHE_TTL_MINUTES` | `15` | 每個新聞來源的快取分鐘數 |
| `ANTHROPIC_API_KEY` | （無） | 「AI 解析用法」與「AI 工作室」需要。到 [console.anthropic.com](https://console.anthropic.com) 申請。沒設定時其他功能照常使用 |
| `GITHUB_TOKEN` | （無） | 選填。GitHub 未登入的搜尋 API 每分鐘只能呼叫 10 次，設定後額度較高 |

### AI 功能怎麼運作、會花多少錢？

- 使用 Claude API（模型 `claude-opus-5-5`），以「結構化輸出」確保回傳格式正確，App 再把它畫成流程圖、心智圖、卡片。
- 解析工具時，伺服器會先抓該專案的 GitHub README（或網頁內文）交給 AI，並要求 AI **只依據原文**整理，原文沒寫的內容會標註「原文未說明」，降低編造的機會。
- 同一個工具或主題的結果會快取在伺服器記憶體中，重複點擊不會重複計費。
- 費用依 Anthropic 官方價目表計算（輸入每百萬 token 4 美元、輸出每百萬 token 20 美元，請以[官方價格](https://www.anthropic.com/pricing)為準）。

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

## 工具雷達的掃描來源

| 類型 | 來源 |
| --- | --- |
| GitHub 熱門專案 | 用 GitHub 搜尋 API 找「近 30–90 天內建立、依星數排序」的專案：Claude / Agent Skills、MCP 伺服器、AI Agent、提示詞與教學 |
| 社群熱議 | Hacker News「Show HN」AI 新工具、Reddit r/ChatGPT、r/ClaudeAI、r/GeminiAI、r/PromptEngineering 本週熱門 |

設定在 [`src/toolScanner.js`](src/toolScanner.js)，指令庫內容在 [`src/playbook.js`](src/playbook.js)。

## API

| 路徑 | 說明 |
| --- | --- |
| `GET /api/news` | 取得新聞。參數：`category`（industry / research / official / zh）、`source`（來源 id）、`q`（關鍵字）、`limit`（預設 200，上限 500）、`refresh=1`（略過快取） |
| `GET /api/sources` | 取得分類與來源清單 |
| `GET /api/tools` | 熱門 AI 工具。參數：`group`（github / community）、`q`、`refresh=1` |
| `POST /api/tools/analyze` | `{ "id": "<工具 id>" }`，用 AI 解析工具用法（只接受掃描結果中的 id） |
| `GET /api/playbook` | 提示詞捷徑與各平台技巧 |
| `POST /api/studio` | `{ "format": "cheatsheet" \| "blueprint" \| "flashcards" \| "mindmap", "topic": "主題" }` |

## 專案結構

```
server.js            HTTP 伺服器（API + 靜態檔案）
src/sources.js       新聞來源清單
src/feedParser.js    RSS / Atom 解析器（零依賴）
src/aggregator.js    抓取、快取、去重、排序、搜尋
src/toolScanner.js   AI 工具雷達（GitHub 搜尋 API ＋ 社群 RSS）
src/ai.js            Claude API：工具解析、主題整理
src/playbook.js      技巧指令庫內容（人工整理）
public/              前端（HTML / CSS / JS / PWA）
public/js/render.js  流程圖、筆記、藍圖、卡片、心智圖的繪製
test/                單元測試
```

## 測試

```bash
npm test
```
