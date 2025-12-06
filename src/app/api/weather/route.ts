// src/app/api/weather/route.ts
import { NextResponse } from "next/server";
import type { WeatherDay, WeatherResponse } from "@/types/weekly-planner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Default location (can be overridden by query params)
const DEFAULT_LAT = 40.7128; // New York City
const DEFAULT_LON = -74.006;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = parseFloat(searchParams.get("lat") || String(DEFAULT_LAT));
    const lon = parseFloat(searchParams.get("lon") || String(DEFAULT_LON));

    if (isNaN(lat) || isNaN(lon)) {
      return NextResponse.json(
        { error: "Invalid latitude or longitude", forecast: [] },
        { status: 400 }
      );
    }

    // Call Open-Meteo API (free, no key needed)
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weathercode&temperature_unit=fahrenheit&timezone=auto`;

    const response = await fetch(weatherUrl);

    if (!response.ok) {
      throw new Error(`Weather API returned ${response.status}`);
    }

    const data = await response.json();

    // Parse response into our format
    const forecast: WeatherDay[] = [];

    for (let i = 0; i < 7 && i < data.daily.time.length; i++) {
      const weatherCode = data.daily.weathercode[i];

      forecast.push({
        date: data.daily.time[i],
        temp_high: Math.round(data.daily.temperature_2m_max[i]),
        temp_low: Math.round(data.daily.temperature_2m_min[i]),
        condition: getWeatherCondition(weatherCode),
        icon: getWeatherIcon(weatherCode),
      });
    }

    const result: WeatherResponse = { forecast };
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: String(err), forecast: [] },
      { status: 500 }
    );
  }
}

// WMO Weather interpretation codes
// https://open-meteo.com/en/docs
function getWeatherCondition(code: number): string {
  if (code === 0) return "Clear Sky";
  if (code <= 3) return "Partly Cloudy";
  if (code <= 48) return "Foggy";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Showers";
  if (code <= 86) return "Snow Showers";
  if (code <= 99) return "Thunderstorm";
  return "Unknown";
}

function getWeatherIcon(code: number): string {
  if (code === 0) return "clear";
  if (code <= 3) return "partly_cloudy";
  if (code <= 48) return "fog";
  if (code <= 57) return "drizzle";
  if (code <= 67) return "rain";
  if (code <= 77) return "snow";
  if (code <= 82) return "showers";
  if (code <= 86) return "snow_showers";
  if (code <= 99) return "thunderstorm";
  return "unknown";
}
