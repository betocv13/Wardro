// src/hooks/useUserClothes.ts
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export type ItemType = "top" | "bottom" | "shoes" | string;

export type ClothingItem = {
  id: string;
  user_id: string;
  name: string;
  type: ItemType;
  created_at: string;
  image_url: string | null;
};

function errMsg(e: unknown) {
  if (e instanceof Error) return e.message;
  try { return JSON.stringify(e); } catch { return String(e); }
}

/**
 * Fetch the current user's clothes. Optionally filter by type.
 */
export function useUserClothes(filterType?: "top" | "bottom" | "shoes") {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setError(null);
    try {
      const { data: sessionRes } = await supabase.auth.getSession();
      const session = sessionRes?.session;

      if (!session) {
        router.replace("/");
        return;
      }

      const user = session.user;
      setEmail(user.email ?? null);

      let query = supabase
        .from("clothes")
        .select("id,user_id,name,type,created_at,image_url")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (filterType) query = query.eq("type", filterType);

      const { data, error } = await query;
      if (error) throw error;

      setItems(data ?? []);
    } catch (e) {
      setItems([]);
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [router, filterType]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      setLoading(true);
      await fetchItems();
    })();
    return () => { mounted = false; };
  }, [fetchItems]);

  return { loading, error, email, items, refresh: fetchItems };
}