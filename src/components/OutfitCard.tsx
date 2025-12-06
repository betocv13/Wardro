// src/components/OutfitCard.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { Heart, Sparkles, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { OutfitSuggestion } from "@/types/outfits";
import { supabase } from "@/lib/supabase";

type OutfitCardProps = {
  outfit: OutfitSuggestion;
  onShuffle?: () => void;
  showReason?: boolean;
};

export default function OutfitCard({
  outfit,
  onShuffle,
  showReason = true,
}: OutfitCardProps) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Not authenticated");
      }

      const { error } = await supabase.from("outfits").insert({
        user_id: user.id,
        name: `${outfit.items[0]?.name} Outfit`,
        item_ids: outfit.items.map((i) => i.id),
        ai_generated: true,
        occasion: null,
      });

      if (error) throw error;

      setSaved(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save outfit");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-4 space-y-3 bg-card border-border hover:border-primary/50 transition-colors">
      {/* Item Images Grid */}
      <div className="grid grid-cols-2 gap-2">
        {outfit.items.slice(0, 4).map((item, idx) => (
          <div
            key={item.id}
            className="relative aspect-square rounded-lg overflow-hidden bg-muted"
          >
            {item.image_url ? (
              <Image
                src={item.image_url}
                alt={item.name}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover"
                priority={idx === 0}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                No image
              </div>
            )}

            {/* Item type badge */}
            <div className="absolute top-1 left-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
              {item.type}
            </div>
          </div>
        ))}
      </div>

      {/* Reason */}
      {showReason && outfit.reason && (
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
          <p className="line-clamp-2">{outfit.reason}</p>
        </div>
      )}

      {/* Item Names */}
      <div className="text-xs text-muted-foreground space-y-1">
        {outfit.items.map((item) => (
          <div key={item.id} className="truncate">
            • {item.name}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={handleSave}
          disabled={saving || saved}
        >
          <Heart
            className={`w-4 h-4 mr-2 ${saved ? "fill-current text-red-500" : ""}`}
          />
          {saved ? "Saved" : "Save"}
        </Button>

        {onShuffle && (
          <Button variant="outline" size="sm" onClick={onShuffle}>
            <Shuffle className="w-4 h-4" />
          </Button>
        )}
      </div>
    </Card>
  );
}
