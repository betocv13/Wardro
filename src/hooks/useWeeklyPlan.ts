// src/hooks/useWeeklyPlan.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type {
  WeeklyPlan,
  DayOfWeek,
  DayOutfit,
  DayOutfitWithItems,
} from "@/types/weekly-planner";
import type { ClothingItemExtended } from "@/types/outfits";

const DAYS_OF_WEEK: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

function getTodayIndex(): number {
  const today = new Date().getDay();
  // Convert Sunday (0) to 6, Monday (1) to 0, etc.
  return today === 0 ? 6 : today - 1;
}

export function useWeeklyPlan() {
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [currentDayWithItems, setCurrentDayWithItems] =
    useState<DayOutfitWithItems | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(getTodayIndex());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allItems, setAllItems] = useState<ClothingItemExtended[]>([]);

  // Fetch plan on mount
  useEffect(() => {
    fetchPlan();
    fetchAllItems();
  }, []);

  // Update current day when selection changes or plan updates
  useEffect(() => {
    if (weeklyPlan && allItems.length > 0) {
      const dayOutfit = weeklyPlan.outfits[selectedDayIndex];
      if (dayOutfit) {
        populateDayWithItems(dayOutfit);
      }
    }
  }, [weeklyPlan, selectedDayIndex, allItems]);

  async function fetchAllItems() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data } = await supabase
        .from("clothes")
        .select("*")
        .eq("user_id", user.id);

      setAllItems((data as ClothingItemExtended[]) || []);
    } catch (err) {
      console.error("Failed to fetch items:", err);
    }
  }

  async function fetchPlan() {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/weekly-plan", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await res.json();

      console.log("Weekly plan response:", data);

      if (!res.ok) {
        throw new Error(data.error || `API error: ${res.status}`);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setWeeklyPlan(data.plan);
    } catch (err) {
      console.error("fetchPlan error:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const generateWeek = useCallback(
    async (location?: { lat: number; lon: number }) => {
      try {
        setGenerating(true);
        setError(null);

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error("Not authenticated");
        }

        const res = await fetch("/api/weekly-plan", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ location }),
        });

        const data = await res.json();

        console.log("generateWeek response:", {
          status: res.status,
          ok: res.ok,
          data,
        });

        if (!res.ok) {
          throw new Error(data.error || `Server error: ${res.status}`);
        }

        if (data.error) {
          throw new Error(data.error);
        }

        if (!data.plan) {
          throw new Error("No plan data received from server");
        }

        setWeeklyPlan(data.plan);
        return data.plan;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        throw err;
      } finally {
        setGenerating(false);
      }
    },
    []
  );

  const regenerateDay = useCallback(
    async (dayIndex: number, occasion?: string) => {
      try {
        setRegenerating(true);
        setError(null);

        const day = DAYS_OF_WEEK[dayIndex];

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error("Not authenticated");
        }

        const res = await fetch(`/api/weekly-plan/${day}/regenerate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ occasion }),
        });

        const data = await res.json();

        if (data.error) {
          throw new Error(data.error);
        }

        setWeeklyPlan(data.plan);
        return data.plan;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        throw err;
      } finally {
        setRegenerating(false);
      }
    },
    []
  );

  const swapItem = useCallback(
    async (dayIndex: number, itemIds: string[], heroItemId: string) => {
      try {
        setError(null);

        const day = DAYS_OF_WEEK[dayIndex];

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error("Not authenticated");
        }

        const res = await fetch(`/api/weekly-plan/${day}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ item_ids: itemIds, hero_item_id: heroItemId }),
        });

        const data = await res.json();

        if (data.error) {
          throw new Error(data.error);
        }

        setWeeklyPlan(data.plan);
        return data.plan;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        throw err;
      }
    },
    []
  );

  function populateDayWithItems(dayOutfit: DayOutfit) {
    const items = allItems.filter((item) =>
      dayOutfit.item_ids.includes(item.id)
    );
    const heroItem = allItems.find((item) => item.id === dayOutfit.hero_item_id);
    const suggestedAccessories = allItems.filter((item) =>
      dayOutfit.suggested_accessory_ids.includes(item.id)
    );

    console.log("populateDayWithItems:", {
      dayOutfit,
      itemsFound: items.length,
      heroItemFound: !!heroItem,
      allItemsCount: allItems.length,
    });

    if (heroItem) {
      setCurrentDayWithItems({
        ...dayOutfit,
        items,
        hero_item: heroItem,
        suggested_accessories: suggestedAccessories,
      });
    } else {
      console.error("Hero item not found! hero_item_id:", dayOutfit.hero_item_id);
      // Fallback: use first item as hero if hero item not found
      const fallbackHero = items[0] || allItems[0];
      if (fallbackHero) {
        console.log("Using fallback hero item:", fallbackHero.id);
        setCurrentDayWithItems({
          ...dayOutfit,
          items,
          hero_item: fallbackHero,
          suggested_accessories: suggestedAccessories,
        });
      } else {
        setError("No items found for this outfit");
      }
    }
  }

  const navigateToDay = useCallback((dayIndex: number) => {
    if (dayIndex >= 0 && dayIndex < 7) {
      setSelectedDayIndex(dayIndex);
    }
  }, []);

  const currentDay = weeklyPlan?.outfits[selectedDayIndex] || null;

  return {
    weeklyPlan,
    currentDay,
    currentDayWithItems,
    loading,
    generating,
    regenerating,
    error,
    generateWeek,
    regenerateDay,
    swapItem,
    navigateToDay,
    selectedDayIndex,
    allItems,
  };
}
