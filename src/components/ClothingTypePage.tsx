"use client";

import { usePagedClothes } from "@/hooks/usePagedClothes";
import ClothesCard from "@/components/clothescard";

type ItemType = "top" | "bottom" | "shoes";

type ClothingTypePageProps = {
  title: string;
  filterType: ItemType;
};

export default function ClothingTypePage({ title, filterType }: ClothingTypePageProps) {
  const {
    items,
    error,
    isLoadingInitial,
    isFetchingNextPage,
    hasMore,
    setSentinelRef,
  } = usePagedClothes({ pageSize: 6, filterType });


  if (isLoadingInitial) {
    return (
      <main className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">{title}</h1>
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

  if (error) {
    return (
      <main className="p-6">
        <p className="text-sm text-red-600">Error: {error}</p>
      </main>
    );
  }

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">{title}</h1>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No {filterType}s yet.</p>
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
        {/* infinite scroll sentinel / loader */}
        <div ref={setSentinelRef} className="py-6 flex justify-center">
            {isFetchingNextPage ? (
              <div className="text-sm text-muted-foreground">Loading more…</div>
            ) : !hasMore ? (
              <div className="text-xs text-muted-foreground">No more items.</div>
            ) : null}
          </div>
        </>
      )}
    </main>
  );
}