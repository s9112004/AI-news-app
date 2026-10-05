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

const { BASE_SYSTEM, SCHEMAS, STUDY_INSTRUCTIONS, buildAnalysisPrompt, buildStudyPrompt } = require('./prompts');

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
  const user = buildAnalysisPrompt(item, context);
  try {
    return await callClaude({ system: BASE_SYSTEM, user, schema: SCHEMAS.analysis });
  } catch (err) {
    throw toAiError(err);
  }
}

async function generateStudy(format, topic) {
  if (!STUDY_INSTRUCTIONS[format]) throw new AiError('不支援的格式', 400);
  const user = buildStudyPrompt(format, topic);
  try {
    return await callClaude({ system: BASE_SYSTEM, user, schema: SCHEMAS[format] });
  } catch (err) {
    throw toAiError(err);
  }
}

module.exports = { analyzeTool, generateStudy, isConfigured, setClientForTesting, AiError, SCHEMAS, STUDY_INSTRUCTIONS };
