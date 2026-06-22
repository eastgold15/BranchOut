"use client";

import { useCallback, useEffect, useState } from "react";
import { NestedChatView } from "@/components/chat/nested-chat-view";
import { KnowledgeTree } from "@/components/knowledge-tree/knowledge-tree";
import { TopicSelector } from "@/components/topic-selector";
import { useSessionStore } from "@/store/sessionStore";

export default function Home() {
  const { session, viewMode, setViewMode } = useSessionStore();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Tab" && session && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setViewMode(viewMode === "chat" ? "tree" : "chat");
      }
    },
    [session, viewMode, setViewMode]
  );

  useEffect(() => {
    if (!session) return;

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [session, handleKeyDown]);

  return (
    <main className="relative h-screen">
      {session ? (
        <>
          {/* 聊天视图 */}
          {viewMode === "chat" && (
            <div className="absolute inset-0 transition-opacity duration-300">
              <NestedChatView />
            </div>
          )}

          {/* 3D知识树视图 */}
          {viewMode === "tree" && (
            <div className="absolute inset-0 transition-opacity duration-300">
              <KnowledgeTree />
            </div>
          )}

          {/* 视图切换提示 */}
          <div className="absolute bottom-4 left-1/2 z-50 -translate-x-1/2">
            <span className="rounded-full bg-slate-900/80 px-4 py-2 text-slate-400 text-xs shadow-black/20 shadow-lg backdrop-blur-md">
              按 Tab 切换视图 · 当前：{viewMode === "chat" ? "聊天" : "3D知识树"}
            </span>
          </div>
        </>
      ) : (
        <TopicSelector />
      )}
    </main>
  );
}