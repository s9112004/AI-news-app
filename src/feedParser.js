// 輕量的 RSS 2.0 / RSS 1.0(RDF) / Atom 解析器，不依賴任何套件。
// 只取 App 需要的欄位：標題、連結、日期、摘要。

const NAMED_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' };

function decodeEntities(str) {
  return str.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code) => {
    if (code[0] === '#') {
      const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    const v = NAMED_ENTITIES[code.toLowerCase()];
    return v === undefined ? m : v;
  });
}

function stripCdata(str) {
  return str.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
}

// 把 HTML 摘要轉成純文字
function toPlainText(html) {
  if (!html) return '';
  let text = stripCdata(html);
  // 部分 feed 會把 HTML 再編碼一次（&lt;p&gt;），先解碼再去標籤
  if (/&lt;[a-z/!]/i.test(text)) text = decodeEntities(text);
  text = text
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  return decodeEntities(text).replace(/\s+/g, ' ').trim();
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 取得第一個符合 tag 名稱的內容（支援 namespace，例如 content:encoded）
function getTag(xml, names) {
  for (const name of names) {
    const re = new RegExp(`<${escapeRe(name)}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escapeRe(name)}>`, 'i');
    const m = xml.match(re);
    if (m && m[1].trim()) return m[1];
  }
  return '';
}

function getAtomLink(entryXml) {
  const links = entryXml.match(/<link\b[^>]*\/?>/gi) || [];
  let fallback = '';
  for (const tag of links) {
    const href = (tag.match(/\bhref\s*=\s*["']([^"']+)["']/i) || [])[1];
    if (!href) continue;
    const rel = (tag.match(/\brel\s*=\s*["']([^"']+)["']/i) || [])[1];
    if (!rel || rel === 'alternate') return decodeEntities(href);
    if (!fallback) fallback = decodeEntities(href);
  }
  return fallback;
}

function parseDate(str) {
  if (!str) return null;
  const d = new Date(str.trim());
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function truncate(text, max) {
  return text.length > max ? text.slice(0, max - 1).trimEnd() + '…' : text;
}

function parseFeed(xml) {
  if (typeof xml !== 'string' || !xml.trim()) return { title: '', items: [] };
  const isAtom = /<feed\b[^>]*>/i.test(xml) && /<entry\b/i.test(xml);
  const blockRe = isAtom ? /<entry\b[^>]*>([\s\S]*?)<\/entry>/gi : /<item\b[^>]*>([\s\S]*?)<\/item>/gi;

  // feed 標題：取第一個 <item>/<entry> 之前的 <title>
  const head = xml.split(isAtom ? /<entry\b/i : /<item\b/i)[0];
  const feedTitle = toPlainText(getTag(head, ['title']));

  const items = [];
  let m;
  while ((m = blockRe.exec(xml)) !== null) {
    const block = m[1];
    const title = toPlainText(getTag(block, ['title']));
    let link;
    if (isAtom) {
      link = getAtomLink(block);
    } else {
      link = decodeEntities(stripCdata(getTag(block, ['link'])).trim());
      if (!link) {
        const guid = block.match(/<guid\b([^>]*)>([\s\S]*?)<\/guid>/i);
        if (guid && !/isPermaLink\s*=\s*["']false["']/i.test(guid[1])) link = stripCdata(guid[2]).trim();
      }
      if (!link) link = (block.match(/rdf:about\s*=\s*["']([^"']+)["']/i) || [])[1] || '';
    }
    const dateStr = isAtom
      ? getTag(block, ['published', 'updated'])
      : getTag(block, ['pubDate', 'dc:date', 'published', 'updated']);
    const summaryRaw = isAtom
      ? getTag(block, ['summary', 'content'])
      : getTag(block, ['description', 'content:encoded', 'summary']);

    if (!title || !link) continue;
    items.push({
      title,
      link,
      publishedAt: parseDate(stripCdata(dateStr)),
      summary: truncate(toPlainText(summaryRaw), 280),
    });
  }
  return { title: feedTitle, items };
}

module.exports = { parseFeed, toPlainText, decodeEntities };
