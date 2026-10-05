const test = require('node:test');
const assert = require('node:assert');
const server = require('../server');

let base;
test.before(() => new Promise((r) => server.listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; r(); })));
test.after(() => new Promise((r) => server.close(r)));

const post = (p, body) => fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('指令庫 API', async () => {
  const res = await fetch(`${base}/api/playbook`);
  const data = await res.json();
  assert.strictEqual(res.status, 200);
  assert.ok(data.FORMATS.some((f) => f.command === '/mindmap'));
  assert.ok(data.TIPS.every((t) => ['all', 'chatgpt', 'claude', 'gemini'].includes(t.platform)));
});

test('AI 工作室輸入驗證', async () => {
  assert.strictEqual((await post('/api/studio', { format: 'poem', topic: 'x' })).status, 400);
  assert.strictEqual((await post('/api/studio', { format: 'mindmap', topic: '' })).status, 400);
  assert.strictEqual((await post('/api/studio', { format: 'mindmap', topic: 'x'.repeat(101) })).status, 400);
  const bad = await fetch(`${base}/api/studio`, { method: 'POST', body: '{oops' });
  assert.strictEqual(bad.status, 400);
});

test('只能解析掃描結果中存在的工具（不能指定任意網址）', async () => {
  const res = await post('/api/tools/analyze', { id: 'feed:http://169.254.169.254/' });
  assert.strictEqual(res.status, 404);
});

test('靜態檔案與路徑穿越防護', async () => {
  assert.strictEqual((await fetch(`${base}/`)).status, 200);
  assert.strictEqual((await fetch(`${base}/js/render.js`)).status, 200);
  const res = await fetch(`${base}/%2e%2e/server.js`);
  assert.notStrictEqual(res.status, 200);
  assert.doesNotMatch(await res.text(), /createServer/);
});
