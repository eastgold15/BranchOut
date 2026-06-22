"use client";

import { useState, useCallback } from "react";
import { useSessionStore } from "@/store/sessionStore";
import type { AtomMessageData } from "@/types";
import { isGalaxyTopic, hasChildTopics } from "@/types";

interface MessageItemProps {
  message: AtomMessageData;
  depth?: number;
  onDragStart: (e: React.DragEvent, message: AtomMessageData) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetMessage: AtomMessageData) => void;
  onDragEnd: () => void;
}

function MessageItem({
  message,
  depth = 0,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd
}: MessageItemProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  const [isDragOver, setIsDragOver] = useState(false);
  const hasChildren = message.children && message.children.length > 0;

  const roleColors = {
    user: "bg-blue-500/20 border-blue-500/30",
    assistant: "bg-purple-500/20 border-purple-500/30",
    topic: isGalaxyTopic(message)
      ? "bg-amber-500/20 border-amber-500/30"
      : "bg-emerald-500/20 border-emerald-500/30",
  };

  const roleLabels = {
    user: "用户",
    assistant: "AI",
    topic: isGalaxyTopic(message)
      ? "星系"
      : hasChildTopics(message)
        ? "话题(含子话题)"
        : "话题",
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    onDragOver(e);
    setIsDragOver(true);
  }, [onDragOver]);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    onDrop(e, message);
  }, [message, onDrop]);

  return (
    <div className="mb-2">
      <div
        className={`group relative rounded-lg border p-3 transition-all duration-200 ${roleColors[message.role]} ${isDragOver ? "ring-2 ring-sky-500/50" : ""}`}
        style={{ marginLeft: `${depth * 16}px` }}
        draggable={message.role === "topic"}
        onDragStart={(e) => onDragStart(e, message)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onDragEnd={onDragEnd}
      >
        <div className="mb-1 flex items-center gap-2">
          <span className={`rounded bg-slate-700/50 px-1.5 py-0.5 text-xs ${
            isGalaxyTopic(message) ? "text-amber-400" : ""
          }`}>
            {roleLabels[message.role]}
          </span>
          {message.title && (
            <span className="font-medium text-white text-sm">
              {isGalaxyTopic(message) && <span className="mr-1">🌌</span>}
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
          {message.role === "topic" && (
            <span className="ml-auto text-slate-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
              拖拽排序
            </span>
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

      {hasChildren && isExpanded && (
        <div className="mt-1">
          {message.children?.map((child) => (
            <MessageItem
              key={child.id}
              depth={depth + 1}
              message={child}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function NestedChatView() {
  const session = useSessionStore((s) => s.session);
  const currentTopicId = useSessionStore((s) => s.currentTopicId);
  const navigationStack = useSessionStore((s) => s.navigationStack);
  const enterChat = useSessionStore((s) => s.enterChat);
  const goBack = useSessionStore((s) => s.goBack);
  const reorderMessages = useSessionStore((s) => s.reorderMessages);
  const moveMessageToTopic = useSessionStore((s) => s.moveMessageToTopic);
  const [newMessage, setNewMessage] = useState("");
  const [draggedMessage, setDraggedMessage] = useState<AtomMessageData | null>(null);

  if (!session) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400">
        <p>请先创建学习会话</p>
      </div>
    );
  }

  const buildNestedMessages = (parentId: string | null): AtomMessageData[] => {
    const children = session.messages.filter((m) => m.parentId === parentId);
    return children
      .sort((a, b) => a.order - b.order)
      .map((child) => ({
        ...child,
        children: buildNestedMessages(child.id),
      }));
  };

  const rootMessages = buildNestedMessages(currentTopicId || null);

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
          parentId: currentTopicId || null,
        }),
      });

      if (response.ok) {
        setNewMessage("");
        useSessionStore.getState().loadSession(session.id);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleDragStart = useCallback((e: React.DragEvent, message: AtomMessageData) => {
    if (message.role !== "topic") return;
    setDraggedMessage(message);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", message.id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetMessage: AtomMessageData) => {
    e.preventDefault();
    if (!draggedMessage) return;

    if (draggedMessage.id === targetMessage.id) {
      setDraggedMessage(null);
      return;
    }

    if (targetMessage.role === "topic") {
      const draggedParentId = draggedMessage.parentId;
      const targetParentId = targetMessage.parentId;

      if (draggedParentId === targetParentId) {
        const siblings = session.messages.filter((m) => m.parentId === draggedParentId);
        const sortedSiblings = [...siblings].sort((a, b) => a.order - b.order);

        const newOrder = sortedSiblings.map((s) => {
          if (s.id === draggedMessage.id) return targetMessage.id;
          if (s.id === targetMessage.id) return draggedMessage.id;
          return s.id;
        });

        reorderMessages(draggedParentId, newOrder);
      } else {
        moveMessageToTopic(draggedMessage.id, targetMessage.id);
      }
    }

    setDraggedMessage(null);
  }, [draggedMessage, session, reorderMessages, moveMessageToTopic]);

  const handleDragEnd = useCallback(() => {
    setDraggedMessage(null);
  }, []);

  return (
    <div className="flex h-full flex-col">
      {navigationStack.length > 0 && (
        <div className="border-b border-slate-700 p-3">
          <div className="flex items-center gap-2">
            <button
              className="rounded-lg bg-slate-800 px-3 py-1 text-slate-400 text-sm hover:text-white"
              onClick={goBack}
            >
              ← 返回
            </button>
            <div className="flex-1 overflow-x-auto">
              <div className="flex items-center gap-2">
                {navigationStack.map((item, index) => (
                  <span key={item.nodeId} className="flex items-center gap-2">
                    {index > 0 && <span className="text-slate-600">/</span>}
                    <span className="text-slate-300 text-sm">
                      {item.title}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="border-b border-slate-700 p-3">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-sm">当前话题：</span>
          <select
            className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-white"
            onChange={(e) => {
              const topicId = e.target.value;
              if (topicId) {
                const topic = session.messages.find((m) => m.id === topicId);
                if (topic) {
                  enterChat(topic.id, topic.title);
                }
              } else {
                goBack();
              }
            }}
            value={currentTopicId || ""}
          >
            <option value="">根话题</option>
            {session.messages
              .filter((m) => m.role === "topic")
              .map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {isGalaxyTopic(topic) && "🌌 "}
                  {topic.title}
                </option>
              ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {rootMessages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-slate-400">
            <p>暂无消息</p>
          </div>
        ) : (
          rootMessages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
            />
          ))
        )}
      </div>

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