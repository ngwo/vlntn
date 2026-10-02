// Fetches Letterboxd + Goodreads RSS and scrapes Backloggd, writes data.json.
// Needs Node 18+ (built-in fetch). No dependencies.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const cfg = JSON.parse(readFileSync("config.json", "utf8"));
const UA = { "User-Agent": "Mozilla/5.0 (personal profile page)" };

const get = async (url) => {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.text();
};
const tag = (s, name) =>
  (s.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`)) || [])[1]
    ?.replace(/^<!\[CDATA\[|\]\]>$/g, "")
    .trim() || "";
const items = (xml) => xml.split("<item>").slice(1);
const decode = (s) =>
  s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
   .replace(/&lt;/g, "<").replace(/&gt;/g, ">");

async function letterboxd() {
  const xml = await get(`https://letterboxd.com/${cfg.letterboxd}/rss/`);
  return items(xml)
    .filter((i) => tag(i, "letterboxd:filmTitle"))
    .slice(0, 12)
    .map((i) => ({
      title: decode(tag(i, "letterboxd:filmTitle")),
      year: tag(i, "letterboxd:filmYear"),
      rating: tag(i, "letterboxd:memberRating") || null,
      image: (tag(i, "description").match(/<img src="([^"]+)"/) || [])[1] || "",
      url: tag(i, "link"),
      date: tag(i, "letterboxd:watchedDate"),
    }));
}

async function goodreads() {
  const url = `https://www.goodreads.com/review/list_rss/${cfg.goodreadsUserId}?shelf=read&sort=date_read&order=d`;
  const xml = await get(url);
  return items(xml)
    .slice(0, 12)
    .map((i) => ({
      title: decode(tag(i, "title")),
      author: decode(tag(i, "author_name")),
      rating: tag(i, "user_rating") === "0" ? null : tag(i, "user_rating"),
      image: tag(i, "book_large_image_url") || tag(i, "book_image_url"),
      url: `https://www.goodreads.com/book/show/${tag(i, "book_id")}`,
      date: tag(i, "user_read_at"),
    }));
}

async function backloggd() {
  const html = await get(`https://www.backloggd.com/u/${cfg.backloggd}/`);
  const out = [];
  for (const m of html.matchAll(/<img[^>]*>/g)) {
    const t = m[0];
    if (!/card-img/.test(t)) continue;
    const src = (t.match(/src="([^"]+)"/) || [])[1];
    const alt = (t.match(/alt="([^"]*)"/) || [])[1];
    if (src && alt && !out.some((g) => g.title === decode(alt)))
      out.push({ title: decode(alt), image: src, url: `https://www.backloggd.com/u/${cfg.backloggd}/` });
  }
  return out.slice(0, 12);
}

// If a source fails, keep its previous data so the site never goes blank.
const prev = existsSync("data.json") ? JSON.parse(readFileSync("data.json", "utf8")) : {};
const manualGames = existsSync("games-manual.json")
  ? JSON.parse(readFileSync("games-manual.json", "utf8"))
  : [];

const data = { updated: new Date().toISOString(), name: cfg.displayName };
for (const [key, fn] of [["films", letterboxd], ["books", goodreads], ["games", backloggd]]) {
  try {
    const r = await fn();
    if (!r.length) throw new Error("empty result");
    data[key] = r;
  } catch (e) {
    console.warn(`${key} failed: ${e.message}`);
    data[key] = key === "games" && manualGames.length ? manualGames : prev[key] || [];
  }
}

writeFileSync("data.json", JSON.stringify(data, null, 2));
console.log("data.json written");
