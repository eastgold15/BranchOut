import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { atomMessages, sessions } from "@/db/schema";
import { generateKnowledgeTree } from "@/lib/ai-service";

// GET /api/session?id=xxx — 获取单个会话及其消息
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, id))
      .limit(1);

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const messages = await db
      .select()
      .from(atomMessages)
      .where(eq(atomMessages.sessionId, id))
      .orderBy(atomMessages.timestamp);

    return NextResponse.json({
      session,
      messages,
    });
  } catch (error) {
    console.error("Get session error:", error);
    return NextResponse.json(
      { error: "Failed to get session" },
      { status: 500 }
    );
  }
}

// POST /api/session — 创建新会话
export async function POST(request: Request) {
  try {
    const { topic } = await request.json();

    if (!topic || typeof topic !== "string") {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }

    // Generate knowledge tree with AI
    const treeData = await generateKnowledgeTree(topic);

    // Create session
    const sessionId = nanoid();
    await db.insert(sessions).values({
      id: sessionId,
      rootTopic: topic,
      status: "active",
    });

    // Create root topic (AtomMessage with role="topic")
    const rootTopicId = nanoid();
    await db.insert(atomMessages).values({
      id: rootTopicId,
      sessionId,
      content: "",
      role: "topic",
      title: topic,
      parentId: null,
    });

    // Create child topics from AI generated tree
    const topicMap = new Map<string, string>(); // title -> id
    topicMap.set(topic, rootTopicId);

    for (const node of treeData.nodes) {
      if (node.depth === 0) continue; // Skip root

      const topicId = nanoid();
      topicMap.set(node.title, topicId);

      const parentId = node.parentTitle
        ? topicMap.get(node.parentTitle)
        : rootTopicId;

      await db.insert(atomMessages).values({
        id: topicId,
        sessionId,
        content: node.description || "",
        role: "topic",
        title: node.title,
        parentId: parentId || null,
      });
    }

    // Fetch all messages for the session
    const messages = await db
      .select()
      .from(atomMessages)
      .where(eq(atomMessages.sessionId, sessionId));

    return NextResponse.json({
      sessionId,
      messages,
    });
  } catch (error) {
    console.error("Session creation error:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}