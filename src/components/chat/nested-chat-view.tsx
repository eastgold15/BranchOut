"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSessionStore } from "@/store/sessionStore";
import type { ChatMessageData } from "@/types";

/* ============================================================
 * 飞书式话题聊天视图
 *
 * 在同一个滚动流里展示所有话题的消息，按话题分组：
 *   📌 定义域 [展开]
 *     对话消息...
 *     └─ 📎 分母不为零 [展开]     ← 子话题嵌套
 *        对话消息...
 *   📌 值域 [折叠]
 *   ...
 *
 * 底部输入框发送到"当前活跃话题"，AI 实时判断消息归属。
 * ============================================================ */

// ── 小图标 ──────────────────────────────────────────
function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-3 w-3 transition-transform ${open ? "rotate-90" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── 话题分组渲染 ─────────────────────────────────────
function TopicSection({
  depth = 0,
  isActive,
  messages,
  nodeId,
  onActivate,
  subTopics,
  title,
}: {
  depth?: number;
  isActive?: boolean;
  messages: ChatMessageData[];
  nodeId: string;
  onActivate?: (nodeId: string) => void;
  subTopics?: Array<{
    nodeId: string;
    title: string;
    messages: ChatMessageData[];
  }>;
  title: string;
}) {
  const { enterSubChat } = useSessionStore();
  const [collapsed, setCollapsed] = useState(false);
  const isSub = depth > 0;

  return (
    <div
      className="group scroll-mt-12"
      data-topic-id={nodeId}
      style={{ marginLeft: depth * 16 }}
    >
      {/* 话题标题行 */}
      <button
        className={`flex w-full items-center gap-2 px-4 py-2 text-left transition-colors ${
          isActive
            ? "border-sky-700 border-l-2 bg-sky-900/30"
            : "hover:bg-slate-800/50"
        } ${
          isSub
            ? "text-sky-300 text-xs"
            : "border-slate-700/50 border-b text-slate-200 text-sm"
        }`}
        onClick={() => {
          setCollapsed(!collapsed);
          onActivate?.(nodeId);
        }}
        type="button"
      >
        <Chevron open={!collapsed} />
        <span className={isSub ? "text-sky-300" : "text-sky-400"}>
          {isSub ? "📎" : "📌"}
        </span>
        <span className="font-medium">{title}</span>
        <span className="ml-auto text-slate-600 text-xs">
          {messages.length} 条消息
        </span>
      </button>

      {/* 消息列表 */}
      {!collapsed && (
        <div
          className={`${isSub ? "ml-4 border-sky-800/40 border-l pl-3" : ""}`}
        >
          {messages.map((msg) => (
            <div
              className={`flex px-4 py-2 ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
              key={msg.id}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-sky-600 text-white"
                    : msg.type === "correction"
                      ? "border border-orange-700 bg-orange-900/50 text-orange-100"
                      : "bg-slate-800 text-slate-200"
                }`}
              >
                {msg.content}
                {/* 如果消息触发了子话题，显示入口 */}
                {msg.spawnedNodeId && (
                  <button
                    className="mt-1.5 block rounded-full bg-sky-700/60 px-2.5 py-0.5 text-sky-200 text-xs transition-colors hover:bg-sky-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      enterSubChat(msg.spawnedNodeId!, "深入探讨");
                    }}
                    type="button"
                  >
                    深入了解 →
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* 嵌套的子话题 */}
          {subTopics?.map((st) => (
            <TopicSection
              depth={depth + 1}
              isActive={isActive}
              key={st.nodeId}
              messages={st.messages}
              nodeId={st.nodeId}
              onActivate={onActivate}
              title={st.title}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── 主组件 ───────────────────────────────────────────
export function NestedChatView() {
  const { session, currentChatNodeId, clearSession, addNode } =
    useSessionStore();
  const [allMessages, setAllMessages] = useState<ChatMessageData[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [messagesSinceExtraction, setMessagesSinceExtraction] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // 全量提取话题（每 10 轮对话触发一次）
  const triggerFullExtraction = useCallback(async () => {
    if (!session || isExtracting || messagesSinceExtraction < 10) {
      return;
    }

    setIsExtracting(true);
    try {
      const res = await fetch("/api/extract-topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          sessionTopic: session.rootTopic,
          messages: allMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (res.ok) {
        const { topics } = await res.json();
        console.log("[全量提取] 发现话题:", topics);

        // 对比现有节点，找出新增的话题
        for (const topic of topics) {
          const exists = Array.from(session.nodes.values()).some(
            (n) => n.title === topic.title
          );
          if (!exists) {
            // 创建新节点
            try {
              const createRes = await fetch("/api/nodes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  sessionId: session.id,
                  title: topic.title,
                  content: topic.content,
                  parentId: null,
                  depth: 0,
                }),
              });
              if (createRes.ok) {
                const { node } = await createRes.json();
                const newNode: import("@/types").TopicNodeData = {
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
              console.warn("[全量提取] 创建节点失败:", err);
            }
          }
        }
      }
    } catch (err) {
      console.warn("[全量提取] 失败:", err);
    } finally {
      setIsExtracting(false);
      setMessagesSinceExtraction(0);
    }
  }, [session, isExtracting, messagesSinceExtraction, allMessages, addNode]);

  // 加载所有消息，并初始化活跃话题
  useEffect(() => {
    if (!session) {
      return;
    }
    setIsLoadingHistory(true);
    fetch(`/api/messages?sessionId=${session.id}`)
      .then((r) => r.json())
      .then((data) => {
        setAllMessages(data.messages || []);
        setIsLoadingHistory(false);

        // 用 currentChatNodeId 初始化活跃话题（从知识树点进来的）
        if (currentChatNodeId) {
          setActiveTopicId(currentChatNodeId);
        }
      })
      .catch((err) => {
        console.error("Failed to load session messages:", err);
        setIsLoadingHistory(false);
      });
  }, [session, currentChatNodeId]);

  const scrollToBottom = useCallback(() => {
    setTimeout(
      () => listRef.current?.scrollIntoView({ behavior: "smooth" }),
      50
    );
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  // ── 构建话题树（展示所有会话节点，即使没有消息） ──────
  const topicTree = useMemo(() => {
    if (!session) {
      return [];
    }

    // 按消息分组
    const msgsByTopic = new Map<string, ChatMessageData[]>();
    for (const msg of allMessages) {
      if (!msgsByTopic.has(msg.nodeId)) {
        msgsByTopic.set(msg.nodeId, []);
      }
      msgsByTopic.get(msg.nodeId)!.push(msg);
    }

    // 收集 spawned 关系
    const parentTopicOfSpawned = new Map<string, string>();
    for (const msg of allMessages) {
      if (msg.spawnedNodeId) {
        parentTopicOfSpawned.set(msg.spawnedNodeId, msg.nodeId);
      }
    }
    const childTopicIds = new Set(parentTopicOfSpawned.keys());

    // 按 depth 排序
    const sortedNodes = Array.from(session.nodes.entries()).sort((a, b) => {
      const depthDiff = (a[1].depth ?? 0) - (b[1].depth ?? 0);
      if (depthDiff !== 0) {
        return depthDiff;
      }
      return a[1].createdAt.getTime() - b[1].createdAt.getTime();
    });

    // 顶层节点（未被 spawn 的）
    const rootNodes = sortedNodes.filter(([id]) => !childTopicIds.has(id));

    function buildSubTopics(parentNodeId: string) {
      const children: Array<{
        messages: ChatMessageData[];
        nodeId: string;
        title: string;
      }> = [];
      for (const [id, pId] of parentTopicOfSpawned) {
        if (pId === parentNodeId) {
          const node = session!.nodes.get(id);
          if (node) {
            children.push({
              nodeId: id,
              title: node.title,
              messages: msgsByTopic.get(id) || [],
            });
          }
        }
      }
      return children;
    }

    return rootNodes.map(([id, node]) => ({
      nodeId: id,
      title: node.title,
      messages: msgsByTopic.get(id) || [],
      subTopics: buildSubTopics(id),
    }));
  }, [allMessages, session]);

  // ── 发送消息 ────────────────────────────────────────
  const currentTopicId =
    activeTopicId || topicTree[0]?.nodeId || session?.rootNodeId;

  const handleSend = async () => {
    if (!(input.trim() && session && currentTopicId)) {
      return;
    }

    const userMsg: ChatMessageData = {
      id: crypto.randomUUID(),
      nodeId: currentTopicId,
      role: "user",
      content: input,
      type: "text",
      timestamp: new Date(),
    };

    setAllMessages((prev) => [...prev, userMsg]);
    const sentText = input;
    setInput("");
    setIsSending(true);
    setStreamingContent("");

    // 保存用户消息
    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeId: currentTopicId,
          role: "user",
          content: sentText,
          type: "text",
        }),
      });
    } catch {
      // 保存失败不影响聊天体验
    }

    const abort = new AbortController();
    abortRef.current = abort;

    // 获取当前话题标题
    const currentTopicTitle = session.nodes.get(currentTopicId)?.title || "";

    // 获取当前所有消息（用于 AI context）
    const contextMessages = [...allMessages, userMsg].map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: session.rootTopic,
          nodeTitle: currentTopicTitle,
          messages: contextMessages,
        }),
        signal: abort.signal,
      });

      if (!response.ok) {
        throw new Error("Chat API error");
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
        for (const line of text.split("\n")) {
          if (!line.startsWith("data: ")) {
            continue;
          }
          const data = line.slice(6).trim();
          if (data === "[DONE]") {
            continue;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              fullContent += parsed.content;
              setStreamingContent(fullContent);
            }
          } catch {
            // skip
          }
        }
      }

      const aiMsg: ChatMessageData = {
        id: crypto.randomUUID(),
        nodeId: currentTopicId,
        role: "assistant",
        content: fullContent,
        type: "text",
        timestamp: new Date(),
      };

      setAllMessages((prev) => [...prev, aiMsg]);
      setStreamingContent("");

      // 保存 AI 回复
      try {
        await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nodeId: currentTopicId,
            role: "assistant",
            content: fullContent,
            type: "text",
          }),
        });
      } catch {
        // ignore
      }

      // 后台分类
      classifyInBackground(
        { id: session.id, rootTopic: session.rootTopic, nodes: session.nodes },
        sentText,
        fullContent,
        currentTopicTitle,
        currentTopicId,
        allMessages,
        addNode
      );

      // 检查是否需要全量提取
      const newCount = messagesSinceExtraction + 2; // 用户消息 + AI 回复
      setMessagesSinceExtraction(newCount);
      if (newCount >= 10) {
        triggerFullExtraction();
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("Chat error:", err);
      }
    } finally {
      setIsSending(false);
      abortRef.current = null;
    }
  };

  // ── 滚动到活跃话题 ────────────────────────────────
  useEffect(() => {
    if (!activeTopicId) {
      return;
    }
    // 给 topic section 一点时间渲染
    setTimeout(() => {
      const el = document.querySelector(`[data-topic-id="${activeTopicId}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, [activeTopicId]);

  // ── 渲染 ────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950">
      {/* Header */}
      <header className="flex items-center justify-between border-slate-800 border-b px-4 py-3">
        <button
          className="flex items-center gap-1 text-slate-400 text-sm transition-colors hover:text-white"
          onClick={clearSession}
          type="button"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              d="M15 19l-7-7 7-7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          返回
        </button>
        <h1 className="font-medium text-sm text-white">
          {session?.rootTopic || ""} · 话题聊天
        </h1>
        <div className="flex items-center gap-2">
          <kbd className="hidden rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono text-slate-500 text-xs md:inline-block">
            Tab
          </kbd>
          <span className="hidden text-slate-600 text-xs md:inline-block">
            3D 知识树
          </span>
        </div>
      </header>

      {/* 消息区域 */}
      <div className="flex-1 overflow-y-auto">
        {isLoadingHistory && (
          <div className="flex items-center justify-center py-20 text-slate-500">
            <div className="flex gap-1">
              <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
              <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0.1s]" />
              <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0.2s]" />
            </div>
          </div>
        )}

        {!isLoadingHistory && topicTree.length === 0 && (
          <div className="py-20 text-center text-slate-500">
            <p>还没有对话记录</p>
            <p className="mt-1 text-xs">开始聊点什么吧</p>
          </div>
        )}

        {topicTree.map((topic) => (
          <TopicSection
            isActive={activeTopicId === topic.nodeId}
            key={topic.nodeId}
            messages={topic.messages}
            nodeId={topic.nodeId}
            onActivate={setActiveTopicId}
            subTopics={topic.subTopics}
            title={topic.title}
          />
        ))}

        {/* 流式输出 */}
        {streamingContent && (
          <div className="flex justify-start px-4 py-2">
            <div className="max-w-[75%] rounded-2xl bg-slate-800 px-3 py-2 text-slate-200 text-sm">
              {streamingContent}
              <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-sky-400 align-text-bottom" />
            </div>
          </div>
        )}

        <div ref={listRef} />
      </div>

      {/* 底部输入 */}
      <div className="border-slate-800 border-t px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <span className="shrink-0 rounded bg-sky-900/60 px-2 py-1 text-sky-300 text-xs">
            {session?.nodes.get(currentTopicId || "")?.title || "选择话题"}
          </span>
          <input
            className="flex-1 rounded-lg bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="输入消息..."
            type="text"
            value={input}
          />
          <button
            className="rounded-lg bg-sky-600 px-4 py-2.5 font-medium text-sm text-white transition-colors hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-500"
            disabled={!input.trim() || isSending}
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

// ── 后台话题分类 ─────────────────────────────────────
interface ClassificationResult {
  isNew: boolean;
  isSubTopic?: boolean;
  newNodeId?: string;
  topicTitle: string;
}

async function classifyInBackground(
  session: {
    id: string;
    rootTopic: string;
    nodes: Map<string, import("@/types").TopicNodeData>;
  },
  userMsg: string,
  aiResponse: string,
  currentTopicTitle: string,
  currentNodeId: string | null,
  recentMessages: ChatMessageData[],
  addNode: (node: import("@/types").TopicNodeData) => void
): Promise<ClassificationResult | null> {
  const existingTopics = Array.from(session.nodes.values()).map((n) => ({
    title: n.title,
    content: n.content,
  }));

  try {
    const res = await fetch("/api/classify-topic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionTopic: session?.rootTopic || "",
        userMessage: userMsg,
        aiResponse,
        currentTopicTitle,
        existingTopics,
        recentHistory: recentMessages.slice(-4).map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!res.ok) {
      return null;
    }

    const result: { topicTitle: string; isNew: boolean; isSubTopic?: boolean } =
      await res.json();
    console.log("[话题分类]", result);

    // 如果是新话题，创建节点
    if (result.isNew && result.topicTitle) {
      const parentNode = currentNodeId
        ? session.nodes.get(currentNodeId)
        : null;
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
          const newNode: import("@/types").TopicNodeData = {
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
          return { ...result, newNodeId: node.id };
        }
      } catch (err) {
        console.warn("[话题分类] 创建节点失败:", err);
      }
    }

    return result;
  } catch (err) {
    console.warn("[话题分类] 请求失败:", err);
    return null;
  }
}
