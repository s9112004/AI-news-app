// AI 新聞 App 的伺服器：提供 API 與前端靜態檔案。
// 啟動：npm start，然後開啟 http://localhost:3000
const http = require('http');
const fs = require('fs');
const path = require('path');
const { getNews } = require('./src/aggregator');
const { CATEGORIES, SOURCES } = require('./src/sources');
const { TOOL_GROUPS, getTools, findToolById, fetchToolContext } = require('./src/toolScanner');
const playbook = require('./src/playbook');
const ai = require('./src/ai');

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

function readJson(req, limit = 10000) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > limit) {
        reject(Object.assign(new Error('內容太大'), { status: 413 }));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(Object.assign(new Error('JSON 格式錯誤'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

// AI 結果快取：同一個工具或主題不重複花費 API 額度
const aiCache = new Map();
const AI_CACHE_MAX = 200;
async function cachedAi(key, fn) {
  if (aiCache.has(key)) return { ...aiCache.get(key), cached: true };
  const result = await fn();
  if (aiCache.size >= AI_CACHE_MAX) aiCache.delete(aiCache.keys().next().value);
  aiCache.set(key, result);
  return result;
}

function sendAiError(res, err) {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  return sendJson(res, status, { error: err.message || 'AI 處理失敗' });
}

function serveStatic(req, res, pathname) {
  const rel = pathname === '/' ? 'index.html' : decodeURIComponent(pathname).replace(/^\/+/, '');
  const filePath = path.resolve(PUBLIC_DIR, rel);
  if (!filePath.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('找不到頁面');
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname === '/api/news') {
      const category = url.searchParams.get('category') || undefined;
      if (category && !CATEGORIES[category]) return sendJson(res, 400, { error: '未知的分類' });
      const data = await getNews({
        category,
        source: url.searchParams.get('source') || undefined,
        q: (url.searchParams.get('q') || '').trim() || undefined,
        limit: Math.min(Number(url.searchParams.get('limit')) || 200, 500),
        force: url.searchParams.get('refresh') === '1',
      });
      return sendJson(res, 200, data);
    }
    if (url.pathname === '/api/sources') {
      return sendJson(res, 200, {
        categories: CATEGORIES,
        sources: SOURCES.map(({ id, name, category, url: feedUrl }) => ({ id, name, category, url: feedUrl })),
      });
    }
    if (url.pathname === '/api/tools') {
      const group = url.searchParams.get('group') || undefined;
      if (group && !TOOL_GROUPS[group]) return sendJson(res, 400, { error: '未知的分類' });
      const data = await getTools({
        group,
        q: (url.searchParams.get('q') || '').trim() || undefined,
        force: url.searchParams.get('refresh') === '1',
      });
      return sendJson(res, 200, { groups: TOOL_GROUPS, ...data });
    }
    if (url.pathname === '/api/tools/analyze' && req.method === 'POST') {
      const { id } = await readJson(req);
      const item = typeof id === 'string' ? findToolById(id) : null;
      if (!item) return sendJson(res, 404, { error: '找不到這個工具，請先重新掃描。' });
      try {
        const result = await cachedAi(`tool:${id}`, async () => {
          const context = await fetchToolContext(item);
          return { item, analysis: await ai.analyzeTool(item, context) };
        });
        return sendJson(res, 200, result);
      } catch (err) {
        return sendAiError(res, err);
      }
    }
    if (url.pathname === '/api/playbook') {
      return sendJson(res, 200, playbook);
    }
    if (url.pathname === '/api/ai/status') {
      return sendJson(res, 200, { configured: ai.isConfigured() });
    }
    if (url.pathname === '/api/studio' && req.method === 'POST') {
      const { format, topic } = await readJson(req);
      const cleanTopic = typeof topic === 'string' ? topic.trim() : '';
      if (!ai.STUDY_INSTRUCTIONS[format]) return sendJson(res, 400, { error: '不支援的格式' });
      if (!cleanTopic || cleanTopic.length > 100) return sendJson(res, 400, { error: '請輸入 1–100 字的主題' });
      try {
        const data = await cachedAi(`study:${format}:${cleanTopic}`, async () => ({
          format,
          topic: cleanTopic,
          data: await ai.generateStudy(format, cleanTopic),
        }));
        return sendJson(res, 200, data);
      } catch (err) {
        return sendAiError(res, err);
      }
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405);
      return res.end();
    }
    return serveStatic(req, res, url.pathname);
  } catch (err) {
    if (err.status && err.status < 500) return sendJson(res, err.status, { error: err.message });
    console.error(err);
    return sendJson(res, 500, { error: '伺服器錯誤' });
  }
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`AI 新聞 App 已啟動：http://localhost:${PORT}`);
  });
}

module.exports = server;
