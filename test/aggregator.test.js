const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { getNews, clearCache, normalizeLink } = require('../src/aggregator');

const rss = fs.readFileSync(path.join(__dirname, 'fixtures', 'rss.xml'), 'utf8');
const atom = fs.readFileSync(path.join(__dirname, 'fixtures', 'atom.xml'), 'utf8');

const SOURCES = [
  { id: 'a', name: 'Source A', category: 'industry', url: 'https://feeds.test/rss' },
  { id: 'a2', name: 'Source A copy', category: 'industry', url: 'https://feeds.test/rss-dup' },
  { id: 'b', name: 'Source B', category: 'research', url: 'https://feeds.test/atom' },
  { id: 'bad', name: 'Broken', category: 'zh', url: 'https://feeds.test/404' },
];

function fakeFetch(url) {
  const body = { 'https://feeds.test/rss': rss, 'https://feeds.test/rss-dup': rss, 'https://feeds.test/atom': atom }[url];
  if (!body) return Promise.resolve({ ok: false, status: 404, text: async () => '' });
  return Promise.resolve({ ok: true, status: 200, text: async () => body });
}

test('合併、去重、依時間排序，失敗來源回報錯誤', async () => {
  clearCache();
  const { items, status } = await getNews({ sources: SOURCES, fetchImpl: fakeFetch, force: true });
  assert.strictEqual(items.length, 5); // RSS 3 則（重複來源被去重）+ Atom 2 則
  assert.strictEqual(items[0].title, 'New model beats benchmark & more');
  assert.strictEqual(items[1].sourceId, 'b');
  assert.strictEqual(items.at(-1).publishedAt, null);
  const bad = status.find((s) => s.id === 'bad');
  assert.strictEqual(bad.ok, false);
  assert.match(bad.error, /404/);
});

test('分類與關鍵字篩選', async () => {
  clearCache();
  const r1 = await getNews({ sources: SOURCES, fetchImpl: fakeFetch, category: 'research' });
  assert.ok(r1.items.every((it) => it.category === 'research'));
  const r2 = await getNews({ sources: SOURCES, fetchImpl: fakeFetch, q: '突破' });
  assert.deepStrictEqual(r2.items.map((it) => it.title), ['研究 & 突破']);
});

test('normalizeLink 去掉 utm 參數與 www', () => {
  assert.strictEqual(normalizeLink('https://www.x.com/a/?utm_source=rss#top'), normalizeLink('https://x.com/a'));
});
