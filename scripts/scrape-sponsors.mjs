import { mkdir, writeFile } from "node:fs/promises";

const SOURCE_URL =
  "https://ktrh.iheart.com/featured/michael-berry/content/2023-10-12-michael-berry-show-show-sponsors/";

const outPath = new URL("../data/sponsors.raw.json", import.meta.url);

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function absoluteUrl(href) {
  return new URL(href, SOURCE_URL).toString();
}

function extractPhone(lines) {
  return (
    lines.find((line) => /(?:\d{3}[-.)\s]*\d{3}[-.\s]*\d{4}|1[.-]800|844-|833-|877-|281-|713-|832-|979-|409-)/i.test(line)) ||
    ""
  );
}

function extractSponsors(html) {
  const articleStart = html.indexOf('<article class="content-detail-container">');
  const articleEnd = html.indexOf("</article>", articleStart);

  if (articleStart === -1 || articleEnd === -1) {
    throw new Error("Could not find KTRH article body");
  }

  const article = html.slice(articleStart, articleEnd);
  const bodyStart = article.indexOf('<div class="component-embed-html">');
  const bodyEnd = article.indexOf("</div>", bodyStart);

  if (bodyStart === -1 || bodyEnd === -1) {
    throw new Error("Could not find sponsor HTML block");
  }

  const body = article.slice(bodyStart, bodyEnd);
  const paragraphs = [...body.matchAll(/<p>([\s\S]*?)<\/p>/gi)].map((match) => match[1]);
  const sponsors = [];

  for (const paragraph of paragraphs) {
    const links = [...paragraph.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];

    for (let index = 0; index < links.length; index += 1) {
      const link = links[index];
      const afterStart = link.index + link[0].length;
      const afterEnd = index + 1 < links.length ? links[index + 1].index : paragraph.length;
      const trailingLines = paragraph
        .slice(afterStart, afterEnd)
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]+>/g, " ")
        .split(/\n+/)
        .map(decodeHtml)
        .filter(Boolean);

      const name = decodeHtml(link[2].replace(/<[^>]+>/g, " "));
      const websiteUrl = absoluteUrl(link[1]);

      if (!name || !websiteUrl) continue;

      sponsors.push({
        source_url: SOURCE_URL,
        source_published_at: "2026-03-27",
        name,
        website_url: websiteUrl,
        phone: extractPhone(trailingLines),
        source_notes: trailingLines,
      });
    }
  }

  return sponsors;
}

const response = await fetch(SOURCE_URL, {
  headers: {
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/148 Safari/537.36",
  },
});

if (!response.ok) {
  throw new Error(`KTRH sponsor fetch failed: ${response.status} ${response.statusText}`);
}

const html = await response.text();
const sponsors = extractSponsors(html);

await mkdir(new URL("../data/", import.meta.url), { recursive: true });
await writeFile(
  outPath,
  `${JSON.stringify(
    {
      source_url: SOURCE_URL,
      scraped_at: new Date().toISOString(),
      sponsor_count: sponsors.length,
      sponsors,
    },
    null,
    2,
  )}\n`,
);

console.log(`Wrote ${sponsors.length} sponsors to ${outPath.pathname}`);
