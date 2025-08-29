"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { usePaletteFromImage } from "@/hooks/usePaletteFromImage";

function errMsg(e: unknown) {
  if (e instanceof Error) return e.message;
  try { return JSON.stringify(e); } catch { return String(e); }
}

export default function AddItemPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<"top" | "bottom" | "shoes" | "accessories">("top");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [palette, imgRef] = usePaletteFromImage(preview, {
    maxColors: 4,
    paletteSize: 12,
    quality: 5,
  });

  const paletteReady = !preview || palette.length > 0;

  const canSubmit = !!preview && paletteReady && !loading;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/");
    });
  }, [router]);

  // add cleanup so we don't leak object URLs
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      setMsg("Please sign in again.");
      setLoading(false);
      return;
    }
    const userId = userData.user.id;

    // 1) create DB row first (get item id)
    const { data: insertData, error: insertErr } = await supabase
      .from("clothes")
      .insert([{ user_id: userId, name: name.trim(), type, palette: palette && palette.length ? palette : null, }])
      .select("id")
      .single();

    if (insertErr || !insertData) {
      console.error("DB insert failed:", insertErr);
      setMsg(insertErr?.message ?? "Failed to create item");
      setLoading(false);
      return;
    }


    // 2) optional: upload file via server route using service key
    if (file) {
      try {
        // Safe, unique filename; preserve extension
        const orig = file.name || "image";
        const ext = orig.includes(".") ? orig.split(".").pop() : "png";
        const safeName = `${Date.now()}.${(ext || "png").toLowerCase()}`;

        console.log("[upload] starting via API", { userId, safeName, type: file.type, size: file.size });

        const fd = new FormData();
        fd.append("file", file);
        fd.append("userId", userId);
        fd.append("filename", safeName);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: fd,
        });

        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.error || `Upload failed with ${res.status}`);
        }

        const { publicUrl } = await res.json();
        console.log("[upload] success; publicUrl:", publicUrl);

        const { error: updErr } = await supabase
          .from("clothes")
          .update({ image_url: publicUrl })
          .eq("id", insertData.id)
          .eq("user_id", userId);

        if (updErr) {
          console.error("[db] update image_url failed:", updErr);
          setMsg(`Saved item but failed to save image URL: ${updErr.message}`);
          setLoading(false);
          return;
        }
      } catch (e: unknown) {
        console.error("[upload] unexpected error:", e);
        setMsg(errMsg(e));
        setLoading(false);
        return;
      }
    }

    setMsg("Item added!");
    router.replace("/closet");
    setLoading(false);
  }

  return (
    <main className="max-w-md mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Add Item</h1>
        <p className="text-sm text-muted-foreground">Add name, type, and an optional photo.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            placeholder="e.g. Black T-Shirt"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="type">Type</Label>
          <select
              id="type"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value as "top" | "bottom" | "shoes")}
          >
            <option value="top">Top</option>
            <option value="bottom">Bottom</option>
            <option value="shoes">Shoes</option>
            <option value="accessories">Accessories</option>
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="photo">Photo (optional)</Label>
          <Input id="photo" type="file" accept="image/*" onChange={onFileChange} />
          {preview && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={preview}
              alt="preview"
              className="mt-2 h-32 w-32 object-cover rounded-md border"
            />
          )}
        </div>

        {preview && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            ref={imgRef}
            src={preview}
            alt=""
            className="hidden"
            aria-hidden="true"
            decoding="async"
          />
        )}

        <Button type="submit" disabled={!canSubmit} className="w-full">
          {loading ? "Adding…" : "Add Item"}
        </Button>
      </form>

      {msg && <p className="text-sm text-center text-muted-foreground">{msg}</p>}
    </main>
  );
}