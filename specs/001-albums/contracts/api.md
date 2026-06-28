# API 契约 - 相册功能

**创建日期**: 2026-06-28
**基础路径**: `/api`
**认证**: HTTP-only Cookie (`photo_session`)
**响应格式**: JSON

---

## 1. 通用约定

### 1.1 认证

- 用户登录后，服务端设置 `photo_session` Cookie
- 后续请求自动携带此 Cookie
- 分享链接访问 (`/share/album/:token`) 不需要 Cookie

### 1.2 认证状态获取

**GET /api/auth/me**

- 响应当前登录用户信息
- 未登录返回 `{ user: null }`

成功响应 (200):
```json
{
  "user": {
    "id": "uuid-xxx",
    "displayName": "爸爸",
    "avatarEmoji": "👨",
    "isAdmin": true,
    "status": "active"
  }
}
```

### 1.3 错误响应

- HTTP 状态码反映错误类型
- Body: `{ "error": "错误信息" }`

| 状态码 | 含义 |
|--------|------|
| 400 | 参数错误 |
| 401 | 未登录 |
| 403 | 无权限（已登录但无权操作） |
| 404 | 资源不存在 |
| 500 | 服务器错误 |

---

## 2. 认证相关端点

### 2.1 检查系统是否已初始化

**GET /api/auth/status**

- 无权限要求
- 用于登录页判断是否显示初始化向导

响应 (200):
```json
{
  "hasUsers": true,    // 是否存在任何用户
  "hasAdmin": true     // 是否有管理员
}
```

### 2.2 系统初始化（创建第一个用户）

**POST /api/auth/init**

- 仅在无用户时可用
- 创建第一个用户（自动为管理员）

请求体:
```json
{
  "username": "admin",
  "password": "password123",
  "displayName": "管理员",
  "avatarEmoji": "👨"
}
```

成功响应 (200):
```json
{
  "user": {
    "id": "uuid-xxx",
    "displayName": "管理员",
    "avatarEmoji": "👨",
    "isAdmin": true
  }
}
```

失败响应 (400):
```json
{ "error": "系统已初始化，无法再次创建管理员" }
```

### 2.3 管理员密码登录

**POST /api/auth/login**

请求体:
```json
{
  "username": "admin",
  "password": "password123"
}
```

成功响应 (200) + 设置 Cookie:
```json
{
  "user": {
    "id": "uuid-xxx",
    "displayName": "管理员",
    "avatarEmoji": "👨",
    "isAdmin": true
  }
}
```

失败响应 (401):
```json
{ "error": "用户名或密码错误" }
```

### 2.4 邀请码登录

**POST /api/auth/login-with-code**

请求体:
```json
{
  "inviteCode": "family2026-abcxyz"
}
```

成功响应 (200) + 设置 Cookie:
```json
{
  "user": {
    "id": "uuid-yyy",
    "displayName": "妈妈",
    "avatarEmoji": "👩",
    "isAdmin": false
  }
}
```

失败响应 (401):
```json
{ "error": "邀请码无效或用户已被禁用" }
```

### 2.5 退出登录

**POST /api/auth/logout**

- 需要登录
- 删除服务器端 session 记录
- 清除客户端 Cookie

响应 (200):
```json
{ "ok": true }
```

---

## 3. 用户管理端点（仅管理员）

### 3.1 获取所有用户列表

**GET /api/users**

- 需要登录 + 管理员权限

响应 (200):
```json
{
  "users": [
    {
      "id": "uuid-xxx",
      "username": "admin",
      "displayName": "管理员",
      "avatarEmoji": "👨",
      "isAdmin": true,
      "status": "active",
      "inviteCode": null,
      "createdAt": "2026-06-28T10:00:00Z"
    },
    {
      "id": "uuid-yyy",
      "username": null,
      "displayName": "妈妈",
      "avatarEmoji": "👩",
      "isAdmin": false,
      "status": "active",
      "inviteCode": "family2026-xxxxxx",
      "createdAt": "2026-06-28T11:00:00Z"
    }
  ]
}
```

### 3.2 创建新用户

**POST /api/users**

- 需要登录 + 管理员权限

请求体:
```json
{
  "displayName": "孩子",
  "avatarEmoji": "🧒"
}
```

成功响应 (201):
```json
{
  "user": {
    "id": "uuid-zzz",
    "displayName": "孩子",
    "avatarEmoji": "🧒",
    "isAdmin": false,
    "status": "active",
    "inviteCode": "child-xxxxx",
    "createdAt": "2026-06-28T12:00:00Z"
  }
}
```

### 3.3 更新用户

**PUT /api/users/:id**

- 需要登录 + 管理员权限
- 可修改：昵称、头像、状态、重新生成邀请码

请求体:
```json
{
  "displayName": "大儿子",
  "avatarEmoji": "🧑",
  "status": "active",
  "regenerateInviteCode": false   // true 则重新生成邀请码
}
```

响应 (200):
```json
{
  "user": {
    "id": "uuid-zzz",
    "displayName": "大儿子",
    "avatarEmoji": "🧑",
    "status": "active",
    "inviteCode": "child-xxxxx",
    "isAdmin": false
  }
}
```

