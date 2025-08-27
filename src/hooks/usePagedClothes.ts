// src/hooks/usePagedClothes.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  palette?: string[] | null;
};

type Options = {
  filterType?: "top" | "bottom" | "shoes";
  pageSize?: number;
};

export function usePagedClothes({ filterType, pageSize = 6 }: Options = {}) {
  const router = useRouter();

  const [email, setEmail] = useState<string | null>(null);
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchPage = useCallback(
    async (pageIndex: number, append: boolean) => {
      try {
        const { data: sessionRes } = await supabase.auth.getSession();
        const session = sessionRes?.session;
        if (!session) {
          router.replace("/");
          return;
        }
        setEmail(session.user.email ?? null);

        const from = pageIndex * pageSize;
        const to = from + pageSize - 1;

        let query = supabase
          .from("clothes")
          .select("id,user_id,name,type,created_at,image_url,palette")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })
          .range(from, to);

        if (filterType) query = query.eq("type", filterType);

        const { data, error } = await query;
        if (error) throw error;

        const rows = data ?? [];
        setHasMore(rows.length === pageSize);
        setItems(prev => (append ? [...prev, ...rows] : rows));
        setPage(pageIndex);
        setError(null);
      } catch (e: any) {
        setError(e?.message ?? String(e));
      } finally {
        setIsLoadingInitial(false);
        setIsFetchingNextPage(false);
      }
    },
    [router, filterType, pageSize]
  );

  const refresh = useCallback(async () => {
    setIsLoadingInitial(true);
    setHasMore(true);
    await fetchPage(0, false);
  }, [fetchPage]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const loadMore = useCallback(async () => {
    if (isFetchingNextPage || !hasMore) return;
    setIsFetchingNextPage(true);
    await fetchPage(page + 1, true);
  }, [fetchPage, page, isFetchingNextPage, hasMore]);

  // IntersectionObserver glue
  const observerRef = useRef<IntersectionObserver | null>(null);
  const setSentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      // cleanup previous observer
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (!node) return;

      observerRef.current = new IntersectionObserver(
        entries => {
          const first = entries[0];
          if (first.isIntersecting && !isLoadingInitial) loadMore();
        },
        { root: null, rootMargin: "300px", threshold: 0 }
      );

      observerRef.current.observe(node);
    },
    [loadMore, isLoadingInitial]);

    // cleanup on unmount
    useEffect(() => {
      return () => {
        if (observerRef.current) observerRef.current.disconnect();
      };
    }, 
[]);


  return {
    email,
    items,
    error,
    isLoadingInitial,
    isFetchingNextPage,
    hasMore,
    loadMore,         // still exposed if you want a manual “Load more” button
    setSentinelRef,   // assign this to a <div ref={...} /> at the bottom
    pageSize
  };
}