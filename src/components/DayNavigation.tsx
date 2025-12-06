// src/components/DayNavigation.tsx
"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

type DayNavigationProps = {
  currentDayIndex: number;
  date?: string;
  onPrevious: () => void;
  onNext: () => void;
};

export default function DayNavigation({
  currentDayIndex,
  date,
  onPrevious,
  onNext,
}: DayNavigationProps) {
  const dayName = DAYS[currentDayIndex];

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="flex items-center justify-between gap-4">
      <Button
        variant="outline"
        size="icon"
        onClick={onPrevious}
        disabled={currentDayIndex === 0}
        className="shrink-0"
      >
        <ChevronLeft className="w-5 h-5" />
      </Button>

      <div className="text-center">
        <h2 className="text-2xl font-bold">{dayName}</h2>
        {date && (
          <p className="text-sm text-muted-foreground">{formatDate(date)}</p>
        )}
      </div>

      <Button
        variant="outline"
        size="icon"
        onClick={onNext}
        disabled={currentDayIndex === 6}
        className="shrink-0"
      >
        <ChevronRight className="w-5 h-5" />
      </Button>
    </div>
  );
}
