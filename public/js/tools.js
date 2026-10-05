// 🔥 工具雷達頁
(() => {
  const { $, h, relativeTime, api } = window.App;
  const state = { group: '', q: '', items: [], status: [], loading: false, seq: 0 };

  async function analyze(item) {
    const dlg = $('#analysisDialog');
    const body = $('#analysisBody');
    body.replaceChildren(h('div', { class: 'loading' },
      h('div', { class: 'spinner', 'aria-hidden': 'true' }),
      h('p', {}, `正在閱讀「${item.title}」的說明文件並整理教學…`),
      h('small', {}, '通常需要 20–60 秒')));
    if (!dlg.open) dlg.showModal();
    try {
      const { analysis } = await api('/api/tools/analyze', { id: item.id });
      body.replaceChildren(window.App.render.analysis(analysis, item));
    } catch (err) {
      const configured = await window.App.checkAi();
      body.replaceChildren(h('div', { class: 'notice error' }, h('strong', {}, '解析失敗'), h('p', {}, err.message)),
        configured ? null : window.App.aiSetupHint());
    }
  }

  function card(item) {
    return h('li', { class: 'card tool-card' },
      h('div', { class: 'card-head' },
        h('span', { class: 'badge', dataset: { cat: item.group } }, item.group === 'github' ? 'GitHub' : '社群'),
        h('span', { class: 'source' }, item.sourceName),
        item.scoreLabel ? h('span', { class: 'score' }, item.scoreLabel) : null,
        h('time', { class: 'time' }, relativeTime(item.publishedAt))),
      h('a', { class: 'title', href: item.link, target: '_blank', rel: 'noopener noreferrer' }, item.title),
      item.summary ? h('p', { class: 'summary' }, item.summary) : null,
      item.topics && item.topics.length ? h('div', { class: 'chips' }, item.topics.map((t) => h('span', { class: 'chip' }, t))) : null,
      h('div', { class: 'card-actions' },
        h('button', { type: 'button', class: 'primary-btn small', onclick: () => analyze(item) }, '🔍 AI 解析用法')));
  }

  function render() {
    $('#toolsList').replaceChildren(...state.items.map(card));
    const empty = $('#toolsEmpty');
    empty.hidden = state.items.length > 0 || state.loading;
    empty.textContent = '目前沒有掃描結果。可以換個關鍵字，或按右上角 ⟳ 重新掃描。';
    const failed = state.status.filter((s) => !s.ok).length;
    $('#toolsMeta').textContent = state.loading ? '正在掃描熱門 AI 工具…'
      : `共 ${state.items.length} 項・${state.status.length - failed}/${state.status.length} 個掃描來源正常${failed ? '（按 ⓘ 查看）' : ''}`;
  }

  async function load({ refresh = false } = {}) {
    const seq = ++state.seq;
    state.loading = true;
    render();
    const params = new URLSearchParams();
    if (state.group) params.set('group', state.group);
    if (state.q) params.set('q', state.q);
    if (refresh) params.set('refresh', '1');
    try {
      const data = await api(`/api/tools?${params}`);
      if (seq !== state.seq) return;
      state.items = data.items;
      state.status = data.status;
    } catch (err) {
      if (seq !== state.seq) return;
      state.loading = false;
      render();
      $('#toolsMeta').textContent = `載入失敗：${err.message}`;
      return;
    }
    state.loading = false;
    render();
  }

  function init() {
    $('#toolsTabs').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-group]');
      if (!btn) return;
      window.App.activate('#toolsTabs', btn);
      state.group = btn.dataset.group;
      load();
    });
    let timer;
    $('#toolsSearch').addEventListener('input', (e) => {
      clearTimeout(timer);
      timer = setTimeout(() => { state.q = e.target.value.trim(); load(); }, 300);
    });
    $('#analysisPrint').addEventListener('click', () => window.App.printNode($('#analysisBody')));
  }

  window.App.views.tools = { init, load, refresh: () => load({ refresh: true }), status: () => state.status, loaded: () => state.seq > 0 };
})();
