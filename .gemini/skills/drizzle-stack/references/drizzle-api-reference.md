# Drizzle ORM 1.0 API 速查手册

> 适用于 Drizzle ORM **1.0.0-beta.1+**
>
> ```bash
> bun add drizzle-orm@beta
> bun add drizzle-kit@beta -D
> ```

---

## 1. 关系定义（defineRelations）详细

### 初始化 db

```ts
import { relations } from "./drizzle/table.relation";
import { drizzle } from "drizzle-orm/bun-postgres";

const db = drizzle(process.env.DATABASE_URL, { relations });
```

### 完整功能列表

| 功能 | 语法 |
|------|------|
| 一对一 | `r.one.tableName({ from, to })` |
| 一对多 | `r.many.tableName({ from, to })` |
| 多对多（through） | `r.many.tableName({ from: r.a.id.through(r.mid.aId), to: r.b.id.through(r.mid.bId) })` |
| 字段名 | `from` / `to`（支持单值或数组） |
| 关系别名 | `alias: "xxx"` |
| 仅定义 many | 可以不配对 `one`，单独使用 `r.many` |
| 可选性控制 | `optional: false` 声明关联一定存在 |
| 预定义过滤 | 在关系定义中加 `where: { verified: true }` |

### 多对多示例（through）

```ts
export const relations = defineRelations(schema, (r) => ({
  users: {
    groups: r.many.groups({
      from: r.users.id.through(r.usersToGroups.userId),
      to: r.groups.id.through(r.usersToGroups.groupId),
    }),
  },
  groups: {
    participants: r.many.users(),
  },
}));

// 查询时直接用
const response = await db.query.users.findMany({
  with: { groups: true },
});
```

### 拆分关系定义

```ts
import { defineRelations, defineRelationsPart } from "drizzle-orm";

export const relations = defineRelations(schema, (r) => ({
  users: { /* ... */ }
}));

export const part = defineRelationsPart(schema, (r) => ({
  posts: { /* ... */ }
}));

const db = drizzle(url, { relations: { ...relations, ...part } });
```

---

## 2. where 过滤（对象语法）

**不需要导入 `eq`、`and` 等操作符，直接用对象。**

### 等值过滤

```ts
db.query.users.findMany({ where: { id: 1 } });
// SQL: WHERE id = 1
```

### 多条件 + 操作符

```ts
db.query.users.findMany({
  where: {
    age: 15,
    name: { like: "A%" },
  },
});
// SQL: WHERE age = 15 AND name LIKE 'A%'
```

### 完整操作符列表

```ts
where: {
  // 逻辑组合
  OR: [],
  AND: [],
  NOT: {},

  // 原生 SQL
  RAW: (table) => sql`${table.id} = 1`,

  // 按关联表过滤
  [relationName]: { /* ... */ },

  // 列操作符
  [columnName]: {
    eq: 1,           // =
    ne: 1,           // !=
    gt: 1,           // >
    gte: 1,          // >=
    lt: 1,           // <
    lte: 1,          // <=
    in: [1, 2],      // IN
    notIn: [1, 2],   // NOT IN
    like: "A%",      // LIKE
    ilike: "a%",     // ILIKE（PostgreSQL 不区分大小写）
    notLike: "X%",
    notIlike: "x%",
    isNull: true,    // IS NULL
    isNotNull: true, // IS NOT NULL

    // PostgreSQL 数组操作
    arrayOverlaps: [1, 2],
    arrayContained: [1, 2],
    arrayContains: [1, 2],
  },
};
```

### 按关联表过滤

```ts
// 获取 ID > 10 且至少有一篇内容以 "M" 开头的帖子的用户
db.query.users.findMany({
  where: {
    id: { gt: 10 },
    posts: { content: { like: "M%" } },
  },
});

// 仅获取有帖子的用户（至少有一条关联记录）
db.query.users.findMany({
  where: { posts: true },
});
```

### 嵌套 where

```ts
db.query.posts.findMany({
  where: { id: 1 },
  with: {
    comments: {
      where: { createdAt: { lt: new Date() } },
    },
  },
});
```

---

## 3. orderBy 排序

```ts
// 单字段
db.query.posts.findMany({ orderBy: { id: "asc" } });

// 多字段
db.query.posts.findMany({ orderBy: [{ id: "desc" }, { name: "asc" }] });

// 主表 + 关联表
db.query.posts.findMany({
  orderBy: { id: "asc" },
  with: {
    comments: { orderBy: { id: "desc" } },
  },
});

// 原生 SQL 排序
db.query.posts.findMany({
  orderBy: (t) => sql`${t.id} asc`,
});
```

---

## 4. columns 部分字段选择

SQL 层面裁剪，不传多余数据。

```ts
// 只要 id 和 content
db.query.posts.findMany({
  columns: { id: true, content: true },
});

// 排除 content
db.query.posts.findMany({
  columns: { content: false },
});

// 嵌套关联也支持
db.query.posts.findMany({
  columns: { id: true },
  with: {
    comments: { columns: { authorId: false } },
  },
});

// 主表不返回任何字段（仅获取关联数据）
db.query.users.findMany({
  columns: {},
  with: { posts: true },
});
```

