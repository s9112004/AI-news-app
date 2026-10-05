// 主程式：分頁切換、狀態視窗、列印、Service Worker
(() => {
  const App = window.App;
  const { $, $$, h } = App;
  let current = 'news';

  App.activate = (groupSel, btn) => {
    $$(`${groupSel} button`).forEach((b) => {
      b.classList.toggle('active', b === btn);
      b.setAttribute('aria-pressed', String(b === btn));
    });
  };

  App.showView = (name) => {
    if (!App.views[name]) return;
    current = name;
    $$('#views button').forEach((b) => b.classList.toggle('active', b.dataset.view === name));
    $$('.view').forEach((v) => { v.hidden = v.id !== `view-${name}`; });
    $('#refreshBtn').hidden = name === 'studio' || name === 'playbook';
    $('#statusBtn').hidden = name === 'studio' || name === 'playbook';
    if (!App.views[name].loaded()) App.views[name].load();
    try { history.replaceState(null, '', `#${name}`); } catch { /* 忽略 */ }
  };

  // 只列印指定區塊（可在列印視窗選「另存為 PDF」）
  App.printNode = (node) => {
    document.body.classList.add('printing');
    node.classList.add('print-target');
    const done = () => {
      document.body.classList.remove('printing');
      node.classList.remove('print-target');
      window.removeEventListener('afterprint', done);
    };
    window.addEventListener('afterprint', done);
    window.print();
  };

  Object.values(App.views).forEach((v) => v.init());

  $('#views').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-view]');
    if (btn) App.showView(btn.dataset.view);
  });
  $('#refreshBtn').addEventListener('click', () => App.views[current].refresh());
  $('#statusBtn').addEventListener('click', () => {
    const list = App.views[current].status();
    $('#statusList').replaceChildren(...(list.length ? list.map((s) => h('li', { class: s.ok ? 'ok' : 'fail' },
      `${s.ok ? '✅' : '⚠️'} ${s.name}：${s.ok ? `${s.count} 則` : s.error}`)) : [h('li', {}, '尚未載入。')]));
    $('#statusDialog').showModal();
  });

  // 新聞頁開著時，每 15 分鐘自動更新
  setInterval(() => { if (!document.hidden && current === 'news') App.views.news.load(); }, 15 * 60 * 1000);

  const start = (location.hash || '').slice(1);
  App.showView(App.views[start] ? start : 'news');

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