### 3.4 删除用户

**DELETE /api/users/:id**

- 需要登录 + 管理员权限
- 不能删除自己（防止意外锁定）
- 删除用户同时删除其相册及关联记录

响应 (200):
```json
{ "ok": true }
```

失败响应 (400):
```json
{ "error": "不能删除当前登录用户" }
```

---

## 4. 相册端点

### 4.1 获取相册列表

**GET /api/albums**

- 需要登录
- 返回：
  - 我拥有的所有相册
  - visibility = 'all_users' 的他人相册

查询参数（可选）:
- `?owner=me` - 仅显示我的相册
- `?owner=others` - 仅显示他人的共享相册
- `?q=关键词` - 按名称搜索

响应 (200):
```json
{
  "albums": [
    {
      "id": "album-uuid-1",
      "ownerId": "user-uuid-1",
      "ownerName": "爸爸",
      "name": "2026年春节",
      "description": "春节家庭聚会照片",
      "coverMediaId": "media-uuid-123",
      "visibility": "private",
      "mediaCount": 42,
      "createdAt": "2026-02-10T10:00:00Z",
      "updatedAt": "2026-02-15T08:00:00Z"
    },
    {
      "id": "album-uuid-2",
      "ownerId": "user-uuid-2",
      "ownerName": "妈妈",
      "name": "家庭旅行",
      "description": null,
      "coverMediaId": "media-uuid-456",
      "visibility": "all_users",
      "mediaCount": 128,
      "createdAt": "2026-03-01T10:00:00Z",
      "updatedAt": "2026-03-10T08:00:00Z"
    }
  ]
}
```

### 4.2 获取单个相册详情

**GET /api/albums/:id**

- 需要登录
- 权限：所有者 或 visibility = 'all_users'

响应 (200):
```json
{
  "album": {
    "id": "album-uuid-1",
    "ownerId": "user-uuid-1",
    "ownerName": "爸爸",
    "name": "2026年春节",
    "description": "春节家庭聚会照片",
    "coverMediaId": "media-uuid-123",
    "visibility": "private",
    "mediaCount": 42,
    "createdAt": "2026-02-10T10:00:00Z",
    "updatedAt": "2026-02-15T08:00:00Z"
  }
}
```

失败响应 (403):
```json
{ "error": "无权访问此相册" }
```

### 4.3 创建相册

**POST /api/albums**

- 需要登录

请求体:
```json
{
  "name": "2026年暑假",
  "description": "海边度假",
  "visibility": "private"   // 或 "all_users"
}
```

成功响应 (201):
```json
{
  "album": {
    "id": "album-uuid-new",
    "ownerId": "user-uuid-1",
    "ownerName": "爸爸",
    "name": "2026年暑假",
    "description": "海边度假",
    "coverMediaId": null,
    "visibility": "private",
    "mediaCount": 0,
    "createdAt": "2026-06-28T12:00:00Z",
    "updatedAt": "2026-06-28T12:00:00Z"
  }
}
```

### 4.4 更新相册

**PUT /api/albums/:id**

- 需要登录
- 权限：仅所有者

请求体（字段可选，仅更新提供的字段）:
```json
{
  "name": "2026年夏天海边",
  "description": "青岛+威海五日游",
  "visibility": "all_users",
  "coverMediaId": "media-uuid-789"
}
```

响应 (200):
```json
{
  "album": {
    "id": "album-uuid-1",
    "ownerId": "user-uuid-1",
    "name": "2026年夏天海边",
    "description": "青岛+威海五日游",
    "coverMediaId": "media-uuid-789",
    "visibility": "all_users",
    "mediaCount": 42,
    "createdAt": "2026-02-10T10:00:00Z",
    "updatedAt": "2026-06-28T12:30:00Z"
  }
}
```

### 4.5 删除相册

**DELETE /api/albums/:id**

- 需要登录
- 权限：仅所有者
- 级联删除：相册-照片关联 + 相册分享记录
- **不删除**原始照片文件和 media 表记录

响应 (200):
```json
{ "ok": true }
```

---

## 5. 相册-照片管理端点

### 5.1 获取相册内的照片列表

**GET /api/albums/:id/media**

- 需要登录
- 权限：所有者 或 visibility = 'all_users'
- 分页参数：`?page=1&limit=30`
- 排序参数：`?sort=addedAt_desc`（按添加时间倒序，默认）或 `?sort=dateTaken_desc`

响应 (200):
```json
{
  "data": [
    {
      "id": "media-uuid-1",
      "albumId": "album-uuid-1",
      "addedAt": "2026-06-28T12:00:00Z",
      // 照片原信息（来自 media 表）
      "filename": "IMG_0001.jpg",
      "fileType": "image",
      "thumbnailPath": "thumb/...",
      "dateTaken": "2026-02-10T10:00:00Z",
      "effectiveTime": "2026-02-10T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 30,
    "total": 42,
    "totalPages": 2
  }
}
```

### 5.2 添加照片到相册

**POST /api/albums/:id/media**

