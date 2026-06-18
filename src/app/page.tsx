"use client";

import { TopicSelector } from "@/components/topic-selector";
import { KnowledgeTree } from "@/components/knowledge-tree/knowledge-tree";
import { NestedChatView } from "@/components/chat/nested-chat-view";
import { useSessionStore } from "@/store/sessionStore";

export default function Home() {
  const { session, viewMode, currentChatNodeId } = useSessionStore();

  return (
    <main className="relative">
      {!session ? (
        <TopicSelector />
      ) : (
        <>
          <KnowledgeTree />
          {viewMode === "chat" && currentChatNodeId && <NestedChatView />}
        </>
      )}
    </main>
  );
}
