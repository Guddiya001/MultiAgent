export async function getWeather(city) {
  const geoUrl =
    `https://geocoding-api.open-meteo.com/v1/search` +
    `?name=${encodeURIComponent(city)}` +
    `&count=1` +
    `&language=en` +
    `&format=json`;

  const geoResponse = await fetch(geoUrl);

  if (!geoResponse.ok) {
    throw new Error("Could not find location");
  }

  const geoData = await geoResponse.json();

  //console.log("Geo Data:", geoData);

  if (!geoData.results?.length) {
    throw new Error(`Location not found: ${city}`);
  }

  const location = geoData.results[0];

  const weatherUrl =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${location.latitude}` +
    `&longitude=${location.longitude}` +
    `&current=temperature_2m,relative_humidity_2m,weather_code` +
    `&timezone=auto`;

  const weatherResponse = await fetch(weatherUrl);

  if (!weatherResponse.ok) {
    throw new Error("Weather request failed");
  }

  const weatherData = await weatherResponse.json();

  return {
    city: location.name,
    temperature:
      weatherData.current.temperature_2m,
    humidity:
      weatherData.current.relative_humidity_2m,
    weatherCode:
      weatherData.current.weather_code
  };
}

const result = await getWeather("Delhi");
console.log("Weather Module Loaded", result);