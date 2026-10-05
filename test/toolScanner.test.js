const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { getTools, findToolById, fetchToolContext, clearToolCache } = require('../src/toolScanner');

const rss = fs.readFileSync(path.join(__dirname, 'fixtures', 'rss.xml'), 'utf8');

const scanners = [
  {
    id: 'gh', name: 'GH', group: 'github',
    run: async () => [
      { id: 'gh:a/low', group: 'github', title: 'a/low', link: 'https://github.com/a/low', summary: 'agent skills', score: 10, repo: 'a/low' },
      { id: 'gh:b/high', group: 'github', title: 'b/high', link: 'https://github.com/b/high', summary: 'mcp server', score: 900, repo: 'b/high' },
    ],
  },
  { id: 'bad', name: 'Broken', group: 'community', run: async () => { throw new Error('HTTP 403'); } },
];

test('掃描結果依熱度排序，失敗來源回報錯誤', async () => {
  clearToolCache();
  const { items, status } = await getTools({ scanners, force: true });
  assert.deepStrictEqual(items.map((i) => i.title), ['b/high', 'a/low']);
  assert.strictEqual(status.find((s) => s.id === 'bad').ok, false);
});

test('關鍵字篩選與 findToolById', async () => {
  const { items } = await getTools({ scanners, q: 'skills' });
  assert.deepStrictEqual(items.map((i) => i.title), ['a/low']);
  assert.strictEqual(findToolById('gh:b/high').title, 'b/high');
  assert.strictEqual(findToolById('gh:not/exist'), null);
});

test('真實掃描器：解析 GitHub API 與社群 RSS 格式', async () => {
  clearToolCache();
  const fakeFetch = async (url) => {
    if (url.startsWith('https://api.github.com/search/')) {
      return { ok: true, status: 200, json: async () => ({ items: [{ full_name: 'x/y', html_url: 'https://github.com/x/y', description: 'Claude skills', stargazers_count: 1234, language: 'Python', topics: ['claude'], created_at: '2026-09-01T00:00:00Z' }] }) };
    }
    return { ok: true, status: 200, text: async () => rss };
  };
  const { items, status } = await getTools({ force: true, fetchImpl: fakeFetch });
  assert.ok(status.every((s) => s.ok));
  const gh = items.find((i) => i.id === 'gh:x/y');
  assert.strictEqual(gh.scoreLabel, '★ 1,234');
  assert.ok(items.some((i) => i.group === 'community' && i.title === 'Older story'));
});

test('fetchToolContext 讀 GitHub README', async () => {
  const calls = [];
  const fakeFetch = async (url, opts) => { calls.push([url, opts.headers.Accept]); return { ok: true, status: 200, text: async () => '# README' }; };
  const text = await fetchToolContext({ repo: 'x/y', link: 'https://github.com/x/y' }, fakeFetch);
  assert.strictEqual(text, '# README');
  assert.deepStrictEqual(calls[0], ['https://api.github.com/repos/x/y/readme', 'application/vnd.github.raw']);
});
