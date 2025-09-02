import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { imageUrl } = await req.json();

        if (!imageUrl) {
            return NextResponse.json({ error: "Missing imageUrl" }, { status: 400 });
        }

        const res = await fetch("https://api.openai.com/v1/responses", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.OPENAI_API_KEY!}`,
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                input: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "input_text",
                                text:
                                    `Return 3–6 concise style tags (lowercase, comma-separated). 
                   Example: "casual,streetwear,red,denim,minimal".`,
                            },
                            { type: "input_image", image_url: imageUrl },
                        ],
                    },
                ],
            }),
        });

        const data = await res.json();

        // Try to parse text output into tags
        const text = data?.output?.[0]?.content?.[0]?.text || "";
        const tags = text
            .split(/[,|\n]/)
            .map((t: string) => t.trim().toLowerCase())
            .filter(Boolean);

        return NextResponse.json({ tags: Array.from(new Set(tags)).slice(0, 6) });
    } catch (err: any) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}