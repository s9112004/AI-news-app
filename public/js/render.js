// 視覺化元件：流程圖、一頁式筆記、藍圖、學習卡片、心智圖、工具解析
(() => {
  const { h } = window.App;
  const R = (window.App.render = {});

  const PALETTE = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#14b8a6'];
  R.color = (i) => PALETTE[i % PALETTE.length];

  // 流程圖：nodes = [{kind:'start'|'step'|'decision'|'end', label, note}] 或字串陣列
  R.flow = (nodes) => {
    let stepNo = 0;
    const list = nodes.map((n) => {
      const node = typeof n === 'string' ? { kind: 'step', label: n, note: '' } : { ...n };
      if (!node.kind || node.kind === 'step') node.idx = ++stepNo;
      return node;
    });
    const wrap = h('ol', { class: 'flow', 'aria-label': '流程圖' });
    list.forEach((n, i) => {
      wrap.appendChild(h('li', { class: `flow-node flow-${n.kind || 'step'}` },
        n.kind === 'decision' ? h('span', { class: 'flow-icon', 'aria-hidden': 'true' }, '◆') : null,
        n.kind === 'step' || !n.kind ? h('span', { class: 'flow-num' }, String(n.idx)) : null,
        h('div', { class: 'flow-text' },
          h('div', { class: 'flow-label' }, n.label),
          n.note ? h('div', { class: 'flow-note' }, n.note) : null)));
      if (i < list.length - 1) wrap.appendChild(h('li', { class: 'flow-arrow', 'aria-hidden': 'true' }, '↓'));
    });
    return wrap;
  };

  const section = (title, ...body) => h('section', { class: 'sheet-section' }, h('h3', {}, title), ...body);
  const bullets = (arr) => h('ul', { class: 'bullets' }, arr.map((t) => h('li', {}, t)));
  const header = (d, tag) => h('header', { class: 'sheet-head' },
    h('span', { class: 'sheet-tag' }, tag),
    h('h2', {}, d.title),
    d.subtitle ? h('p', { class: 'sheet-sub' }, d.subtitle) : null);

  R.cheatsheet = (d) => h('article', { class: 'sheet' },
    header(d, 'CHEAT SHEET 一頁式重點筆記'),
    d.summary ? h('p', { class: 'sheet-summary' }, '💡 ', d.summary) : null,
    h('div', { class: 'sheet-grid' }, d.sections.map((s, i) => h('div', { class: 'sheet-card', style: `--c:${R.color(i)}` },
      h('h4', {}, h('span', { class: 'num' }, String(i + 1)), s.heading),
      bullets(s.points)))),
    h('div', { class: 'sheet-two' },
      section('📖 你一定要懂的名詞', h('dl', { class: 'glossary' }, d.glossary.flatMap((g) => [h('dt', {}, g.term), h('dd', {}, g.meaning)]))),
      section('🏆 重點整理', h('ol', { class: 'takeaways' }, d.keyTakeaways.map((t) => h('li', {}, t))))));

  const titledCards = (items, cls) => h('div', { class: `mini-grid ${cls || ''}` },
    items.map((it, i) => h('div', { class: 'mini-card', style: `--c:${R.color(i)}` }, h('strong', {}, it.title || it.name), h('p', {}, it.detail || it.role))));

  R.blueprint = (d) => h('article', { class: 'sheet blueprint' },
    header(d, 'BLUEPRINT 主題拆解藍圖'),
    section('01 核心構造', titledCards(d.components)),
    section('02 運作流程', h('div', { class: 'process' }, d.process.map((p, i) => h('div', { class: 'process-step' },
      h('span', { class: 'num' }, String(i + 1)), h('strong', {}, p.step), h('p', {}, p.detail))))),
    h('div', { class: 'sheet-two' },
      section('03 優點', titledCards(d.pros, 'pros')),
      section('04 挑戰', titledCards(d.challenges, 'cons'))),
    d.practical.length ? section('05 實務應用', titledCards(d.practical)) : null);

  R.flashcards = (d) => h('article', { class: 'sheet' },
    header(d, 'FLASHCARDS 學習卡片'),
    h('p', { class: 'hint-line' }, '點卡片可以翻面'),
    h('div', { class: 'cards' }, d.cards.map((c, i) => {
      const card = h('button', { type: 'button', class: 'flashcard', style: `--c:${R.color(i)}`, 'aria-label': `第 ${i + 1} 張卡片，點擊翻面` },
        h('div', { class: 'fc-inner' },
          h('div', { class: 'fc-face fc-front' }, h('span', { class: 'num' }, String(i + 1)), h('p', {}, c.front)),
          h('div', { class: 'fc-face fc-back' }, h('p', {}, c.back), c.hint ? h('small', {}, '💡 ', c.hint) : null)));
      card.addEventListener('click', () => card.classList.toggle('flipped'));
      return card;
    })));

  R.mindmap = (d) => {
    const half = Math.ceil(d.branches.length / 2);
    const branch = (b, i, side) => h('div', { class: `mm-branch ${side}`, style: `--c:${R.color(i)}` },
      h('div', { class: 'mm-label' }, b.label),
      h('ul', {}, b.children.map((c) => h('li', {}, c))));
    return h('article', { class: 'sheet' },
      header({ title: d.title }, 'MINDMAP 心智圖'),
      h('div', { class: 'mindmap' },
        h('div', { class: 'mm-col left' }, d.branches.slice(0, half).map((b, i) => branch(b, i, 'left'))),
        h('div', { class: 'mm-center' }, d.center),
        h('div', { class: 'mm-col right' }, d.branches.slice(half).map((b, i) => branch(b, i + half, 'right')))));
  };

  R.study = (format, data) => {
    const fn = R[format];
    return fn ? fn(data) : h('p', {}, '不支援的格式');
  };

  // 工具解析結果
  R.analysis = (a, item) => {
    const copyable = (t) => h('div', { class: 'copy-row' }, h('code', {}, t), h('button', { type: 'button', class: 'small-btn', onclick: () => window.App.copy(t) }, '複製'));
    return h('article', { class: 'sheet analysis' },
      header({ title: a.name || item.title, subtitle: a.oneLiner }, 'AI 工具解析'),
      h('div', { class: 'sheet-two' },
        section('這是什麼？', h('p', {}, a.whatItIs)),
        section('適合誰？', h('p', {}, a.whoFor))),
      a.setup.length ? section('🧰 開始前準備', bullets(a.setup)) : null,
      section('🪜 使用步驟', h('ol', { class: 'steps' }, a.steps.map((s) => h('li', {}, h('strong', {}, s.title), h('p', {}, s.detail))))),
      section('🗺️ 使用流程圖', R.flow(a.flow)),
      a.examplePrompts.length ? section('⌨️ 可直接使用的指令／提示詞', a.examplePrompts.map(copyable)) : null,
      h('div', { class: 'sheet-two' },
        a.tips.length ? section('✅ 小技巧', bullets(a.tips)) : null,
        a.cautions.length ? section('⚠️ 注意事項', bullets(a.cautions)) : null),
      h('p', { class: 'source-note' }, 'ℹ️ ', a.sourceNote, '　原始連結：', h('a', { href: item.link, target: '_blank', rel: 'noopener noreferrer' }, item.link)));
  };
})();
