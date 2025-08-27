"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import ClothesCard from "@/components/clothescard";
import { usePagedClothes } from "@/hooks/usePagedClothes";

export default function ClosetPage() {
  const {
    email,
    items,
    error,
    isLoadingInitial,        // initial page loading
    isFetchingNextPage,      // loading more pages
    hasMore,                 // whether more pages exist
    setSentinelRef,          // assign to a div at the bottom
  } = usePagedClothes({ pageSize: 6 });

  // 2) Initial loading state
  if (isLoadingInitial) {
    return (
      <main className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-bold">Your Closet</h1>
        </div>

        {/* simple skeletons */}
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="rounded-lg border p-4">
              <div className="mb-3 h-80 w-full rounded-md bg-muted/30 animate-pulse" />
              <div className="h-4 w-2/3 bg-muted/30 rounded animate-pulse" />
            </li>
          ))}
        </ul>
      </main>
    );
  }

  return (
    <main className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Your Closet</h1>
          {email && (
            <p className="text-sm text-muted-foreground">
              Signed in as <strong>{email}</strong>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/closet/add">+ Add Item</Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm">
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-md border p-6 text-center">
          <p className="mb-3">Your closet is empty.</p>
          <Button asChild>
            <Link href="/closet/add">Add your first item</Link>
          </Button>
        </div>
      ) : (
        <>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it, idx) => (
            <li key={it.id}>
              <ClothesCard
                id={it.id}
                name={it.name}
                type={it.type}
                created_at={it.created_at}
                image_url={it.image_url}
                palette={it.palette}
                priority={idx < 3}
              />
            </li>
          ))}
        </ul>
        
         {/* loader / sentinel */}
         <div ref={setSentinelRef} className="py-6 flex justify-center">
         {isFetchingNextPage ? (
           <div className="text-lg text-muted-foreground">Loading more…</div>
         ) : !hasMore ? (
           <div className="text-xs text-muted-foreground">No more items.</div>
         ) : null}
       </div>
     </>
   )}
 </main>
  );
}