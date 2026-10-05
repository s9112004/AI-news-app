const test = require('node:test');
const assert = require('node:assert');
const ai = require('../src/ai');

function fakeClient(response, capture = {}) {
  return { beta: { messages: { create: async (params) => { capture.params = params; return response; } } } };
}

test('generateStudy 送出結構化輸出請求並解析 JSON', async () => {
  const capture = {};
  const data = { title: '電動車', center: '電動車', branches: [{ label: '電池', children: ['鋰電池'] }] };
  ai.setClientForTesting(fakeClient({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(data) }] }, capture));
  const out = await ai.generateStudy('mindmap', '電動車');
  assert.deepStrictEqual(out, data);
  assert.strictEqual(capture.params.model, 'claude-opus-5-5');
  assert.strictEqual(capture.params.output_config.format.type, 'json_schema');
  assert.deepStrictEqual(capture.params.output_config.format.schema, ai.SCHEMAS.mindmap);
  assert.strictEqual(capture.params.fallbacks, 'default');
  assert.match(capture.params.messages[0].content, /電動車/);
});

test('拒絕與截斷會回傳清楚的錯誤', async () => {
  ai.setClientForTesting(fakeClient({ stop_reason: 'refusal', content: [] }));
  await assert.rejects(ai.generateStudy('cheatsheet', 'x'), (e) => e.status === 422);
  ai.setClientForTesting(fakeClient({ stop_reason: 'max_tokens', content: [{ type: 'text', text: '{' }] }));
  await assert.rejects(ai.generateStudy('cheatsheet', 'x'), /截斷/);
});

test('不支援的格式', async () => {
  await assert.rejects(ai.generateStudy('poem', 'x'), (e) => e.status === 400);
});

test('所有 schema 都符合結構化輸出的要求（每層 additionalProperties:false 且 required 完整）', () => {
  const walk = (s) => {
    if (s.type === 'object') {
      assert.strictEqual(s.additionalProperties, false);
      assert.deepStrictEqual([...s.required].sort(), Object.keys(s.properties).sort());
      Object.values(s.properties).forEach(walk);
    } else if (s.type === 'array') walk(s.items);
  };
  Object.values(ai.SCHEMAS).forEach(walk);
});
