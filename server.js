// AI 新聞 App 的伺服器：提供 API 與前端靜態檔案。
// 啟動：npm start，然後開啟 http://localhost:3000
const http = require('http');
const fs = require('fs');
const path = require('path');
const { getNews } = require('./src/aggregator');
const { CATEGORIES, SOURCES } = require('./src/sources');

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
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405);
      return res.end();
    }
    return serveStatic(req, res, url.pathname);
  } catch (err) {
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
