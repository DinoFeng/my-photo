# 研究文档 - 相册功能

**创建日期**: 2026-06-28
**功能**: 相册功能 (spec.md)

---

## 1. 项目架构调研

### 1.1 已确认的技术栈

| 层级 | 技术 | 位置 |
|------|------|------|
| **前端** | Vue 3 + Naive UI + Pinia + Vue Router | `frontend/src/` |
| **后端** | Express 4.x + Drizzle ORM + SQLite | `backend/src/` |
| **共享模块** | Shared package (DB schema, types, config) | `packages/shared/` |
| **Worker** | 独立进程处理文件扫描、缩略图 | `worker/src/` |

### 1.2 现有代码入口点

| 组件 | 文件路径 | 说明 |
|------|---------|------|
| 数据库 Schema | `packages/shared/src/db/schema.ts` | 定义 media, setting, scanCheckpoint 表 |
| 数据库初始化 | `backend/src/services/dbInitService.ts` | 启动时 CREATE TABLE |
| 后端路由入口 | `backend/src/routes/api/index.ts` | 聚合 mediaRoutes 等 |
| 认证中间件 | `backend/src/middleware/authMiddleware.ts` | 当前仅 Basic Auth |
| API 响应格式 | `backend/src/controllers/mediaController.ts` | 参考响应结构 |
| 前端路由 | `frontend/src/routes.ts` | Vue Router 配置 |
| 前端 API 调用 | `frontend/src/utils/apiClient.ts` | 统一请求封装 |
| 前端 Store | `frontend/src/stores/` | Pinia store 目录 |
| 前端视图 | `frontend/src/views/` | 页面组件目录 |

### 1.3 现有表结构参考

```typescript
// media 表 - 照片/视频索引
// 字段: id, sourcePath, filename, filepath, fileSize, fileType, hash,
//        width, height, duration, make, model, dateTaken, fileBirthtime,
//        fileMtime, effectiveTime, latitude, longitude, metadata,
//        thumbnailPath, status, createdAt, updatedAt
//
// setting 表 - 系统设置
// 字段: id, key (唯一), value, description, createdAt, updatedAt
//
// scanCheckpoint 表 - 扫描状态
// 字段: id, path, isRoot, lastScannedMtime, lastScannedFile, status,
//        progress, totalFiles, scannedFiles, errorCount,
//        startedAt, completedAt, createdAt, updatedAt
```

---

## 2. 关键设计决策

### 2.1 用户认证方式

**决策**: Session Cookie + 用户表

**理由**:
- NAS 场景下，家庭成员长期使用同一设备，Cookie 体验最佳
- 避免每次访问都输入密码
- 支持"记住我"长期登录
- 实现简单，Express 原生支持

**实现要点**:
- 使用 `express-session` 或简单的自定义 Cookie 方案
- Session 存储在 SQLite 数据库（或内存，重启失效也可接受）
- Admin 密码使用 bcrypt 存储
- 邀请码：与用户记录关联的唯一随机字符串

### 2.2 相册可见性模型

**决策**: 三级可见性（私有 / 所有登录用户 / 公开链接）

**理由**:
- 覆盖 NAS 家庭使用的所有场景
- 简单易懂，用户无需学习复杂权限设置
- 公开链接可分享给外部朋友（如生日照片分享给其他家人）

**权限矩阵**:

| 操作 | 所有者 | 已登录用户 | 访客（通过分享链接） |
|------|-------|-----------|-------------------|
| 查看相册 | ✅ | 仅"所有登录用户可见" | ✅（仅被分享的相册） |
| 创建相册 | ✅ | ✅（自己的相册） | ❌ |
| 编辑相册信息 | ✅ | ❌ | ❌ |
| 删除相册 | ✅ | ❌ | ❌ |
| 添加/移除照片 | ✅ | ❌ | ❌ |
| 管理分享链接 | ✅ | ❌ | ❌ |

### 2.3 分享链接 Token 生成

**决策**: 使用 crypto 生成 16 字节随机字符串，Base64 URL 编码

**理由**:
- 足够长（~22 字符），无法被暴力破解
- URL 安全，不会有特殊字符问题
- 标准做法

### 2.4 数据库表定义位置

**决策**: 在 `packages/shared/src/db/schema.ts` 中添加新表

**理由**:
- 与现有表结构保持一致
- shared package 被 backend 和 worker 共享
- 便于统一维护

### 2.5 前端页面组织

**决策**:
- 新增 `Login.vue` - 登录页面（密码 + 邀请码两种模式）
- 新增 `AlbumList.vue` - 相册列表（主入口之一）
- 新增 `AlbumDetail.vue` - 相册详情
- 新增 `UserAdmin.vue` - 用户管理（仅管理员）
- 新增 `ShareView.vue` - 分享链接访问页面（无框架 shell）
- 修改 `routes.ts` - 添加新路由和导航守卫

**理由**: 与现有 Gallery.vue、Settings.vue 的组织方式一致

### 2.6 照片选择交互

**决策**:
- 在相册详情页提供"添加照片"按钮
- 点击后打开照片选择对话框（复用现有瀑布流组件，可多选）
- 在照片详情/预览中提供"添加到相册"操作

**理由**: 两种场景都需要：从相册角度添加照片，和从照片角度归类到相册

---

## 3. 数据库添加表

无需新数据库，使用现有的 SQLite。需要新表：

1. `user` - 用户表
2. `album` - 相册表
3. `album_media` - 相册-照片关联表（多对多）
4. `album_share` - 相册分享记录

---

## 4. 会话管理

### 4.1 方案

使用简单的 HTTP-only Cookie + 服务器端会话

- Cookie 名: `photo_session`
- 值: 随机 sessionId（32字节）
- 存储: SQLite 新表 `session`，或内存（重启后需要重新登录，可接受）
- 过期: 默认 30 天（记住我），否则会话级
- HttpOnly: true
- Secure: 如果是 HTTPS 环境
- SameSite: Lax

### 4.2 流程

```
登录成功
   ↓
生成 sessionId
   ↓
存储: sessionId -> { userId, createdAt, expiresAt }
   ↓
Set-Cookie: photo_session=<sessionId>; HttpOnly; Max-Age=...
   ↓
后续请求 → 读取 Cookie → 查找 session → 识别用户 → req.user = { id, name, isAdmin }
```

---

## 5. 已确认的实现方式

| 项目 | 方案 | 位置 |
|------|------|------|
| 密码哈希 | bcrypt | backend |
| 随机数 | crypto.randomBytes | Node.js 内置 |
| 会话 | HTTP-only Cookie + SQLite | backend middleware |
| API 响应格式 | { data: ..., pagination?: ... } | 与 mediaController 一致 |
| API 错误格式 | { error: 'message' } | 与现有一致 |
| 前端请求 | apiClient (fetch) | frontend |
| 前端状态 | Pinia stores | frontend/stores |