"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

type OutfitRole = "top" | "bottom" | "shoes" | "accessories" | "outerwear" | "dress";
type OutfitItemRef = { clothing_id: string; role: OutfitRole };
type OutfitSuggestion = { name: string; notes?: string; items: OutfitItemRef[] };

// Clothing info we care about for rendering
type ClothingItem = {
    id: string;
    name: string | null;
    image_url: string | null;
    type: string | null;
};

export default function OutfitsPage() {
    const [outfits, setOutfits] = useState<OutfitSuggestion[] | null>(null);
    const [clothesById, setClothesById] = useState<Record<string, ClothingItem>>({});
    const [loading, setLoading] = useState(true);
    const [redoLoading, setRedoLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function getAuthHeaders(): Promise<Record<string, string>> {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        return token ? { Authorization: `Bearer ${token}` } : {};
    }

    // helper: after we get outfits, load all referenced clothing rows
    async function hydrateClothes(outfits: OutfitSuggestion[]) {
        const allIds = new Set<string>();
        outfits.forEach((o) =>
            o.items.forEach((it) => {
                allIds.add(it.clothing_id);
            })
        );

        if (allIds.size === 0) {
            setClothesById({});
            return;
        }

        const { data, error } = await supabase
            .from("clothes")
            .select("id, name, image_url, type")
            .in("id", Array.from(allIds));

        if (error) {
            console.error("[OutfitsPage] failed to load clothes", error);
            return;
        }

        const map: Record<string, ClothingItem> = {};
        (data ?? []).forEach((row) => {
            map[row.id] = {
                id: row.id,
                name: row.name ?? null,
                image_url: row.image_url ?? null,
                type: row.type ?? null,
            };
        });
        setClothesById(map);
    }

    // Auto-load: fetch existing week or create if missing
    useEffect(() => {
        let mounted = true;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const headers = await getAuthHeaders();
                const res = await fetch("/api/outfits/suggest", {
                    method: "POST",
                    credentials: "include",
                    headers,
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data?.error || "Failed to load outfits");

                const arr = Array.isArray(data.outfits) ? (data.outfits as OutfitSuggestion[]) : [];
                if (mounted) {
                    setOutfits(arr);
                    await hydrateClothes(arr);
                }
            } catch (e) {
                if (mounted) setError(e instanceof Error ? e.message : String(e));
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    async function redoWeek() {
        setRedoLoading(true);
        setError(null);
        try {
            const headers = await getAuthHeaders();
            const res = await fetch("/api/outfits/suggest?redo=1", {
                method: "POST",
                credentials: "include",
                headers,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "Failed to regenerate outfits");
            const arr = Array.isArray(data.outfits) ? (data.outfits as OutfitSuggestion[]) : [];
            setOutfits(arr);
            await hydrateClothes(arr);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setRedoLoading(false);
        }
    }

    return (
        <main className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Outfits of the Week</h1>
                <Button onClick={redoWeek} disabled={redoLoading}>
                    {redoLoading ? "Rebuilding…" : "Redo week"}
                </Button>
            </div>

            {loading && <p className="text-sm text-muted-foreground">Loading outfits…</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}

            {!loading && !error && (!outfits || outfits.length === 0) && (
                <p className="text-sm text-muted-foreground">No outfits yet.</p>
            )}

            {!loading && !error && outfits && outfits.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                    {outfits.map((o, idx) => (
                        <div key={idx} className="rounded-lg border p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <h2 className="font-semibold">{o.name || `Outfit ${idx + 1}`}</h2>
                            </div>
                            {o.notes && <p className="text-sm text-muted-foreground">{o.notes}</p>}

                            <ul className="space-y-2">
                                {o.items.map((it, i) => {
                                    const item = clothesById[it.clothing_id];
                                    return (
                                        <li key={i} className="flex items-center gap-3">
                                            {/* thumbnail */}
                                            {item?.image_url ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={item.image_url}
                                                    alt={item.name ?? it.role}
                                                    className="h-12 w-12 rounded object-cover border"
                                                />
                                            ) : (
                                                <div className="h-12 w-12 rounded border flex items-center justify-center text-xs text-muted-foreground">
                                                    {it.role}
                                                </div>
                                            )}

                                            <div className="flex-1">
                                                <div className="flex justify-between">
                          <span className="font-medium text-sm">
                            {item?.name ?? "Unknown item"}
                          </span>
                                                    <span className="uppercase text-[10px] tracking-wide opacity-60">
                            {it.role}
                          </span>
                                                </div>
                                                {item?.type && (
                                                    <p className="text-xs text-muted-foreground">{item.type}</p>
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </div>
            )}
        </main>
    );
}