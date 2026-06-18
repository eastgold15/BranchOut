import { NextResponse } from "next/server";
import { generateChatResponse } from "@/lib/ai-service";

export async function POST(request: Request) {
  try {
    const { topic, nodeTitle, messages } = await request.json();

    if (!topic || !messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }

    const result = await generateChatResponse(topic, messages);

    // For now, return the complete response
    // In production, you'd stream this
    const text = await result.text;

    return NextResponse.json({
      content: text,
      type: "text",
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
