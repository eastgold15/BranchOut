"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSessionStore } from "@/store/sessionStore";
import type { AtomMessageData } from "@/types";

interface ChatCardProps {
  topicId: string;
  title: string;
  isNested?: boolean;
}

export function ChatCard({ topicId, title, isNested = false }: ChatCardProps) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { session } = useSessionStore();

  // 获取当前话题下的消息
  const messages = session?.messages.filter((m) => m.parentId === topicId) || [];

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  const handleSend = async () => {
    if (!(input.trim() && session)) return;

    const userMessage: AtomMessageData = {
      id: crypto.randomUUID(),
      sessionId: session.id,
      content: input,
      role: "user",
      title: input.slice(0, 50),
      timestamp: new Date(),
      parentId: topicId,
      order: 0,
    };

    setInput("");
    setIsLoading(true);
    setStreamingContent("");

    // 保存用户消息
    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userMessage),
      });
    } catch (error) {
      console.error("Failed to save message:", error);
    }

    const abortController = new AbortController();
    abortRef.current = abortController;

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
        signal: abortController.signal,
      });

      if (!response.ok) throw new Error("Failed to get response");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();

          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              console.error("Stream error:", parsed.error);
              continue;
            }
            if (parsed.content) {
              fullContent += parsed.content;
              setStreamingContent(fullContent);
            }
          } catch {
            // skip malformed JSON
          }
        }
      }

      // 保存 AI 回复
      const assistantMessage: AtomMessageData = {
        id: crypto.randomUUID(),
        sessionId: session.id,
        content: fullContent,
        role: "assistant",
        title: "AI回复",
        timestamp: new Date(),
        parentId: topicId,
        order: 0,
      };

      try {
        await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(assistantMessage),
        });
      } catch (error) {
        console.error("Failed to save AI message:", error);
      }

      setStreamingContent("");
      useSessionStore.getState().loadSession(session.id);
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        console.error("Chat error:", error);
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
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
      className={`flex h-full flex-col bg-slate-900/95 backdrop-blur-sm ${
        isNested ? "rounded-lg border border-slate-700" : ""
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-slate-700 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-sky-400" />
          <h3 className="font-medium text-white">{title}</h3>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 && !isLoading && (
          <div className="py-8 text-center text-slate-500">
            <p>开始探讨「{title}」</p>
            <p className="mt-1 text-sm">你可以提问、讨论或请求解释</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
            key={message.id}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.role === "user"
                  ? "bg-sky-600 text-white"
                  : "bg-slate-800 text-slate-200"
              }`}
            >
              <div className="whitespace-pre-wrap text-sm">
                {message.content}
              </div>
            </div>
          </div>
        ))}

        {/* 流式输出 */}
        {streamingContent && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl bg-slate-800 px-4 py-3 text-slate-200">
              <div className="whitespace-pre-wrap text-sm">
                {streamingContent}
              </div>
              <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-sky-400 align-text-bottom" />
            </div>
          </div>
        )}

        {!streamingContent && isLoading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-slate-800 px-4 py-3">
              <div className="flex gap-1">
                <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
                <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0.1s]" />
                <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0.2s]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-slate-700 border-t px-4 py-3">
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg bg-slate-800 px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息..."
            type="text"
            value={input}
          />
          <button
            className="rounded-lg bg-sky-600 px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-500"
            disabled={!input.trim() || isLoading}
            onClick={handleSend}
            type="button"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}