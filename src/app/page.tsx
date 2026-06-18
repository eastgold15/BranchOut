"use client";

import { NestedChatView } from "@/components/chat/nested-chat-view";
import { KnowledgeTree } from "@/components/knowledge-tree/knowledge-tree";
import { TopicSelector } from "@/components/topic-selector";
import { useSessionStore } from "@/store/sessionStore";

export default function Home() {
  const { session, viewMode, currentChatNodeId } = useSessionStore();

  return (
    <main className="relative">
      {session ? (
        <>
          <KnowledgeTree />
          {viewMode === "chat" && currentChatNodeId && <NestedChatView />}
        </>
      ) : (
        <TopicSelector />
      )}
    </main>
  );
}