> 同时出现 `true` 和 `false` 时，所有 `false` 被忽略。

---

## 5. with 关联查询

```ts
// 单层
db.query.users.findMany({ with: { posts: true } });

// 多层嵌套
db.query.users.findMany({
  with: {
    posts: {
      with: { comments: true },
    },
  },
});

// 关联带过滤/排序/分页
db.query.posts.findMany({
  with: {
    comments: {
      where: { createdAt: { gt: new Date("2025-01-01") } },
      orderBy: { id: "desc" },
      limit: 3,
      offset: 3,
      columns: { id: true, content: true },
    },
  },
});
```

---

## 6. limit / offset 分页

主查询和嵌套关联**都支持** limit 和 offset。

```ts
db.query.posts.findMany({
  limit: 5,
  offset: 2,
  with: {
    comments: { limit: 3, offset: 3 },
  },
});
```

---

## 7. extras 自定义计算字段

```ts
import { sql } from "drizzle-orm";

// 回调写法（推荐，类型安全）
db.query.users.findMany({
  extras: {
    fullName: (users, { sql }) =>
      sql<string>`concat(${users.name}, ' ', ${users.lastName})`,
    loweredName: (users, { sql }) => sql`lower(${users.name})`,
  },
});

// 嵌套关联也支持 extras
db.query.posts.findMany({
  extras: {
    contentLength: (table, { sql }) => sql<number>`length(${table.content})`,
  },
  with: {
    comments: {
      extras: {
        commentSize: (table, { sql }) => sql<number>`length(${table.content})`,
      },
    },
  },
});
```

> 不支持聚合函数（COUNT、SUM 等），请用核心查询 API 或 `$count`。

---

## 8. 子查询（$count）

```ts
await db.query.users.findMany({
  with: { posts: true },
  extras: {
    totalPostsCount: (table) =>
      db.$count(posts, eq(posts.authorId, table.id)),
  },
});
```

### $count 配合对象语法 where

`$count` 不支持对象语法，需要用 `relationsFilterToSQL` 转换：

```ts
import { relationsFilterToSQL } from "drizzle-orm"; // 未文档化

const filters = { age: 21 };

// findMany 用对象语法
const users = await db.query.users.findMany({ where: filters });

// $count 需要转换回 SQL 条件
const total = await db.$count(
  usersTable,
  relationsFilterToSQL(usersTable, filters),
);
```

> `relationsFilterToSQL` 是未文档化的内部 API，类型尚不完善，随时可能变动。

### workaround：在 extras 中内联 count

```ts
const products = await db.query.product.findMany({
  where: queryWhere,
  limit,
  offset,
  extras: {
    count: db.$count(
      dbSchema.product,
      relationsFilterToSQL(dbSchema.product, queryWhere),
    ),
  },
});
```

---

## 9. 预编译语句（Prepared Statements）

```ts
const prepared = db.query.users
  .findMany({
    where: { id: { eq: sql.placeholder("id") } },
    limit: sql.placeholder("uLimit"),
    offset: sql.placeholder("uOffset"),
    with: {
      posts: {
        where: { id: { eq: sql.placeholder("pid") } },
        limit: sql.placeholder("pLimit"),
      },
    },
  })
  .prepare("query_name");

await prepared.execute({ id: 1, uLimit: 3, uOffset: 0, pid: 6, pLimit: 1 });
```

---

## 10. where 类型标注

对象语法 where 目前没有官方导出类型。社区方案：

```ts
import { RelationsFilter } from "drizzle-orm";

type DatabaseSchema = typeof schema;
type DatabaseRelations = typeof relations;

type DatabaseRelationsFilter<
  K extends keyof DatabaseRelations = keyof DatabaseRelations,
  R extends DatabaseRelations[keyof DatabaseRelations] = DatabaseRelations[K],
> = RelationsFilter<R, DatabaseRelations>;

// 使用
const queryWhere: DatabaseRelationsFilter<"users"> = {
  age: 21,
  name: { like: "A%" },
};

const users = await db.query.users.findMany({ where: queryWhere });
```

---

## 11. v1 → v2 迁移详细

| 用途 | v1（旧） | v2（新） |
|------|---------|---------|
| 关系定义 | `import { relations } from "drizzle-orm/_relations"` | `import { defineRelations } from "drizzle-orm"` |
| 查询入口 | `db._query.xxx.findMany()` | `db.query.xxx.findMany()` |
| 字段引用 | `fields` / `references` | `from` / `to` |
| 关系别名 | `relationName` | `alias` |
| drizzle 配置 | `drizzle()` 需要 `mode` 参数 | 不再需要 `mode` 参数 |
| 配置泛型 | `DrizzleConfig` | 新增 `TRelations` 泛型 |
| 内部类型 | `drizzle-orm` 主入口 | 旧类型移至 `drizzle-orm/_relations` |

### 渐进迁移

```ts
// v2 关系定义
import { defineRelations } from "drizzle-orm";

// v1 关系定义（兼容旧代码）
import { relations } from "drizzle-orm/_relations";

// v2 查询
db.query.xxx.findMany();

// v1 查询（兼容旧代码）
db._query.xxx.findMany();
```
