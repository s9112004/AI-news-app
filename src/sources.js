// 新聞來源清單：每個來源都是公開的 RSS / Atom feed。
// category：industry 產業動態｜research 研究與知識｜official 官方公告｜zh 中文媒體
// 想新增來源，只要在這裡加一筆即可。
const CATEGORIES = {
  industry: '產業動態',
  research: '研究與知識',
  official: '官方公告',
  zh: '中文媒體',
};

const SOURCES = [
  // 產業動態
  { id: 'techcrunch', name: 'TechCrunch AI', category: 'industry', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
  { id: 'verge', name: 'The Verge AI', category: 'industry', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml' },
  { id: 'venturebeat', name: 'VentureBeat AI', category: 'industry', url: 'https://venturebeat.com/category/ai/feed/' },
  { id: 'arstechnica', name: 'Ars Technica AI', category: 'industry', url: 'https://arstechnica.com/ai/feed/' },
  { id: 'hn', name: 'Hacker News（AI 熱門）', category: 'industry', url: 'https://hnrss.org/newest?q=AI&points=100' },

  // 研究與知識
  { id: 'mittr', name: 'MIT Technology Review AI', category: 'research', url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed' },
  { id: 'arxiv-ai', name: 'arXiv cs.AI', category: 'research', url: 'https://rss.arxiv.org/rss/cs.AI', limit: 15 },
  { id: 'arxiv-cl', name: 'arXiv cs.CL（語言模型）', category: 'research', url: 'https://rss.arxiv.org/rss/cs.CL', limit: 15 },
  { id: 'bair', name: 'Berkeley AI Research', category: 'research', url: 'https://bair.berkeley.edu/blog/feed.xml' },
  { id: 'simonw', name: 'Simon Willison', category: 'research', url: 'https://simonwillison.net/atom/everything/' },

  // 官方公告
  { id: 'openai', name: 'OpenAI News', category: 'official', url: 'https://openai.com/news/rss.xml' },
  { id: 'google-ai', name: 'Google AI Blog', category: 'official', url: 'https://blog.google/technology/ai/rss/' },
  { id: 'deepmind', name: 'Google DeepMind', category: 'official', url: 'https://deepmind.google/blog/rss.xml' },
  { id: 'huggingface', name: 'Hugging Face Blog', category: 'official', url: 'https://huggingface.co/blog/feed.xml' },
  { id: 'nvidia', name: 'NVIDIA Blog', category: 'official', url: 'https://blogs.nvidia.com/feed/' },

  // 中文媒體
  { id: 'technews', name: '科技新報 AI', category: 'zh', url: 'https://technews.tw/category/ai/feed/' },
  { id: 'ithome', name: 'iThome', category: 'zh', url: 'https://www.ithome.com.tw/rss' },
  { id: 'inside', name: 'INSIDE', category: 'zh', url: 'https://www.inside.com.tw/feed/rss' },
];

module.exports = { CATEGORIES, SOURCES };
