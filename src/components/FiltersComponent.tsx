"use client";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal } from "lucide-react";

export type FilterType = "all" | "top" | "bottom" | "shoes" | "accessories";

interface FiltersProps {
    active: FilterType;
    onChange: (filter: FilterType) => void;
}

export default function FiltersComponent({ active, onChange }: FiltersProps) {
    const isActive = active !== "all";

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant={isActive ? "default" : "outline"}
                    size="icon"
                    className="relative"
                    aria-pressed={isActive}
                    aria-label={`Filters${isActive ? " (active)" : ""}`}
                >
                    <SlidersHorizontal className="h-5 w-5" />
                    {isActive && (
                        <span
                            aria-hidden
                            className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background"
                        />
                    )}
                    <span className="sr-only">Open filters</span>
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onChange("all")}>
                    All
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onChange("top")}>
                    Tops
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onChange("bottom")}>
                    Bottoms
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onChange("shoes")}>
                    Shoes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onChange("accessories")}>
                    Accessories
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}