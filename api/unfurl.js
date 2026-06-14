// Vercel Serverless Function — fetches a URL server-side and returns its
// OpenGraph/meta preview (title, description, image). Requires a signed-in
// Supabase session. Basic SSRF guards block private/loopback hosts.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://jdqizltpalpefzvckinq.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkcWl6bHRwYWxwZWZ6dmNraW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NDA2MjIsImV4cCI6MjA5NjExNjYyMn0.Ti_7LoBVniWzi3kSU8i-GG0l-boANBVkKc85L0nczEM";

const PRIVATE = /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0|::1|172\.(1[6-9]|2\d|3[01])\.)/i;
const decode = s => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const pick = (html, ...res) => { for (const re of res) { const m = html.match(re); if (m) return m[1].trim(); } return ""; };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return res.status(401).json({ error: "Invalid or expired session" });
  } catch { return res.status(401).json({ error: "Auth verification failed" }); }

  const { url } = req.body || {};
  if (typeof url !== "string" || url.length > 2000) return res.status(400).json({ error: "Missing url" });
  let u;
  try { u = new URL(url); } catch { return res.status(400).json({ error: "Invalid url" }); }
  if (!/^https?:$/.test(u.protocol)) return res.status(400).json({ error: "Only http(s) allowed" });
  if (PRIVATE.test(u.hostname)) return res.status(400).json({ error: "Host not allowed" });

  const fallback = { url: u.toString(), title: u.hostname.replace(/^www\./, ""), description: "", image: "", site: u.hostname.replace(/^www\./, "") };
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const r = await fetch(u.toString(), { headers: { "User-Agent": "Mozilla/5.0 (compatible; StartupOracleBot/1.0)" }, signal: ctrl.signal, redirect: "follow" });
    clearTimeout(t);
    if (!(r.headers.get("content-type") || "").includes("text/html")) return res.status(200).json(fallback);
    const html = (await r.text()).slice(0, 500000);
    const og = p => pick(
      html,
      new RegExp(`<meta[^>]+property=["']og:${p}["'][^>]+content=["']([^"']+)["']`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${p}["']`, "i"),
      new RegExp(`<meta[^>]+name=["']twitter:${p}["'][^>]+content=["']([^"']+)["']`, "i")
    );
    let image = og("image");
    if (image && image.startsWith("/")) image = u.origin + image;
    const title = og("title") || pick(html, /<title[^>]*>([^<]+)<\/title>/i) || fallback.title;
    const description = og("description") || pick(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) || "";
    return res.status(200).json({ url: u.toString(), title: decode(title).slice(0, 140), description: decode(description).slice(0, 200), image, site: fallback.site });
  } catch { return res.status(200).json(fallback); }
}
