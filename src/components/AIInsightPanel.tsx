// src/components/AIInsightPanel.tsx
"use client";

import { Sparkles, Cloud } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { AIInsight, WeatherDay } from "@/types/weekly-planner";

type AIInsightPanelProps = {
  insight: AIInsight;
  weather?: WeatherDay;
  suggestedAccessories?: string[];
};

export default function AIInsightPanel({
  insight,
  weather,
  suggestedAccessories = [],
}: AIInsightPanelProps) {
  return (
    <Card className="p-6 space-y-4 bg-card">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">AI Insight</h3>
      </div>

      {/* Reasoning */}
      <p className="text-sm text-muted-foreground leading-relaxed">
        {insight.reason}
      </p>

      {/* Weather */}
      {weather && (
        <div className="flex items-center gap-2 text-sm">
          <Cloud className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">Weather:</span>
          <span className="text-muted-foreground">
            {weather.temp_high}°F, {weather.condition}
          </span>
        </div>
      )}

      {/* Occasion */}
      <div className="text-sm">
        <span className="font-medium">Occasion:</span>{" "}
        <span className="text-muted-foreground">{insight.occasion}</span>
      </div>

      {/* Vibe */}
      <div className="text-sm">
        <span className="font-medium">Vibe:</span>{" "}
        <span className="text-muted-foreground">{insight.vibe}</span>
      </div>

      {/* Suggested Accessories */}
      {suggestedAccessories.length > 0 && (
        <>
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-2">Suggested Accessories:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedAccessories.map((accessory, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 bg-muted rounded-full text-xs"
                >
                  {accessory}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
