import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { sessions } from "@/db/schema";

// GET /api/sessions — 列出最近的会话
export async function GET() {
  try {
    const sessionList = await db
      .select({
        id: sessions.id,
        rootTopic: sessions.rootTopic,
        status: sessions.status,
        createdAt: sessions.createdAt,
        updatedAt: sessions.updatedAt,
      })
      .from(sessions)
      .orderBy(desc(sessions.updatedAt))
      .limit(20);

    return NextResponse.json({ sessions: sessionList });
  } catch (error) {
    console.error("List sessions error:", error);
    return NextResponse.json(
      { error: "Failed to list sessions" },
      { status: 500 }
    );
  }
}
