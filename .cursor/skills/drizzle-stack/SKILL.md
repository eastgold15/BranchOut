---
name: drizzle-stack
description: >-
  为 Drizzle ORM 后端项目生成并强制执行标准文件结构、表 schema 定义、关系映射、TypeBox 类型契约和查询模式。
  当用户提及 drizzle、drizzle-orm、数据库表设计、TypeBox schema 生成、Drizzle 项目结构或 Drizzle 查询时触发。
  配合 Better Auth 使用。
---

# Drizzle Stack 规范

后端使用 **Drizzle ORM 1.0 + Better Auth** 的标准代码规范。

> 详细 API 速查见 `references/drizzle-api-reference.md`
> 完整真实示例见 `references/examples.md`

## 触发条件

当用户执行以下操作时自动应用此技能：

- 创建或修改数据库表 schema
- 设置 Drizzle ORM 项目结构
- 从 Drizzle 表生成 TypeBox 契约类型
- 定义数据库表之间的关联关系
- 编写 Drizzle 查询（findMany、findFirst、where、with、orderBy 等）
- 任何涉及 `drizzle`、`drizzle-orm`、`数据库表`、`schema`、`typebox`、`pg-core` 的后端操作

**不使用此技能的场景：** 非 Drizzle ORM 项目（如 Prisma、Kysely）、纯前端数据库操作、NoSQL 数据库。

## 工作流

### 创建新表时的步骤

