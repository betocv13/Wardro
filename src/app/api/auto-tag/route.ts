// src/app/api/auto-tag/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { imageUrl, name, type, palette } = await req.json();

        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
        }
        if (!imageUrl) {
            return NextResponse.json({ tags: [] });
        }

        // Ask for 2–4 short tags; keep lowercase; no spaces inside tags.
        const prompt = [
            "You are labeling wardrobe items. Return 2-4 concise lowercase tags (no spaces; use hyphens if needed).",
            "Prefer: color, garment features, style vibe, seasonality.",
            "Avoid duplicates and brand names. JSON only: {\"tags\": [\"...\"]}",
            `Name: ${name ?? ""}`,
            `Type: ${type ?? ""}`,
            `Palette (hex): ${Array.isArray(palette) ? palette.join(", ") : ""}`,
        ].join("\n");

        const res = await fetch("https://api.openai.com/v1/responses", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                input: [
                    { role: "user", content: [
                            { type: "input_text", text: prompt },
                            { type: "input_image", image_url: imageUrl }
                        ] }
                ],
                temperature: 0.2,
            }),
        });

        const data = await res.json();
        if (!res.ok) {
            // graceful fallback
            return NextResponse.json({ tags: [], error: data?.error ?? "ai_error" }, { status: 200 });
        }

        // The Responses API returns structured output in data.output[0].content[0].text
        const text = data?.output?.[0]?.content?.[0]?.text ?? "";
        let tags: string[] = [];
        try {
            const parsed = JSON.parse(text) as { tags?: unknown };
            if (Array.isArray(parsed.tags)) {
                tags = (parsed.tags as unknown[]).map(String);
            }
        } catch {
            // very defensive: try to scrape bracket content
            const m = text.match(/\[([\s\S]*?)\]/);
            if (m) {
                tags = m[1]
                    .split(",")
                    .map((s: string) => s.replace(/["'\s]/g, "").toLowerCase())
                    .filter(Boolean);
            }
        }

        // normalize & cap to 4
        tags = [...new Set(tags.map(t => t.trim().toLowerCase()))].slice(0, 4);
        return NextResponse.json({ tags });
    } catch (err) {
        return NextResponse.json({ tags: [], error: String(err) }, { status: 200 });
    }
}