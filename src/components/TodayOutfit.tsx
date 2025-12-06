// src/components/TodayOutfit.tsx
"use client";

import { RefreshCw } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import DayNavigation from "./DayNavigation";
import AIInsightPanel from "./AIInsightPanel";
import SwatchRow from "./PalletRow";
import type { DayOutfitWithItems, WeatherDay } from "@/types/weekly-planner";

type TodayOutfitProps = {
  dayOutfit: DayOutfitWithItems;
  weather?: WeatherDay;
  currentDayIndex: number;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  onRegenerate?: () => void;
  regenerating?: boolean;
};

export default function TodayOutfit({
  dayOutfit,
  weather,
  currentDayIndex,
  onNavigatePrev,
  onNavigateNext,
  onRegenerate,
  regenerating = false,
}: TodayOutfitProps) {
  // Get all colors from outfit items
  const allColors = dayOutfit.items
    .flatMap((item) => item.palette || [])
    .filter(Boolean)
    .slice(0, 8); // Limit to 8 colors max

  // Generic accessory suggestions (for MVP)
  const genericAccessories = ["Sunglasses", "Watch", "Hat"];

  return (
    <div className="space-y-6">
      {/* Day Navigation */}
      <DayNavigation
        currentDayIndex={currentDayIndex}
        date={dayOutfit.date}
        onPrevious={onNavigatePrev}
        onNext={onNavigateNext}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
        {/* Left Side - Outfit Display */}
        <Card className="p-6 bg-card space-y-6">
          {/* Hero Item */}
          <div className="relative w-full rounded-lg overflow-hidden bg-white" style={{ maxHeight: "400px", aspectRatio: "1/1" }}>
            {dayOutfit.hero_item.image_url ? (
              <Image
                src={dayOutfit.hero_item.image_url}
                alt={dayOutfit.hero_item.name}
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-contain"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                No image
              </div>
            )}
          </div>

          {/* Supporting Items */}
          <div className="grid grid-cols-3 gap-4">
            {dayOutfit.items
              .filter((item) => item.id !== dayOutfit.hero_item_id)
              .map((item) => (
                <div key={item.id} className="space-y-2">
                  <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-white border border-border">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.name}
                        fill
                        sizes="200px"
                        className="object-contain p-2"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                        {item.type}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-center truncate text-muted-foreground">
                    {item.name}
                  </p>
                </div>
              ))}
          </div>

          {/* Color Palette */}
          {allColors.length > 0 && (
            <div className="pt-2">
              <SwatchRow colors={allColors} />
            </div>
          )}
        </Card>

        {/* Right Side - AI Insights */}
        <div className="space-y-4">
          <AIInsightPanel
            insight={dayOutfit.ai_insight}
            weather={weather}
            suggestedAccessories={genericAccessories}
          />

          {onRegenerate && (
            <Button
              onClick={onRegenerate}
              disabled={regenerating}
              variant="outline"
              className="w-full"
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${regenerating ? "animate-spin" : ""}`}
              />
              {regenerating ? "Regenerating..." : "Regenerate Day"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
