// AI 工具雷達：掃描 GitHub 與社群，找出近期最熱門的 AI 工具、Skill、提示詞技巧。
const { parseFeed } = require('./feedParser');

const CACHE_TTL_MS = 60 * 60 * 1000; // 熱門榜變化較慢，快取 1 小時
const FETCH_TIMEOUT_MS = 12000;

const TOOL_GROUPS = {
  github: 'GitHub 熱門專案',
  community: '社群熱議',
};

// GitHub 搜尋：只看最近 N 天內建立、依星數排序的專案，才抓得到「新竄紅」的工具
const GITHUB_QUERIES = [
  { id: 'gh-skills', name: 'Claude / Agent Skills', q: 'claude skills OR agent skills', days: 90 },
  { id: 'gh-mcp', name: 'MCP 伺服器', q: 'topic:mcp-server', days: 60 },
  { id: 'gh-agents', name: 'AI Agent 工具', q: 'topic:ai-agents', days: 30 },
  { id: 'gh-prompts', name: '提示詞與教學', q: 'prompts in:name,description chatgpt OR claude OR gemini', days: 90 },
];

// 社群 RSS：Reddit 每週熱門、Hacker News 的 Show HN（作者自己發表的新工具）
const COMMUNITY_FEEDS = [
  { id: 'hn-show', name: 'Show HN（AI 新工具）', url: 'https://hnrss.org/show?q=AI&points=30' },
  { id: 'r-chatgpt', name: 'r/ChatGPT 本週熱門', url: 'https://www.reddit.com/r/ChatGPT/top/.rss?t=week' },
  { id: 'r-claude', name: 'r/ClaudeAI 本週熱門', url: 'https://www.reddit.com/r/ClaudeAI/top/.rss?t=week' },
  { id: 'r-gemini', name: 'r/GeminiAI 本週熱門', url: 'https://www.reddit.com/r/GeminiAI/top/.rss?t=week' },
  { id: 'r-prompt', name: 'r/PromptEngineering 本週熱門', url: 'https://www.reddit.com/r/PromptEngineering/top/.rss?t=week' },
];

const cache = new Map();

async function fetchWithTimeout(url, headers, fetchImpl = fetch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetchImpl(url, { signal: controller.signal, headers, redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('連線逾時');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function githubHeaders() {
  const h = { Accept: 'application/vnd.github+json', 'User-Agent': 'AI-News-App/0.2' };
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

function daysAgo(n) {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
}

async function scanGithub(query, fetchImpl) {
  const q = `${query.q} created:>${daysAgo(query.days)}`;
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=15`;
  const res = await fetchWithTimeout(url, githubHeaders(), fetchImpl);
  const data = await res.json();
  return (data.items || []).map((r) => ({
    id: `gh:${r.full_name}`,
    group: 'github',
    sourceId: query.id,
    sourceName: query.name,
    title: r.full_name,
    link: r.html_url,
    summary: r.description || '',
    score: r.stargazers_count,
    scoreLabel: `★ ${r.stargazers_count.toLocaleString('en-US')}`,
    language: r.language || '',
    topics: (r.topics || []).slice(0, 6),
    publishedAt: r.created_at,
    repo: r.full_name,
  }));
}

async function scanFeed(feed, fetchImpl) {
  const res = await fetchWithTimeout(feed.url, { 'User-Agent': 'AI-News-App/0.2 (+RSS reader)' }, fetchImpl);
  const { items } = parseFeed(await res.text());
  return items.slice(0, 20).map((it) => {
    // hnrss 的摘要會帶「Points: 123」，拿來當熱度
    const pts = (it.summary.match(/Points:\s*(\d+)/i) || [])[1];
    return {
      id: `feed:${it.link}`,
      group: 'community',
      sourceId: feed.id,
      sourceName: feed.name,
      title: it.title,
      link: it.link,
      summary: it.summary,
      score: pts ? Number(pts) : null,
      scoreLabel: pts ? `▲ ${pts}` : '',
      publishedAt: it.publishedAt,
    };
  });
}

function allScanners() {
  return [
    ...GITHUB_QUERIES.map((q) => ({ id: q.id, name: q.name, group: 'github', run: (f) => scanGithub(q, f) })),
    ...COMMUNITY_FEEDS.map((c) => ({ id: c.id, name: c.name, group: 'community', run: (f) => scanFeed(c, f) })),
  ];
}

async function runScanner(scanner, { force, fetchImpl }) {
  const cached = cache.get(scanner.id);
  if (!force && cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached;
  try {
    const entry = { fetchedAt: Date.now(), error: null, items: await scanner.run(fetchImpl) };
    cache.set(scanner.id, entry);
    return entry;
  } catch (err) {
    const entry = { fetchedAt: Date.now(), error: err.message || String(err), items: cached ? cached.items : [] };
    cache.set(scanner.id, entry);
    return entry;
  }
}

async function getTools({ group, q, force = false, fetchImpl, scanners = allScanners() } = {}) {
  const selected = group ? scanners.filter((s) => s.group === group) : scanners;
  const results = await Promise.all(selected.map((s) => runScanner(s, { force, fetchImpl })));

  const seen = new Set();
  let items = [];
  for (const it of results.flatMap((r) => r.items)) {
    if (seen.has(it.id)) continue;
    seen.add(it.id);
    items.push(it);
  }
  if (q) {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    items = items.filter((it) => {
      const hay = `${it.title} ${it.summary} ${(it.topics || []).join(' ')}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }
  // GitHub 依星數、社群依分數，沒有分數的依時間
  items.sort((a, b) => {
    if (a.group !== b.group) return a.group === 'github' ? -1 : 1;
    if ((b.score ?? -1) !== (a.score ?? -1)) return (b.score ?? -1) - (a.score ?? -1);
    return (b.publishedAt || '').localeCompare(a.publishedAt || '');
  });

  const status = selected.map((s, i) => ({
    id: s.id,
    name: s.name,
    group: s.group,
    ok: !results[i].error,
    error: results[i].error,
    count: results[i].items.length,
  }));
  return { items, status, generatedAt: new Date().toISOString() };
}

// 抓工具的原始說明（GitHub README 或網頁內文），給 AI 解析時當依據，避免憑空編造
async function fetchToolContext(item, fetchImpl = fetch) {
  const MAX = 20000;
  try {
    if (item.repo && /^[\w.-]+\/[\w.-]+$/.test(item.repo)) {
      const res = await fetchWithTimeout(
        `https://api.github.com/repos/${item.repo}/readme`,
        { ...githubHeaders(), Accept: 'application/vnd.github.raw' },
        fetchImpl
      );
      return (await res.text()).slice(0, MAX);
    }
    if (/^https?:\/\//i.test(item.link)) {
      const res = await fetchWithTimeout(item.link, { 'User-Agent': 'AI-News-App/0.2' }, fetchImpl);
      const html = await res.text();
      return html
        .replace(/<(script|style|nav|footer|header)[\s\S]*?<\/\1>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, MAX);
    }
  } catch {
    /* 抓不到就只用標題與摘要 */
  }
  return '';
}

// 只允許解析「掃描結果裡真的有」的項目，避免伺服器被拿去抓任意網址
function findToolById(id) {
  for (const entry of cache.values()) {
    const hit = entry.items.find((it) => it.id === id);
    if (hit) return hit;
  }
  return null;
}

function clearToolCache() {
  cache.clear();
}

module.exports = { TOOL_GROUPS, getTools, fetchToolContext, findToolById, clearToolCache, GITHUB_QUERIES, COMMUNITY_FEEDS };
