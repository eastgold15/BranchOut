import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { views } from "@/db/schema";

// GET /api/views?sessionId=xxx — 获取某个 session 的所有视角
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    const result = await db
      .select()
      .from(views)
      .where(eq(views.sessionId, sessionId))
      .orderBy(views.createdAt);

    return NextResponse.json({ views: result });
  } catch (error) {
    console.error("Get views error:", error);
    return NextResponse.json({ error: "Failed to get views" }, { status: 500 });
  }
}

// POST /api/views — 创建新视角
export async function POST(request: Request) {
  try {
    const { sessionId, name, type, segments } = await request.json();

    if (!(sessionId && name)) {
      return NextResponse.json(
        { error: "sessionId and name are required" },
        { status: 400 }
      );
    }

    const id = nanoid();
    const result = await db
      .insert(views)
      .values({
        id,
        sessionId,
        name,
        type: type || "custom",
        segments: segments ? JSON.stringify(segments) : "[]",
      })
      .returning();

    return NextResponse.json({ view: result[0] });
  } catch (error) {
    console.error("Create view error:", error);
    return NextResponse.json(
      { error: "Failed to create view" },
      { status: 500 }
    );
  }
}

// DELETE /api/views?id=xxx — 删除视角
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    await db.delete(views).where(eq(views.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete view error:", error);
    return NextResponse.json(
      { error: "Failed to delete view" },
      { status: 500 }
    );
  }
}
