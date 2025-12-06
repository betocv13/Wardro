// src/types/weekly-planner.ts

import type { ClothingItemExtended } from "./outfits";

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type AIInsight = {
  reason: string;
  occasion: string;
  vibe: string;
};

export type DayOutfit = {
  day: DayOfWeek;
  date: string; // ISO date string YYYY-MM-DD
  item_ids: string[];
  hero_item_id: string;
  ai_insight: AIInsight;
  suggested_accessory_ids: string[];
};

export type WeatherDay = {
  date: string; // ISO date string
  temp_high: number; // Fahrenheit
  temp_low: number; // Fahrenheit
  condition: string; // "Partly Cloudy", "Sunny", etc.
  icon: string; // Icon code from weather API
};

export type WeeklyPlan = {
  id: string;
  user_id: string;
  week_start: string; // ISO date string (Monday)
  outfits: DayOutfit[];
  weather_data: WeatherDay[] | null;
  created_at: string;
  updated_at: string;
};

export type DayOutfitWithItems = DayOutfit & {
  items: ClothingItemExtended[];
  hero_item: ClothingItemExtended;
  suggested_accessories: ClothingItemExtended[];
};

export type GenerateWeekRequest = {
  location?: {
    lat: number;
    lon: number;
  };
};

export type GenerateWeekResponse = {
  plan: WeeklyPlan;
  error?: string;
};

export type UpdateDayRequest = {
  item_ids: string[];
  hero_item_id: string;
};

export type RegenerateDayRequest = {
  occasion?: string;
};

export type WeatherResponse = {
  forecast: WeatherDay[];
  error?: string;
};
