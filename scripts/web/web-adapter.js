// 網頁版（claude.ai Artifact）轉接層：
// 網頁版沒有自己的伺服器，也不能連外網，所以：
// - 技巧指令庫：資料直接內嵌在頁面裡
// - AI 工作室：改用 claude.ai 的 sample 功能，由瀏覽者自己的 Claude 帳號回答（不需要 API 金鑰）
// - 新聞、工具雷達：需要連外網抓資料，網頁版改成顯示「如何在電腦上執行完整版」
(() => {
  const App = window.App;
  const P = window.AiPrompts;
  const { h } = App;
  App.webEdition = true;
  App.defaultView = 'playbook';

  let samplePromise = null;
  const getSample = () => {
    if (!samplePromise) {
      samplePromise = window.claude && typeof window.claude.use === 'function'
        ? window.claude.use('sample').catch(() => null)
        : Promise.resolve(null);
    }
    return samplePromise;
  };

  const SAMPLE_ERRORS = {
    not_granted: '你沒有允許這個網頁使用 Claude。重新整理頁面，在詢問視窗按「允許」後再試一次。',
    sampling_disabled: '你的帳號或組織沒有開放這個功能。',
    rate_limited: '使用太頻繁，或已達 Claude 用量上限，請稍後再試。',
    session_expired: '登入已過期，請重新登入 claude.ai 後再試。',
    refused: 'Claude 拒絕處理這個主題，請換個描述方式。',
    invalid_json: 'AI 回傳的內容不完整，請再按一次「開始生成」。',
    empty_completion: 'AI 沒有回傳內容，請把主題寫得具體一點再試。',
    prompt_too_large: '主題太長了，請縮短一點。',
  };

  async function askJson(format, prompt) {
    const sample = await getSample();
    if (!sample) throw new Error('AI 功能需要在 claude.ai 裡開啟這個網頁才能使用。');
    const input = `${P.BASE_SYSTEM}

${prompt}

只回覆一個 JSON 物件，不要加任何其他文字。JSON 必須符合這個 JSON Schema：
${JSON.stringify(P.SCHEMAS[format])}`;
    try {
      return P.normalize(format, await sample.json(input));
    } catch (e) {
      throw new Error(SAMPLE_ERRORS[e && e.code] || 'AI 暫時無法回應，請稍後再試。');
    }
  }

  App.api = async (path, body) => {
    if (path === '/api/playbook') return window.__PLAYBOOK__;
    if (path === '/api/studio') {
      const topic = String((body && body.topic) || '').trim();
      const format = body && body.format;
      if (!P.STUDY_INSTRUCTIONS[format]) throw new Error('不支援的格式');
      if (!topic || topic.length > 100) throw new Error('請輸入 1–100 字的主題');
      return { format, topic, data: await askJson(format, P.buildStudyPrompt(format, topic)) };
    }
    // 新聞與工具雷達需要連外網，網頁版不提供
    if (path.startsWith('/api/news') || path.startsWith('/api/tools')) return { items: [], status: [] };
    throw new Error('網頁版不支援這個功能');
  };

  App.checkAi = async () => Boolean(await getSample());
  App.aiSetupHint = () => h('div', { class: 'notice' },
    h('strong', {}, 'AI 功能需要在 claude.ai 裡使用'),
    h('p', {}, '請從 claude.ai 的 Artifact 連結開啟這個網頁。第一次生成時會詢問是否允許使用你的 Claude 帳號，按「允許」即可。'));

  // 網頁版無法開啟列印視窗，也沒有 prompt() 對話框
  App.printNode = () => {};
  App.copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      App.toast('已複製');
    } catch {
      App.toast('無法自動複製，請長按或拖曳選取文字後複製');
    }
  };

  // 新聞、工具雷達：改成說明如何執行完整版
  const fullVersionNotice = (what) => h('div', { class: 'notice' },
    h('strong', {}, `${what}需要在你的電腦上執行完整版`),
    h('p', {}, `網頁版不能連到外部網站，所以沒辦法即時抓取${what === '即時新聞' ? '新聞' : 'GitHub 與社群資料'}。在電腦上照下面步驟執行，就能使用全部功能：`),
    h('ol', { class: 'setup-steps' },
      h('li', {}, '安裝 Node.js 21 以上版本（nodejs.org）'),
      h('li', {}, '下載專案：', h('code', {}, 'git clone -b claude/blissful-pasteur-7tw1zc https://github.com/s9112004/AI-news-app.git')),
      h('li', {}, '進入資料夾並安裝：', h('code', {}, 'cd AI-news-app && npm install')),
      h('li', {}, '啟動：', h('code', {}, 'npm start')),
      h('li', {}, '用瀏覽器打開 ', h('code', {}, 'http://localhost:3000'))),
    h('p', {}, '想在完整版也使用 AI 解析，啟動前要設定 ANTHROPIC_API_KEY（到 console.anthropic.com 申請）。'));

  const mount = () => {
    // 列表元素保留在頁面上（程式會用到），只是隱藏
    document.querySelector('#view-news .content').prepend(fullVersionNotice('即時新聞'));
    document.querySelector('#view-tools .content').prepend(fullVersionNotice('工具雷達'));
    document.querySelectorAll('#newsMeta, #newsList, #newsEmpty, #toolsMeta, #toolsList, #toolsEmpty').forEach((el) => { el.style.display = 'none'; });
    document.querySelectorAll('#view-news .controls, #view-tools .controls').forEach((el) => { el.hidden = true; });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
