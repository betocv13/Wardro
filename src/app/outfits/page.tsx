// src/app/outfits/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { useWeeklyPlan } from "@/hooks/useWeeklyPlan";
import { useWeather } from "@/hooks/useWeather";
import TodayOutfit from "@/components/TodayOutfit";

export default function OutfitsPage() {
  const router = useRouter();
  const {
    weeklyPlan,
    currentDayWithItems,
    loading,
    generating,
    regenerating,
    error,
    generateWeek,
    regenerateDay,
    navigateToDay,
    selectedDayIndex,
  } = useWeeklyPlan();

  const { weather } = useWeather();

  // Auth check
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/");
    });
  }, [router]);

  const handleGenerate = async () => {
    try {
      await generateWeek();
    } catch (err) {
      // Error is already set in hook
    }
  };

  const handleRegenerateDay = async () => {
    try {
      await regenerateDay(selectedDayIndex);
    } catch (err) {
      // Error is already set in hook
    }
  };

  const handlePrevDay = () => {
    navigateToDay(selectedDayIndex - 1);
  };

  const handleNextDay = () => {
    navigateToDay(selectedDayIndex + 1);
  };

  if (loading) {
    return (
      <main className="p-6 max-w-7xl mx-auto">
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <h1 className="text-3xl font-bold">Weekly Planner</h1>
          </div>
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading your weekly plan...</p>
          </div>
        </div>
      </main>
    );
  }

  // Empty state - no plan exists
  if (!weeklyPlan) {
    return (
      <main className="p-6 max-w-7xl mx-auto">
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <h1 className="text-3xl font-bold">Weekly Planner</h1>
          </div>

          <div className="text-center py-12 space-y-4">
            <div className="max-w-md mx-auto space-y-2">
              <h2 className="text-xl font-semibold">No Weekly Plan Yet</h2>
              <p className="text-muted-foreground">
                Generate a 7-day outfit plan based on your closet and weather
                forecast
              </p>
              {error && (
                <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm mt-4">
                  {error}
                </div>
              )}
            </div>
            <Button
              onClick={handleGenerate}
              disabled={generating}
              size="lg"
              className="mt-4"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {generating ? "Generating..." : "Generate Weekly Plan"}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Requires at least 5 tops, 3 bottoms, and 2 pairs of shoes
            </p>
          </div>
        </div>
      </main>
    );
  }

  // Show today's outfit
  const currentWeather = weather[selectedDayIndex];

  return (
    <main className="p-6 max-w-7xl mx-auto">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <h1 className="text-3xl font-bold">Weekly Planner</h1>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={generating}
            variant="outline"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {generating ? "Regenerating Week..." : "Regenerate Week"}
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Today's Outfit */}
        {currentDayWithItems ? (
          <TodayOutfit
            dayOutfit={currentDayWithItems}
            weather={currentWeather}
            currentDayIndex={selectedDayIndex}
            onNavigatePrev={handlePrevDay}
            onNavigateNext={handleNextDay}
            onRegenerate={handleRegenerateDay}
            regenerating={regenerating}
          />
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Loading outfit for this day...
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
