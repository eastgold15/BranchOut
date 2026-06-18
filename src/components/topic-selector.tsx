"use client";

import { useState } from "react";
import { useSessionStore } from "@/store/sessionStore";
import type { KnowledgeSession, TopicNodeData } from "@/types";
import { nanoid } from "nanoid";

export function TopicSelector() {
  const [topic, setTopic] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { setSession, setLoading, setError } = useSessionStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setIsLoading(true);
    setLoading(true);

    try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim() }),
      });

      if (!response.ok) {
        throw new Error("Failed to create session");
      }

      const data = await response.json();

      const nodesMap = new Map<string, TopicNodeData>();
      data.nodes.forEach((node: TopicNodeData) => {
        nodesMap.set(node.id, node);
      });

      const session: KnowledgeSession = {
        id: data.sessionId,
        rootTopic: topic.trim(),
        status: "active",
        nodes: nodesMap,
        rootNodeId: data.rootNodeId,
        currentFocusNodeId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setSession(session);
    } catch (error) {
      console.error("Failed to create session:", error);
      setError("创建学习会话失败，请重试");
    } finally {
      setIsLoading(false);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">查漏补缺</h1>
          <p className="text-slate-400">用 AI 构建你的知识树，发现每一个薄弱点</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="topic"
              className="block text-sm font-medium text-slate-300 mb-2"
            >
              今天想复习什么知识点？
            </label>
            <input
              type="text"
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="例如：函数、三角函数、牛顿定律..."
              className="w-full bg-slate-900 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={!topic.trim() || isLoading}
            className="w-full bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                正在生成知识树...
              </>
            ) : (
              "开始学习"
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-xs text-slate-600">
            输入一个知识点主题，AI 会为你生成知识树并引导你复习
          </p>
        </div>
      </div>
    </div>
  );
}
