// src/app/outfits/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import OccasionFilter from "@/components/OccasionFilter";
import OutfitGrid from "@/components/OutfitGrid";
import { useOutfitSuggestions } from "@/hooks/useOutfitSuggestions";
import type { Occasion } from "@/types/outfits";

export default function OutfitsPage() {
  const router = useRouter();
  const [occasion, setOccasion] = useState<Occasion>("any");
  const { outfits, loading, error, generateOutfits, regenerate } =
    useOutfitSuggestions();

  // Auth check
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/");
    });
  }, [router]);

  // Auto-generate on first load
  useEffect(() => {
    if (outfits.length === 0 && !loading && !error) {
      generateOutfits({ occasion: "any", count: 6 });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerate = () => {
    generateOutfits({ occasion, count: 6 });
  };

  const handleRegenerate = () => {
    regenerate({ occasion, count: 6 });
  };

  const handleOccasionChange = (newOccasion: Occasion) => {
    setOccasion(newOccasion);
    // Auto-generate when occasion changes
    generateOutfits({ occasion: newOccasion, count: 6 });
  };

  return (
    <main className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          <h1 className="text-3xl font-bold">AI Outfit Suggestions</h1>
        </div>
        <p className="text-muted-foreground">
          Get personalized outfit combinations based on your wardrobe
        </p>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <OccasionFilter selected={occasion} onChange={handleOccasionChange} />

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button onClick={handleGenerate} disabled={loading}>
            <Sparkles className="w-4 h-4 mr-2" />
            {loading ? "Generating..." : "Generate Outfits"}
          </Button>

          {outfits.length > 0 && (
            <Button
              variant="outline"
              onClick={handleRegenerate}
              disabled={loading}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate
            </Button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Outfit Grid */}
      <OutfitGrid outfits={outfits} loading={loading} />

      {/* Empty State Help */}
      {!loading && outfits.length === 0 && !error && (
        <div className="text-center py-12 space-y-4">
          <div className="text-muted-foreground">
            <p className="text-lg mb-2">No outfits yet</p>
            <p className="text-sm">
              Make sure you have at least a few items in your closet
            </p>
            <p className="text-sm">
              (You need tops, bottoms, and shoes to create outfits)
            </p>
          </div>
          <Button onClick={() => router.push("/closet/add")} variant="outline">
            Add Items to Closet
          </Button>
        </div>
      )}
    </main>
  );
}
