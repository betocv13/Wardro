"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function ClosetPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is signed in
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/"); // not signed in → redirect home
      } else {
        setEmail(data.session.user.email ?? null);
      }
      setLoading(false);
    };

    getSession();
  }, [router]);

  if (loading) {
    return <p className="p-6 text-center">Loading your closet...</p>;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-3xl font-bold">👕 Your Closet</h1>
        <p className="text-muted-foreground">
          Signed in as <strong>{email}</strong>
        </p>
        <p className="mt-4">This is where your clothing dashboard will go.</p>
      </div>
    </main>
  );
}