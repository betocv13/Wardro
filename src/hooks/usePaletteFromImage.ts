"use client";

import { useEffect, useRef, useState } from "react";
import ColorThief from "color-thief-browser";
import { rgbToHex, isGrayish, dedupeNear, type RGB } from "@/lib/colors";

type Options = {
  maxColors?: number;   // how many swatches to return (default 4)
  quality?: number;     // ColorThief quality (default 5; lower = slower/better)
  paletteSize?: number; // how many colors to sample from the image (default 12)
};

export function usePaletteFromImage(
  image_url?: string | null,
  { maxColors = 4, quality = 5, paletteSize = 12 }: Options = {}
) {
  const [palette, setPalette] = useState<string[]>([]);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    setPalette([]); // reset on URL change
    if (!image_url) return;

    const img = imgRef.current;
    if (!img) return;

    const extract = () => {
      try {
        const ct = new ColorThief();

        // dominant first (so we always have at least one)
        const dominant = ct.getColor(img, quality) as RGB;

        // broader palette
        const colors = (ct.getPalette(img, paletteSize, quality) || []) as RGB[];

        // combine, filter, dedupe
        let merged: RGB[] = [
          dominant,
          ...colors.filter(c => c.join(",") !== dominant.join(",")),
        ];
        merged = merged.filter(c => !isGrayish(c));
        merged = dedupeNear(merged, 28);

        // to hex + cap
        const hexes = merged.slice(0, maxColors).map(([r, g, b]) => rgbToHex(r, g, b));

        // fallback to dominant if everything got filtered
        const [dr, dg, db] = dominant;
        setPalette(hexes.length ? hexes : [rgbToHex(dr, dg, db)]);
      } catch {
        // ignore extraction errors
      }
    };

    if (img.complete && img.naturalWidth > 0) extract();
    else img.addEventListener("load", extract);

    return () => img.removeEventListener("load", extract);
  }, [image_url, maxColors, quality, paletteSize]);

  return [palette, imgRef] as const;
}