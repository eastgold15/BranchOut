import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { atomMessages } from "@/db/schema";

export async function POST(request: Request) {
  try {
    const { pathname } = new URL(request.url);
    
    if (pathname.endsWith("/reorder")) {
      const { parentId, messageIds } = await request.json();
      
      if (!Array.isArray(messageIds)) {
        return NextResponse.json({ error: "messageIds must be an array" }, { status: 400 });
      }

      const updatePromises = messageIds.map((id: string, index: number) =>
        db.update(atomMessages)
          .set({ order: index })
          .where(and(
            eq(atomMessages.id, id),
            eq(atomMessages.parentId, parentId ?? null)
          ))
      );

      await Promise.all(updatePromises);
      return NextResponse.json({ success: true });
    }

    if (pathname.endsWith("/merge")) {
      const { sourceTopicId, targetTopicId } = await request.json();
      
      if (!sourceTopicId || !targetTopicId) {
        return NextResponse.json({ error: "sourceTopicId and targetTopicId are required" }, { status: 400 });
      }

      if (sourceTopicId === targetTopicId) {
        return NextResponse.json({ error: "Cannot merge a topic with itself" }, { status: 400 });
      }

      await db.transaction(async (tx) => {
        await tx.update(atomMessages)
          .set({ parentId: targetTopicId })
          .where(eq(atomMessages.parentId, sourceTopicId));

        await tx.update(atomMessages)
          .set({ parentId: targetTopicId })
          .where(eq(atomMessages.id, sourceTopicId));

        await tx.update(atomMessages)
          .set({ topicType: "galaxy" })
          .where(eq(atomMessages.id, targetTopicId));
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown endpoint" }, { status: 404 });
  } catch (error) {
    console.error("Message operation error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}