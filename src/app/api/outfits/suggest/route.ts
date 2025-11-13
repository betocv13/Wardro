import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

type ClothingType = "top" | "bottom" | "shoes" | "accessories" | "outerwear" | "dress";

type ClothingItem = {
    id: string;
    name: string | null;
    type: ClothingType;
    tags: string[] | null;
    palette: string[] | null;
    image_url: string | null;
};

type OutfitRole = ClothingType;

type OutfitItemRef = {
    clothing_id: string;
    role: OutfitRole;
};

type OutfitSuggestion = {
    name: string;
    notes?: string;
    items: OutfitItemRef[];
};

type AiResponse = { outfits?: unknown };

const VALID_ROLES: OutfitRole[] = ["top","bottom","shoes","accessories","outerwear","dress"];
const isValidRole = (r: unknown): r is OutfitRole =>
    typeof r === "string" && VALID_ROLES.includes(r as OutfitRole);

function coerceOutfits(raw: unknown, allowedIds: Set<string>): OutfitSuggestion[] {
    if (!Array.isArray(raw)) return [];
    const clean: OutfitSuggestion[] = [];

    for (const o of raw) {
        if (!o || typeof o !== "object") continue;

        const name =
            typeof (o as { name?: unknown }).name === "string"
                ? (o as { name: string }).name
                : "Outfit";

        const notesVal = (o as { notes?: unknown }).notes;
        const notes = typeof notesVal === "string" ? notesVal : undefined;

        const itemsRaw = (o as { items?: unknown }).items;
        const items: OutfitItemRef[] = [];

        if (Array.isArray(itemsRaw)) {
            for (const it of itemsRaw) {
                if (!it || typeof it !== "object") continue;
                const cid = (it as { clothing_id?: unknown }).clothing_id;
                const role = (it as { role?: unknown }).role;
                if (typeof cid === "string" && allowedIds.has(cid) && isValidRole(role)) {
                    items.push({ clothing_id: cid, role });
                }
            }
        }

        if (items.length) clean.push({ name, notes, items });
    }
    return clean.slice(0, 7);
}

