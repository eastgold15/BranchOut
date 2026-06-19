import { z } from "zod";
import { deepseekClient } from "./deepseek-client";

const MODEL = "deepseek-v4-pro";

/**
 * AI 从聊天历史中提取独立的原子话题
 */
export async function extractAtomicTopics(
  sessionTopic: string,
  chatHistory: { role: string; content: string }[]
): Promise<Array<{ title: string; content: string }>> {
  const completion = await deepseekClient.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "你是一位知识分析专家。把学习对话想象成一棵树的生长过程——话题不是被'切'出来的，而是自然'长'出来的。",
      },
      {
        role: "user",
        content: `以下是一次关于"${sessionTopic}"的学习对话记录。

${chatHistory
  .map((m) => `[${m.role === "assistant" ? "AI" : "学生"}]: ${m.content}`)
  .join("\n")}

把这段对话想象成一棵树的生长过程。每个"完整的生长段"就是一个原子话题。

一个话题在对话中会经历自然的生命阶段（就像植物经历 甲→乙→丙→丁→戊）：

| 阶段 | 对话中的样子 | 例子 |
|------|-------------|------|
| **甲（萌发）** | 学生提到一个新概念，或问一个新问题 | "那反函数是什么？" |
| **乙（展开）** | 开始讨论，交换信息，有问有答 | "反函数就是把输入输出互换" "哦，所以就是倒过来算？" |
| **丙（深入）** | 追问机制、因果、关联——"为什么" | "为什么单调函数一定有反函数？" |
| **丁（关联）** | 把当前概念和已有知识连起来 | "哦，那单调性和一一对应是一回事啊" |
| **戊（收敛）** | 理解达成，讨论自然结束 | "明白了" "差不多了" |

**一个原子话题 = 至少经历了 甲→乙 的完整生长段**（只萌发了但没有展开的，不算一个独立话题）。
**两个话题之间的边界 = 新的甲阶段出现**（学生提出了一个与当前话题不同的新方向）。

**特别注意**：
- 聊出去的内容（旁逸斜出的侧枝）也是一次完整的生长，不要扔掉
  例：聊"定义域"时突然问"那反函数呢"→ 这是一个独立的生长段
- 回到之前聊过的话题继续深入 → 这是之前话题的延续延伸，不是新的
  例：聊完"值域"后又回来说"刚才定义域那块我再问一下"→ 归到"定义域"
- 如果一个段里包含了两个可独立检验的概念 → 检查中间是否有性质转变
  - 有转变 → 拆成两个
  - 没有转变 → 就是一个，保持完整

每个原子话题：
1. 标题 2-8 个字，让人一看就知道在说什么
2. 内容是对该生长段核心要点的总结（30-60字）
3. 不同话题之间内容不重叠

输出格式（严格 JSON）：
{
  "topics": [
    { "title": "定义域", "content": "函数的自变量x的取值范围，受分母、根号等条件限制" },
    { "title": "值域", "content": "函数f(x)的取值范围，与定义域和对应关系相关" }
  ]
}`,
      },
    ],
    thinking: { type: "enabled" },
    reasoning_effort: "high",
    stream: false,
  });

  const raw = completion.choices[0].message.content || '{"topics":[]}';
  const parsed = JSON.parse(raw);
  const schema = z.object({
    topics: z.array(
      z.object({
        title: z.string(),
        content: z.string(),
      })
    ),
  });
  const result = schema.parse(parsed);
  return result.topics;
}

/**
 * 实时判断一轮对话属于哪个话题（轻量版，~2-3 秒）
 *
 * 与 extractAtomicTopics 共享同一个"生长段"思维，但只判断归属，不做全量提取
 * 用于每轮对话后实时更新 UI 的话题结构
 */
