# 真实示例

以实际业务实体展示 ORM 规范的完整应用。

---

## table.schema.ts 示例

```ts
import { sql } from "drizzle-orm";
import * as p from "drizzle-orm/pg-core";

// --- Helper Fields ---
const idUuid = p.uuid("id").primaryKey().default(sql`gen_random_uuid()`);
const createdAt = p.timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = p.timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date());
const Audit = { id: idUuid, createdAt, updatedAt };

// --- Enums ---
export const userRoleEnum = p.pgEnum("user_role", ["admin", "member", "viewer"]);
export const deptCategoryEnum = p.pgEnum("dept_category", ["sales", "engineering", "hr"]);

// --- 表 ---
export const userTable = p.pgTable("user", {
  ...Audit,
  name: p.varchar("name", { length: 100 }).notNull(),
  email: p.varchar("email", { length: 255 }).notNull().unique(),
  role: userRoleEnum("role").default("member").notNull(),
  avatarUrl: p.text("avatar_url"),
  isActive: p.boolean("is_active").default(true),
}, (table) => [
  p.index("user_email_idx").on(table.email),
  p.index("user_role_idx").on(table.role),
]);

export const departmentTable = p.pgTable("department", {
  ...Audit,
  name: p.varchar("name", { length: 100 }).notNull(),
  category: deptCategoryEnum("category").notNull(),
  parentId: p.uuid("parent_id"),
}, (table) => [
  p.index("dept_category_idx").on(table.category),
]);
```

---

## 关系定义示例

```ts
import { defineRelations } from "drizzle-orm";
import * as schema from "./table.schema";

export const relations = defineRelations(schema, (r) => ({
  departmentTable: {
    members: r.many.userTable({
      from: r.departmentTable.id,
      to: r.userTable.deptId,
    }),
    boundSite: r.one.siteTable({
      from: r.departmentTable.id,
      to: r.siteTable.boundDeptId,
      optional: true,
    }),
    roles: r.many.roleTable({
      from: r.departmentTable.id.through(r.userDepartmentTable.userId),
      to: r.userDepartmentTable.id.through(r.userDepartmentTable.roleId),
    }),
  },
  userTable: {
    posts: r.many.postTable({
      from: r.userTable.id,
      to: r.postTable.authorId,
    }),
    department: r.one.departmentTable({
      from: r.userTable.deptId,
      to: r.departmentTable.id,
    }),
  },
}));
```

---

## TypeBox 契约示例（AdContract）

```ts
import { t } from "elysia";
import { adTable } from "../drizzle/table.schema";
import type { InferDTO } from "../utils";
import { spread } from "../utils";

export const AdInsertFields = spread(adTable, "insert");
export const AdFields = spread(adTable, "select");

export const AdContract = {
  Response: t.Object({
    ...AdFields,
  }),

  Create: t.Object({
    ...t.Omit(t.Object(AdInsertFields), [
      "id", "createdAt", "updatedAt",
      "startDate", "endDate", "siteId",
    ]).properties,
    startDate: t.String(),
    endDate: t.String(),
  }),

  Update: t.Partial(
    t.Object({
      ...t.Omit(t.Object(AdInsertFields), [
        "id", "createdAt", "updatedAt",
        "startDate", "endDate", "siteId",
      ]).properties,
      startDate: t.String(),
      endDate: t.String(),
    }),
  ),

  ListQuery: t.Object({
    ...t.Partial(t.Object(AdInsertFields)).properties,
    search: t.Optional(t.String()),
  }),

  ListResponse: t.Object({
    data: t.Array(t.Object({ ...AdFields })),
    total: t.Number(),
  }),
} as const;

export type AdContract = InferDTO<typeof AdContract>;
```

---

## 查询示例

```ts
// 获取用户列表带部门 + 分页
const users = await db.query.userTable.findMany({
  where: {
    role: "admin",
    isActive: true,
  },
  columns: { id: true, name: true, email: true },
  orderBy: { createdAt: "desc" },
  limit: 20,
  offset: 0,
  with: {
    department: { columns: { id: true, name: true } },
    posts: {
      columns: { id: true, title: true },
      orderBy: { createdAt: "desc" },
      limit: 5,
    },
  },
});

// 单条查询
const user = await db.query.userTable.findFirst({
  where: { email: "test@example.com" },
  with: { department: true, posts: true },
});

// 按关联表过滤
const deptsWithActiveUsers = await db.query.departmentTable.findMany({
  where: {
    members: { isActive: true },
  },
  with: { members: true },
});
```
