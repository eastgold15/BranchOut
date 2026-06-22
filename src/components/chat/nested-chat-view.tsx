"use client";

import { useState } from "react";
import { useSessionStore } from "@/store/sessionStore";
import type { AtomMessageData } from "@/types";

interface MessageItemProps {
  message: AtomMessageData;
  depth?: number;
}

function MessageItem({ message, depth = 0 }: MessageItemProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  const hasChildren = message.children && message.children.length > 0;

  const roleColors = {
    user: "bg-blue-500/20 border-blue-500/30",
    assistant: "bg-purple-500/20 border-purple-500/30",
    topic: "bg-emerald-500/20 border-emerald-500/30",
  };

  const roleLabels = {
    user: "用户",
    assistant: "AI",
    topic: "话题",
  };

  return (
    <div className="mb-2">
      <div
        className={`rounded-lg border p-3 ${roleColors[message.role]}`}
        style={{ marginLeft: `${depth * 16}px` }}
      >
        <div className="mb-1 flex items-center gap-2">
          <span className="rounded bg-slate-700/50 px-1.5 py-0.5 text-xs">
            {roleLabels[message.role]}
          </span>
          {message.title && (
            <span className="font-medium text-white text-sm">
              {message.title}
            </span>
          )}
          {hasChildren && (
            <button
              className="ml-auto text-slate-400 text-xs hover:text-white"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? "收起" : `展开 (${message.children?.length})`}
            </button>
          )}
        </div>

        {message.content && (
          <p className="text-slate-300 text-sm whitespace-pre-wrap">
            {message.content}
          </p>
        )}

        {message.timestamp && (
          <div className="mt-1 text-slate-500 text-xs">
            {new Date(message.timestamp).toLocaleString("zh-CN")}
          </div>
        )}
      </div>

      {/* 子消息 */}
      {hasChildren && isExpanded && (
        <div className="mt-1">
          {message.children?.map((child) => (
            <MessageItem key={child.id} depth={depth + 1} message={child} />
          ))}
        </div>
      )}
    </div>
  );
}

interface NestedChatViewProps {
  onTopicSelect?: (topic: AtomMessageData) => void;
}

export function NestedChatView({ onTopicSelect }: NestedChatViewProps) {
  const session = useSessionStore((s) => s.session);
  const [newMessage, setNewMessage] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<AtomMessageData | null>(
    null
  );

  if (!session) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400">
        <p>请先创建学习会话</p>
      </div>
    );
  }

  // 构建消息树
  const messageTree = session.messages.filter((m) => m.parentId === null);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !session) return;

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          content: newMessage.trim(),
          role: "user",
          title: newMessage.trim().slice(0, 50),
          parentId: selectedTopic?.id || null,
        }),
      });

      if (response.ok) {
        setNewMessage("");
        // 刷新会话数据
        useSessionStore.getState().loadSession(session.id);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* 话题选择器 */}
      <div className="border-b border-slate-700 p-3">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-sm">当前话题：</span>
          <select
            className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-white"
            onChange={(e) => {
              const topicId = e.target.value;
              const topic = session.messages.find((m) => m.id === topicId);
              setSelectedTopic(topic || null);
              if (topic && onTopicSelect) {
                onTopicSelect(topic);
              }
            }}
            value={selectedTopic?.id || ""}
          >
            <option value="">根话题</option>
            {session.messages
              .filter((m) => m.role === "topic")
              .map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.title}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4">
        {messageTree.length === 0 ? (
          <div className="flex h-full items-center justify-center text-slate-400">
            <p>暂无消息</p>
          </div>
        ) : (
          messageTree.map((message) => (
            <MessageItem key={message.id} message={message} />
          ))
        )}
      </div>

      {/* 输入框 */}
      <div className="border-t border-slate-700 p-3">
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="输入消息..."
            type="text"
            value={newMessage}
          />
          <button
            className="rounded-lg bg-sky-600 px-4 py-2 font-medium text-white transition-colors hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-500"
            disabled={!newMessage.trim()}
            onClick={handleSendMessage}
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}