"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

type ClothingItem = {
  id: string;
  user_id: string;
  name: string;
  type: "top" | "bottom" | "shoes" | string;
  created_at: string;
  image_url: string | null; 
};

export default function ClosetPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setError(null);
    const { data: sess } = await supabase.auth.getSession();
    if (!sess?.session) {
      router.replace("/");
      return;
    }
    const u = sess.session.user;
    setUid(u.id);
    setEmail(u.email ?? null);

    const { data, error } = await supabase
      .from("clothes")
      .select("id,user_id,name,type,created_at, image_url")
      .eq("user_id", u.id)
      .order("created_at", { ascending: false });

    if (error) setError(error.message);
    setItems(data ?? []);
  }, [router]);

  useEffect(() => {
    (async () => {
      await fetchItems();
      setLoading(false);
    })();

    // Also refetch when auth state changes (e.g., after sign-in)
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      fetchItems();
    });
    return () => sub.subscription.unsubscribe();
  }, [fetchItems]);

  if (loading) return <p className="p-6 text-center">Loading your closet…</p>;

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">👕 Your Closet</h1>
          <p className="text-sm text-muted-foreground">
            Signed in as <strong>{email}</strong>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchItems}>Refresh</Button>
          <Button asChild>
            <Link href="/closet/add">+ Add Item</Link>
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-md border p-6 text-center">
          <p className="mb-3">Your closet is empty.</p>
          <Button asChild>
            <Link href="/closet/add">Add your first item</Link>
          </Button>
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((it) => (
            <li key={it.id} className="rounded-lg border bg-card p-4 shadow-sm hover:shadow transition">
            {it.image_url ? (
              <img
                src={it.image_url}
                alt={it.name}
                className="mb-3 h-40 w-full object-cover rounded-md"
              />
            ) : (
              <div className="mb-3 h-40 w-full rounded-md border bg-muted/30 grid place-items-center text-xs text-muted-foreground">
                No photo
              </div>
            )}
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold">{it.name}</h3>
              <span className="rounded-full border px-2 py-0.5 text-xs capitalize">{it.type}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Added {new Date(it.created_at).toLocaleDateString()}
            </p>
          </li>
          ))}
        </ul>
      )}
    </main>
  );
}