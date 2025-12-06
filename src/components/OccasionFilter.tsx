// src/components/OccasionFilter.tsx
"use client";

import { Button } from "@/components/ui/button";
import type { Occasion } from "@/types/outfits";

const OCCASIONS: { value: Occasion; label: string; icon: string }[] = [
  { value: "any", label: "Any", icon: "✨" },
  { value: "casual", label: "Casual", icon: "👕" },
  { value: "formal", label: "Formal", icon: "👔" },
  { value: "date-night", label: "Date Night", icon: "💕" },
  { value: "work", label: "Work", icon: "💼" },
  { value: "gym", label: "Gym", icon: "💪" },
  { value: "party", label: "Party", icon: "🎉" },
  { value: "outdoor", label: "Outdoor", icon: "🌲" },
];

type OccasionFilterProps = {
  selected: Occasion;
  onChange: (occasion: Occasion) => void;
};

export default function OccasionFilter({
  selected,
  onChange,
}: OccasionFilterProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Occasion</label>
      <div className="flex flex-wrap gap-2">
        {OCCASIONS.map((occasion) => (
          <Button
            key={occasion.value}
            variant={selected === occasion.value ? "default" : "outline"}
            size="sm"
            onClick={() => onChange(occasion.value)}
            className="transition-all"
          >
            <span className="mr-1.5">{occasion.icon}</span>
            {occasion.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
