import type { ReactNode } from "react";
import SideNav from "@/components/SideNav";

export default function ClosetLayout({ children }: { children: ReactNode }) {
  return (
    <div className="md:flex">
      <SideNav />
      <main className="flex-1 min-h-[100dvh] bg-background border">
        {children}
      </main>
    </div>
  );
}