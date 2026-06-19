/**
 * 测试原子话题提取 — 用一段真实的"函数"学习对话检验生长段分割效果
 *
 * 运行：DEEPSEEK_API_KEY=sk-xxx bun run scripts/test-topic-extraction.ts
 */
import { extractAtomicTopics } from "../src/lib/topic-extractor";

const conversation = [
  { role: "user", content: "我们开始复习函数吧" },
  {
    role: "assistant",
    content: "好的，函数是高中数学的基础概念。你觉得函数是什么？",
  },
  { role: "user", content: "函数就是 y=f(x)，输入一个 x 输出一个 y" },
  {
    role: "assistant",
    content: "对，这是函数的基本形式。那你知道函数的定义域是什么吗？",
  },
  { role: "user", content: "定义域就是 x 的取值范围吧" },
  {
    role: "assistant",
    content: "没错。比如 f(x)=1/(x-2)，定义域是什么？",
  },
  { role: "user", content: "x 不能等于 2，所以定义域是 x≠2" },
  {
    role: "assistant",
    content: "很好！那值域呢，你知道什么是值域吗？",
  },
  { role: "user", content: "值域就是 y 的取值范围" },
  {
    role: "assistant",
    content: "对。说到函数，你知道什么是奇函数和偶函数吗？",
  },
  { role: "user", content: "奇函数是 f(-x)=-f(x)，偶函数是 f(-x)=f(x)" },
  {
    role: "assistant",
    content: "没错。举个例子，f(x)=x² 是什么函数？",
  },
  { role: "user", content: "偶函数，因为 (-x)²=x²" },
  {
    role: "assistant",
    content: "正确。那函数的单调性呢？",
  },
  {
    role: "user",
    content: "就是函数在某个区间递增或递减",
  },
  {
    role: "assistant",
    content:
      "对。比如 f(x)=x²，它在 (-∞,0] 递减，在 [0,∞) 递增。你能判断 f(x)=2x+1 的单调性吗？",
  },
  {
    role: "user",
    content: "这是递增的，因为 x 越大 y 越大",
  },
  {
    role: "assistant",
    content: "非常好！你对这些基础概念掌握得不错。",
  },
  {
    role: "user",
    content: "我突然想到，那反函数呢？反函数和这些有什么关系？",
  },
  {
    role: "assistant",
    content:
      "好问题！反函数就是把函数的输入输出互换。比如 f(x)=2x 的反函数是 f⁻¹(x)=x/2。",
  },
  { role: "user", content: "哦，所以反函数就是把原来的计算倒过来？" },
  {
    role: "assistant",
    content: "对，而且只有一一对应的函数才有反函数。",
  },
  {
    role: "user",
    content: "那单调函数一定是一一对应的吗？",
  },
  {
    role: "assistant",
    content: "严格单调的函数确实是一一对应的，所以它一定有反函数。",
  },
  { role: "user", content: "明白了，单调函数可逆。" },
  {
    role: "user",
    content: "那我们回来看定义域，如果 f(x)=√(x-1)，定义域是什么？",
  },
  {
    role: "assistant",
    content: "x≥1，因为根号下的数不能为负。",
  },
  {
    role: "user",
    content: "对，我刚才想确认这个。行，函数的基本概念我差不多了。",
  },
];

async function main() {
  console.log("=".repeat(60));
  console.log("开始测试原子话题提取");
  console.log("主题：函数");
  console.log(`对话轮次：${conversation.length / 2} 组`);
  console.log("=".repeat(60));

  const start = Date.now();
  const topics = await extractAtomicTopics("函数", conversation);
  const elapsed = Date.now() - start;

  console.log(`\n提取耗时：${(elapsed / 1000).toFixed(1)}s`);
  console.log(`提取到 ${topics.length} 个原子话题：`);
  console.log("-".repeat(60));

  for (const [i, topic] of topics.entries()) {
    console.log(`\n${i + 1}. 【${topic.title}】`);
    console.log(`   ${topic.content}`);
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log("期望行为：");
  console.log("  ✅ 定义域 和 值域 是分开的原子话题");
  console.log("  ✅ 奇偶性 和 单调性 是分开的原子话题");
  console.log("  ✅ 反函数 是一个独立话题（聊出去的侧枝）");
  console.log("  ✅ 不会出现重复的'定义域'（回到之前话题时归并）");
  console.log("  ❌ 不应该把整段对话合并成'函数'一个话题（太粗）");
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("测试失败：", err);
  process.exit(1);
});
