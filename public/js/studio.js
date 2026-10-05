// ✨ AI 工作室：輸入主題 → 生成一頁式筆記／藍圖／學習卡片／心智圖
(() => {
  const { $, h, api } = window.App;
  const state = { format: 'cheatsheet', busy: false };
  const NAMES = { cheatsheet: '一頁式筆記', blueprint: '主題藍圖', flashcards: '學習卡片', mindmap: '心智圖' };

  function selectFormat(format) {
    state.format = format;
    const btn = $(`#studioFormats button[data-format="${format}"]`);
    if (btn) window.App.activate('#studioFormats', btn);
  }

  async function generate() {
    const topic = $('#studioTopic').value.trim();
    if (!topic || state.busy) return;
    state.busy = true;
    const result = $('#studioResult');
    $('#studioPrint').hidden = true;
    result.replaceChildren(h('div', { class: 'loading' },
      h('div', { class: 'spinner', 'aria-hidden': 'true' }),
      h('p', {}, `正在把「${topic}」整理成${NAMES[state.format]}…`),
      h('small', {}, '通常需要 20–60 秒')));
    try {
      const { format, data } = await api('/api/studio', { format: state.format, topic });
      result.replaceChildren(window.App.render.study(format, data),
        h('p', { class: 'meta' }, '⚠️ 內容由 AI 生成，重要的數字、日期與專有名詞請再查證。'));
      $('#studioPrint').hidden = false;
    } catch (err) {
      const configured = await window.App.checkAi();
      result.replaceChildren(h('div', { class: 'notice error' }, h('strong', {}, '生成失敗'), h('p', {}, err.message)),
        configured ? null : window.App.aiSetupHint());
    } finally {
      state.busy = false;
    }
  }

  function init() {
    $('#studioFormats').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-format]');
      if (btn) selectFormat(btn.dataset.format);
    });
    $('#studioForm').addEventListener('submit', (e) => { e.preventDefault(); generate(); });
    $('#studioPrint').addEventListener('click', () => window.App.printNode($('#studioResult')));
  }

  // 從指令庫跳過來
  function open(format, topic) {
    window.App.showView('studio');
    selectFormat(format);
    if (topic) $('#studioTopic').value = topic;
    $('#studioTopic').focus();
  }

  window.App.views.studio = { init, load: () => {}, refresh: () => {}, status: () => [], loaded: () => true, open };
})();
