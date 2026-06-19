"use client";

import { useCallback, useEffect, useState } from "react";
import { NestedChatView } from "@/components/chat/nested-chat-view";
import { KnowledgeTree } from "@/components/knowledge-tree/knowledge-tree";
import { TopicSelector } from "@/components/topic-selector";
import { ViewSelector } from "@/components/view-selector";
import { useSessionStore } from "@/store/sessionStore";

export default function Home() {
  const { session } = useSessionStore();
  const [showTree, setShowTree] = useState(false);

  // ── Tab 键呼出 3D 知识树 ──────────────────────────
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Tab" && session) {
        e.preventDefault();
        setShowTree(true);
      }
    },
    [session]
  );

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.key === "Tab") {
      e.preventDefault();
      setShowTree(false);
    }
  }, []);

  useEffect(() => {
    // 只在有 session 时监听 Tab
    if (!session) {
      setShowTree(false);
      return;
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    // 页面失焦时自动关闭（防止 Tab 键卡住）
    const handleBlur = () => setShowTree(false);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [session, handleKeyDown, handleKeyUp]);

  return (
    <main className="relative">
      {session ? (
        <>
          {/* 主界面：话题聊天 */}
          <NestedChatView />

          {/* Tab 呼出：3D 知识树（半透明叠加） */}
          <div
            className="fixed inset-0 z-60 transition-opacity duration-100"
            style={{
              opacity: showTree ? 1 : 0,
              pointerEvents: showTree ? "auto" : "none",
              visibility: showTree ? "visible" : "hidden",
            }}
          >
            {/* 半透明背景 */}
            <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" />

            {/* 3D 树 */}
            <div className="relative z-10 size-full">
              <ViewSelector />
              <div className="size-full">
                <KnowledgeTree />
              </div>
            </div>

            {/* Tab 提示 */}
            <div className="absolute top-6 left-1/2 z-20 -translate-x-1/2">
              <span className="rounded-full bg-slate-900/80 px-4 py-2 text-slate-400 text-xs shadow-black/20 shadow-lg backdrop-blur-md">
                松开 Tab 关闭知识树 · 点击节点进入话题聊天
              </span>
            </div>
          </div>
        </>
      ) : (
        <TopicSelector />
      )}
    </main>
  );
}
