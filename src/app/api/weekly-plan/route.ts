// src/app/api/weekly-plan/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { ClothingItemExtended } from "@/types/outfits";
import type {
  DayOutfit,
  WeatherDay,
  WeeklyPlan,
  GenerateWeekResponse,
} from "@/types/weekly-planner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAYS_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

// Helper to get Monday of current week
function getMondayOfWeek(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

// Helper to add days to date
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    const { data: plan, error: fetchError } = await supabase
      .from("weekly_plans")
      .select("*")
      .eq("user_id", user.id)
      .eq("week_start", weekStart)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        // No plan found
        console.log("No weekly plan found for user", user.id, "week", weekStart);
        return NextResponse.json({ plan: null });
      }
      console.error("Error fetching weekly plan:", fetchError);
      throw fetchError;
    }

    console.log("Found weekly plan:", {
      id: plan.id,
      week_start: plan.week_start,
      outfits_count: Array.isArray(plan.outfits) ? plan.outfits.length : 0,
    });

    return NextResponse.json({ plan: plan as WeeklyPlan });
  } catch (err) {
    return NextResponse.json(
      { error: String(err), plan: null },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { location } = await req.json();

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

    console.log("Generating weekly plan for user:", user.id);

    // Fetch user's clothing items
    const { data: items, error: fetchError } = await supabase
      .from("clothes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("Error fetching items:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch items" },
        { status: 500 }
      );
    }

    console.log("Fetched items count:", items?.length || 0);

    if (!items || items.length < 5) {
      return NextResponse.json({
        error:
          "Not enough items in closet. Add at least 5 items to generate a weekly plan.",
      });
    }

    // Group items by type
    const tops = items.filter((i) =>
      ["top", "outerwear", "layer"].includes(i.type)
    );
    const bottoms = items.filter((i) => i.type === "bottom");
    const shoes = items.filter((i) => i.type === "shoes");
    const accessories = items.filter((i) =>
      ["accessories", "hat"].includes(i.type)
    );

    console.log("Items by type:", {
      tops: tops.length,
      bottoms: bottoms.length,
      shoes: shoes.length,
      accessories: accessories.length,
    });

    // Validate minimum requirements
    if (tops.length < 5 || bottoms.length < 3 || shoes.length < 2) {
      return NextResponse.json({
        error:
          "Need at least 5 tops, 3 bottoms, and 2 pairs of shoes for a weekly plan.",
      });
    }

    // Fetch weather forecast
    const lat = location?.lat || 40.7128; // Default NYC
    const lon = location?.lon || -74.006;

    const weatherUrl = `${req.headers.get("origin") || "http://localhost:3000"}/api/weather?lat=${lat}&lon=${lon}`;
    console.log("Fetching weather from:", weatherUrl);

    const weatherRes = await fetch(weatherUrl);
    const weatherData = await weatherRes.json();
    const weather: WeatherDay[] = weatherData.forecast || [];

    console.log("Weather forecast days:", weather.length);

    // Generate 7-day plan with OpenAI
    console.log("Calling OpenAI to generate weekly outfits...");
    const outfits = await generateWeeklyOutfits(
      items as ClothingItemExtended[],
      { tops, bottoms, shoes, accessories },
      weather
    );

    if (!outfits || outfits.length !== 7) {
      console.error("Failed to generate complete weekly plan. Outfits:", outfits?.length || 0);
      return NextResponse.json({
        error: "Failed to generate complete weekly plan",
      });
    }

    console.log("Successfully generated 7 day outfits");

    // Save to database
    const weekStart = getMondayOfWeek();

    console.log("Saving weekly plan to database...");
    const { data: plan, error: saveError } = await supabase
      .from("weekly_plans")
      .upsert(
        {
          user_id: user.id,
          week_start: weekStart,
          outfits: outfits,
          weather_data: weather,
        },
        { onConflict: "user_id,week_start" }
      )
      .select()
      .single();

    if (saveError) {
      console.error("Error saving weekly plan:", saveError);
      throw saveError;
    }

    console.log("Successfully saved weekly plan:", plan.id);

    const result: GenerateWeekResponse = { plan: plan as WeeklyPlan };
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}