**Step 1**: 在 `src/drizzle/table.schema.ts` 中定义表，遵循下方 [table.schema.ts 规范](#tableschemats-的规范)

**Step 2**: 在 `src/drizzle/table.relation.ts` 中定义表关系，遵循下方 [关系定义规范](#关系定义规范)

**Step 3**: 在 `src/typebox/core.ts` 中生成 TypeBox 契约类型，遵循下方 [TypeBox 规范](#typebox生成类型的规范)

**Step 4**: 在所有 `index.ts` 文件中添加集中导出

### 编写查询

**Step 1**: 初始化 db 实例时传入 relations：
```ts
import { relations } from "./drizzle/table.relation";
import { drizzle } from "drizzle-orm/bun-postgres";
const db = drizzle(process.env.DATABASE_URL, { relations });
```

**Step 2**: 使用 `db.query.[table].findMany()` / `findFirst()` 编写查询

**Step 3**: where 条件使用对象语法（不导入 `eq`、`and` 等操作符）

---

## 核心规则

**CRITICAL** — 以下规则必须严格遵守：

- 所有 `index.ts` 文件只用于集中导出，**不得包含业务逻辑**
- **导入 pg-core 必须以数据库首字母作为命名空间**：`import * as p from "drizzle-orm/pg-core"`（PG 用 `p`，MySQL 用 `m`，SQLite 用 `s`）
- 表变量使用**小驼峰命名**，后缀 `Table`：如 `userTable`、`roleTable`
- 关系定义使用 **`defineRelations`**（v2 API），不使用旧的 `relations()` 导入
- **where 条件使用对象语法**，不导入 `eq`、`and` 等操作符
- 文档中 `[xxx]` 表示占位符，`X` 表示大写字母

文件结构：

```text
src
├── drizzle
│   ├── index.ts              # 集中导出所有表和关系
│   ├── table.relation.ts     # 所有 Drizzle 表关系（defineRelations）
│   └── table.schema.ts       # 所有数据库 schema 定义
├── index.ts
├── typebox
│   └── core.ts               # 由数据库 schema 转化的 TypeBox schema 和 TS 类型
└── utils
    ├── constants
    │   ├── index.ts           # 集中导出
    │   └── [xxx-xxx].constants.ts  # 连字符命名的常量文件
    ├── index.ts
    ├── query-types.model.ts
    ├── utils.ts               # 固定工具文件（不可变）
    └── utils.types.ts
```

---

## 规范明细

### table.schema.ts

**CRITICAL**：导入 pg-core 必须以数据库首字母命名。

<details>
<summary>📖 占位符约定</summary>

- `[xxx]` — 实体名小写：`user`、`role`
- `[Xxx]` — 实体名首字母大写：`User`、`Role`
- `[xXX]` — 枚举名小驼峰：`userRole`、`deptCategory`

</details>

```ts
import { sql } from "drizzle-orm";
import * as p from "drizzle-orm/pg-core"; // 必须以数据库首字母命名

// --- Helper Fields ---
const idUuid = p.uuid("id").primaryKey().default(sql`gen_random_uuid()`);
const createdAt = p.timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = p.timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date());
const Audit = { id: idUuid, createdAt, updatedAt };

// --- Enums ---
export const [xXX]Enum = p.pgEnum("[xxx]", ["xxxx", "xxx"]);

// --- 表定义 ---
export const [xxx]Table = p.pgTable("[xxx]", {
  ...Audit,
  [xxx]: p.uuid("[xxx]"),
  [xxx]: p.varchar("[xxx]", { length: 50 }),
  [xxx]: [xxx]Enum("[xxx]").default("[xxx]").notNull(),
  [xxx]: p.json("[xxx]"),
  [xxx]: p.boolean("is_[xxx]").default(false),
}, (table) => [
  p.index("[xxx]_idx").on(table.[xxx]),
]);
```

> 真实示例见 `references/examples.md`


### 关系定义

使用 `defineRelations` **在一个文件内**统一定义。关系类型：

| 类型 | 语法 | 说明 |
|------|------|------|
| 一对一 | `r.one.tableName({ from, to })` | |
| 一对多 | `r.many.tableName({ from, to })` | 可不配对 `one` |
| 多对多 | `r.many.tableName({ from: r.a.id.through(r.mid.aId), to: r.b.id.through(r.mid.bId) })` | 需中间表 |
| 可选 | 加 `optional: true` | |
| 别名 | `alias: "xxx"` | |
| 预过滤 | 加 `where: { ... }` | |

```ts
import { defineRelations } from "drizzle-orm";
import * as schema from "./table.schema";

export const relations = defineRelations(schema, (r) => ({
  [xxx]Table: {
    [xxx]: r.many.userTable({          // 一对多
      from: r.[xxx]Table.id,
      to: r.[xxx]Table.deptId,
    }),
    [xxx]: r.one.siteTable({           // 一对一可选
      from: r.[xxx]Table.id,
      to: r.[xxx]Table.boundDeptId,
      optional: true,
    }),
    [xxx]: r.many.roleTable({          // 多对多 through
      from: r.[xxx]Table.id.through(r.[xxx]Table.userId),
      to: r.[xxx]Table.id.through(r.[xxx]Table.roleId),
    }),
  },
}));

// db 初始化时必须传入 relations
const db = drizzle(process.env.DATABASE_URL, { relations });
```

> 拆分大型关系定义使用 `defineRelationsPart`，详见 `references/drizzle-api-reference.md`。


### 查询

**CRITICAL**：where 使用对象语法，不导入 `eq`、`and` 等操作符。

```ts
// 多条 / 单条
db.query.[xxx]Table.findMany();
db.query.[xxx]Table.findFirst();

// where 过滤
db.query.users.findMany({
  where: {
    age: 15,                         // 等值 AND
    name: { like: "A%" },            // 操作符
    OR: [{ age: 15 }, { name: "A%" }], // 逻辑组合
    posts: true,                     // 有关联记录
    posts: { content: { like: "M%" } }, // 关联表字段过滤
  },
});

// 排序 / 分页 / 字段选择
db.query.posts.findMany({
  columns: { id: true, content: true },
  orderBy: [{ id: "desc" }, { name: "asc" }],
  limit: 10,
  offset: 20,
});

// with 关联查询（支持嵌套 + 过滤 + 分页）
db.query.users.findMany({
  with: {
    posts: {
      columns: { id: true, title: true },
      where: { createdAt: { gt: new Date("2025-01-01") } },
      orderBy: { id: "desc" },
      limit: 5,
      with: { comments: true },
    },
  },
});

// extras 自定义计算字段
db.query.users.findMany({
  extras: {
    fullName: (users, { sql }) => sql<string>`concat(${users.name}, ' ', ${users.lastName})`,
  },
});
```

> 完整操作符列表（`gt`、`gte`、`lt`、`lte`、`in`、`ilike`、`isNull`、`arrayOverlaps` 等）及 `$count`、预编译语句见 `references/drizzle-api-reference.md`。


### utils 文件

> 固定文件，完整代码见 `assets/utils.ts`，复制到 `src/utils/utils.ts` 即可。


### TypeBox 契约

```ts
import { t } from "elysia";
import { [xxx]Table } from "../drizzle/table.schema";
import type { InferDTO } from "../utils";
import { spread } from "../utils";

export const [Xxx]InsertFields = spread([xxx]Table, "insert"); // 可选的
export const [Xxx]Fields = spread([xxx]Table, "select");       // 几乎都不可选

export const [Xxx]Contract = {
  Response: t.Object({ ...[Xxx]Fields }),

  Create: t.Object({
    ...t.Omit(t.Object([Xxx]InsertFields), [
      "id", "createdAt", "updatedAt", "[autoFields]",
    ]).properties,
    // 需要客户端手动传入的字段在此补充
  }),

  Update: t.Partial(t.Object({
    ...t.Omit(t.Object([Xxx]InsertFields), [
      "id", "createdAt", "updatedAt", "[immutableFields]",
    ]).properties,
  })),

  ListQuery: t.Object({
    ...t.Partial(t.Object([Xxx]InsertFields)).properties,
    search: t.Optional(t.String()),
  }),

  ListResponse: t.Object({
    data: t.Array(t.Object({ ...[Xxx]Fields })),
    total: t.Number(),
  }),
} as const;

export type [Xxx]Contract = InferDTO<typeof [Xxx]Contract>;
```

> 完整真实示例见 `references/examples.md`。


### v1 → v2 迁移

| 用途 | v1（旧） | v2（新） |
|------|---------|---------|
| 关系定义 | `import { relations } from "drizzle-orm/_relations"` | `import { defineRelations } from "drizzle-orm"` |
| 查询入口 | `db._query.xxx.findMany()` | `db.query.xxx.findMany()` |
| 字段引用 | `fields` / `references` | `from` / `to` |
| 关系别名 | `relationName` | `alias` |

---

## 故障排除

### `drizzle-typebox` 导入失败

未安装依赖。
```bash
pnpm add drizzle-typebox
```

### 关系定义报类型错误

1. 检查表名是否以 `Table` 结尾并已从 `table.schema.ts` 导出
2. 确认外键字段名与 schema 中定义的一致
3. 确保中间表已在 schema 中定义

### `spread()` 返回类型不正确

`spread()` 只接受 `drizzle-orm` 的 `Table` 或 `@sinclair/typebox` 的 `TObject`。检查传入参数是否为实际的表定义。

### where 对象语法类型报错

变量存储 where 条件时缺少类型标注，使用 `RelationsFilter` 类型，详见 `references/drizzle-api-reference.md#10-where-类型标注`。

### `index.ts` 集中导出遗漏

每新增一个模块，立即在对应的 `index.ts` 中添加 `export` 语句。
