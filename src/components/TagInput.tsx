"use client";

import { useState, KeyboardEvent } from "react";
import { X } from "lucide-react";

type Props = {
    value: string[];
    onChange: (next: string[]) => void;
    placeholder?: string;
    maxTags?: number;
};

export default function TagInput({
                                     value,
                                     onChange,
                                     placeholder,
                                     maxTags = Infinity,
                                 }: Props) {
    const [draft, setDraft] = useState("");

    const atMax = value.length >= maxTags;

    function addTag(raw: string) {
        const t = raw.trim().toLowerCase();
        if (!t) return;
        if (value.includes(t)) return;
        if (atMax) return;
        onChange([...value, t]);
    }

    function removeTag(tag: string) {
        onChange(value.filter((t) => t !== tag));
    }

    function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
            e.preventDefault();
            addTag(draft);
            setDraft("");
        }
        if (e.key === " " && draft.trim().length > 0) {
            e.preventDefault();
            addTag(draft);
            setDraft("");
        }
    }

    return (
        <div className="w-full rounded-md border bg-background p-2">
            <div className="flex flex-wrap gap-2">
                {value.map((tag) => (
                    <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-sm"
                    >
            {tag}
                        <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="rounded-full p-0.5 hover:bg-muted"
                            aria-label={`Remove ${tag}`}
                        >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
                ))}

                <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder={
                        atMax ? "Max tags reached" : placeholder ?? "Type and press Enter"
                    }
                    disabled={atMax}
                    className="min-w-[8rem] flex-1 bg-transparent outline-none text-sm px-1 py-1 disabled:opacity-50"
                />
            </div>
        </div>
    );
}