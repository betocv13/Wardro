"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function AuthForm() {
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMsg("Account created! Redirecting...");
        window.location.href = "/closet";
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setMsg("Signed in! Redirecting...");
        window.location.href = "/closet";
      }
    } catch (err: unknown) {
      if (err && typeof err === "object" && "message" in err) {
        setMsg(String((err as { message?: string }).message));
      } else {
        setMsg("Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.reload();
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 justify-center">
        <Button variant={mode === "signup" ? "default" : "outline"} onClick={() => setMode("signup")}>
          Sign up
        </Button>
        <Button variant={mode === "signin" ? "default" : "outline"} onClick={() => setMode("signin")}>
          Sign in
        </Button>
       
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 text-left">
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
        </Button>
      </form>

      {msg && <p className="text-sm text-center text-muted-foreground">{msg}</p>}
    </div>
  );
}