import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";          // need Node for File -> Buffer
export const dynamic = "force-dynamic";   // avoid caching

function errorMessage(e: unknown) {
  if (e instanceof Error) return e.message;
  try { return JSON.stringify(e); } catch { return String(e); }
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const userId = form.get("userId") as string | null;
    const filename = form.get("filename") as string | null;

    if (!file || !userId || !filename) {
      return NextResponse.json(
        { error: "Missing file, userId, or filename" },
        { status: 400 }
      );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE;

    if (!url || !serviceKey) {
      return NextResponse.json(
        { error: "Server is missing SUPABASE env vars" },
        { status: 500 }
      );
    }

    const supabase = createClient(url, serviceKey);

    // Convert web File -> Buffer for Node runtime
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const bucket = "clothes";
    // Service role bypasses RLS.
    const path = `${userId}/${filename}`;

    const { error: uploadErr } = await supabase.storage
      .from(bucket)
      .upload(path, buffer, {
        upsert: true,
        contentType: file.type || "application/octet-stream",
        cacheControl: "3600",
      });

    if (uploadErr) {
      return NextResponse.json(
        { error: uploadErr.message, where: "upload" },
        { status: 400 }
      );
    }

    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
    return NextResponse.json({ publicUrl: pub.publicUrl, path });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: errorMessage(e), where: "handler" },
      { status: 500 }
    );
  }
}