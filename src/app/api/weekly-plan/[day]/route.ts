// src/app/api/weekly-plan/[day]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { DayOfWeek, WeeklyPlan } from "@/types/weekly-planner";

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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ day: string }> }
) {
  try {
    const { day } = await params;

    if (!DAYS_OF_WEEK.includes(day as DayOfWeek)) {
      return NextResponse.json({ error: "Invalid day" }, { status: 400 });
    }

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { item_ids, hero_item_id } = await req.json();

    if (!Array.isArray(item_ids) || !hero_item_id) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
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

    const outfits = plan.outfits as any[];
    const dayIndex = DAYS_OF_WEEK.indexOf(day as DayOfWeek);

    if (!outfits[dayIndex]) {
      return NextResponse.json({ error: "Day not found" }, { status: 404 });
    }

    // Update the specific day
    outfits[dayIndex] = {
      ...outfits[dayIndex],
      item_ids,
      hero_item_id,
    };

    // Save updated plan
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
