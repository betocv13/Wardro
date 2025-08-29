"use client";

import Image from "next/image";
import PalletRow from "@/components/PalletRow";
import { Button } from "@/components/ui/button";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";

export type ClothingCardProps = {
  id: string;
  name: string;
  type: string;
  created_at?: string | Date | null;
  image_url?: string | null;
  className?: string;
  priority?: boolean;
  palette?: string[] | null;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
};

export default function ClothesCard({
  id, name,
  type,
  created_at,
  image_url,
  className,
  priority,
  palette,
    onEdit,
    onDelete,
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

        <div className="relative mb-3 h-100 w-full overflow-hidden rounded-md border bg-muted/30">
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
          <div className="flex items-center gap-1">
            <span className="rounded-full border px-2 py-0.5 text-xs capitalize">{type}</span>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    aria-label="Item actions"
                >
                  <MoreVertical className="h-4 w-4"/>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit?.(id)}>Edit</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete?.(id)}>Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <p className="mt-2 text-xs text-muted-foreground">Added {dateLabel}</p>

        {/* Color swatches */}
        {swatches.length > 0 && (
            <PalletRow
                colors={swatches}
                dotSize={16}
                gap={8}
                className="mt-3"
            />
        )}
      </div>
  );
}