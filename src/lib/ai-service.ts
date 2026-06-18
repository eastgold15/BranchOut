import { openai } from "@ai-sdk/openai";
import { streamText, generateObject } from "ai";
import { z } from "zod";
import type { TopicNodeData } from "@/types";

const model = openai("gpt-4o-mini");

const knowledgeTreeSchema = z.object({
  nodes: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      depth: z.number(),
      parentTitle: z.string().nullable(),
    })
  ),
});

export async function generateKnowledgeTree(topic: string) {
  const result = await generateObject({
    model,
    schema: knowledgeTreeSchema,
    prompt: `你是一位高中教学专家。请为"${topic}"这个知识点生成一棵知识树。

要求：
1. 生成 1 个根节点（depth=0）和 4-8 个一级子节点（depth=1）
2. 每个节点包含：title（标题）、description（简短描述）、depth（层级）、parentTitle（父节点标题，根节点为 null）
3. 根节点的 title 就是主题本身
4. 子节点应该是该主题下最核心的知识点
5. 输出格式严格按照 schema

示例输出结构：
- 根节点：title="函数", depth=0, parentTitle=null
- 子节点：title="定义域", depth=1, parentTitle="函数"`,
  });

  return result.object;
}

const evaluationSchema = z.object({
  isCorrect: z.boolean(),
  confidence: z.number().min(0).max(1),
  feedback: z.string(),
  missingPoints: z.array(z.string()),
  suggestedNodeTitle: z.string().optional(),
  suggestedNodeContent: z.string().optional(),
});

export async function evaluateAnswer(
  topic: string,
  question: string,
  userAnswer: string,
  context: string
) {
  const result = await generateObject({
    model,
    schema: evaluationSchema,
    prompt: `你是一位耐心的高中学习伙伴。请评估学生对以下问题的回答。

当前主题：${topic}
问题：${question}
学生回答：${userAnswer}
上下文：${context}

评估要求：
1. isCorrect：回答是否正确（部分正确也算不正确）
2. confidence：你对评估的置信度（0-1）
3. feedback：用鼓励性的语气给出反馈，指出问题但不要直接说"你错了"
4. missingPoints：学生遗漏的关键点列表
5. 如果回答不正确，提供 suggestedNodeTitle 和 suggestedNodeContent 用于创建纠正卡片

语气要求：
- 不要说"你错了"
- 用"这里有个容易混淆的点"、"我们再来看看"等引导性语言
- 要具体指出哪里有问题，不要泛泛而谈`,
  });

  return result.object;
}

const parseSpeechSchema = z.object({
  mentionedTopics: z.array(
    z.object({
      title: z.string(),
      confidence: z.number().min(0).max(1),
    })
  ),
});

export async function parseSpeechInput(
  topic: string,
  speechText: string,
  existingNodes: string[]
) {
  const result = await generateObject({
    model,
    schema: parseSpeechSchema,
    prompt: `学生正在复习"${topic}"这个知识点，他口述了以下内容：

"${speechText}"

已有知识点列表：${existingNodes.join(", ")}

请解析学生口述中提到的知识点，返回 mentionedTopics 数组。
- 只返回与"${topic}"相关的知识点
- 如果提到的知识点已在已有列表中，也要返回（用于标记为 mentioned）
- confidence 表示你对解析结果的置信度
- 标题要简洁，2-6 个字`,
  });

  return result.object;
}

export async function generateChatResponse(
  topic: string,
  messages: { role: "user" | "assistant"; content: string }[]
) {
  const result = streamText({
    model,
    messages: [
      {
        role: "system",
        content: `你是一位耐心的高中学习伙伴，正在帮助学生复习"${topic}"这个知识点。

角色设定：
- 你不是考官，而是帮助发现漏洞的伙伴
- 语气鼓励性、引导性
- 当学生答错时，不说"你错了"，而是说"这里有个容易混淆的点，我们来一起看看"
- 回答要简洁，适合高中生理解
- 可以主动提问检验掌握程度
- 如果学生理解有偏差，创建纠正内容`,
      },
      ...messages,
    ],
  });

  return result;
}

export async function generateQuestion(topic: string, nodeTitle: string) {
  const result = await generateObject({
    model,
    schema: z.object({
      question: z.string(),
      hint: z.string(),
    }),
    prompt: `请为"${topic}"下的"${nodeTitle}"这个知识点生成一道检验性问题。

要求：
1. 问题要能检验学生是否真正理解，不是简单的定义背诵
2. 提供一个小提示（hint），但不要直接给出答案
3. 问题难度适中，适合高中生`,
  });

  return result.object;
}
