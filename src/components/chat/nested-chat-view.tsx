"use client";

import { useSessionStore } from "@/store/sessionStore";
import { ChatCard } from "./chat-card";

export function NestedChatView() {
  const { navigationStack, currentChatNodeId, goBack } = useSessionStore();

  if (!currentChatNodeId || navigationStack.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex">
      {/* Sidebar with navigation stack */}
      <div className="w-64 border-r border-slate-800 p-4 flex flex-col">
        <h2 className="text-white font-medium mb-4">导航路径</h2>
        <div className="space-y-2">
          {navigationStack.map((item, index) => (
            <div
              key={item.nodeId}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                index === navigationStack.length - 1
                  ? "bg-sky-900/50 text-sky-200 border border-sky-700"
                  : "text-slate-400 hover:bg-slate-800"
              }`}
            >
              <span className="text-xs text-slate-500">{index + 1}</span>
              <span className="truncate">{item.title}</span>
            </div>
          ))}
        </div>

        {navigationStack.length > 1 && (
          <button
            onClick={goBack}
            className="mt-4 text-slate-400 hover:text-white text-sm px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors text-left"
          >
            ← 返回上一级
          </button>
        )}
      </div>

      {/* Main chat area */}
      <div className="flex-1 p-4">
        <ChatCard
          nodeId={currentChatNodeId}
          title={navigationStack[navigationStack.length - 1]?.title || ""}
        />
      </div>
    </div>
  );
}
