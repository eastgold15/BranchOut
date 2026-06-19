"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSessionStore } from "@/store/sessionStore";
import type { ChatMessageData, TopicNodeData } from "@/types";

/**
 * 后台调用 AI 实时判断一轮对话属于哪个话题
 * 不阻塞 UI，分类结果只用于更新话题结构展示
 */
async function classifyCurrentExchange(
  session: { id: string; rootTopic: string; nodes: Map<string, TopicNodeData> },
  userMessage: string,
  aiResponse: string,
  currentTopicTitle: string,
  currentNodeId: string,
  recentMessages: ChatMessageData[],
  addNode: (node: TopicNodeData) => void
) {
  const existingTopics = Array.from(session.nodes.values()).map((n) => ({
    title: n.title,
    content: n.content,
  }));

  const recentHistory = recentMessages.slice(-4).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const res = await fetch("/api/classify-topic", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionTopic: session.rootTopic,
      userMessage,
      aiResponse,
      currentTopicTitle,
      existingTopics,
      recentHistory,
    }),
  });

  if (!res.ok) {
    console.warn("Topic classification failed:", res.status);
    return;
  }

  const result: { topicTitle: string; isNew: boolean } = await res.json();
  console.log("[话题分类]", result);

  // 如果是新话题，创建节点
  if (result.isNew && result.topicTitle) {
    const parentNode = currentNodeId ? session.nodes.get(currentNodeId) : null;
    const depth = (parentNode?.depth ?? -1) + 1;

    try {
      const createRes = await fetch("/api/nodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          title: result.topicTitle,
          content: "",
          parentId: currentNodeId || null,
          depth,
        }),
      });

      if (createRes.ok) {
        const { node } = await createRes.json();
        const newNode: TopicNodeData = {
          id: node.id,
          title: node.title,
          content: node.content,
          depth: node.depth,
          parentId: node.parentId,
          status: node.status,
          source: node.source,
          embedding: node.embedding,
          children: [],
          createdAt: new Date(node.createdAt),
          updatedAt: new Date(node.updatedAt),
        };
        addNode(newNode);
      }
    } catch (err) {
      console.warn("[话题分类] 创建节点失败:", err);
    }
  }
}

interface ChatCardProps {
  isNested?: boolean;
  nodeId: string;
  title: string;
}

export function ChatCard({ nodeId, title, isNested = false }: ChatCardProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { session, enterSubChat, returnToTree, addNode } = useSessionStore();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  // 加载历史消息
  useEffect(() => {
    async function loadHistory() {
      setIsLoadingHistory(true);
      try {
        const response = await fetch(`/api/messages?nodeId=${nodeId}`);
        if (!response.ok) {
          throw new Error("Failed to load history");
        }

        const data = await response.json();
        const historyMessages: ChatMessageData[] = data.messages.map(
          (m: {
            id: string;
            nodeId: string;
            role: string;
            content: string;
            type: string;
            spawnedNodeId: string | null;
            timestamp: string;
          }) => ({
            id: m.id,
            nodeId: m.nodeId,
            role: m.role as "user" | "assistant",
            content: m.content,
            type: m.type as "text" | "correction" | "question" | "summary",
            spawnedNodeId: m.spawnedNodeId || undefined,
            timestamp: new Date(m.timestamp),
          })
        );

        setMessages(historyMessages);
      } catch (error) {
        console.error("Failed to load chat history:", error);
      } finally {
        setIsLoadingHistory(false);
      }
    }

    loadHistory();
  }, [nodeId]);

  // 保存消息到数据库
  const saveMessage = async (message: ChatMessageData) => {
    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeId: message.nodeId,
          role: message.role,
          content: message.content,
          type: message.type,
          spawnedNodeId: message.spawnedNodeId || null,
        }),
      });
    } catch (error) {
      console.error("Failed to save message:", error);
    }
  };

  const handleSend = async () => {
    if (!(input.trim() && session)) {
      return;
    }

    const userMessage: ChatMessageData = {
      id: Date.now().toString(),
      nodeId,
      role: "user",
      content: input,
      type: "text",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const _currentInput = input;
    setInput("");
    setIsLoading(true);
    setStreamingContent("");

    // 保存用户消息
    await saveMessage(userMessage);

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

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) {
            continue;
          }
          const data = line.slice(6).trim();

          if (data === "[DONE]") {
            continue;
          }

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
            // skip malformed JSON lines
          }
        }
      }

      const assistantMessage: ChatMessageData = {
        id: (Date.now() + 1).toString(),
        nodeId,
        role: "assistant",
        content: fullContent,
        type: "text",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setStreamingContent("");

      // 保存 AI 回复
      await saveMessage(assistantMessage);

      // 后台实时话题分类（不影响聊天体验）
      if (session) {
        classifyCurrentExchange(
          {
            id: session.id,
            rootTopic: session.rootTopic,
            nodes: session.nodes,
          },
          _currentInput,
          fullContent,
          title,
          nodeId,
          messages,
          addNode
        ).catch(console.error);
      }
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
        <button
          className="text-slate-400 text-sm transition-colors hover:text-white"
          onClick={returnToTree}
          type="button"
        >
          回到主线
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {isLoadingHistory && (
          <div className="py-8 text-center text-slate-500">
            <div className="mb-2 flex justify-center gap-1">
              <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
              <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0.1s]" />
              <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0.2s]" />
            </div>
            <p className="text-sm">加载历史记录...</p>
          </div>
        )}

        {!isLoadingHistory && messages.length === 0 && !isLoading && (
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
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${message.role === "user" ? "bg-sky-600 text-white" : message.type === "correction" ? "border border-orange-700 bg-orange-900/50 text-orange-100" : "bg-slate-800 text-slate-200"}`}
            >
              <div className="whitespace-pre-wrap text-sm">
                {message.content}
              </div>
              {message.type === "correction" && (
                <button
                  className="mt-2 rounded-full bg-orange-700 px-3 py-1 text-white text-xs transition-colors hover:bg-orange-600"
                  onClick={() => {
                    if (message.spawnedNodeId) {
                      enterSubChat(message.spawnedNodeId, "深入探讨");
                    }
                  }}
                  type="button"
                >
                  深入了解
                </button>
              )}
            </div>
          </div>
        ))}

        {/* 流式输出中的内容 */}
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
