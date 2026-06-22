"use client";

import { useEffect, useState } from "react";
import { embeddingService } from "@/lib/embedding-service";
import { useSessionStore } from "@/store/sessionStore";
import type { AtomMessageData, KnowledgeSession } from "@/types";

export function TopicSelector() {
  const [topic, setTopic] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadMsg, setLoadMsg] = useState("");
  const {
    setSession,
    setLoading,
    setError,
    loadSession,
    loadRecentSessions,
    recentSessions,
  } = useSessionStore();

  // 加载历史会话列表
  useEffect(() => {
    loadRecentSessions();
  }, [loadRecentSessions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setIsLoading(true);
    setLoading(true);
    setLoadMsg("正在生成知识树...");

    try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim() }),
      });

      if (!response.ok) throw new Error("Failed to create session");

      const data = await response.json();

      // 加载嵌入模型并计算所有话题的 embedding
      setLoadMsg("正在加载嵌入模型（首次需下载 23MB）...");
      await embeddingService.loadModel();

      setLoadMsg("正在计算知识点向量...");
      const messages: AtomMessageData[] = [];

      for (const msg of data.messages || []) {
        const embedding = await embeddingService.encode(msg.title);
        messages.push({
          ...msg,
          timestamp: new Date(msg.timestamp),
          embedding,
        });
      }

      const session: KnowledgeSession = {
        id: data.sessionId,
        rootTopic: topic.trim(),
        userId: "anonymous",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        messages,
      };

      setSession(session);
    } catch (error) {
      console.error("Failed to create session:", error);
      setError("创建学习会话失败，请重试");
    } finally {
      setIsLoading(false);
      setLoading(false);
      setLoadMsg("");
    }
  };

  const formatDate = (d: Date | string) => {
    const date = new Date(d);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / 86_400_000);

    if (days === 0) {
      return `今天 ${date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
    }
    if (days === 1) {
      return `昨天 ${date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
    }
    if (days < 7) {
      return `${days} 天前`;
    }
    return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md">
        {/* 标题 */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 font-bold text-4xl text-white">查漏补缺</h1>
          <p className="text-slate-400">
            用 AI 构建你的知识树，发现每一个薄弱点
          </p>
        </div>

        {/* 新会话表单 */}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label
              className="mb-2 block font-medium text-slate-300 text-sm"
              htmlFor="topic"
            >
              今天想复习什么知识点？
            </label>
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white placeholder-slate-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sky-500"
              disabled={isLoading}
              id="topic"
              onChange={(e) => setTopic(e.target.value)}
              placeholder="例如：函数、三角函数、牛顿定律..."
              type="text"
              value={topic}
            />
          </div>

          <button
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 py-3 font-medium text-white transition-colors hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-500"
            disabled={!topic.trim() || isLoading}
            type="submit"
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                {loadMsg}
              </>
            ) : (
              "开始学习"
            )}
          </button>
        </form>

        {/* 历史会话 */}
        {recentSessions.length > 0 && (
          <div className="mt-10">
            <div className="mb-3 flex items-center gap-2">
              <div className="h-px flex-1 bg-slate-800" />
              <span className="text-slate-500 text-xs">继续上次学习</span>
              <div className="h-px flex-1 bg-slate-800" />
            </div>

            <div className="space-y-1.5">
              {recentSessions.map((s) => (
                <button
                  className="flex w-full items-center gap-3 rounded-lg border border-slate-800 px-4 py-3 text-left transition-colors hover:border-slate-700 hover:bg-slate-900"
                  key={s.id}
                  onClick={() => loadSession(s.id)}
                  type="button"
                >
                  <span className="text-lg">📌</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-slate-200 text-sm">
                      {s.rootTopic}
                    </div>
                    <div className="text-slate-600 text-xs">
                      {formatDate(s.updatedAt)}
                    </div>
                  </div>
                  <svg
                    className="h-4 w-4 shrink-0 text-slate-600"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M9 18l6-6-6-6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}