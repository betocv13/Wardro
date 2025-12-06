// src/app/api/suggest-outfits/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { ClothingItemExtended, OutfitSuggestion } from "@/types/outfits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { occasion = "any", season, count = 5 } = await req.json();

    // Get user from Authorization header or session
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Setup Supabase client with proper fallbacks
    const supabaseUrl =
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Server is missing SUPABASE env vars", outfits: [] },
        { status: 500 }
      );
    }

    // Create Supabase client with service role (for RLS bypass on read)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // Fetch user's clothing items
    let query = supabase
      .from("clothes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    // Optional season filter
    if (season && season !== "all-season") {
      query = query.or(`season.eq.${season},season.eq.all-season`);
    }

    const { data: items, error: fetchError } = await query;

    if (fetchError) {
      return NextResponse.json(
        { error: "Failed to fetch items", outfits: [] },
        { status: 500 }
      );
    }

    if (!items || items.length < 2) {
      return NextResponse.json({
        outfits: [],
        error: "Not enough items in closet to create outfits",
      });
    }

    // Group items by type
    const tops = items.filter((i) => i.type === "top");
    const bottoms = items.filter((i) => i.type === "bottom");
    const shoes = items.filter((i) => i.type === "shoes");
    const accessories = items.filter((i) => i.type === "accessories");

    // Need at least top + bottom OR top + shoes
    if ((tops.length === 0 || bottoms.length === 0) && shoes.length === 0) {
      return NextResponse.json({
        outfits: [],
        error: "Need at least tops and bottoms or shoes to create outfits",
      });
    }

    // Call OpenAI for outfit suggestions
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured", outfits: [] },
        { status: 500 }
      );
    }

    const outfits = await generateOutfitsWithAI(
      items as ClothingItemExtended[],
      { tops, bottoms, shoes, accessories },
      occasion,
      season,
      count
    );

    return NextResponse.json({ outfits });
  } catch (err) {
    return NextResponse.json(
      { error: String(err), outfits: [] },
      { status: 500 }
    );
  }
}

async function generateOutfitsWithAI(
  allItems: ClothingItemExtended[],
  grouped: {
    tops: ClothingItemExtended[];
    bottoms: ClothingItemExtended[];
    shoes: ClothingItemExtended[];
    accessories: ClothingItemExtended[];
  },
  occasion: string,
  season: string | undefined,
  count: number
): Promise<OutfitSuggestion[]> {
  const { tops, bottoms, shoes, accessories } = grouped;

  // Build compact item descriptions for the prompt
  const formatItem = (item: ClothingItemExtended) => {
    const colors = item.palette?.slice(0, 2).join(", ") || "unknown";
    const tags = item.tags?.join(", ") || "";
    return `${item.id}: ${item.name} (${item.type}, colors: ${colors}${tags ? `, tags: ${tags}` : ""})`;
  };

  const prompt = `You are a professional stylist. Create ${count} outfit combinations for a "${occasion}" occasion${season ? ` in ${season}` : ""}.

Available items:
TOPS:
${tops.map(formatItem).join("\n")}

BOTTOMS:
${bottoms.map(formatItem).join("\n")}

SHOES:
${shoes.map(formatItem).join("\n")}

${accessories.length > 0 ? `ACCESSORIES:\n${accessories.map(formatItem).join("\n")}` : ""}

Rules:
1. Each outfit must have at least: 1 top + 1 bottom + 1 shoes
2. You can optionally add 1-2 accessories
3. Consider color harmony (complementary, analogous, or monochromatic)
4. Match the formality level to the occasion
5. Ensure style coherence (don't mix athletic with formal)

Return ONLY valid JSON in this exact format:
{
  "outfits": [
    {
      "item_ids": ["id1", "id2", "id3"],
      "reason": "Brief explanation of why this works"
    }
  ]
}`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.error?.message || "OpenAI request failed");
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const parsed = JSON.parse(content);
    const outfitResults: OutfitSuggestion[] = [];

    // Validate and populate outfit suggestions
    for (const outfit of parsed.outfits || []) {
      if (!Array.isArray(outfit.item_ids) || outfit.item_ids.length < 2) {
        continue;
      }

      // Fetch full item data
      const outfitItems = allItems.filter((item) =>
        outfit.item_ids.includes(item.id)
      );

      // Ensure we got all items
      if (outfitItems.length === outfit.item_ids.length) {
        outfitResults.push({
          items: outfitItems,
          reason: outfit.reason || "",
        });
      }
    }

    return outfitResults.slice(0, count);
  } catch (err) {
    // Fallback to simple random combinations if AI fails
    return generateFallbackOutfits(grouped, count);
  }
}

function generateFallbackOutfits(
  grouped: {
    tops: ClothingItemExtended[];
    bottoms: ClothingItemExtended[];
    shoes: ClothingItemExtended[];
    accessories: ClothingItemExtended[];
  },
  count: number
): OutfitSuggestion[] {
  const { tops, bottoms, shoes, accessories } = grouped;
  const outfits: OutfitSuggestion[] = [];

  // Simple random combination fallback
  for (let i = 0; i < Math.min(count, tops.length); i++) {
    const items: ClothingItemExtended[] = [];

    if (tops[i]) items.push(tops[i]);
    if (bottoms[i % bottoms.length]) items.push(bottoms[i % bottoms.length]);
    if (shoes[i % shoes.length]) items.push(shoes[i % shoes.length]);

    // Optionally add accessory
    if (accessories.length > 0 && Math.random() > 0.5) {
      items.push(accessories[i % accessories.length]);
    }

    if (items.length >= 2) {
      outfits.push({
        items,
        reason: "Simple combination",
      });
    }
  }

  return outfits;
}
