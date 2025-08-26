"use client";

import { useUserClothes } from "@/hooks/useUserClothes";
import ClothesCard from "@/components/clothescard";

type ItemType = "top" | "bottom" | "shoes";

type ClothingTypePageProps = {
  title: string;
  filterType: ItemType;
};

export default function ClothingTypePage({ title, filterType }: ClothingTypePageProps) {
  const { loading, error, items } = useUserClothes(filterType);

  if (loading) return <main className="p-6">Loading {title.toLowerCase()}…</main>;

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
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it, idx) => (
            <li key={it.id}>
              <ClothesCard
                id={it.id}
                name={it.name}
                type={it.type}
                created_at={it.created_at}
                image_url={it.image_url}
                priority={idx < 3}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}