import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { chatMessages } from "@/db/schema";

// GET /api/messages?nodeId=xxx
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nodeId = searchParams.get("nodeId");

    if (!nodeId) {
      return NextResponse.json(
        { error: "nodeId is required" },
        { status: 400 }
      );
    }

    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.nodeId, nodeId))
      .orderBy(chatMessages.timestamp);

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Get messages error:", error);
    return NextResponse.json(
      { error: "Failed to get messages" },
      { status: 500 }
    );
  }
}

// POST /api/messages
export async function POST(request: Request) {
  try {
    const { nodeId, role, content, type, spawnedNodeId } = await request.json();

    if (!(nodeId && role && content)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const result = await db
      .insert(chatMessages)
      .values({
        id: crypto.randomUUID(),
        nodeId,
        role,
        content,
        type: type || "text",
        spawnedNodeId: spawnedNodeId || null,
      })
      .returning();

    return NextResponse.json({ message: result[0] });
  } catch (error) {
    console.error("Save message error:", error);
    return NextResponse.json(
      { error: "Failed to save message" },
      { status: 500 }
    );
  }
}
