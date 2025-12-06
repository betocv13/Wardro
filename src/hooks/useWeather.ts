// src/hooks/useWeather.ts
"use client";

import { useState, useEffect } from "react";
import type { WeatherDay } from "@/types/weekly-planner";

type UseWeatherOptions = {
  lat?: number;
  lon?: number;
};

export function useWeather(options: UseWeatherOptions = {}) {
  const [weather, setWeather] = useState<WeatherDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWeather() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (options.lat) params.set("lat", String(options.lat));
        if (options.lon) params.set("lon", String(options.lon));

        const url = `/api/weather${params.toString() ? `?${params.toString()}` : ""}`;
        const res = await fetch(url);

        if (!res.ok) {
          throw new Error("Failed to fetch weather");
        }

        const data = await res.json();

        if (data.error) {
          throw new Error(data.error);
        }

        setWeather(data.forecast || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setWeather([]);
      } finally {
        setLoading(false);
      }
    }

    fetchWeather();
  }, [options.lat, options.lon]);

  return { weather, loading, error };
}
