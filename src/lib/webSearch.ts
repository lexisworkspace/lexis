"use client";

/**
 * Lightweight client-side web search via our server-side API route.
 * The actual DuckDuckGo fetching happens server-side to bypass CORS.
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
 * Search the web via our server-side API route
 */
export async function webSearch(query: string): Promise<SearchResponse> {
  const response: SearchResponse = {
    query,
    results: [],
    abstract: "",
    relatedTopics: [],
  };

  try {
    const res = await fetch(
      `/api/web-search?q=${encodeURIComponent(query)}`,
      { method: "GET" }
    );
    if (res.ok) {
      const data = await res.json();
      response.results = data.results || [];
      response.abstract = data.abstract || "";
      response.relatedTopics = data.relatedTopics || [];
    } else {
      console.warn("[webSearch] API returned status:", res.status);
    }
  } catch (err) {
    console.warn("[webSearch] Fetch failed:", err);
  }

  return response;
}
