export const COAST = {
  name: "Machias Bay",
  latitude: 44.661,
  longitude: -67.391,
} as const;

export const FORECAST_URL =
  "https://api.open-meteo.com/v1/forecast" +
  `?latitude=${COAST.latitude}` +
  `&longitude=${COAST.longitude}` +
  "&current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,is_day" +
  "&temperature_unit=fahrenheit" +
  "&wind_speed_unit=kn" +
  "&timezone=America%2FNew_York";
