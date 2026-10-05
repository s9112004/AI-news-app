// 📚 技巧指令庫頁
(() => {
  const { $, h, api, copy, PLATFORM_NAMES } = window.App;
  const state = { tab: 'formats', data: null, topic: '' };

  const fill = (tpl) => tpl.replaceAll('{topic}', state.topic || '（你的主題）');

  const USAGE_FLOW = [
    { kind: 'start', label: '打開 ChatGPT、Gemini 或 Claude', note: '' },
    { kind: 'decision', label: '想要圖片還是文字？', note: '圖片 → 選「建立圖像」（Claude 沒有圖片生成，可請它做 Artifact 網頁）；文字 → 直接在對話框輸入' },
    { kind: 'step', label: '貼上「捷徑＋主題」或完整提示詞', note: '完整提示詞把需求寫清楚，結果通常比較穩定' },
    { kind: 'step', label: '核對內容是否正確', note: '圖片裡的小字與數字最容易出錯' },
    { kind: 'end', label: '追問修改，直到滿意', note: '例如：「第 3 點太難懂，換個比喻」' },
  ];

  function formatCard(f) {
    const textP = h('pre', { class: 'prompt' }, fill(f.textPrompt));
    const imageP = h('pre', { class: 'prompt' }, fill(f.imagePrompt));
    return h('li', { class: 'card pb-card' },
      h('div', { class: 'pb-head' }, h('code', { class: 'cmd' }, f.command), h('h3', {}, f.name)),
      h('p', { class: 'plain' }, '白話說：', f.plain),
      h('div', { class: 'chips' }, h('span', { class: 'chip-label' }, '適合：'), f.bestFor.map((b) => h('span', { class: 'chip' }, b))),
      f.note ? h('p', { class: 'note' }, '⚠️ ', f.note) : null,
      h('details', {}, h('summary', {}, '📝 文字版完整提示詞'), textP,
        h('button', { type: 'button', class: 'small-btn', onclick: () => copy(fill(f.textPrompt)) }, '複製')),
      h('details', {}, h('summary', {}, '🖼️ 圖片版提示詞（建立圖像用）'), imageP,
        h('button', { type: 'button', class: 'small-btn', onclick: () => copy(fill(f.imagePrompt)) }, '複製')),
      f.studio ? h('div', { class: 'card-actions' },
        h('button', { type: 'button', class: 'primary-btn small', onclick: () => window.App.views.studio.open(f.id, state.topic) }, '✨ 直接在 AI 工作室生成')) : null);
  }

  function tipCard(t) {
    return h('li', { class: 'card pb-card' },
      h('div', { class: 'pb-head' }, h('span', { class: 'badge', dataset: { cat: t.platform } }, PLATFORM_NAMES[t.platform]), h('h3', {}, t.title)),
      h('p', { class: 'plain' }, '白話說：', t.plain),
      h('details', { open: true }, h('summary', {}, '🗺️ 操作流程'), window.App.render.flow(t.steps)),
      t.example ? h('details', {}, h('summary', {}, '⌨️ 範例提示詞'), h('pre', { class: 'prompt' }, t.example),
        h('button', { type: 'button', class: 'small-btn', onclick: () => copy(t.example) }, '複製')) : null,
      t.note ? h('p', { class: 'note' }, '⚠️ ', t.note) : null,
      t.link || state.data.OFFICIAL_HELP[t.platform]
        ? h('a', { class: 'doc-link', href: t.link || state.data.OFFICIAL_HELP[t.platform], target: '_blank', rel: 'noopener noreferrer' },
          t.link ? '官方文件 ↗' : `${PLATFORM_NAMES[t.platform]} 官方說明中心 ↗`)
        : null);
  }

  function render() {
    const root = $('#pbContent');
    if (!state.data) return root.replaceChildren(h('p', { class: 'meta' }, '載入中…'));
    const d = state.data;
    const disclaimer = h('p', { class: 'meta' }, `整理時間：${d.UPDATED_AT}。各家功能名稱、位置與付費方案限制會變動，請以官方說明為準。`);

    if (state.tab === 'formats') {
      const input = h('input', { type: 'search', placeholder: '先輸入主題，下面的提示詞會自動帶入（例如：電動車）', value: state.topic });
      input.addEventListener('input', () => {
        state.topic = input.value.trim();
        const list = $('#pbFormats');
        if (list) list.replaceChildren(...d.FORMATS.map(formatCard));
      });
      root.replaceChildren(
        h('div', { class: 'notice' },
          h('strong', {}, '先說清楚：這些斜線捷徑不是官方指令'),
          h('p', {}, '像「/cheatsheet 主題」「/mindmap 主題」這類寫法是社群流行的提示詞捷徑。ChatGPT、Gemini 等 AI 只是把斜線後面的字當成一般的指示來理解，所以把需求寫完整的「完整提示詞」通常效果更穩定。')),
        h('details', { class: 'card', open: true }, h('summary', {}, '🗺️ 使用流程'), window.App.render.flow(USAGE_FLOW)),
        input,
        h('ul', { class: 'list', id: 'pbFormats' }, d.FORMATS.map(formatCard)),
        disclaimer);
      return;
    }
    const tips = d.TIPS.filter((t) => t.platform === state.tab);
    root.replaceChildren(h('ul', { class: 'list' }, tips.map(tipCard)), disclaimer);
  }

  async function load() {
    if (!state.data) {
      try { state.data = await api('/api/playbook'); } catch (err) {
        $('#pbContent').replaceChildren(h('p', { class: 'meta' }, `載入失敗：${err.message}`));
        return;
      }
    }
    render();
  }

  function init() {
    $('#pbTabs').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-pb]');
      if (!btn) return;
      window.App.activate('#pbTabs', btn);
      state.tab = btn.dataset.pb;
      render();
    });
  }

  window.App.views.playbook = { init, load, refresh: load, status: () => [], loaded: () => Boolean(state.data) };
})();
