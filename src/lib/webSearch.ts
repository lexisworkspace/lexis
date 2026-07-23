"use client";

/**
 * Lightweight client-side web search using DuckDuckGo.
 * Returns search results with title, snippet, and URL.
 */

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
 * Search DuckDuckGo instant answers API + HTML search results
 */
export async function webSearch(query: string): Promise<SearchResponse> {
  const response: SearchResponse = {
    query,
    results: [],
    abstract: "",
    relatedTopics: [],
  };

  try {
    // Try DuckDuckGo instant answers first
    const iaUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const iaRes = await fetch(iaUrl);
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
        // Also extract URLs from related topics
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
    // Silent fail — we'll return what we have
  }

  // If no results from instant answers, try the lite HTML search
  if (response.results.length === 0 && !response.abstract) {
    try {
      const searchUrl = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`;
      const searchRes = await fetch(searchUrl);
      if (searchRes.ok) {
        const html = await searchRes.text();
        const results = parseLiteResults(html);
        response.results = results.slice(0, 5);
      }
    } catch {
      // Silent fail
    }
  }

  return response;
}

/**
 * Parse DuckDuckGo lite HTML search results
 */
function parseLiteResults(html: string): SearchResult[] {
  const results: SearchResult[] = [];
  const linkRegex = /<a[^>]+class="result-link"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi;
  const snippetRegex = /<td[^>]*class="result-snippet"[^>]*>([\s\S]*?)<\/td>/gi;

  let match: RegExpExecArray | null;
  const links: { url: string; title: string }[] = [];
  const snippets: string[] = [];

  while ((match = linkRegex.exec(html)) !== null) {
    links.push({ url: match[1], title: match[2].trim() });
  }

  while ((match = snippetRegex.exec(html)) !== null) {
    snippets.push(match[1].replace(/<[^>]+>/g, "").trim());
  }

  for (let i = 0; i < Math.min(links.length, 5); i++) {
    results.push({
      title: links[i].title,
      snippet: snippets[i] || "",
      url: links[i].url,
    });
  }

  return results;
}
