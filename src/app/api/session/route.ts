import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { sessions, topicNodes } from "@/db/schema";
import { generateKnowledgeTree } from "@/lib/ai-service";

// GET /api/session?id=xxx — 获取单个会话及其节点
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

    const nodes = await db
      .select()
      .from(topicNodes)
      .where(eq(topicNodes.sessionId, id))
      .orderBy(topicNodes.depth);

    const rootNode = nodes.find((n) => n.depth === 0);

    return NextResponse.json({
      session,
      nodes: nodes.map((n) => ({
        id: n.id,
        title: n.title,
        content: n.content,
        depth: n.depth,
        parentId: n.parentId,
        status: n.status,
        source: n.source,
        embedding: n.embedding,
        children: nodes
          .filter((child) => child.parentId === n.id)
          .map((child) => child.id),
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
      })),
      rootNodeId: rootNode?.id || null,
    });
  } catch (error) {
    console.error("Get session error:", error);
    return NextResponse.json(
      { error: "Failed to get session" },
      { status: 500 }
    );
  }
}

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

    // Create nodes
    const nodeMap = new Map<string, string>(); // title -> id
    const nodes: Array<{
      id: string;
      title: string;
      content: string;
      parentId: string | null;
      depth: number;
      status: string;
    }> = [];

    // Create root node
    const rootNodeId = nanoid();
    nodeMap.set(topic, rootNodeId);
    nodes.push({
      id: rootNodeId,
      title: topic,
      content: `${topic} 知识树的根节点`,
      parentId: null,
      depth: 0,
      status: "untouched",
    });

    // Create child nodes
    for (const node of treeData.nodes) {
      if (node.depth === 0) {
        continue; // Skip root if AI returned one
      }

      const nodeId = nanoid();
      nodeMap.set(node.title, nodeId);

      const parentId = node.parentTitle
        ? nodeMap.get(node.parentTitle)
        : rootNodeId;

      nodes.push({
        id: nodeId,
        title: node.title,
        content: node.description,
        parentId: parentId || rootNodeId,
        depth: node.depth,
        status: "untouched",
      });
    }

    // Insert all nodes
    for (const node of nodes) {
      await db.insert(topicNodes).values({
        id: node.id,
        sessionId,
        title: node.title,
        content: node.content,
        parentId: node.parentId,
        depth: node.depth,
        status: "untouched",
        source: "ai-init",
      });
    }

    return NextResponse.json({
      sessionId,
      rootNodeId,
      nodes: nodes.map((n) => ({
        ...n,
        children: nodes
          .filter((child) => child.parentId === n.id)
          .map((child) => child.id),
        createdAt: new Date(),
        updatedAt: new Date(),
        source: "ai-init",
      })),
    });
  } catch (error) {
    console.error("Session creation error:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}
