import { NextResponse } from "next/server";
import { callChat } from "@/lib/ai-provider";
import { guardApi, bodyTooLarge } from "@/lib/apiGuard";

export const runtime = "nodejs";
export const maxDuration = 60;

// NVIDIA NIM vision: describes an attached image so Noor can "see" it.
export async function POST(req: Request) {
  const denied = guardApi(req, { perMinute: 120, perDay: 5000 });
  if (denied) return denied;

  try {
    if (bodyTooLarge(req, 8 * 1024 * 1024)) {
      return NextResponse.json({ error: "image too large (max 6MB)" }, { status: 413 });
    }
    const { imageDataUrl, hint } = await req.json();
    if (imageDataUrl.length > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "image too large (max 6MB)" }, { status: 413 });
    }
    if (!imageDataUrl || typeof imageDataUrl !== "string" || !imageDataUrl.startsWith("data:image/")) {
      return NextResponse.json({ error: "image required" }, { status: 400 });
    }
    const key = process.env.NVIDIA_API_KEY;
    if (!key) return NextResponse.json({ error: "no key" }, { status: 500 });

    const call = await callChat({
      model: "meta/llama-3.2-11b-vision-instruct",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: hint
                ? `Describe this image in 1-2 concise sentences. Be literal and precise - describe shapes, colors, and text exactly as they appear; never guess, interpret, or invent letters/symbols/details you cannot clearly see. Focus on: ${hint}`
                : "Describe this image in 1-2 concise sentences. Be literal and precise - describe shapes, colors, and text exactly as they appear; never guess, interpret, or invent letters/symbols/details you cannot clearly see. If something is unclear, say what you see plainly.",
            },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ],
        },
      ],
      max_tokens: 220,
      timeoutMs: 50_000,
    });
    if (!call.ok || !call.response) return NextResponse.json({ error: "vision failed" }, { status: 502 });

    const data = await call.response.json();
    const description = data?.choices?.[0]?.message?.content?.trim() || "";
    return NextResponse.json({ description });
  } catch {
    return NextResponse.json({ error: "vision failed" }, { status: 500 });
  }
}
