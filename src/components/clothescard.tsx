"use client";

import Image from "next/image";

export type ClothingCardProps = {
  id: string;
  name: string;
  type: string;
  created_at?: string | Date | null;
  image_url?: string | null;
  className?: string;
  priority?: boolean;
  palette?: string[] | null;
};

export default function ClothesCard({
  name,
  type,
  created_at,
  image_url,
  className,
  priority,
  palette,
}: ClothingCardProps) {
  const swatches = (palette ?? []).slice(0, 4);

  const dateObj = created_at
    ? (typeof created_at === "string" || typeof created_at === "number"
      ? new Date(created_at)
      : created_at)
    : null;

  const dateLabel =
    dateObj && !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString() : "—";

  return (
    <div className={`rounded-lg border bg-card p-4 shadow-sm transition hover:shadow ${className ?? ""}`}>

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
      {swatches.length > 0 && (
        <div className="mt-3 flex gap-2" aria-label="Color palette">
          {swatches.map((hex, i) => (
            <span
              key={i}
              className="h-4 w-4 rounded-full border"
              title={hex}
              style={{ backgroundColor: hex }}
              aria-label={`Color swatch ${i + 1} ${hex}`}
              role="img"
            />
          ))}
        </div>
      )}
    </div>
  );
}