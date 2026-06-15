// Vercel Serverless Function — fetches live startup news from TechCrunch's RSS
// feed server-side (avoids browser CORS and the flaky third-party rss2json proxy).

const FEED = "https://techcrunch.com/category/startups/feed/";

export default async function handler(req, res) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 7000);
    const r = await fetch(FEED, { headers: { "User-Agent": "Mozilla/5.0 (compatible; StartupOracleBot/1.0)" }, signal: ctrl.signal });
    clearTimeout(t);
    const xml = await r.text();
    const items = [];
    const re = /<item>([\s\S]*?)<\/item>/g;
    let m;
    const pick = (block, tag) => {
      const cdata = block.match(new RegExp(`<${tag}>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>`, "i"));
      if (cdata) return cdata[1].trim();
      const plain = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
      return plain ? plain[1].trim() : "";
    };
    while ((m = re.exec(xml)) && items.length < 8) {
      const b = m[1];
      const title = pick(b, "title").replace(/&amp;/g, "&").replace(/&#8217;/g, "'").replace(/&#8216;/g, "'").replace(/&#8220;/g, '"').replace(/&#8221;/g, '"').replace(/&#8211;/g, "—");
      const link = pick(b, "link");
      const pubDate = pick(b, "pubDate");
      if (title && link) items.push({ title, link, pubDate });
    }
    res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=3600");
    return res.status(200).json({ items });
  } catch {
    return res.status(200).json({ items: [] });
  }
}
