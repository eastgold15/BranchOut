"use client";

import { useState } from "react";
import { useSessionStore } from "@/store/sessionStore";
import type { KnowledgeSession, TopicNodeData } from "@/types";

export function TopicSelector() {
	const [topic, setTopic] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const { setSession, setLoading, setError } = useSessionStore();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!topic.trim()) {
			return;
		}

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
			for (const node of data.nodes as TopicNodeData[]) {
				nodesMap.set(node.id, node);
			}

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
		<div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
			<div className="w-full max-w-md">
				<div className="mb-8 text-center">
					<h1 className="mb-2 font-bold text-4xl text-white">查漏补缺</h1>
					<p className="text-slate-400">
						用 AI 构建你的知识树，发现每一个薄弱点
					</p>
				</div>

				<form className="space-y-4" onSubmit={handleSubmit}>
					<div>
						<label
							className="mb-2 block font-medium text-slate-300 text-sm"
							htmlFor="topic"
						>
							今天想复习什么知识点？
						</label>
						<input
							className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white placeholder-slate-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sky-500"
							disabled={isLoading}
							id="topic"
							onChange={(e) => setTopic(e.target.value)}
							placeholder="例如：函数、三角函数、牛顿定律..."
							type="text"
							value={topic}
						/>
					</div>

					<button
						className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 py-3 font-medium text-white transition-colors hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-500"
						disabled={!topic.trim() || isLoading}
						type="submit"
					>
						{isLoading ? (
							<>
								<div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
								正在生成知识树...
							</>
						) : (
							"开始学习"
						)}
					</button>
				</form>

				<div className="mt-8 text-center">
					<p className="text-slate-600 text-xs">
						输入一个知识点主题，AI 会为你生成知识树并引导你复习
					</p>
				</div>
			</div>
		</div>
	);
}
