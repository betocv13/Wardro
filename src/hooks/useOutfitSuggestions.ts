// src/hooks/useOutfitSuggestions.ts
"use client";

import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type {
  OutfitSuggestion,
  Occasion,
  Season,
  SuggestOutfitsResponse,
} from "@/types/outfits";

type UseOutfitSuggestionsOptions = {
  occasion?: Occasion;
  season?: Season;
  count?: number;
};

export function useOutfitSuggestions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outfits, setOutfits] = useState<OutfitSuggestion[]>([]);
  const [cache, setCache] = useState<Map<string, OutfitSuggestion[]>>(
    new Map()
  );

  const generateOutfits = useCallback(
    async (options: UseOutfitSuggestionsOptions = {}) => {
      const { occasion = "any", season, count = 5 } = options;

      // Create cache key
      const cacheKey = `${occasion}-${season || "any"}-${count}`;

      // Return cached results if available
      if (cache.has(cacheKey)) {
        setOutfits(cache.get(cacheKey)!);
        return cache.get(cacheKey)!;
      }

      setLoading(true);
      setError(null);

      try {
        // Get current session token
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error("Not authenticated");
        }

        const res = await fetch("/api/suggest-outfits", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ occasion, season, count }),
        });

        const data: SuggestOutfitsResponse = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to generate outfits");
        }

        if (data.error) {
          setError(data.error);
        }

        setOutfits(data.outfits);

        // Cache the results
        setCache((prev) => new Map(prev).set(cacheKey, data.outfits));

        return data.outfits;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setOutfits([]);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [cache]
  );

  const clearCache = useCallback(() => {
    setCache(new Map());
  }, []);

  const regenerate = useCallback(
    async (options: UseOutfitSuggestionsOptions = {}) => {
      // Clear cache for this specific combination
      const { occasion = "any", season, count = 5 } = options;
      const cacheKey = `${occasion}-${season || "any"}-${count}`;

      setCache((prev) => {
        const newCache = new Map(prev);
        newCache.delete(cacheKey);
        return newCache;
      });

      return generateOutfits(options);
    },
    [generateOutfits]
  );

  return {
    outfits,
    loading,
    error,
    generateOutfits,
    regenerate,
    clearCache,
  };
}
