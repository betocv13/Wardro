// src/app/api/weekly-plan/[day]/regenerate/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { ClothingItemExtended } from "@/types/outfits";
import type { DayOfWeek, DayOutfit, WeeklyPlan } from "@/types/weekly-planner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAYS_OF_WEEK: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

function getMondayOfWeek(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export async function POST(
  req: Request,
  { params }: { params: { day: string } }
) {
  try {
    const { day } = params;

    if (!DAYS_OF_WEEK.includes(day as DayOfWeek)) {
      return NextResponse.json({ error: "Invalid day" }, { status: 400 });
    }

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { occasion } = await req.json();

    const supabaseUrl =
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const weekStart = getMondayOfWeek();
    const dayIndex = DAYS_OF_WEEK.indexOf(day as DayOfWeek);

    // Fetch existing plan
    const { data: plan, error: fetchError } = await supabase
      .from("weekly_plans")
      .select("*")
      .eq("user_id", user.id)
      .eq("week_start", weekStart)
      .single();

    if (fetchError || !plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // Fetch user's items
    const { data: items, error: itemsError } = await supabase
      .from("clothes")
      .select("*")
      .eq("user_id", user.id);

    if (itemsError || !items) {
      return NextResponse.json(
        { error: "Failed to fetch items" },
        { status: 500 }
      );
    }

    // Get weather for this day
    const weather = plan.weather_data as any[];
    const dayWeather = weather?.[dayIndex];

    // Get items already used this week (to avoid repeats)
    const outfits = plan.outfits as DayOutfit[];
    const usedItemIds = new Set<string>();

    // Don't include items from yesterday and tomorrow
    const yesterdayIndex = dayIndex - 1;
    const tomorrowIndex = dayIndex + 1;

    if (yesterdayIndex >= 0) {
      outfits[yesterdayIndex]?.item_ids.forEach((id) => usedItemIds.add(id));
    }
    if (tomorrowIndex < 7) {
      outfits[tomorrowIndex]?.item_ids.forEach((id) => usedItemIds.add(id));
    }

    // Generate new outfit for this day
    const newOutfit = await generateDayOutfit(
      items as ClothingItemExtended[],
      day as DayOfWeek,
      dayWeather,
      usedItemIds,
      occasion
    );

    if (!newOutfit) {
      return NextResponse.json(
        { error: "Failed to generate outfit" },
        { status: 500 }
      );
    }

    // Update plan
    outfits[dayIndex] = {
      ...newOutfit,
      date: addDays(weekStart, dayIndex),
    };

    const { data: updated, error: updateError } = await supabase
      .from("weekly_plans")
      .update({ outfits })
      .eq("id", plan.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ plan: updated as WeeklyPlan });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

async function generateDayOutfit(
  allItems: ClothingItemExtended[],
  day: DayOfWeek,
  weather: any,
  usedItemIds: Set<string>,
  occasion?: string
): Promise<Omit<DayOutfit, "date"> | null> {
  const formatItem = (item: ClothingItemExtended) => {
    const colors = item.palette?.slice(0, 2).join(", ") || "unknown";
    const tags = item.tags?.join(", ") || "";
    return `${item.id}: ${item.name} (${item.type}, colors: ${colors}${tags ? `, tags: ${tags}` : ""})`;
  };

  const tops = allItems.filter((i) =>
    ["top", "outerwear", "layer"].includes(i.type)
  );
  const bottoms = allItems.filter((i) => i.type === "bottom");
  const shoes = allItems.filter((i) => i.type === "shoes");
  const accessories = allItems.filter((i) =>
    ["accessories", "hat"].includes(i.type)
  );

  const weatherInfo = weather
    ? `${weather.temp_high}°F/${weather.temp_low}°F, ${weather.condition}`
    : "Unknown";

  const usedItemsList = Array.from(usedItemIds).join(", ");

  const prompt = `You are a stylist creating ONE outfit for ${day}.

WEATHER: ${weatherInfo}
${occasion ? `OCCASION: ${occasion}` : ""}

AVAILABLE ITEMS:
TOPS/OUTERWEAR:
${tops.map(formatItem).join("\n")}

BOTTOMS:
${bottoms.map(formatItem).join("\n")}

SHOES:
${shoes.map(formatItem).join("\n")}

${accessories.length > 0 ? `ACCESSORIES:\n${accessories.map(formatItem).join("\n")}` : ""}

AVOID THESE IDS (used yesterday/tomorrow): ${usedItemsList || "none"}

RULES:
1. Select: 1 top + 1 bottom + 1 pair of shoes
2. Match weather appropriately
3. Select ONE item as the "hero" piece
4. Consider color harmony
5. Optional: Add 1-2 accessories

Return ONLY JSON:
{
  "day": "${day}",
  "item_ids": ["id1", "id2", "id3"],
  "hero_item_id": "id1",
  "ai_insight": {
    "reason": "Brief explanation",
    "occasion": "Casual Day Out",
    "vibe": "Minimal Streetwear"
  },
  "suggested_accessory_ids": []
}`;

  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key not configured");
    }

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

    return {
      day,
      item_ids: parsed.item_ids || [],
      hero_item_id: parsed.hero_item_id || parsed.item_ids?.[0],
      ai_insight: parsed.ai_insight || {
        reason: "Coordinated outfit",
        occasion: "Casual",
        vibe: "Comfortable",
      },
      suggested_accessory_ids: parsed.suggested_accessory_ids || [],
    };
  } catch (err) {
    console.error("Failed to generate day outfit:", err);
    return null;
  }
}
