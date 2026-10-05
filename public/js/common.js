// 共用小工具（全部掛在 window.App 底下，各頁面腳本共用）
window.App = window.App || {};
(() => {
  const App = window.App;

  App.$ = (sel, root = document) => root.querySelector(sel);
  App.$$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // 安全地建立 DOM：文字一律用 textContent，不用 innerHTML
  App.h = (tag, attrs = {}, ...children) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'href') el.href = App.safeUrl(v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat()) {
      if (c === null || c === undefined || c === false) continue;
      el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return el;
  };

  App.safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? u : '#');

  App.relativeTime = (iso) => {
    if (!iso) return '';
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return '剛剛';
    if (diff < 3600) return `${Math.floor(diff / 60)} 分鐘前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} 小時前`;
    if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} 天前`;
    return new Date(iso).toLocaleDateString('zh-TW');
  };

  App.toast = (msg) => {
    let t = App.$('#toast');
    if (!t) {
      t = App.h('div', { id: 'toast', role: 'status' });
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(App._toastTimer);
    App._toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
  };

  App.copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      App.toast('已複製');
    } catch {
      window.prompt('請手動複製：', text);
    }
  };

  App.api = async (path, body) => {
    const res = await fetch(path, body
      ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      : undefined);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  };

  App.storage = {
    get(key, fallback) {
      try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* 無痕模式等情況忽略 */ }
    },
  };

  App.views = {};

  App.PLATFORM_NAMES = { all: '通用', chatgpt: 'ChatGPT', claude: 'Claude', gemini: 'Gemini' };

  // AI 是否可用（伺服器有設定金鑰）
  App.aiStatus = null;
  App.checkAi = async () => {
    if (App.aiStatus === null) {
      try { App.aiStatus = (await App.api('/api/ai/status')).configured; } catch { App.aiStatus = false; }
    }
    return App.aiStatus;
  };

  App.aiSetupHint = () => App.h('div', { class: 'notice' },
    App.h('strong', {}, '尚未設定 AI 金鑰'),
    App.h('p', {}, '這個功能會呼叫 Claude API。請在啟動伺服器前設定環境變數 ANTHROPIC_API_KEY（到 console.anthropic.com 申請），然後重新啟動：'),
    App.h('pre', {}, 'ANTHROPIC_API_KEY=你的金鑰 npm start'),
  );
})();
