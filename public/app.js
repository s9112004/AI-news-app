// AI 新聞雷達 前端邏輯
(() => {
  const CATEGORY_NAMES = { industry: '產業動態', research: '研究與知識', official: '官方公告', zh: '中文媒體' };
  const AUTO_REFRESH_MS = 15 * 60 * 1000;
  const SAVED_KEY = 'ai-news-saved';

  const $ = (sel) => document.querySelector(sel);
  const listEl = $('#list');
  const metaEl = $('#meta');
  const emptyEl = $('#empty');
  const searchEl = $('#search');
  const tpl = $('#cardTpl');

  const state = { category: '', q: '', items: [], status: [], loading: false };

  // ---- 收藏（存在瀏覽器本機）----
  function loadSaved() {
    try { return JSON.parse(localStorage.getItem(SAVED_KEY)) || []; } catch { return []; }
  }
  function storeSaved(list) {
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(list)); } catch { /* 無痕模式等情況忽略 */ }
  }
  let saved = loadSaved();
  const isSaved = (link) => saved.some((s) => s.link === link);
  function toggleSaved(item) {
    saved = isSaved(item.link) ? saved.filter((s) => s.link !== item.link) : [item, ...saved];
    storeSaved(saved);
  }

  // ---- 工具 ----
  function relativeTime(iso) {
    if (!iso) return '';
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return '剛剛';
    if (diff < 3600) return `${Math.floor(diff / 60)} 分鐘前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} 小時前`;
    if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} 天前`;
    return new Date(iso).toLocaleDateString('zh-TW');
  }
  const safeUrl = (u) => (/^https?:\/\//i.test(u) ? u : '#');

  // ---- 繪製 ----
  function render() {
    const items = state.category === 'saved'
      ? saved.filter((it) => !state.q || `${it.title} ${it.summary}`.toLowerCase().includes(state.q.toLowerCase()))
      : state.items;

    listEl.replaceChildren();
    const frag = document.createDocumentFragment();
    for (const item of items) {
      const node = tpl.content.firstElementChild.cloneNode(true);
      node.querySelector('.badge').textContent = CATEGORY_NAMES[item.category] || '';
      node.querySelector('.badge').dataset.cat = item.category;
      node.querySelector('.source').textContent = item.sourceName;
      const timeEl = node.querySelector('.time');
      timeEl.textContent = relativeTime(item.publishedAt);
      if (item.publishedAt) {
        timeEl.dateTime = item.publishedAt;
        timeEl.title = new Date(item.publishedAt).toLocaleString('zh-TW');
      }
      const a = node.querySelector('.title');
      a.textContent = item.title;
      a.href = safeUrl(item.link);
      const summary = node.querySelector('.summary');
      summary.textContent = item.summary;
      summary.hidden = !item.summary;

      const saveBtn = node.querySelector('.save-btn');
      const syncSave = () => { saveBtn.textContent = isSaved(item.link) ? '★ 已收藏' : '☆ 收藏'; };
      syncSave();
      saveBtn.addEventListener('click', () => {
        toggleSaved(item);
        if (state.category === 'saved') render(); else syncSave();
      });

      node.querySelector('.share-btn').addEventListener('click', async () => {
        const data = { title: item.title, url: item.link };
        try {
          if (navigator.share) await navigator.share(data);
          else { await navigator.clipboard.writeText(`${item.title}\n${item.link}`); alert('已複製連結'); }
        } catch { /* 使用者取消 */ }
      });
      frag.appendChild(node);
    }
    listEl.appendChild(frag);

    emptyEl.hidden = items.length > 0 || state.loading;
    emptyEl.textContent = state.category === 'saved'
      ? '還沒有收藏的文章，點文章下方的「☆ 收藏」即可加入。'
      : '目前沒有符合條件的新聞。可以換個關鍵字，或按右上角 ⟳ 重新抓取。';

    if (state.category !== 'saved') {
      const failed = state.status.filter((s) => !s.ok).length;
      metaEl.textContent = state.loading
        ? '正在抓取最新新聞…'
        : `共 ${items.length} 則・${state.status.length - failed}/${state.status.length} 個來源正常${failed ? '（按 ⓘ 查看）' : ''}`;
    } else {
      metaEl.textContent = `收藏 ${items.length} 則`;
    }
  }

  function renderStatus() {
    const ul = $('#statusList');
    ul.replaceChildren();
    for (const s of state.status) {
      const li = document.createElement('li');
      li.className = s.ok ? 'ok' : 'fail';
      li.textContent = `${s.ok ? '✅' : '⚠️'} ${s.name}：${s.ok ? `${s.count} 則` : s.error}`;
      ul.appendChild(li);
    }
    if (!state.status.length) ul.textContent = '尚未載入。';
  }

  // ---- 資料 ----
  let requestSeq = 0;
  async function load({ refresh = false } = {}) {
    const seq = ++requestSeq;
    if (state.category === 'saved') { state.loading = false; return render(); }
    state.loading = true;
    render();
    const params = new URLSearchParams();
    if (state.category) params.set('category', state.category);
    if (state.q) params.set('q', state.q);
    if (refresh) params.set('refresh', '1');
    try {
      const res = await fetch(`/api/news?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (seq !== requestSeq) return; // 已有更新的請求，丟棄舊結果
      state.items = data.items;
      state.status = data.status;
      state.loading = false;
      render();
    } catch (err) {
      if (seq !== requestSeq) return;
      state.loading = false;
      render();
      metaEl.textContent = `載入失敗：${err.message}`;
    }
  }

  // ---- 事件 ----
  $('#tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-cat]');
    if (!btn) return;
    document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('active', b === btn));
    state.category = btn.dataset.cat;
    load();
  });

  let searchTimer;
  searchEl.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.q = searchEl.value.trim(); load(); }, 300);
  });

  $('#refreshBtn').addEventListener('click', () => load({ refresh: true }));
  $('#statusBtn').addEventListener('click', () => { renderStatus(); $('#statusDialog').showModal(); });

  setInterval(() => { if (!document.hidden) load(); }, AUTO_REFRESH_MS);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  load();
})();
