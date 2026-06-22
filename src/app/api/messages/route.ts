import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { atomMessages } from "@/db/schema";

// GET /api/messages?sessionId=xxx — 获取整个 session 的所有消息
// GET /api/messages?id=xxx — 获取单个消息
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const id = searchParams.get("id");

    if (id) {
      const message = await db
        .select()
        .from(atomMessages)
        .where(eq(atomMessages.id, id))
        .limit(1);

      return NextResponse.json({ message: message[0] || null });
    }

    if (sessionId) {
      const messages = await db
        .select()
        .from(atomMessages)
        .where(eq(atomMessages.sessionId, sessionId))
        .orderBy(atomMessages.timestamp);

      return NextResponse.json({ messages });
    }

    return NextResponse.json(
      { error: "sessionId or id is required" },
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

// POST /api/messages — 创建新消息或话题
export async function POST(request: Request) {
  try {
    const { sessionId, content, role, title, parentId, embedding } =
      await request.json();

    if (!(sessionId && role)) {
      return NextResponse.json(
        { error: "Missing required fields: sessionId, role" },
        { status: 400 }
      );
    }

    const result = await db
      .insert(atomMessages)
      .values({
        id: crypto.randomUUID(),
        sessionId,
        content: content || "",
        role,
        title: title || "",
        parentId: parentId || null,
        embedding: embedding ? JSON.stringify(embedding) : null,
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

// PATCH /api/messages?id=xxx — 更新消息
export async function PATCH(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const updates = await request.json();
    const allowedFields = ["content", "title", "parentId", "embedding"];
    const filteredUpdates: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    }

    if (filteredUpdates.embedding !== undefined) {
      filteredUpdates.embedding = JSON.stringify(filteredUpdates.embedding);
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const result = await db
      .update(atomMessages)
      .set(filteredUpdates)
      .where(eq(atomMessages.id, id))
      .returning();

    return NextResponse.json({ message: result[0] });
  } catch (error) {
    console.error("Update message error:", error);
    return NextResponse.json(
      { error: "Failed to update message" },
      { status: 500 }
    );
  }
}

// DELETE /api/messages?id=xxx — 删除消息
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    await db.delete(atomMessages).where(eq(atomMessages.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete message error:", error);
    return NextResponse.json(
      { error: "Failed to delete message" },
      { status: 500 }
    );
  }
}