"use client";

import { useState, useRef, useEffect } from "react";
import { useSessionStore } from "@/store/sessionStore";
import type { ChatMessageData } from "@/types";

interface ChatCardProps {
  nodeId: string;
  title: string;
  isNested?: boolean;
}

export function ChatCard({ nodeId, title, isNested = false }: ChatCardProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { session, enterSubChat, returnToTree } = useSessionStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !session) return;

    const userMessage: ChatMessageData = {
      id: Date.now().toString(),
      nodeId,
      role: "user",
      content: input,
      type: "text",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: session.rootTopic,
          nodeTitle: title,
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const data = await response.json();

      const assistantMessage: ChatMessageData = {
        id: (Date.now() + 1).toString(),
        nodeId,
        role: "assistant",
        content: data.content,
        type: data.type || "text",
        spawnedNodeId: data.spawnedNodeId,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className={`flex flex-col h-full bg-slate-900/95 backdrop-blur-sm ${
        isNested ? "rounded-lg border border-slate-700" : ""
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-sky-400" />
          <h3 className="text-white font-medium">{title}</h3>
        </div>
        <button
          onClick={returnToTree}
          className="text-slate-400 hover:text-white text-sm transition-colors"
        >
          回到主线
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-slate-500 py-8">
            <p>开始探讨「{title}」</p>
            <p className="text-sm mt-1">你可以提问、讨论或请求解释</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.role === "user"
                  ? "bg-sky-600 text-white"
                  : message.type === "correction"
                  ? "bg-orange-900/50 border border-orange-700 text-orange-100"
                  : "bg-slate-800 text-slate-200"
              }`}
            >
              <div className="text-sm whitespace-pre-wrap">{message.content}</div>
              {message.type === "correction" && (
                <button
                  onClick={() => {
                    if (message.spawnedNodeId) {
                      enterSubChat(message.spawnedNodeId, "深入探讨");
                    }
                  }}
                  className="mt-2 text-xs bg-orange-700 hover:bg-orange-600 text-white px-3 py-1 rounded-full transition-colors"
                >
                  深入了解
                </button>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-slate-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息..."
            className="flex-1 bg-slate-800 text-white placeholder-slate-500 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