export async function classifyMessageTopic(
  sessionTopic: string,
  userMessage: string,
  aiResponse: string,
  currentTopicTitle: string | null,
  existingTopics: Array<{ title: string; content: string }>,
  recentHistory: { role: string; content: string }[]
): Promise<{ topicTitle: string; isNew: boolean }> {
  const existingList =
    existingTopics.length > 0
      ? existingTopics
          .map((t, i) => `${i + 1}. "${t.title}" — ${t.content}`)
          .join("\n")
      : "（暂无话题）";

  const recentContext =
    recentHistory.length > 0
      ? recentHistory
          .slice(-4)
          .map(
            (m) => `[${m.role === "assistant" ? "AI" : "学生"}]: ${m.content}`
          )
          .join("\n")
      : "（对话刚开始）";

  const completion = await deepseekClient.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `你是一位知识分析助手。你的任务是在学习对话中实时判断每一轮对话属于哪个原子话题。

用"生长段"思维来看对话——一个话题就像一棵树的枝干，从萌发（甲）到收敛（戊）。
新消息可能属于：
1. 已有话题的自然延续 → 追加到该话题
2. 已有话题的深入追问 → 属于子话题（萌发了一个新的生长段）
3. 一个全新话题的开始 → 创建新话题

注意：
- "为什么"、"再举个例子"这类追问 → 属于当前话题的深入（丙阶段），不是新话题
- 突然提到一个不同的概念 → 新话题的萌发（甲阶段）
- 回到之前聊过的概念 → 归到已有话题，不新建`,
      },
      {
        role: "user",
        content: `当前学习主题：${sessionTopic}

已有话题列表：
${existingList}

当前活跃话题：${currentTopicTitle || "无"}

最近对话上下文：
${recentContext}

最新一轮对话：
[学生]: ${userMessage}
[AI]: ${aiResponse}

请判断这轮对话属于哪个话题？
- 如果是对当前活跃话题的自然延续（追问、举例、补充）→ 返回当前活跃话题
- 如果是已有话题的深入子话题 → 返回新子话题标题
- 如果是全新话题 → 返回新话题标题（2-8个字）
- 如果是回到已聊过的话题 → 返回已有话题标题

输出格式（严格 JSON）：
{
  "topicTitle": "定义域",
  "isNew": false,
  "isSubTopic": false,
  "reason": "学生在追问定义域的具体限制条件，属于当前话题的深入"
}`,
      },
    ],
    reasoning_effort: "low",
    stream: false,
  });

  const raw =
    completion.choices[0].message.content ||
    '{"topicTitle":"","isNew":false,"isSubTopic":false}';
  const parsed = JSON.parse(raw);
  const schema = z.object({
    topicTitle: z.string(),
    isNew: z.boolean(),
    isSubTopic: z.boolean().optional(),
    reason: z.string().optional(),
  });
  const result = schema.parse(parsed);
  return { topicTitle: result.topicTitle, isNew: result.isNew };
}

/**
 * AI 根据用户的一句话描述生成视角嵌入向量
 * 调用 DeepSeek API 将文字描述转为嵌入
 */
export async function generateViewEmbedding(
  description: string
): Promise<string> {
  const completion = await deepseekClient.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "你是一个文本分析助手。请将用户的视角描述转化为一段精简（20字以内）的查询文本，用于向量匹配。直接输出文本，不要解释。",
      },
      {
        role: "user",
        content: `用户想从以下视角来看待知识点：${description}
        
请给出一个简洁的查询短语（20字以内）。`,
      },
    ],
    thinking: { type: "enabled" },
    reasoning_effort: "high",
    stream: false,
  });

  return completion.choices[0].message.content?.trim() || description;
}

/**
 * 根据视角类型获取默认的视角描述
 */
export function getViewTypeDescription(type: string): string {
  const descriptions: Record<string, string> = {
    default: "按照知识本身的语义关联",
    semantic: "按照知识的语义相似度",
    chronological: "按照学习的时间顺序",
    "problem-solving": "按照解题思路和方法",
  };
  return descriptions[type] || descriptions.default;
}
