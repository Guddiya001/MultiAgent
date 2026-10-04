export async function getExchangeRate(base, target) {
  const url =
    `https://api.frankfurter.app/latest` +
    `?from=${encodeURIComponent(base)}` +
    `&to=${encodeURIComponent(target)}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Exchange rate API failed: ${response.status}`
    );
  }

  const data = await response.json();

  const rate = data.rates?.[target];

  if (typeof rate !== "number") {
    throw new Error(
      `Exchange rate not found for ${base}/${target}`
    );
  }

  return {
    currencyPair: `${base}/${target}`,
    rate,
    unit: `${target} per 1 ${base}`,
    date: data.date,
    source: "Frankfurter"
  };
}