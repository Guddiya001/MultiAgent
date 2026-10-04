export async function searchWeb(query) {

  const url =
    `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}` +
    `&format=json` +
    `&no_html=1` +
    `&skip_disambig=1`;

console.log(
  `Searching web for: ${url}`
  );
  const response =
    await fetch(url);


  if (!response.ok) {

    throw new Error(
      "Search request failed"
    );

  }


  const data =
    await response.json();


  return {

    query,

    abstract:
      data.AbstractText ||
      "No summary found",

    source:
      data.AbstractURL ||
      null

  };

}

const webData = await searchWeb("USD to INR exchange rate");
console.log(webData);

