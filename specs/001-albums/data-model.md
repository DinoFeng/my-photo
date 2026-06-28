# 数据模型设计 - 相册功能

**创建日期**: 2026-06-28
**数据库**: SQLite (通过 Drizzle ORM 定义)
**定义位置**: `packages/shared/src/db/schema.ts`
**初始化位置**: `backend/src/services/dbInitService.ts` (CREATE TABLE 语句)

---

## 1. 表列表

| 表名 | 用途 | 与现有表关系 |
|------|------|-------------|
| `user` | 用户（管理员 + 普通用户） | 新表 |
| `session` | 用户登录会话 | 新表 |
| `album` | 相册 | 新表，user.id 外键 |
| `album_media` | 相册-照片关联（多对多） | 新表，album.id + media.id 外键 |
| `album_share` | 相册分享链接记录 | 新表，album.id + user.id 外键 |

---

## 2. 表结构详情

### 2.1 user 表 - 用户

```typescript
// Drizzle Schema:
export const user = sqliteTable('user', {
  id: text('id').primaryKey(),              // 用户ID（UUID）
  username: text('username'),               // 登录用户名（仅管理员设置）
  passwordHash: text('password_hash'),      // bcrypt 哈希（仅管理员有）
  displayName: text('display_name').notNull(), // 昵称（显示用）
  avatarEmoji: text('avatar_emoji').notNull().default('👤'), // 头像表情
  inviteCode: text('invite_code').unique(), // 邀请码（唯一）
  isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
  status: text('status').notNull().default('active'), // active / disabled
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})
```

**约束和规则**:
- `username` 唯一（如有值），但可为空（仅管理员有用户名密码）
- `inviteCode` 唯一（如有值），但管理员可空（用密码登录）
- `isAdmin = true` 的用户必须有 `passwordHash`
- `status = 'disabled'` 的用户无法登录
- 第一个创建的用户自动 `isAdmin = true`

**业务规则验证**:
- 删除用户时，需要同时处理：
  - 删除该用户的所有相册（album.owner_id = ?）
  - 删除 album_media 关联
  - 删除 album_share 记录
  - 删除该用户的所有 session

---

### 2.2 session 表 - 登录会话

```typescript
export const session = sqliteTable('session', {
  id: text('id').primaryKey(),              // sessionId (随机 32 字节)
  userId: text('user_id').notNull(),        // 关联用户
  createdAt: text('created_at').notNull(),  // 创建时间
  expiresAt: text('expires_at').notNull(),  // 过期时间（30天后）
})
```

**业务规则**:
- Cookie `photo_session` 存储此表的 `id`
- 请求时验证 sessionId 是否存在且未过期
- 过期 session 可在后台清理
- 退出登录时删除对应的 session 记录

---

### 2.3 album 表 - 相册

```typescript
export const album = sqliteTable('album', {
  id: text('id').primaryKey(),              // 相册ID（UUID）
  ownerId: text('owner_id').notNull(),      // 所有者用户ID
  name: text('name').notNull(),             // 相册名称
  description: text('description'),         // 描述（可选）
  coverMediaId: text('cover_media_id'),     // 封面照片ID（可选）
  visibility: text('visibility').notNull().default('private'),
  // visibility: 'private' (仅自己) / 'all_users' (所有登录用户)
  sortOrder: integer('sort_order').default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})
```

**约束和规则**:
- `ownerId` 必需（每个相册必须有所有者）
- `visibility` 枚举：`'private' | 'all_users'`
- `coverMediaId` 引用 media.id，可能为空（相册暂无照片时）
- 相册名称在同一用户下唯一（或允许重复？设计决定：允许重名）
- `sortOrder` 保留用于未来的自定义排序

**权限验证**:
- 查看相册 → 是 owner 或 visibility = 'all_users'
- 编辑/删除相册 → 是 owner
- 管理用户 → 是 admin

---

### 2.4 album_media 表 - 相册-照片关联

```typescript
export const albumMedia = sqliteTable('album_media', {
  albumId: text('album_id').notNull(),      // 相册ID
  mediaId: text('media_id').notNull(),      // 照片ID（引用 media.id）
  addedAt: text('added_at').notNull(),      // 添加时间
})
```

**约束**:
- `(albumId, mediaId)` 组合唯一（一张照片在一个相册中不重复）
- `albumId` 外键到 album.id
- `mediaId` 外键到 media.id

**删除策略**:
- 删除相册 → 级联删除 album_media 记录（不影响 media 表）
- 从相册移除照片 → 删除单条 album_media 记录（不影响 media 表）

---

### 2.5 album_share 表 - 相册分享记录

```typescript
export const albumShare = sqliteTable('album_share', {
  id: text('id').primaryKey(),              // 分享记录ID
  albumId: text('album_id').notNull(),      // 被分享的相册
  shareToken: text('share_token').unique().notNull(), // 公开访问 token
  createdBy: text('created_by').notNull(),  // 创建分享的用户ID
  createdAt: text('created_at').notNull(),  // 创建时间
  expiresAt: text('expires_at'),            // 可选过期时间（目前未使用，保留）
})
```