async function generateWeeklyOutfits(
  allItems: ClothingItemExtended[],
  grouped: {
    tops: ClothingItemExtended[];
    bottoms: ClothingItemExtended[];
    shoes: ClothingItemExtended[];
    accessories: ClothingItemExtended[];
  },
  weather: WeatherDay[]
): Promise<DayOutfit[] | null> {
  const { tops, bottoms, shoes, accessories } = grouped;

  // Format item for prompt
  const formatItem = (item: ClothingItemExtended) => {
    const colors = item.palette?.slice(0, 2).join(", ") || "unknown";
    const tags = item.tags?.join(", ") || "";
    return `${item.id}: ${item.name} (${item.type}, colors: ${colors}${tags ? `, tags: ${tags}` : ""})`;
  };

  // Build weather context
  const weekStart = getMondayOfWeek();
  const weatherContext = weather
    .map((w, i) => {
      const dayName = DAYS_OF_WEEK[i];
      return `${dayName}: ${w.temp_high}°F/${w.temp_low}°F, ${w.condition}`;
    })
    .join("\n");

  const prompt = `You are a professional stylist creating a 7-day outfit plan. Generate coordinated outfits for Monday through Sunday.

WEATHER FORECAST:
${weatherContext}

AVAILABLE ITEMS:
TOPS/OUTERWEAR:
${tops.map(formatItem).join("\n")}

BOTTOMS:
${bottoms.map(formatItem).join("\n")}

SHOES:
${shoes.map(formatItem).join("\n")}

${accessories.length > 0 ? `ACCESSORIES:\n${accessories.map(formatItem).join("\n")}` : ""}

RULES:
1. Each day needs: 1 top + 1 bottom + 1 pair of shoes (minimum)
2. Select ONE item as the "hero" (featured/standout piece)
3. Match weather appropriately (layers for cold, light for warm)
4. Avoid using the SAME item on consecutive days
5. Consider color harmony and style coherence
6. Optional: Add 1-2 accessories per day
7. Suggest 0-2 additional accessories user doesn't own (general items like "sunglasses", "watch")

Return ONLY valid JSON in this exact format:
{
  "outfits": [
    {
      "day": "monday",
      "item_ids": ["id1", "id2", "id3"],
      "hero_item_id": "id1",
      "ai_insight": {
        "reason": "Brief explanation of outfit choice",
        "occasion": "Casual Day Out",
        "vibe": "Minimal Streetwear"
      },
      "suggested_accessory_ids": ["id4"]
    }
  ]
}`;

  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error("OpenAI API key not configured");
      throw new Error("OpenAI API key not configured");
    }

    console.log("Sending request to OpenAI...");

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
      console.error("OpenAI API error:", data);
      throw new Error(data?.error?.message || "OpenAI request failed");
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.error("No content in OpenAI response:", data);
      throw new Error("No response from OpenAI");
    }

    console.log("Received response from OpenAI, parsing...");

    const parsed = JSON.parse(content);
    const outfitResults: DayOutfit[] = [];

    // Validate and add dates to each day
    for (let i = 0; i < 7; i++) {
      const outfit = parsed.outfits?.[i];
      if (!outfit || !Array.isArray(outfit.item_ids)) {
        throw new Error(`Invalid outfit for day ${i + 1}`);
      }

      const date = addDays(getMondayOfWeek(), i);

      outfitResults.push({
        day: DAYS_OF_WEEK[i],
        date: date,
        item_ids: outfit.item_ids,
        hero_item_id: outfit.hero_item_id || outfit.item_ids[0],
        ai_insight: outfit.ai_insight || {
          reason: "Coordinated outfit for the day",
          occasion: "Casual",
          vibe: "Comfortable",
        },
        suggested_accessory_ids: outfit.suggested_accessory_ids || [],
      });
    }

    return outfitResults;
  } catch (err) {
    console.error("Failed to generate weekly outfits:", err);
    return null;
  }
}
