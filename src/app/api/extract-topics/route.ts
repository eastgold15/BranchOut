import { NextResponse } from "next/server";
import { extractAtomicTopics } from "@/lib/topic-extractor";

// POST /api/extract-topics
// 全量提取话题（耗时 ~20s，用于定期整理）
export async function POST(request: Request) {
  try {
    const { sessionId, sessionTopic, messages } = await request.json();

    if (!(sessionId && messages && Array.isArray(messages))) {
      return NextResponse.json(
        { error: "sessionId and messages are required" },
        { status: 400 }
      );
    }

    const chatHistory = messages.map(
      (m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })
    );

    const topics = await extractAtomicTopics(
      sessionTopic || "学习主题",
      chatHistory
    );

    return NextResponse.json({ topics });
  } catch (error) {
    console.error("Extract topics error:", error);
    return NextResponse.json(
      { error: "Failed to extract topics" },
      { status: 500 }
    );
  }
}
