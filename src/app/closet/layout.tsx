import type { ReactNode } from "react";
import SideNav from "@/components/SideNav";

export default function ClosetLayout({ children }: { children: ReactNode }) {
  return (
    <div className="md:flex">
      <SideNav />
      <main className="flex-1 min-h-[100dvh] bg-background">
        <div className="max-w-5xl mx-auto p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}