export async function POST(req: Request) {
    try {
        const url = new URL(req.url);
        const forceRedo = url.searchParams.get("redo") === "1";

        const authHeader = req.headers.get("authorization") ?? "";

        // ✅ cookies() is synchronous — do NOT await
        const cookieStore = cookies();

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value;
                    },
                    set(name: string, value: string, options?: CookieOptions) {
                        try {
                            cookieStore.set({ name, value, ...(options ?? {}) });
                        } catch {
                            // some runtimes disallow setting here — noop
                        }
                    },
                    remove(name: string, options?: CookieOptions) {
                        try {
                            cookieStore.set({ name, value: "", ...(options ?? {}), maxAge: 0 });
                        } catch {
                            // noop
                        }
                    },
                },
                // pass through Authorization if present (for client fetch with auth header)
                global: authHeader ? { headers: { Authorization: authHeader } } : undefined,
            }
        );

        const { data: userData, error: userErr } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        if (userErr || !userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // ---- Week window: Monday 00:00 UTC .. next Monday 00:00 UTC
        const now = new Date();
        const dow = now.getUTCDay(); // 0=Sun..6=Sat
        const sinceMonday = (dow + 6) % 7;
        const weekStart = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate() - sinceMonday
        ));
        const weekEnd = new Date(weekStart);
        weekEnd.setUTCDate(weekStart.getUTCDate() + 7);

        // ---- If this week's plan already exists, return it (no AI call)
        if (!forceRedo) {
            // ⛑ Avoid server-side 500s due to order() on stale cache: select, then sort in JS.
            const { data: existingOutfits, error: exErr } = await supabase
                .from("outfits")
                .select("id,name,notes,created_at")
                .eq("user_id", userId)
                .gte("created_at", weekStart.toISOString())
                .lt("created_at", weekEnd.toISOString());

            if (exErr) {
                console.error("[outfits/suggest] select outfits error:", exErr);
                return NextResponse.json({ error: exErr.message }, { status: 500 });
            }

            if (existingOutfits && existingOutfits.length > 0) {
                // sort by created_at in JS if present
                existingOutfits.sort((a, b) => {
                    const at = a.created_at ? new Date(a.created_at).getTime() : 0;
                    const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
                    return at - bt;
                });

                const ids = existingOutfits.map((o) => o.id);
                const { data: itemRows, error: itemsErr } = await supabase
                    .from("outfit_items")
                    .select("outfit_id,clothing_id,role")
                    .in("outfit_id", ids);

                if (itemsErr) {
                    console.error("[outfits/suggest] select outfit_items error:", itemsErr);
                    return NextResponse.json({ error: itemsErr.message }, { status: 500 });
                }

                const byOutfit = new Map<string, OutfitItemRef[]>();
                (itemRows ?? []).forEach((r) => {
                    const arr = byOutfit.get(r.outfit_id) ?? [];
                    arr.push({ clothing_id: String(r.clothing_id), role: r.role as OutfitRole });
                    byOutfit.set(r.outfit_id, arr);
                });

                const suggestions = existingOutfits.map((o) => ({
                    name: o.name ?? "Outfit",
                    notes: (o as { notes?: string | null }).notes ?? undefined,
                    items: byOutfit.get(o.id) ?? [],
                }));

                return NextResponse.json({ outfits: suggestions });
            }
        }

        // ---- Pull wardrobe (for AI)
        const { data: clothes, error: clothesErr } = await supabase
            .from("clothes")
            .select("id,name,type,tags,palette,image_url")
            .eq("user_id", userId)
            .limit(200);

        if (clothesErr) {
            console.error("[outfits/suggest] select clothes error:", clothesErr);
            return NextResponse.json({ error: clothesErr.message }, { status: 500 });
        }

        const items: ClothingItem[] = (clothes ?? []).map((c) => ({
            id: String(c.id),
            name: c.name ?? null,
            type: (c.type ?? "top") as ClothingType,
            tags: Array.isArray(c.tags) ? c.tags.map(String) : null,
            palette: Array.isArray(c.palette) ? c.palette.map(String) : null,
            image_url: c.image_url ?? null,
        }));

        if (!items.length) {
            return NextResponse.json({ outfits: [], info: "No clothes found" });
        }

        // --- Build prompt for OpenAI
        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
        }

        const wardrobeJson = JSON.stringify(
            items.map((i) => ({
                id: i.id,
                name: i.name,
                type: i.type,
                tags: i.tags,
                palette: i.palette,
            }))
        );

        const system = [
            "You assemble stylish, wearable outfits from a given wardrobe.",
            "Constraints:",
            "- Use ONLY clothing IDs provided.",
            "- Aim for variety across 7 outfits (Mon–Sun).",
            "- Each outfit is 2–5 items total; include shoes if possible.",
            "- Prefer color harmony based on tags/palette; avoid duplicates within an outfit unless it makes sense.",
            "- Respond ONLY with strict JSON matching this TypeScript type:",
            '  { "outfits": [{ "name": string, "notes"?: string, "items": [{ "clothing_id": string, "role": "top"|"bottom"|"shoes"|"accessories"|"outerwear"|"dress" }] }] }',
            "Keep 'notes' under 140 chars.",
        ].join("\n");

        const user = [
            "Wardrobe JSON:",
            wardrobeJson,
            "",
            "Return exactly 7 outfits (Mon..Sun).",
        ].join("\n");

        const aiRes = await fetch("https://api.openai.com/v1/responses", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                input: [
                    { role: "system", content: [{ type: "input_text", text: system }] },
                    { role: "user", content: [{ type: "input_text", text: user }] },
                ],
                temperature: 0.3,
            }),
        });

        const data: unknown = await aiRes.json();
        if (!aiRes.ok) {
            console.error("[outfits/suggest] OpenAI error payload:", data);
            return NextResponse.json(
                { error: (data as { error?: unknown })?.error ?? "ai_error" },
                { status: 502 }
            );
        }

        // Parse Responses API text
        const text =
            (data as { output?: unknown[] })?.output &&
            Array.isArray((data as { output?: unknown[] }).output) &&
            ((data as { output: unknown[] }).output[0] as { content?: unknown[] })?.content &&
            Array.isArray(((data as { output: unknown[] }).output[0] as { content?: unknown[] }).content) &&
            ((((data as { output: unknown[] }).output[0] as { content: unknown[] }).content[0] as { text?: unknown })?.text ?? "");

        const rawText = typeof text === "string" ? text : "";
        let parsed: AiResponse = {};
        try {
            parsed = JSON.parse(rawText) as AiResponse;
        } catch {
            const m = rawText.match(/\{[\s\S]*\}/);
            if (m) {
                try {
                    parsed = JSON.parse(m[0]) as AiResponse;
                } catch {
                    parsed = {};
                }
            }
        }

        const idsAllowed = new Set(items.map((i) => i.id));
        const outfits = coerceOutfits(parsed.outfits, idsAllowed);

        // ---- Persist to DB as this week's plan
        if (outfits.length) {
            const toInsert = outfits.map((o) => ({
                user_id: userId,
                name: o.name,
                notes: o.notes ?? null,
            }));

            const { data: inserted, error: insErr } = await supabase
                .from("outfits")
                .insert(toInsert)
                .select("id,created_at"); // include created_at so we can debug ordering if needed

            if (insErr || !inserted) {
                console.error("[outfits/suggest] insert outfits error:", insErr);
                return NextResponse.json(
                    { error: insErr?.message ?? "failed_to_insert_outfits" },
                    { status: 500 }
                );
            }

            const itemsToInsert = inserted.flatMap((row, idx) =>
                (outfits[idx].items ?? []).map((it) => ({
                    outfit_id: row.id,
                    clothing_id: it.clothing_id,
                    role: it.role,
                }))
            );

            if (itemsToInsert.length) {
                const { error: itemsInsErr } = await supabase
                    .from("outfit_items")
                    .insert(itemsToInsert);
                if (itemsInsErr) {
                    console.error("[outfits/suggest] insert outfit_items error:", itemsInsErr);
                    return NextResponse.json({ error: itemsInsErr.message }, { status: 500 });
                }
            }
        }

        return NextResponse.json({ outfits });
    } catch (err) {
        console.error("[outfits/suggest] unhandled error:", err);
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}