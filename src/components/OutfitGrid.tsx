// src/components/OutfitGrid.tsx
"use client";

import OutfitCard from "./OutfitCard";
import type { OutfitSuggestion } from "@/types/outfits";

type OutfitGridProps = {
  outfits: OutfitSuggestion[];
  onShuffleOutfit?: (index: number) => void;
  loading?: boolean;
};

export default function OutfitGrid({
  outfits,
  onShuffleOutfit,
  loading = false,
}: OutfitGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border p-4 space-y-3 bg-card animate-pulse"
          >
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <div
                  key={j}
                  className="aspect-square rounded-lg bg-muted/30"
                />
              ))}
            </div>
            <div className="h-4 bg-muted/30 rounded w-3/4" />
            <div className="h-3 bg-muted/30 rounded w-1/2" />
            <div className="flex gap-2">
              <div className="h-8 bg-muted/30 rounded flex-1" />
              <div className="h-8 w-8 bg-muted/30 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (outfits.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg mb-2">No outfits generated yet</p>
        <p className="text-sm">
          Click "Generate Outfits" to get AI-powered suggestions
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {outfits.map((outfit, index) => (
        <OutfitCard
          key={index}
          outfit={outfit}
          onShuffle={
            onShuffleOutfit ? () => onShuffleOutfit(index) : undefined
          }
        />
      ))}
    </div>
  );
}