- 需要登录
- 权限：仅所有者
- 一次可添加多张

请求体:
```json
{
  "mediaIds": ["media-uuid-1", "media-uuid-2", "media-uuid-3"]
}
```

响应 (200):
```json
{
  "added": 3,       // 实际添加的数量（去重后的结果）
  "skipped": 0      // 已在相册中被跳过的数量
}
```

### 5.3 从相册移除单张照片

**DELETE /api/albums/:id/media/:mediaId**

- 需要登录
- 权限：仅所有者

响应 (200):
```json
{ "ok": true }
```

### 5.4 批量从相册移除照片

**POST /api/albums/:id/media/batch-remove**

- 需要登录
- 权限：仅所有者

请求体:
```json
{
  "mediaIds": ["media-uuid-1", "media-uuid-2"]
}
```

响应 (200):
```json
{ "removed": 2 }
```

---

## 6. 相册分享端点

### 6.1 获取相册的所有分享链接

**GET /api/albums/:id/shares**

- 需要登录
- 权限：仅所有者

响应 (200):
```json
{
  "shares": [
    {
      "id": "share-uuid-1",
      "albumId": "album-uuid-1",
      "shareToken": "aB3xY7_Zq1kP2mN4vC6b",
      "createdBy": "user-uuid-1",
      "createdAt": "2026-06-28T12:00:00Z",
      "expiresAt": null
    }
  ]
}
```

### 6.2 生成新的分享链接

**POST /api/albums/:id/shares**

- 需要登录
- 权限：仅所有者

请求体（无参数，或可选 expiresAt）:
```json
{}
```

响应 (201):
```json
{
  "share": {
    "id": "share-uuid-new",
    "albumId": "album-uuid-1",
    "shareToken": "xY7zK9_AbCdEfGhIjKl",
    "createdBy": "user-uuid-1",
    "createdAt": "2026-06-28T12:30:00Z",
    "expiresAt": null
  }
}
```

### 6.3 删除/撤销分享链接

**DELETE /api/albums/:id/shares/:shareId**

- 需要登录
- 权限：仅所有者

响应 (200):
```json
{ "ok": true }
```

---

## 7. 公开分享访问端点

这些端点**不需要登录**，通过分享链接 token 访问。

### 7.1 通过 token 获取相册信息

**GET /api/share/album/:token**

- 无登录要求
- token 来自 album_share.shareToken

响应 (200):
```json
{
  "album": {
    "id": "album-uuid-1",
    "name": "2026年春节",
    "description": "春节家庭聚会照片",
    "coverMediaId": "media-uuid-123",
    "mediaCount": 42
  },
  "ownerName": "爸爸"
}
```

失败响应 (404):
```json
{ "error": "分享链接已过期或不存在" }
```

### 7.2 获取分享相册的照片列表

**GET /api/share/album/:token/media**

- 无登录要求
- 分页参数：`?page=1&limit=30`

响应 (200):
```json
{
  "data": [
    {
      "id": "media-uuid-1",
      "filename": "IMG_0001.jpg",
      "fileType": "image",
      "thumbnailPath": "thumb/...",
      "dateTaken": "2026-02-10T10:00:00Z",
      "effectiveTime": "2026-02-10T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 30,
    "total": 42,
    "totalPages": 2
  }
}
```

---

## 8. 端点权限速查表

| 端点 | 需要登录 | 需要管理员 | 需要所有者 |
|------|---------|-----------|-----------|
| GET /api/auth/status | ❌ | ❌ | ❌ |
| POST /api/auth/init | ❌ | ❌ | ❌ |
| POST /api/auth/login | ❌ | ❌ | ❌ |
| POST /api/auth/login-with-code | ❌ | ❌ | ❌ |
| POST /api/auth/logout | ✅ | ❌ | ❌ |
| GET /api/users | ✅ | ✅ | ❌ |
| POST /api/users | ✅ | ✅ | ❌ |
| PUT /api/users/:id | ✅ | ✅ | ❌ |
| DELETE /api/users/:id | ✅ | ✅ | ❌ |
| GET /api/albums | ✅ | ❌ | ❌ |
| GET /api/albums/:id | ✅ | ❌ | 条件* |
| POST /api/albums | ✅ | ❌ | ❌ |
| PUT /api/albums/:id | ✅ | ❌ | ✅ |
| DELETE /api/albums/:id | ✅ | ❌ | ✅ |
| GET /api/albums/:id/media | ✅ | ❌ | 条件* |
| POST /api/albums/:id/media | ✅ | ❌ | ✅ |
| DELETE /api/albums/:id/media/:mediaId | ✅ | ❌ | ✅ |
| GET /api/albums/:id/shares | ✅ | ❌ | ✅ |
| POST /api/albums/:id/shares | ✅ | ❌ | ✅ |
| DELETE /api/albums/:id/shares/:shareId | ✅ | ❌ | ✅ |
| GET /api/share/album/:token | ❌ | ❌ | ❌ |
| GET /api/share/album/:token/media | ❌ | ❌ | ❌ |

*条件: 所有者 或 visibility = 'all_users'