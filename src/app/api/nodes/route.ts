import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { topicNodes } from "@/db/schema";

// POST /api/nodes
// 创建新话题节点
export async function POST(request: Request) {
  try {
    const { sessionId, title, content, parentId, depth } = await request.json();

    if (!(sessionId && title)) {
      return NextResponse.json(
        { error: "sessionId and title are required" },
        { status: 400 }
      );
    }

    const id = nanoid();
    const result = await db
      .insert(topicNodes)
      .values({
        id,
        sessionId,
        title,
        content: content || "",
        parentId: parentId || null,
        depth: depth ?? 0,
        status: "untouched",
        source: parentId ? "ai-init" : "ai-init",
      })
      .returning();

    return NextResponse.json({ node: result[0] });
  } catch (error) {
    console.error("Create node error:", error);
    return NextResponse.json(
      { error: "Failed to create node" },
      { status: 500 }
    );
  }
}

// PATCH /api/nodes?id=xxx
// 更新节点（如更新 spawnedNodeId 关联）
export async function PATCH(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const updates = await request.json();

    const [updated] = await db
      .update(topicNodes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(topicNodes.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Node not found" }, { status: 404 });
    }

    return NextResponse.json({ node: updated });
  } catch (error) {
    console.error("Update node error:", error);
    return NextResponse.json(
      { error: "Failed to update node" },
      { status: 500 }
    );
  }
}
