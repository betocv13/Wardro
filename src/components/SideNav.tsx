"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Plus } from "lucide-react";

export default function SideNav() {
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-40 bg-background border-b px-4 py-3 flex items-center justify-between">
        <div className="font-semibold">Wardro</div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm"
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={[
          "bg-card border-r hidden md:flex md:flex-col md:h-screen md:sticky md:top-0 md:w-64",
          "fixed top-[56px] bottom-0 w-72 z-40 transition-transform md:transition-none",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        ].join(" ")}
      >
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <div className="mb-4 px-2">
            <div className="text-xl font-bold">👕 Wardro</div>
            <p className="text-sm text-muted-foreground">Your closet, simplified.</p>
          </div>

          {/* Add clothing button */}
          <div className="mb-4">
            <Link
              href="/closet/add"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
            >
              <Plus className="h-4 w-4" /> Add Item
            </Link>
          </div>

          <nav className="space-y-1 text-sm">
            <a
              href="/closet"
              className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-accent"
            >
              <span>Dashboard</span>
            </a>
            <div className="mt-3">
              <div className="px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground">
                Categories
              </div>
              <a href="/closet/tops" className="block rounded-md px-3 py-2 hover:bg-accent">
                Tops
              </a>
              <a href="/closet/bottoms" className="block rounded-md px-3 py-2 hover:bg-accent">
                Bottoms
              </a>
              <a href="/closet/shoes" className="block rounded-md px-3 py-2 hover:bg-accent">
                Shoes
              </a>
            </div>
          </nav>
        </div>

        <div className="border-t p-3">
          <button
            onClick={handleLogout}
            className="w-full rounded-md border px-3 py-2 text-sm hover:bg-accent"
          >
            Log out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {open && (
        <button
          className="md:hidden fixed inset-0 z-30 bg-black/40"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
        />
      )}
    </>
  );
}