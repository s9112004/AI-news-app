// 技巧指令庫：人工整理的 ChatGPT / Claude / Gemini 實用技巧與「提示詞捷徑」。
// 整理時間：2026 年 10 月。各家功能名稱、位置與方案限制會變動，請以官方說明為準。

const UPDATED_AT = '2026-10';

const OFFICIAL_HELP = {
  chatgpt: 'https://help.openai.com',
  claude: 'https://support.claude.com',
  gemini: 'https://support.google.com/gemini',
};

// 提示詞捷徑：像「/cheatsheet 主題」這種寫法在社群很流行，
// 但它們不是任何一家官方內建的指令——AI 只是把斜線後面的字當成一般指示來理解。
// 所以把完整意思寫清楚的「完整提示詞」通常效果更穩定。
const FORMATS = [
  {
    id: 'cheatsheet',
    command: '/cheatsheet',
    name: '一頁式重點筆記',
    plain: '像考前的小抄：把一個主題最重要的東西濃縮在一頁裡。',
    bestFor: ['考前複習', '新技術快速入門', '流程說明（例如：晶片怎麼做出來）'],
    textPrompt: '請把「{topic}」整理成一頁式重點筆記（cheat sheet）。包含：一句話總結、4–8 個重點段落（若是流程請依步驟順序）、必懂名詞解釋、3–5 點重點整理。用繁體中文，每點一到兩句話。',
    imagePrompt: '/cheatsheet {topic}。請做成直式一頁資訊圖表：標題、依序編號的步驟區塊（每塊有小插圖與一句說明）、底部「必懂名詞」與「重點整理」兩欄。繁體中文，文字清楚可讀。',
    studio: true,
  },
  {
    id: 'blueprint',
    command: '/blueprint',
    name: '主題拆解藍圖',
    plain: '像產品說明書的結構圖：把一個東西拆成「由什麼組成、怎麼運作、好處、挑戰」。',
    bestFor: ['理解一項產品或技術（例如：電動車）', '簡報開場的全貌圖', '做產業研究的框架'],
    textPrompt: '請把「{topic}」拆解成一份藍圖（blueprint）：1. 核心構造／組成元件 2. 運作流程（依序）3. 優點 4. 挑戰與限制 5. 實務上常見的方式或應用。用繁體中文，每項一到兩句話。',
    imagePrompt: '/blueprint {topic}。請做成資訊圖表：上方「核心構造」圖示列、中間「運作流程」箭頭圖、主視覺為標註各部位的剖面圖、下方「優點」「挑戰」兩欄。繁體中文標註。',
    note: '在圖片社群裡，/blueprint 也常被當成「白線藍底工程圖風格」的意思。想要哪一種，最好在後面寫清楚。',
    studio: true,
  },
  {
    id: 'flashcards',
    command: '/flashcards',
    name: '學習卡片',
    plain: '像背單字的閃卡：正面是問題，背面是答案，適合反覆練習。',
    bestFor: ['語言學習（例如：義大利文點餐對話）', '名詞與定義', '考試題目練習'],
    textPrompt: '請把「{topic}」做成 8–12 張學習卡片（flashcards）。每張包含：正面（問題或情境）、背面（答案或解釋）、記憶小撇步。若是語言學習，請附原文、中文與發音提示。',
    imagePrompt: '/flashcards {topic}。請做成 2 欄 × 4 列的卡片版面，每張卡有編號、情境、中文、原文、發音提示與小插圖。繁體中文。',
    studio: true,
  },
  {
    id: 'mindmap',
    command: '/mindmap',
    name: '心智圖',
    plain: '像一棵樹：中心是主題，往外長出分支，一眼看出各部分的關係。',
    bestFor: ['歷史或社會主題（例如：大航海時代）', '腦力激盪', '讀書筆記整理'],
    textPrompt: '請把「{topic}」整理成心智圖結構：一個中心主題、5–7 個主分支、每個分支 3–5 個子節點（用短語）。請用縮排清單呈現，繁體中文。',
    imagePrompt: '/mindmap {topic}。中心放主題插圖，往外 6 個彩色分支，每個分支有標題、3–5 個子項目與小圖示。繁體中文，文字清楚可讀。',
    studio: true,
  },
  {
    id: 'timeline',
    command: '/timeline',
    name: '時間軸',
    plain: '把事件依時間排成一條線，看出前因後果。',
    bestFor: ['歷史事件', '公司或產品發展史', '專案時程'],
    textPrompt: '請把「{topic}」整理成時間軸：依時間排序列出關鍵事件，每個事件包含時間、事件名稱、一句話說明與影響。不確定的日期請標註「需查證」。繁體中文。',
    imagePrompt: '/timeline {topic}。橫向時間軸資訊圖，每個節點有年份、標題、一句說明與小圖示。繁體中文。',
  },
  {
    id: 'compare',
    command: '/compare',
    name: '比較表',
    plain: '把幾個選項放在同一張表裡逐項比，幫你做決定。',
    bestFor: ['選購產品', '比較 AI 工具', '技術選型'],
    textPrompt: '請比較「{topic}」。先列出 5–8 個比較面向，再用表格逐項比較，最後給出「適合誰」的建議。資訊若可能已過時請註明。繁體中文。',
    imagePrompt: '/compare {topic}。左右對照的比較資訊圖，每列一個比較面向，用圖示與勾叉表示優劣。繁體中文。',
  },
  {
    id: 'eli5',
    command: '/eli5',
    name: '白話解釋',
    plain: 'ELI5 是「Explain Like I\'m 5」，用講給小朋友聽的方式解釋。',
    bestFor: ['看不懂的專有名詞', '跟長輩或小孩解釋', '先建立直覺再學細節'],
    textPrompt: '請用非常白話的方式解釋「{topic}」：先一句話定義，再用一個生活比喻說明，最後舉一個實際例子。避免專有名詞，必要時加括號解釋。繁體中文。',
    imagePrompt: '/eli5 {topic}。用可愛插畫風格的四格圖解，每格一句白話說明。繁體中文。',
  },
];

