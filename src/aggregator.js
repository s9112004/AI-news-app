// 負責抓取所有來源、快取、去重、排序。
const { SOURCES } = require('./sources');
const { parseFeed } = require('./feedParser');

const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MINUTES || 15) * 60 * 1000;
const FETCH_TIMEOUT_MS = 12000;
const DEFAULT_LIMIT_PER_SOURCE = 30;

// sourceId -> { fetchedAt, items, error }
const cache = new Map();
// 避免同一來源同時被重複抓取
const inflight = new Map();

async function fetchText(url, fetchImpl = fetch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetchImpl(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'AI-News-App/0.1 (+RSS reader)',
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
      },
      redirect: 'follow',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('連線逾時');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function loadSource(source, { force = false, fetchImpl } = {}) {
  const cached = cache.get(source.id);
  if (!force && cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached;
  if (inflight.has(source.id)) return inflight.get(source.id);

  const job = (async () => {
    try {
      const xml = await fetchText(source.url, fetchImpl);
      const { items } = parseFeed(xml);
      const limit = source.limit || DEFAULT_LIMIT_PER_SOURCE;
      const entry = {
        fetchedAt: Date.now(),
        error: null,
        items: items.slice(0, limit).map((it) => ({
          ...it,
          sourceId: source.id,
          sourceName: source.name,
          category: source.category,
        })),
      };
      cache.set(source.id, entry);
      return entry;
    } catch (err) {
      // 抓取失敗時保留舊資料，只更新錯誤訊息
      const entry = {
        fetchedAt: Date.now(),
        error: err.message || String(err),
        items: cached ? cached.items : [],
      };
      cache.set(source.id, entry);
      return entry;
    } finally {
      inflight.delete(source.id);
    }
  })();
  inflight.set(source.id, job);
  return job;
}

function normalizeLink(link) {
  try {
    const u = new URL(link);
    u.hash = '';
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach((k) => u.searchParams.delete(k));
    return (u.host.replace(/^www\./, '') + u.pathname.replace(/\/$/, '') + u.search).toLowerCase();
  } catch {
    return link.trim().toLowerCase();
  }
}

function mergeItems(lists) {
  const seen = new Set();
  const out = [];
  for (const item of lists.flat()) {
    const key = normalizeLink(item.link);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  // 有日期的依新到舊排序，沒有日期的排在最後
  out.sort((a, b) => {
    if (!a.publishedAt && !b.publishedAt) return 0;
    if (!a.publishedAt) return 1;
    if (!b.publishedAt) return -1;
    return b.publishedAt.localeCompare(a.publishedAt);
  });
  return out;
}

async function getNews({ category, source, q, limit = 200, force = false, sources = SOURCES, fetchImpl } = {}) {
  let selected = sources;
  if (category) selected = selected.filter((s) => s.category === category);
  if (source) selected = selected.filter((s) => s.id === source);

  const results = await Promise.all(selected.map((s) => loadSource(s, { force, fetchImpl })));
  let items = mergeItems(results.map((r) => r.items));

  if (q) {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    items = items.filter((it) => {
      const hay = `${it.title} ${it.summary}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }

  const status = selected.map((s, i) => ({
    id: s.id,
    name: s.name,
    category: s.category,
    ok: !results[i].error,
    error: results[i].error,
    count: results[i].items.length,
    fetchedAt: new Date(results[i].fetchedAt).toISOString(),
  }));

  return { items: items.slice(0, limit), status, generatedAt: new Date().toISOString() };
}

function clearCache() {
  cache.clear();
}

module.exports = { getNews, mergeItems, normalizeLink, clearCache };
