// src/types/outfits.ts

export type Season = "spring" | "summer" | "fall" | "winter" | "all-season";

export type Occasion =
  | "casual"
  | "formal"
  | "date-night"
  | "work"
  | "gym"
  | "party"
  | "outdoor"
  | "any";

export type ClothingItemExtended = {
  id: string;
  user_id: string;
  name: string;
  type: "top" | "bottom" | "shoes" | "accessories";
  created_at: string;
  image_url: string | null;
  palette?: string[] | null;
  tags?: string[] | null;
  occasion_tags?: string[] | null;
  season?: Season | null;
  wear_count?: number;
  last_worn?: string | null;
};

export type Outfit = {
  id: string;
  user_id: string;
  name: string | null;
  item_ids: string[];
  occasion: string | null;
  created_at: string;
  ai_generated: boolean;
  times_worn: number;
};

export type OutfitWithItems = Outfit & {
  items: ClothingItemExtended[];
};

export type WearLog = {
  id: string;
  user_id: string;
  outfit_id: string | null;
  item_ids: string[];
  worn_on: string;
  created_at: string;
};

export type OutfitSuggestion = {
  items: ClothingItemExtended[];
  reason?: string;
  score?: number;
};

export type SuggestOutfitsRequest = {
  occasion?: Occasion;
  season?: Season;
  count?: number;
};

export type SuggestOutfitsResponse = {
  outfits: OutfitSuggestion[];
  error?: string;
};
