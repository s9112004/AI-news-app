// 產生「網頁版」單一 HTML 檔，可發佈成 claude.ai Artifact。
// 用法：node scripts/build-web.js [輸出路徑]（預設 dist/ai-news-radar.html）
const fs = require('fs');
const path = require('path');
const playbook = require('../src/playbook');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const out = path.resolve(process.argv[2] || path.join(root, 'dist', 'ai-news-radar.html'));

const html = read('public/index.html');
const body = html
  .slice(html.indexOf('<body>') + '<body>'.length, html.indexOf('</body>'))
  .replace(/<script src="[^"]+"><\/script>\s*/g, '')
  // 網頁版只有一個檔案，圖示改成內嵌
  .replace('src="icon.svg"', `src="data:image/svg+xml;base64,${Buffer.from(read('public/icon.svg')).toString('base64')}"`);

// 避免內嵌內容中的 </script> 提早結束 script 標籤
const safe = (js) => js.replace(/<\/script/gi, '<\\/script');
const script = (js) => `<script>\n${safe(js)}\n</script>\n`;

const scripts = [
  `window.__PLAYBOOK__ = ${JSON.stringify(playbook)};`,
  read('src/prompts.js'),
  read('public/js/common.js'),
  read('scripts/web/web-adapter.js'),
  read('public/js/render.js'),
  read('public/js/news.js'),
  read('public/js/tools.js'),
  read('public/js/playbook.js'),
  read('public/js/studio.js'),
  read('public/js/main.js'),
];

const webCss = `
#studioPrint, #analysisPrint, #refreshBtn, #statusBtn { display: none !important; }
.setup-steps { margin: 8px 0 0; padding-left: 1.3em; font-size: .9rem; }
.setup-steps li { margin: 4px 0; }
.setup-steps code { display: block; margin-top: 2px; padding: 4px 8px; background: var(--card); border-radius: 6px; overflow-x: auto; white-space: nowrap; font-size: .82rem; }
`;

const page = `<title>AI 新聞雷達</title>
<style>
${read('public/style.css')}
${webCss}
</style>
${body.trim()}
${scripts.map(script).join('')}`;

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, page);
console.log(`已產生 ${out}（${(page.length / 1024).toFixed(1)} KB）`);