// 各平台實用技巧。steps 會在 App 裡畫成流程圖。
const TIPS = [
  // ---- 通用 ----
  {
    id: 'prompt-formula',
    platform: 'all',
    title: '提示詞四要素：角色＋任務＋背景＋格式',
    plain: '就像交代工作給新同事：說清楚你是誰、要做什麼、為什麼、交出什麼樣子的成果。',
    steps: ['指定角色：「你是資深行銷顧問」', '說明任務：「幫我寫三個產品標語」', '補充背景：目標客群、限制、用途', '指定格式：字數、條列、表格、語氣', '看結果後追問修改'],
    example: '你是資深行銷顧問。請為我們的無糖手搖飲寫 3 個標語，目標客群是 25–35 歲上班族，每個不超過 15 字，語氣輕鬆，用表格列出標語與設計理由。',
  },
  {
    id: 'few-shot',
    platform: 'all',
    title: '先給範例，再請它照做',
    plain: '與其形容半天，不如直接給一兩個「我要的樣子」，AI 會模仿得更準。',
    steps: ['準備 1–3 個理想範例', '貼上範例並說明「請依照這個格式」', '給新的題目', '比對輸出與範例是否一致'],
    example: '以下是我喜歡的產品介紹寫法：\n範例：「＿＿＿」\n請用同樣的語氣與長度，介紹這個新產品：＿＿＿',
  },
  {
    id: 'ask-first',
    platform: 'all',
    title: '請 AI 先問你問題',
    plain: '任務模糊時，讓 AI 先當訪問者，把缺少的資訊問清楚，再開始寫。',
    steps: ['描述大致需求', '加一句：「開始前，先問我 3–5 個你需要知道的問題」', '回答問題', 'AI 依你的答案產出'],
    example: '我想規劃一趟 5 天的日本親子旅行。開始規劃前，請先問我 5 個你需要知道的問題。',
  },
  {
    id: 'verify',
    platform: 'all',
    title: '要求標出不確定的地方與來源',
    plain: 'AI 有時會說得很有自信但其實是錯的（俗稱「幻覺」）。請它自己標出沒把握的地方。',
    steps: ['提出問題', '加一句：「不確定的內容請標註，並附上可查證的來源」', '打開來源核對', '對有疑問的部分追問'],
    example: '請說明台灣電動車補助的現行規定。不確定或可能已過時的資訊請標註「需查證」，並列出可以查證的官方來源。',
  },

  // ---- ChatGPT ----
  {
    id: 'chatgpt-custom-instructions',
    platform: 'chatgpt',
    title: '自訂指令／個人化：讓每次對話都記得你的偏好',
    plain: '像先把「自我介紹」和「說話規則」交給 ChatGPT，之後每次開新對話都會套用。',
    steps: ['點左下角頭像', '進入「設定」→「個人化」', '填寫你的身分與希望的回覆方式', '儲存後開新對話測試'],
    example: '我是行銷企劃。回答一律使用繁體中文、先給結論再說明、盡量用條列。',
  },
  {
    id: 'chatgpt-projects',
    platform: 'chatgpt',
    title: '專案（Projects）：把同一件事的對話與檔案放一起',
    plain: '像一個資料夾，裡面的對話共用同一批檔案和指示，不用每次重貼背景。',
    steps: ['側邊欄建立新專案', '上傳相關檔案', '設定專案專屬指示', '在專案內開新對話'],
  },
  {
    id: 'chatgpt-image',
    platform: 'chatgpt',
    title: '建立圖像＋提示詞捷徑，做出資訊圖表',
    plain: '你截圖裡的 /cheatsheet、/mindmap 就是這招：在建立圖像時輸入「捷徑＋主題」，ChatGPT 會把它當成版面指示。',
    steps: ['在輸入框選擇「建立圖像」', '輸入「/mindmap 大航海時代」這類捷徑＋主題', '補充風格、語言、版面需求', '生成後檢查文字與內容是否正確', '指出錯誤處請它修改'],
    note: '這些斜線捷徑不是官方指令。圖片中的小字偶爾會出錯，重要內容請務必核對。',
  },
  {
    id: 'chatgpt-deep-research',
    platform: 'chatgpt',
    title: '深度研究（Deep research）：自動上網查資料寫報告',
    plain: '像請一位研究助理花一段時間搜尋多個網站，最後交一份附來源的報告。',
    steps: ['在工具選單選「深度研究」', '清楚描述研究問題與範圍', '回答它提出的釐清問題', '等待完成後檢查引用來源'],
  },

  // ---- Claude ----
  {
    id: 'claude-projects',
    platform: 'claude',
    title: '專案（Projects）：專屬知識庫＋指示',
    plain: '把公司文件、寫作規範放進專案，Claude 在這個專案的每段對話都會參考它們。',
    steps: ['側邊欄建立新專案', '在專案知識中上傳文件', '撰寫專案指示（例如語氣、格式）', '在專案中開始對話'],
  },
  {
    id: 'claude-artifacts',
    platform: 'claude',
    title: 'Artifacts：直接產出可用的文件、網頁、圖表',
    plain: 'Claude 不會像 ChatGPT 一樣畫圖片，但它能直接做出可互動的網頁、圖表、心智圖，放在旁邊的視窗。',
    steps: ['請 Claude 做一個「互動式心智圖」或「一頁式筆記網頁」', '在右側視窗預覽', '用對話請它修改', '下載或分享連結'],
    example: '請把「晶片是怎麼做出來的」做成一頁式重點筆記網頁，依步驟編號，每步附一句白話說明與小圖示。',
  },
  {
    id: 'claude-skills',
    platform: 'claude',
    title: 'Skills：把常用工作流程打包成「技能」',
    plain: '像幫 Claude 準備一本 SOP 手冊：裡面有步驟說明（SKILL.md）和需要的檔案，Claude 碰到相關任務時會自動拿出來用。',
    steps: ['到設定中開啟 Skills 功能', '啟用內建技能，或上傳自己做的技能資料夾', '正常提出任務', 'Claude 判斷相關時自動套用'],
    note: '可用範圍依方案而定，請以官方說明為準。',
  },
  {
    id: 'claude-xml',
    platform: 'claude',
    title: '用 XML 標籤把資料和指示分開',
    plain: 'Anthropic 官方建議用 <文件>…</文件> 這類標籤包住資料，Claude 比較不會把資料內容和你的指示搞混。',
    steps: ['把要處理的資料包在標籤裡', '標籤外寫清楚任務', '指定輸出格式', '需要時請它把答案也放進標籤'],
    example: '<合約>\n（貼上合約內容）\n</合約>\n請列出這份合約中對乙方不利的條款，並用白話說明風險。',
  },
  {
    id: 'claude-code-commands',
    platform: 'claude',
    title: 'Claude Code 常用斜線指令',
    plain: 'Claude Code 是給寫程式用的版本，裡面的斜線指令是「真的官方指令」。',
    steps: ['/init：產生專案說明檔 CLAUDE.md', '/clear：清空對話重新開始', '/compact：壓縮對話，節省上下文空間', '/help：查看所有可用指令'],
    link: 'https://code.claude.com/docs',
  },

  // ---- Gemini ----
  {
    id: 'gemini-gems',
    platform: 'gemini',
    title: 'Gems：建立自己的專屬 Gemini 助手',
    plain: '像訓練一個專門做某件事的小幫手，例如「英文作文批改老師」，之後直接叫它出來用。',
    steps: ['在側邊欄找到 Gem 管理', '建立新 Gem 並撰寫指示', '（可選）上傳參考檔案', '儲存後直接對話使用'],
  },
  {
    id: 'gemini-apps',
    platform: 'gemini',
    title: '用 @ 呼叫 Google 應用程式',
    plain: '在提問時輸入 @，就能讓 Gemini 去查你的 Gmail、YouTube、Google 地圖等服務。',
    steps: ['在輸入框輸入 @', '選擇要使用的應用程式（例如 YouTube）', '接著輸入問題', '檢查結果並追問'],
    example: '@YouTube 幫我找 3 支介紹 AI Agent 的中文影片，並各用一句話說明重點。',
    note: '可用的應用程式與帳號類型、地區有關。',
  },
  {
    id: 'gemini-deep-research',
    platform: 'gemini',
    title: 'Deep Research：自動規劃並執行研究',
    plain: 'Gemini 會先列出研究計畫給你確認，再上網查資料、整理成報告。',
    steps: ['選擇 Deep Research', '輸入研究主題', '檢查並調整研究計畫', '開始研究並閱讀報告與來源'],
  },
  {
    id: 'notebooklm',
    platform: 'gemini',
    title: 'NotebookLM：用你自己的資料做筆記、心智圖、語音摘要',
    plain: 'Google 的另一個 AI 工具：上傳你的資料，它只根據這些資料回答，還能做出心智圖和像 Podcast 一樣的語音摘要。',
    steps: ['到 NotebookLM 建立筆記本', '上傳 PDF、網址或文件', '提問或產生心智圖、語音摘要', '點引用標記核對原文'],
    link: 'https://notebooklm.google.com',
  },
];

module.exports = { UPDATED_AT, OFFICIAL_HELP, FORMATS, TIPS };
