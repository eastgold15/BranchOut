import { eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { chatMessages, topicNodes } from "@/db/schema";

// GET /api/messages?nodeId=xxx — 获取某个话题的消息
// GET /api/messages?sessionId=xxx — 获取整个 session 的所有消息（用于 Feishu 话题视图）
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nodeId = searchParams.get("nodeId");
    const sessionId = searchParams.get("sessionId");

    if (nodeId) {
      const messages = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.nodeId, nodeId))
        .orderBy(chatMessages.timestamp);

      return NextResponse.json({ messages });
    }

    if (sessionId) {
      // 先查该 session 下所有话题节点
      const nodes = await db
        .select({ id: topicNodes.id })
        .from(topicNodes)
        .where(eq(topicNodes.sessionId, sessionId));

      const nodeIds = nodes.map((n) => n.id);

      if (nodeIds.length === 0) {
        return NextResponse.json({ messages: [] });
      }

      // 查所有话题的所有消息
      const messages = await db
        .select()
        .from(chatMessages)
        .where(inArray(chatMessages.nodeId, nodeIds))
        .orderBy(chatMessages.timestamp);

      return NextResponse.json({ messages, nodes });
    }

    return NextResponse.json(
      { error: "nodeId or sessionId is required" },
      { status: 400 }
    );
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
