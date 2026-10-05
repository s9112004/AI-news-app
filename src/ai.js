// 用 Claude 做兩件事：
// 1. analyzeTool：解析熱門 AI 工具的用法，產生步驟與流程圖
// 2. generateStudy：把任何主題整理成 cheat sheet / blueprint / flashcards / mindmap
// 需要環境變數 ANTHROPIC_API_KEY（或 `ant auth login` 的登入資訊）。
const Anthropic = require('@anthropic-ai/sdk');

const MODEL = 'claude-opus-5-5';

let client = null;
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

// 測試用：注入假的 client
function setClientForTesting(c) {
  client = c;
}

function isConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_PROFILE);
}

const str = { type: 'string' };
const strArr = { type: 'array', items: str };
function obj(properties) {
  return { type: 'object', properties, required: Object.keys(properties), additionalProperties: false };
}

const FLOW_NODE = obj({
  kind: { type: 'string', enum: ['start', 'step', 'decision', 'end'] },
  label: str,
  note: str,
});

const SCHEMAS = {
  analysis: obj({
    name: str,
    oneLiner: str,
    whatItIs: str,
    whoFor: str,
    setup: strArr,
    steps: { type: 'array', items: obj({ title: str, detail: str }) },
    flow: { type: 'array', items: FLOW_NODE },
    examplePrompts: strArr,
    tips: strArr,
    cautions: strArr,
    sourceNote: str,
  }),
  cheatsheet: obj({
    title: str,
    subtitle: str,
    summary: str,
    sections: { type: 'array', items: obj({ heading: str, points: strArr }) },
    glossary: { type: 'array', items: obj({ term: str, meaning: str }) },
    keyTakeaways: strArr,
  }),
  blueprint: obj({
    title: str,
    subtitle: str,
    components: { type: 'array', items: obj({ name: str, role: str }) },
    process: { type: 'array', items: obj({ step: str, detail: str }) },
    pros: { type: 'array', items: obj({ title: str, detail: str }) },
    challenges: { type: 'array', items: obj({ title: str, detail: str }) },
    practical: { type: 'array', items: obj({ title: str, detail: str }) },
  }),
  flashcards: obj({
    title: str,
    subtitle: str,
    cards: { type: 'array', items: obj({ front: str, back: str, hint: str }) },
  }),
  mindmap: obj({
    title: str,
    center: str,
    branches: { type: 'array', items: obj({ label: str, children: strArr }) },
  }),
};

const BASE_SYSTEM = `你是一位用繁體中文（台灣用語）寫作的 AI 教學編輯，讀者是想快速上手的一般人。
寫作原則：
- 正確第一：只寫你有把握的事實。不確定的數字、日期、版本，寧可不寫，或標註「需查證」。絕對不要編造功能、指令、網址或引述。
- 白話好懂：先講定義，再用生活化的比喻或例子說明。
- 精簡：每個條目一到兩句話，適合一頁看完。`;

const STUDY_INSTRUCTIONS = {
  cheatsheet: '把主題整理成「一頁式重點筆記（cheat sheet）」：4 到 8 個段落，每段 2 到 5 個重點；附 4 到 8 個必懂名詞；最後 3 到 5 點重點整理。若主題是流程，段落依步驟順序排列。',
  blueprint: '把主題拆解成「藍圖（blueprint）」：核心構造／組成元件（4 到 8 個）、運作流程（4 到 7 步，依序）、優點（3 到 5 個）、挑戰或限制（3 到 5 個）、實務應用或常見方式（2 到 4 個）。',
  flashcards: '把主題做成「學習卡片（flashcards）」：8 到 12 張。正面是問題、情境或詞彙；背面是答案或解釋；hint 是記憶小撇步或發音提示（不需要時給空字串）。語言學習主題請在背面附上原文與中文。',
  mindmap: '把主題整理成「心智圖（mindmap）」：中心主題一個；5 到 7 個主分支，每個分支 3 到 5 個子節點，子節點用短語（10 個字以內為佳）。',
};

async function callClaude({ system, user, schema, effort = 'medium' }) {
  const response = await getClient().beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    // 若請求被安全機制拒絕，交由伺服器自動改用建議的備援模型
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system,
    messages: [{ role: 'user', content: user }],
    output_config: { effort, format: { type: 'json_schema', schema } },
  });
  if (response.stop_reason === 'refusal') {
    throw new AiError('這個請求被 AI 拒絕處理，請換個主題或描述方式。', 422);
  }
  if (response.stop_reason === 'max_tokens') {
    throw new AiError('內容太長被截斷了，請把主題縮小一點再試。', 422);
  }
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  try {
    return JSON.parse(text);
  } catch {
    throw new AiError('AI 回傳的格式無法解析，請再試一次。', 502);
  }
}

class AiError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
  }
}

function toAiError(err) {
  if (err instanceof AiError) return err;
  if (err instanceof Anthropic.AuthenticationError) return new AiError('API 金鑰無效，請檢查 ANTHROPIC_API_KEY。', 401);
  if (err instanceof Anthropic.RateLimitError) return new AiError('呼叫太頻繁或額度用完，請稍後再試。', 429);
  if (err instanceof Anthropic.BadRequestError) return new AiError(`請求格式錯誤：${err.message}`, 400);
  if (err instanceof Anthropic.APIConnectionError) return new AiError('連不上 Claude API，請檢查網路。', 502);
  if (err instanceof Anthropic.APIError) return new AiError(`Claude API 錯誤（${err.status}）`, 502);
  return new AiError(err.message || 'AI 處理失敗', 500);
}

async function analyzeTool(item, context) {
  const user = `請解析下面這個近期熱門的 AI 工具／專案／討論，寫成給新手的使用教學，並規劃成流程圖。

<item>
名稱：${item.title}
來源：${item.sourceName}
連結：${item.link}
簡介：${item.summary || '（無）'}
</item>

<original_document>
${context || '（抓不到原始說明，只能依據上面的名稱與簡介）'}
</original_document>

要求：
- 只依據 <item> 與 <original_document> 的內容。文件沒寫到的安裝步驟、指令、價格，不要自己補，改在 cautions 說明「原文未說明」。
- setup：安裝或開始使用前的準備（沒有就給空陣列）。
- steps：3 到 7 個使用步驟，依序排列。
- flow：流程圖節點，依序排列，第一個 kind 為 start、最後一個為 end；需要判斷的地方用 decision，note 寫判斷條件或分支結果。
- examplePrompts：可以直接複製使用的指令或提示詞（原文有提供才寫，不然給空陣列）。
- sourceNote：一句話說明這份解析依據了哪些資料、資訊是否完整。`;
  try {
    return await callClaude({ system: BASE_SYSTEM, user, schema: SCHEMAS.analysis });
  } catch (err) {
    throw toAiError(err);
  }
}

async function generateStudy(format, topic) {
  if (!STUDY_INSTRUCTIONS[format]) throw new AiError('不支援的格式', 400);
  const user = `主題：「${topic}」

${STUDY_INSTRUCTIONS[format]}
title 用主題名稱，subtitle 用一句話說明這份內容能帶來什麼。`;
  try {
    return await callClaude({ system: BASE_SYSTEM, user, schema: SCHEMAS[format] });
  } catch (err) {
    throw toAiError(err);
  }
}

module.exports = { analyzeTool, generateStudy, isConfigured, setClientForTesting, AiError, SCHEMAS, STUDY_INSTRUCTIONS };
