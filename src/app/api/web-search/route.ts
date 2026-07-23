import { NextRequest, NextResponse } from "next/server";

interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}

interface SearchResponse {
  query: string;
  results: SearchResult[];
  abstract: string;
  relatedTopics: string[];
}

/**
 * Server-side web search using DuckDuckGo HTML.
 * Runs on the server to bypass CORS and bot detection.
 */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");
  if (!query) {
    return NextResponse.json({ error: "Missing query parameter" }, { status: 400 });
  }

  const response: SearchResponse = {
    query,
    results: [],
    abstract: "",
    relatedTopics: [],
  };

  // Try DuckDuckGo instant answers API (works server-side)
  try {
    const iaUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const iaRes = await fetch(iaUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    if (iaRes.ok) {
      const data = await iaRes.json();
      if (data.Abstract) {
        response.abstract = data.Abstract;
      }
      if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
        response.relatedTopics = data.RelatedTopics
          .filter((t: any) => t.Text)
          .slice(0, 5)
          .map((t: any) => t.Text);
        response.results = data.RelatedTopics
          .filter((t: any) => t.Text && t.FirstURL)
          .slice(0, 5)
          .map((t: any) => ({
            title: t.Text.split(" - ")[0] || t.Text.slice(0, 60),
            snippet: t.Text,
            url: t.FirstURL,
          }));
      }
    }
  } catch {
    // Continue to HTML scraping
  }

  // If no results from instant answers, try DuckDuckGo HTML search
  if (response.results.length === 0 && !response.abstract) {
    try {
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const searchRes = await fetch(searchUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });
      if (searchRes.ok) {
        const html = await searchRes.text();
        const results = parseHtmlResults(html);
        response.results = results.slice(0, 8);
      }
    } catch {
      // Continue
    }
  }

  return NextResponse.json(response);
}

/**
 * Parse DuckDuckGo HTML search results
 */
function parseHtmlResults(html: string): SearchResult[] {
  const results: SearchResult[] = [];

  // Match result blocks: <a class="result__a" href="...">title</a> and <a class="result__snippet">snippet</a>
  const resultBlockRegex =
    /<a[^>]+class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

  let match: RegExpExecArray | null;
  while ((match = resultBlockRegex.exec(html)) !== null) {
    const url = match[1].trim();
    const title = match[2].replace(/<[^>]+>/g, "").trim();
    const snippet = match[3].replace(/<[^>]+>/g, "").trim();
    if (title && url) {
      results.push({ title, snippet, url });
    }
  }

  // Fallback: try simpler link extraction if regex didn't match
  if (results.length === 0) {
    const linkRegex = /<a[^>]+class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi;
    const links: { url: string; title: string }[] = [];
    while ((match = linkRegex.exec(html)) !== null) {
      links.push({ url: match[1].trim(), title: match[2].trim() });
    }

    const snippetRegex = /<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
    const snippets: string[] = [];
    while ((match = snippetRegex.exec(html)) !== null) {
      snippets.push(match[1].replace(/<[^>]+>/g, "").trim());
    }

    for (let i = 0; i < Math.min(links.length, 8); i++) {
      results.push({
        title: links[i].title,
        snippet: snippets[i] || "",
        url: links[i].url,
      });
    }
  }

  return results;
}
