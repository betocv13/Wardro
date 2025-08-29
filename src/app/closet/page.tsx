"use client";

import Link from "next/link";
import {useState} from "react";
import {Button} from "@/components/ui/button";
import ClothesCard from "@/components/clothescard";
import {usePagedClothes} from "@/hooks/usePagedClothes";
import FiltersComponent from "@/components/FiltersComponent";
import {useRouter} from "next/navigation";
import {supabase} from "@/lib/supabase";
import {AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,} from "@/components/ui/alert-dialog";


export default function ClosetPage() {
    type FilterType = "all" | "top" | "bottom" | "shoes" | "accessories";
    const [filter, setFilter] = useState<FilterType>("all");

    const titles: Record<FilterType, string> = {
        all: "My Closet",
        top: "Tops",
        bottom: "Bottoms",
        shoes: "Shoes",
        accessories: "Accessories",
    };

    const router = useRouter();
    const [pendingDelete, setPendingDelete] = useState<string | null>(null);
    const title = titles[filter];

    const {
        items,
        error,
        isLoadingInitial,        // initial page loading
        isFetchingNextPage,      // loading more pages
        hasMore,                 // whether more pages exist
        setSentinelRef,          // assign to a div at the bottom
        removeLocal, restoreLocal, refresh
    } = usePagedClothes({
        pageSize: 6,
        filterType: filter === "all" ? undefined : filter, // ✅ translate "all" to undefined for the hook
    });

    function handleEdit(id: string) {
        // navigate to the add page in edit mode
        router.push(`/closet/add?id=${id}`);
    }

    function handleDelete(id: string) {
        // open the modal instead of window.confirm
        setPendingDelete(id);
    }

    async function confirmDelete() {
        if (!pendingDelete) return;

        const snapshot = [...items];      // for rollback
        removeLocal(pendingDelete);       // optimistic remove

        try {
            const {error} = await supabase.from("clothes").delete().eq("id", pendingDelete);
            if (error) throw error;
            await refresh();                // re-sync (optional)
        } catch (err: unknown) {
            restoreLocal(snapshot);         // rollback on failure
            alert(err instanceof Error ? err.message : String(err));
        } finally {
            setPendingDelete(null);         // close modal
        }
    }

    // 2) Initial loading state
    if (isLoadingInitial) {
        return (
            <main className="p-6 space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <h1 className="text-3xl font-bold">{title}</h1>
                </div>

                {/* simple skeletons */}
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({length: 6}).map((_, i) => (
                        <li key={i} className="rounded-lg border p-4">
                            <div className="mb-3 h-80 w-full rounded-md bg-muted/30 animate-pulse"/>
                            <div className="h-4 w-2/3 bg-muted/30 rounded animate-pulse"/>
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
                    <h1 className="text-3xl font-bold">{title}</h1>
                </div>
                <div className="flex gap-2">
                    <FiltersComponent active={filter} onChange={setFilter}/>
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
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
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
            <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this item?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action is permanent and cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setPendingDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </main>
    );
}