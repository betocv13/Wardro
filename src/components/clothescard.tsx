import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import ColorThief from "color-thief-browser";

export type ClothingCardProps = {
  id: string;
  name: string;
  type: string;
  created_at?: string | Date | null;
  image_url?: string | null;
  className?: string;
  priority?: boolean;
};


  function rgbToHsl(r: number, g: number, b: number) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    const d = max - min;

    if (d !== 0) {
      s = d / (1 - Math.abs(2 * l - 1));
      switch (max) {
        case r: h = ((g - b) / d) % 6; break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h *= 60;
      if (h < 0) h += 360;
    }
    return { h, s, l }; // s,l in [0..1]
  }

  function isGrayish([r, g, b]: number[]) {
    const { s, l } = rgbToHsl(r, g, b);
    // low saturation OR extreme light/dark → treat as “neutral”
    return s < 0.15 || l < 0.12 || l > 0.92;
  }

  function dist(a: number[], b: number[]) {
    // Euclidean distance in RGB space
    const dx = a[0] - b[0], dy = a[1] - b[1], dz = a[2] - b[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  function dedupeNear(colors: number[][], threshold = 30) {
    const out: number[][] = [];
    for (const c of colors) {
      if (!out.some(o => dist(o, c) < threshold)) out.push(c);
    }
    return out;
  }
  // add this helper above useEffect (right under your other helpers)
  function rgbToHex(r: number, g: number, b: number) {
    const toHex = (n: number) => n.toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }



export default function ClothesCard({
  name,
  type,
  created_at,
  image_url,
  className,
  priority,
}: ClothingCardProps) {
  const [palette, setPalette] = useState<string[]>([]);
  const hiddenImgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    setPalette([]); // reset on URL change

    if (!image_url) return;

    const img = hiddenImgRef.current;
    if (!img) return;

    const extract = () => {
      try {
        const ct = new ColorThief();

        const dominant = ct.getColor(img, 5);
        const colors = (ct.getPalette(img, 12, 5) || []) as number[][];

        let merged = [dominant, ...colors.filter(c => c.join(",") !== dominant.join(","))];
        merged = merged.filter(c => !isGrayish(c));
        merged = dedupeNear(merged, 28);

        const hexes = merged.slice(0, 4).map(([r, g, b]) => rgbToHex(r, g, b));
        const [dr, dg, db] = dominant as number[];   // narrow the type
        const fallbackHex = rgbToHex(dr, dg, db);
        const finalPalette = hexes.length ? hexes : [fallbackHex];

        setPalette(finalPalette);
      } catch {
        // quietly ignore extraction errors
      }
    };

    if (img.complete && img.naturalWidth > 0) {
      extract();
    } else {
      img.addEventListener("load", extract);
    }

    // ✅ cleanup: remove listener so it doesn’t run multiple times
    return () => {
      img.removeEventListener("load", extract);
    };
  }, [image_url]);


  const dateObj = created_at
    ? (typeof created_at === "string" || typeof created_at === "number"
      ? new Date(created_at)
      : created_at)
    : null;

  const dateLabel =
    dateObj && !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString() : "—";

  return (
    <div className={`rounded-lg border bg-card p-4 shadow-sm transition hover:shadow ${className ?? ""}`}>
      {/* Hidden <img> just for ColorThief */}
      {image_url && (
        <img
          ref={hiddenImgRef}
          src={image_url}
          alt=""
          crossOrigin="anonymous"
          className="hidden"
        />
      )}

      <div className="relative mb-3 h-80 w-full overflow-hidden rounded-md border bg-muted/30">
        {image_url ? (
          <Image
            src={image_url}
            alt={name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority={!!priority}
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">
            No photo
          </div>
        )}
      </div>

      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold">{name}</h3>
        <span className="rounded-full border px-2 py-0.5 text-xs capitalize">{type}</span>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">Added {dateLabel}</p>

      {/* Color swatches */}
      {palette.length > 0 && (
        <div className="mt-3 flex gap-2">
          {palette.map((hex, i) => (
            <span
              key={i}
              className="h-4 w-4 rounded-full border"
              title={hex}
              style={{ backgroundColor: hex }}
            />
          ))}
        </div>
      )}
    </div>
  );
}