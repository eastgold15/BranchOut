"use client";

import { useEffect, useState } from "react";
import { useSessionStore } from "@/store/sessionStore";
import type { ViewType } from "@/types";

const viewOptions: Array<{ type: ViewType; label: string; desc: string }> = [
  {
    type: "default",
    label: "知识关联",
    desc: "按语义相似度自然聚类",
  },
  {
    type: "semantic",
    label: "语义视角",
    desc: "更加突出的语义分组",
  },
  {
    type: "chronological",
    label: "时间顺序",
    desc: "按学习先后串联",
  },
  {
    type: "problem-solving",
    label: "解题思路",
    desc: "按解题方法归类",
  },
];

export function ViewSelector() {
  const { session, currentViewType, setViewType, customViews, loadViews } =
    useSessionStore();
  const [showCreate, setShowCreate] = useState(false);
  const [newViewName, setNewViewName] = useState("");

  // 加载该 session 的自定义视角
  useEffect(() => {
    if (session?.id) {
      loadViews(session.id);
    }
  }, [session?.id, loadViews]);

  const handleCreateView = async () => {
    if (!(session && newViewName.trim())) {
      return;
    }

    try {
      const res = await fetch("/api/views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          name: newViewName.trim(),
          type: "custom",
          segments: [],
        }),
      });

      if (res.ok) {
        const { view } = await res.json();
        useSessionStore.getState().addView({
          id: view.id,
          name: view.name,
          segments: [],
        });
        setNewViewName("");
        setShowCreate(false);
      }
    } catch (err) {
      console.error("Failed to create view:", err);
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
      <div className="flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/80 p-1.5 shadow-black/30 shadow-lg backdrop-blur-md">
        {viewOptions.map((opt) => (
          <button
            className={`rounded-full px-4 py-1.5 font-medium text-xs transition-all ${
              currentViewType === opt.type
                ? "bg-sky-600 text-white shadow-lg shadow-sky-600/30"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
            key={opt.type}
            onClick={() => setViewType(opt.type)}
            title={opt.desc}
            type="button"
          >
            {opt.label}
          </button>
        ))}

        {/* 自定义视角 */}
        {customViews.map((view) => (
          <button
            className={`rounded-full px-4 py-1.5 font-medium text-xs transition-all ${
              currentViewType === view.id
                ? "bg-emerald-600 text-white shadow-emerald-600/30 shadow-lg"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
            key={view.id}
            onClick={() => setViewType(view.id)}
            title={`自定义视角: ${view.name}`}
            type="button"
          >
            {view.name}
          </button>
        ))}

        {/* 创建新视角按钮 */}
        {showCreate ? (
          <div className="flex items-center gap-1">
            <input
              className="w-24 rounded bg-slate-800 px-2 py-1 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              onChange={(e) => setNewViewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateView()}
              placeholder="视角名称..."
              value={newViewName}
            />
            <button
              className="rounded px-2 py-1 text-sky-400 text-xs hover:bg-slate-800"
              onClick={handleCreateView}
              type="button"
            >
              ✓
            </button>
            <button
              className="rounded px-2 py-1 text-slate-500 text-xs hover:bg-slate-800"
              onClick={() => {
                setShowCreate(false);
                setNewViewName("");
              }}
              type="button"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            className="rounded-full px-3 py-1.5 text-slate-500 text-xs transition-all hover:bg-slate-800 hover:text-slate-300"
            onClick={() => setShowCreate(true)}
            title="创建自定义视角"
            type="button"
          >
            + 新建视角
          </button>
        )}
      </div>
    </div>
  );
}
