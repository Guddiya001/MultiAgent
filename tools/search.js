export async function searchWeb(query) {
  const url =
    `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}` +
    `&format=json&no_html=1&skip_disambig=1`;

  const response = await fetch(url);

  console.log("DuckDuckGo API response status:", response, "\n for query:", query);

  if (!response.ok) {
    throw new Error("Search request failed");
  }

  const data = await response.json();

  return {
    query,
    abstract: data.AbstractText || "No summary found",
    source: data.AbstractURL || null
  };
}