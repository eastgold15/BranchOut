import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { viewGroups } from "@/db/schema";

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const viewId = searchParams.get("viewId");

    if (!viewId) {
      return NextResponse.json(
        { error: "viewId is required" },
        { status: 400 }
      );
    }

    const { title, color, parentId, nodeIds } = await request.json();

    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const id = nanoid();

    await db.insert(viewGroups).values({
      id,
      viewId,
      title,
      color: color || "#60A5FA",
      parentId: parentId || null,
      nodeIds: JSON.stringify(nodeIds || []),
      position: 0,
    });

    const group = await db
      .select()
      .from(viewGroups)
      .where(eq(viewGroups.id, id));

    return NextResponse.json({ group: group[0] });
  } catch (error) {
    console.error("Create group error:", error);
    return NextResponse.json(
      { error: "Failed to create group" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const viewId = searchParams.get("viewId");

    if (!viewId) {
      return NextResponse.json(
        { error: "viewId is required" },
        { status: 400 }
      );
    }

    const groups = await db
      .select()
      .from(viewGroups)
      .where(eq(viewGroups.viewId, viewId))
      .orderBy(viewGroups.position);

    return NextResponse.json({ groups });
  } catch (error) {
    console.error("Get groups error:", error);
    return NextResponse.json(
      { error: "Failed to get groups" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const viewId = searchParams.get("viewId");
    const groupId = searchParams.get("groupId");

    if (!(viewId && groupId)) {
      return NextResponse.json(
        { error: "viewId and groupId are required" },
        { status: 400 }
      );
    }

    const updates = await request.json();

    await db
      .update(viewGroups)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(viewGroups.id, groupId));

    const updated = await db
      .select()
      .from(viewGroups)
      .where(eq(viewGroups.id, groupId));

    if (!updated[0]) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    return NextResponse.json({ group: updated[0] });
  } catch (error) {
    console.error("Update group error:", error);
    return NextResponse.json(
      { error: "Failed to update group" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const viewId = searchParams.get("viewId");
    const groupId = searchParams.get("groupId");

    if (!(viewId && groupId)) {
      return NextResponse.json(
        { error: "viewId and groupId are required" },
        { status: 400 }
      );
    }

    const deleted = await db
      .select()
      .from(viewGroups)
      .where(eq(viewGroups.id, groupId));

    if (!deleted[0]) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    await db.delete(viewGroups).where(eq(viewGroups.id, groupId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete group error:", error);
    return NextResponse.json(
      { error: "Failed to delete group" },
      { status: 500 }
    );
  }
}
