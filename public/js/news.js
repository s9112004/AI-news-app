// 📰 新聞頁
(() => {
  const { $, h, relativeTime, api, storage, toast } = window.App;
  const CATEGORY_NAMES = { industry: '產業動態', research: '研究與知識', official: '官方公告', zh: '中文媒體' };
  const SAVED_KEY = 'ai-news-saved';

  const state = { category: '', q: '', items: [], status: [], loading: false, seq: 0 };
  let saved = storage.get(SAVED_KEY, []);
  const isSaved = (link) => saved.some((s) => s.link === link);
  function toggleSaved(item) {
    saved = isSaved(item.link) ? saved.filter((s) => s.link !== item.link) : [item, ...saved];
    storage.set(SAVED_KEY, saved);
  }

  function card(item) {
    const saveBtn = h('button', { type: 'button', class: 'small-btn' });
    const syncSave = () => { saveBtn.textContent = isSaved(item.link) ? '★ 已收藏' : '☆ 收藏'; };
    syncSave();
    saveBtn.addEventListener('click', () => {
      toggleSaved(item);
      if (state.category === 'saved') render(); else syncSave();
    });
    const shareBtn = h('button', { type: 'button', class: 'small-btn' }, '分享');
    shareBtn.addEventListener('click', async () => {
      try {
        if (navigator.share) await navigator.share({ title: item.title, url: item.link });
        else { await navigator.clipboard.writeText(`${item.title}\n${item.link}`); toast('已複製連結'); }
      } catch { /* 使用者取消 */ }
    });
    return h('li', { class: 'card' },
      h('div', { class: 'card-head' },
        h('span', { class: 'badge', dataset: { cat: item.category } }, CATEGORY_NAMES[item.category] || ''),
        h('span', { class: 'source' }, item.sourceName),
        h('time', { class: 'time', datetime: item.publishedAt || undefined, title: item.publishedAt ? new Date(item.publishedAt).toLocaleString('zh-TW') : undefined }, relativeTime(item.publishedAt))),
      h('a', { class: 'title', href: item.link, target: '_blank', rel: 'noopener noreferrer' }, item.title),
      item.summary ? h('p', { class: 'summary' }, item.summary) : null,
      h('div', { class: 'card-actions' }, saveBtn, shareBtn));
  }

  function render() {
    const q = state.q.toLowerCase();
    const items = state.category === 'saved'
      ? saved.filter((it) => !q || `${it.title} ${it.summary}`.toLowerCase().includes(q))
      : state.items;
    $('#newsList').replaceChildren(...items.map(card));
    const empty = $('#newsEmpty');
    empty.hidden = items.length > 0 || state.loading;
    empty.textContent = state.category === 'saved'
      ? '還沒有收藏的文章，點文章下方的「☆ 收藏」即可加入。'
      : '目前沒有符合條件的新聞。可以換個關鍵字，或按右上角 ⟳ 重新抓取。';
    const failed = state.status.filter((s) => !s.ok).length;
    $('#newsMeta').textContent = state.category === 'saved'
      ? `收藏 ${items.length} 則`
      : state.loading ? '正在抓取最新新聞…'
        : `共 ${items.length} 則・${state.status.length - failed}/${state.status.length} 個來源正常${failed ? '（按 ⓘ 查看）' : ''}`;
  }

  async function load({ refresh = false } = {}) {
    const seq = ++state.seq;
    if (state.category === 'saved') { state.loading = false; return render(); }
    state.loading = true;
    render();
    const params = new URLSearchParams();
    if (state.category) params.set('category', state.category);
    if (state.q) params.set('q', state.q);
    if (refresh) params.set('refresh', '1');
    try {
      const data = await api(`/api/news?${params}`);
      if (seq !== state.seq) return;
      state.items = data.items;
      state.status = data.status;
      state.loading = false;
      render();
    } catch (err) {
      if (seq !== state.seq) return;
      state.loading = false;
      render();
      $('#newsMeta').textContent = `載入失敗：${err.message}`;
    }
  }

  function init() {
    $('#newsTabs').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-cat]');
      if (!btn) return;
      window.App.activate('#newsTabs', btn);
      state.category = btn.dataset.cat;
      load();
    });
    let timer;
    $('#newsSearch').addEventListener('input', (e) => {
      clearTimeout(timer);
      timer = setTimeout(() => { state.q = e.target.value.trim(); load(); }, 300);
    });
  }

  window.App.views.news = { init, load, refresh: () => load({ refresh: true }), status: () => state.status, loaded: () => state.seq > 0 };
})();
