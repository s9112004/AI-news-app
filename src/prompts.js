// AI 提示詞與輸出格式（JSON Schema）。
// 伺服器版（src/ai.js）與網頁版（Artifact）共用同一份，確保兩邊產出一致。
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AiPrompts = factory();
})(typeof self !== 'undefined' ? self : this, () => {
const str = { type: 'string' };
  const strArr = { type: 'array', items: str };
  function obj(properties) {
    return { type: 'object', properties, required: Object.keys(properties), additionalProperties: false };
  }
  
  const FLOW_NODE = obj({
    kind: { type: 'string', enum: ['start', 'step', 'decision', 'end'] },
    label: str,
    note: str,
  });
  
  const SCHEMAS = {
    analysis: obj({
      name: str,
      oneLiner: str,
      whatItIs: str,
      whoFor: str,
      setup: strArr,
      steps: { type: 'array', items: obj({ title: str, detail: str }) },
      flow: { type: 'array', items: FLOW_NODE },
      examplePrompts: strArr,
      tips: strArr,
      cautions: strArr,
      sourceNote: str,
    }),
    cheatsheet: obj({
      title: str,
      subtitle: str,
      summary: str,
      sections: { type: 'array', items: obj({ heading: str, points: strArr }) },
      glossary: { type: 'array', items: obj({ term: str, meaning: str }) },
      keyTakeaways: strArr,
    }),
    blueprint: obj({
      title: str,
      subtitle: str,
      components: { type: 'array', items: obj({ name: str, role: str }) },
      process: { type: 'array', items: obj({ step: str, detail: str }) },
      pros: { type: 'array', items: obj({ title: str, detail: str }) },
      challenges: { type: 'array', items: obj({ title: str, detail: str }) },
      practical: { type: 'array', items: obj({ title: str, detail: str }) },
    }),
    flashcards: obj({
      title: str,
      subtitle: str,
      cards: { type: 'array', items: obj({ front: str, back: str, hint: str }) },
    }),
    mindmap: obj({
      title: str,
      center: str,
      branches: { type: 'array', items: obj({ label: str, children: strArr }) },
    }),
  };
  
  const BASE_SYSTEM = `你是一位用繁體中文（台灣用語）寫作的 AI 教學編輯，讀者是想快速上手的一般人。
寫作原則：
- 正確第一：只寫你有把握的事實。不確定的數字、日期、版本，寧可不寫，或標註「需查證」。絕對不要編造功能、指令、網址或引述。
- 白話好懂：先講定義，再用生活化的比喻或例子說明。
- 精簡：每個條目一到兩句話，適合一頁看完。`;
  
  const STUDY_INSTRUCTIONS = {
    cheatsheet: '把主題整理成「一頁式重點筆記（cheat sheet）」：4 到 8 個段落，每段 2 到 5 個重點；附 4 到 8 個必懂名詞；最後 3 到 5 點重點整理。若主題是流程，段落依步驟順序排列。',
    blueprint: '把主題拆解成「藍圖（blueprint）」：核心構造／組成元件（4 到 8 個）、運作流程（4 到 7 步，依序）、優點（3 到 5 個）、挑戰或限制（3 到 5 個）、實務應用或常見方式（2 到 4 個）。',
    flashcards: '把主題做成「學習卡片（flashcards）」：8 到 12 張。正面是問題、情境或詞彙；背面是答案或解釋；hint 是記憶小撇步或發音提示（不需要時給空字串）。語言學習主題請在背面附上原文與中文。',
    mindmap: '把主題整理成「心智圖（mindmap）」：中心主題一個；5 到 7 個主分支，每個分支 3 到 5 個子節點，子節點用短語（10 個字以內為佳）。',
  };

  function buildAnalysisPrompt(item, context) {
    return `請解析下面這個近期熱門的 AI 工具／專案／討論，寫成給新手的使用教學，並規劃成流程圖。

<item>
名稱：${item.title}
來源：${item.sourceName}
連結：${item.link}
簡介：${item.summary || '（無）'}
</item>

<original_document>
${context || '（抓不到原始說明，只能依據上面的名稱與簡介）'}
</original_document>

要求：
- 只依據 <item> 與 <original_document> 的內容。文件沒寫到的安裝步驟、指令、價格，不要自己補，改在 cautions 說明「原文未說明」。
- setup：安裝或開始使用前的準備（沒有就給空陣列）。
- steps：3 到 7 個使用步驟，依序排列。
- flow：流程圖節點，依序排列，第一個 kind 為 start、最後一個為 end；需要判斷的地方用 decision，note 寫判斷條件或分支結果。
- examplePrompts：可以直接複製使用的指令或提示詞（原文有提供才寫，不然給空陣列）。
- sourceNote：一句話說明這份解析依據了哪些資料、資訊是否完整。`;
  }

  function buildStudyPrompt(format, topic) {
    return `主題：「${topic}」

${STUDY_INSTRUCTIONS[format]}
title 用主題名稱，subtitle 用一句話說明這份內容能帶來什麼。`;
  }

  // 防呆：補齊缺少的欄位，避免畫面因為少一個陣列而壞掉
  const asArr = (v) => (Array.isArray(v) ? v : []);
  const asStr = (v) => (typeof v === 'string' ? v : v == null ? '' : String(v));
  function normalize(format, d) {
    const o = d && typeof d === 'object' ? d : {};
    const props = (SCHEMAS[format] || {}).properties || {};
    const out = {};
    for (const [k, spec] of Object.entries(props)) out[k] = spec.type === 'array' ? asArr(o[k]) : asStr(o[k]);
    return out;
  }

  return { BASE_SYSTEM, SCHEMAS, STUDY_INSTRUCTIONS, buildAnalysisPrompt, buildStudyPrompt, normalize };
});