**约束**:
- `shareToken` 唯一且不能为空
- `albumId` 外键到 album.id
- `createdBy` 外键到 user.id

**Token 生成**:
- 16字节随机值 → Base64 URL 编码 → 约 22 字符
- 示例: `aB3xY7_Zq1kP2mN4vC6b`

---

## 3. 类型定义 (TypeScript)

位置: `packages/shared/src/types/`（新建）或 `frontend/src/stores/`

```typescript
// 用户
interface User {
  id: string
  username: string | null
  displayName: string
  avatarEmoji: string
  inviteCode: string | null
  isAdmin: boolean
  status: 'active' | 'disabled'
  createdAt: string
  updatedAt: string
}

// 相册
interface Album {
  id: string
  ownerId: string
  name: string
  description: string | null
  coverMediaId: string | null
  visibility: 'private' | 'all_users'
  sortOrder: number
  createdAt: string
  updatedAt: string
  // 计算字段
  mediaCount?: number
  ownerName?: string
}

// 相册-照片关联
interface AlbumMedia {
  albumId: string
  mediaId: string
  addedAt: string
}

// 分享记录
interface AlbumShare {
  id: string
  albumId: string
  shareToken: string
  createdBy: string
  createdAt: string
  expiresAt: string | null
}

// 登录状态（前端使用）
interface AuthState {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
}
```

---

## 4. 索引建议

为了查询性能，建议添加以下索引：

| 表 | 索引字段 | 用途 |
|----|---------|------|
| `user` | `invite_code` | 邀请码登录查询（已 unique） |
| `user` | `status` | 过滤启用/禁用用户 |
| `session` | `expires_at` | 清理过期会话 |
| `album` | `owner_id, visibility` | 按用户和可见性筛选 |
| `album` | `created_at` | 按时间排序 |
| `album_media` | `album_id` | 查询相册内所有照片 |
| `album_media` | `media_id` | 查询某张照片所在的相册（未来功能） |
| `album_share` | `share_token` | 分享链接查询（已 unique） |
| `album_share` | `album_id` | 查询某相册的所有分享链接 |

---

## 5. 与现有系统的集成点

### 5.1 数据库初始化

在 `backend/src/services/dbInitService.ts` 的 `ensureDatabaseReady()` 中：

- 保持现有表创建逻辑不变
- 在现有 CREATE TABLE 之后，添加 4 个新表的 CREATE TABLE 语句
- 添加新表的 CREATE INDEX 语句

### 5.2 认证中间件

修改/替换 `backend/src/middleware/authMiddleware.ts`:

- 保留 Basic Auth 作为系统级门禁（可保留或移除以简化）
- 添加用户会话解析：读取 Cookie → 查询 session 表 → 设置 `req.user`
- 添加路由守卫：需要登录的路由检查 `req.user`
- 添加管理员权限检查中间件

### 5.3 后端路由扩展

在 `backend/src/routes/api/index.ts`:

- 添加 `authRoutes`（登录、获取当前用户、退出登录）
- 添加 `albumRoutes`（相册 CRUD、照片管理）
- 添加 `userRoutes`（用户管理，仅管理员）
- 添加 `shareRoutes`（分享链接访问，独立路由）

### 5.4 前端路由扩展

在 `frontend/src/routes.ts`:

- 添加 `/login` - 登录页
- 添加 `/albums` - 相册列表
- 添加 `/albums/:id` - 相册详情
- 添加 `/settings/users` - 用户管理（仅管理员）
- 添加 `/share/album/:token` - 公开分享访问
- 添加路由守卫：未登录时重定向到 `/login`

### 5.5 前端 API 客户端扩展

在 `frontend/src/utils/apiClient.ts`:

- 认证相关端点（登录、登出、当前用户）
- 相册相关端点
- 用户管理相关端点
- 分享相关端点

---

## 6. 数据迁移策略

由于现有系统没有用户概念，新表创建后为空：

1. 首次启动：无用户 → 显示初始化向导
2. 初始化向导：创建第一个用户（管理员）
3. 之后：管理员可创建其他用户
4. 现有照片：保持不变，用户可以将它们添加到相册

**无需数据迁移脚本**，新表从零开始。

---

## 7. 验证要点

| 验证项 | 说明 |
|--------|------|
| 用户隔离 | 用 User A 登录，看自己创建的相册是否可见，切换 User B 后不可见 A 的私有相册 |
| 可见性验证 | 把相册设为 "所有登录用户可见"，其他用户登录后可以看到 |
| 分享链接验证 | 退出登录或在匿名窗口访问分享链接，能看到照片但看不到系统其他部分 |
| 权限边界 | 尝试 URL 编辑他人相册 (`/albums/<他人id>/edit`) 应返回 403 |
| 删除安全 | 删除相册后，原始照片文件仍然存在 |
| 邀请码安全 | 错误邀请码不能登录 |