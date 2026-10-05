const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { parseFeed } = require('../src/feedParser');

const fixture = (name) => fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');

test('解析 RSS 2.0', () => {
  const { title, items } = parseFeed(fixture('rss.xml'));
  assert.strictEqual(title, 'Sample AI Feed');
  assert.strictEqual(items.length, 3);
  assert.strictEqual(items[0].title, 'New model beats benchmark & more');
  assert.strictEqual(items[0].summary, 'A new model arrived.');
  assert.strictEqual(items[0].publishedAt, '2026-10-05T08:00:00.000Z');
  assert.strictEqual(items[1].publishedAt, '2026-10-01T10:00:00.000Z');
  assert.strictEqual(items[1].summary, 'Escaped & HTML');
  assert.strictEqual(items[2].link, 'https://example.com/c');
  assert.strictEqual(items[2].publishedAt, null);
});

test('解析 Atom，優先使用 rel=alternate 連結', () => {
  const { title, items } = parseFeed(fixture('atom.xml'));
  assert.strictEqual(title, 'Sample Atom');
  assert.strictEqual(items.length, 2);
  assert.strictEqual(items[0].title, '研究 & 突破');
  assert.strictEqual(items[0].link, 'https://example.org/post/1');
  assert.strictEqual(items[0].publishedAt, '2026-10-04T04:00:00.000Z');
  assert.strictEqual(items[0].summary, '中文摘要內容');
  assert.strictEqual(items[1].link, 'https://example.org/post/2');
  assert.strictEqual(items[1].summary, 'Body');
});

test('空字串或非 feed 內容不會壞掉', () => {
  assert.deepStrictEqual(parseFeed('').items, []);
  assert.deepStrictEqual(parseFeed('<html><body>hi</body></html>').items, []);
});
