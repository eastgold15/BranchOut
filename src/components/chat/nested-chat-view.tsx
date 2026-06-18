"use client";

import { useSessionStore } from "@/store/sessionStore";
import { ChatCard } from "./chat-card";

export function NestedChatView() {
  const { navigationStack, currentChatNodeId, goBack } = useSessionStore();

  if (!currentChatNodeId || navigationStack.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-slate-950/95 backdrop-blur-md">
      {/* Sidebar with navigation stack */}
      <div className="flex w-64 flex-col border-slate-800 border-r p-4">
        <h2 className="mb-4 font-medium text-white">导航路径</h2>
        <div className="space-y-2">
          {navigationStack.map((item, index) => (
            <div
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                index === navigationStack.length - 1
                  ? "border border-sky-700 bg-sky-900/50 text-sky-200"
                  : "text-slate-400 hover:bg-slate-800"
              }`}
              key={item.nodeId}
            >
              <span className="text-slate-500 text-xs">{index + 1}</span>
              <span className="truncate">{item.title}</span>
            </div>
          ))}
        </div>

        {navigationStack.length > 1 && (
          <button
            className="mt-4 rounded-lg px-3 py-2 text-left text-slate-400 text-sm transition-colors hover:bg-slate-800 hover:text-white"
            onClick={goBack}
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
