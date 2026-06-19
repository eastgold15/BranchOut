import { NextResponse } from "next/server";
import { classifyMessageTopic } from "@/lib/topic-extractor";

// POST /api/classify-topic
export async function POST(request: Request) {
  try {
    const {
      sessionTopic,
      userMessage,
      aiResponse,
      currentTopicTitle,
      existingTopics,
      recentHistory,
    } = await request.json();

    if (!userMessage) {
      return NextResponse.json(
        { error: "userMessage is required" },
        { status: 400 }
      );
    }

    const result = await classifyMessageTopic(
      sessionTopic || "",
      userMessage,
      aiResponse || "",
      currentTopicTitle || null,
      existingTopics || [],
      recentHistory || []
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Classify topic error:", error);
    return NextResponse.json(
      { error: "Failed to classify topic" },
      { status: 500 }
    );
  }
}
