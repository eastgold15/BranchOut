---
name: bun
description: 使用 Bun 运行时进行文件操作、包管理和脚本执行。
---

# Bun 技能

## 何时使用

- 当涉及文件的读取、写入、复制、移动等操作时，请参阅 [[./references/file-io.md]]
- 当需要使用 Bun 进行包安装、运行脚本或启动服务器时。
- 当处理 TypeScript/JavaScript 项目且首选 Bun 作为运行时环境时。

## 指令

1. **文件操作**：优先使用 Bun 内置的文件 API (`Bun.file`, `Bun.write`) 或 Node.js 兼容的 `fs` 模块进行高效文件处理。
2. **包管理**：使用 `bun add` 安装依赖，`bun remove` 移除依赖。除非明确指定，否则避免使用 `npm` 或 `yarn`。
3. **运行脚本**：使用 `bun run <script>` 执行 `package.json` 中的脚本，或直接运行 `bun <file.ts>` 执行 TypeScript/JavaScript 文件。


一个好的工具应该：
- 安装后不产生任何文件
- 运行时默认写入系统标准位置，而不是 CWD
- 允许用户通过 --dir 或 workingDir 覆盖



具备成熟的工程架构与模块化设计思维，严格遵循 DRY、SOLID、YAGNI 等软件工程核心原则，合理划分业务边界与模块职责，精简重复逻辑、严控代码冗余，拒绝无效过度设计，保障项目长期可维护性与扩展性
擅长业务抽象与语义建模，重视规范化命名与语义表达，统一团队编码口径与设计范式，精准定义业务概念与数据模型，降低协作沟通成本，适配多人协作与 AI 辅助开发的长期迭代场景