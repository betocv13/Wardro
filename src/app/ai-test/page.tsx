"use client";

import { useState } from "react";

export default function TestPage() {
    const [result, setResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function getAiTest() {
        try {
            const res = await fetch("/api/ai", {
                method: "POST",
                body: JSON.stringify({ input: "Write a haiku about Wardro closets" }),
                headers: { "Content-Type": "application/json" },
            });

            if (!res.ok) throw new Error(`Request failed: ${res.status}`);
            const data = await res.json();
            console.log("AI Response:", data);
            setResult(JSON.stringify(data, null, 2));
        } catch (err) {
            console.error(err);
            setError(String(err));
        }
    }

    return (
        <main className="p-6">
            <h1 className="text-2xl font-bold mb-4">AI Test Page</h1>
            <button
                onClick={getAiTest}
                className="px-4 py-2 bg-black text-white rounded"
            >
                Test AI
            </button>

            {result && (
                <pre className="mt-4 p-2 bg-gray-100 rounded">{result}</pre>
            )}
            {error && <p className="text-red-500 mt-4">{error}</p>}
        </main>
    );
}