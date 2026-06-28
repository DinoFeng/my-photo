# 安全风险记录

> 记录日期：2026-06-28
> 适用范围：my-photo 相册项目（backend + frontend + shared）
> 文档目的：系统性记录已识别的安全风险与漏洞，供后续迭代处理

---

## 一、风险总览

| 严重程度 | 数量 |
|---------|------|
| 🔴 高   | 5    |
| 🟡 中   | 8    |
| 🟢 低   | 4    |
| **合计** | **17** |

---

## 二、风险清单（按严重程度排序）

### 🔴 高风险（5 项）

| # | 风险项 | 位置 | 说明 | 修复建议 |
|---|--------|------|------|---------|
| **H-1** | 登录失败无速率限制 | `backend/src/controllers/authController.ts` | 无任何登录失败限流/锁定机制，攻击者可暴力破解 Admin 密码和邀请码 | 加 IP+用户名 维度的失败计数，超过阈值（如 5 次/10 分钟）后临时锁定；记录失败日志 |
| **H-2** | 邀请码登录无限速 | `backend/src/controllers/authController.ts` | 邀请码 16 位 hex（理论 16^16 空间），但在无限速情况下仍可被大量尝试 | 同 H-1，邀请码登录单独计数 |
| **H-3** | 相册水平越权（查看） | `backend/src/controllers/albumController.ts` | 当前 `canViewAlbum()` 已有 owner / all_users 检查 ✅，**但需确认**：visibility 字段是否在 DB 层做了白名单校验，是否允许传入 `visibility='public'` 等非预期值 | 确保 visibility 仅接受 'private' / 'all_users' 两个枚举值，API 层做白名单校验 |
| **H-4** | 相册水平越权（操作） | `backend/src/controllers/albumController.ts` | 当前每个写操作（update/delete/addMedia/removeMedia/share）都有 `ownerId === req.user.id` 检查 ✅，**但需确认**：前端路由守卫 `requiresAdmin` 只保护了 `/settings/users`，其他页面的"操作按钮"隐藏不能替代后端校验 | 前端 UI 层面继续保持"非 owner 看不到操作按钮"，但后端校验是最终防线，不可依赖前端 |
| **H-5** | 初始化密码在环境变量中可见 | Docker / `backend/src/services/dbInitService.ts` | INIT_PASSWORD 通过环境变量传递，在某些场景下（`docker inspect`、容器内 `env`、宿主机进程列表）可能被看到；虽然 Admin 首次登录后强制改密使其失效，但首次启动到 Admin 完成改密之间存在窗口期 | 1. 文档声明仅受信任人员操作容器；2. 考虑初始化密码仅在首次启动有效，创建 Admin 后立即失效（已实现 must_change_password） |

### 🟡 中风险（8 项）

| # | 风险项 | 位置 | 说明 | 修复建议 |
|---|--------|------|------|---------|
| **M-1** | Cookie `SameSite=Lax` 不够严格 | `backend/src/middleware/authMiddleware.ts:89` | Lax 模式下，跨站 POST 请求的顶级导航仍会携带 Cookie；虽不直接导致 CSRF，但 Strict 更安全 | 改为 `SameSite=Strict` |
| **M-2** | Cookie `Secure` 依赖 NODE_ENV | `backend/src/middleware/authMiddleware.ts:88` | 仅在 `NODE_ENV === 'production'` 时启用 Secure flag；如果部署 HTTPS 但 NODE_ENV 未正确设置，Cookie 会在明文传输 | 引入独立的 `USE_SECURE_COOKIE` 环境变量或依赖请求协议自动判断 |
| **M-3** | session 过期记录不会自动清理 | `backend/src/controllers/authController.ts` | session 表的 expiresAt 只在登录时由中间件检查，过期的记录不会被自动 DELETE，数据库会不断堆积 | 启动时 + 定时任务清理 `expiresAt < now` 的 session |
| **M-4** | 密码策略过弱 | `backend/src/controllers/authController.ts:147` | 仅"至少 6 位"，无大小写/数字/符号要求，无常见密码黑名单 | 最小长度提到 8 位，加入常用密码黑名单（如 top 1000 弱密码）检查 |
| **M-5** | 邀请码重新生成后旧 session 仍有效 | `backend/src/controllers/userController.ts:91` | Admin 重新生成某个用户的邀请码时，代码只更新了 `inviteCode` 字段，但没清理该用户的 session | 重新生成邀请码时同时 `DELETE FROM session WHERE userId=?` |
| **M-6** | 无审计日志 | 全局 | 没有记录谁登录了、谁改了密码、谁分享了相册、谁删除了用户；出现安全事件后无法溯源 | 在关键操作（登录/改密/分享/用户删除/邀请码重生成）处写结构化日志（时间 + 操作人 + 操作 + 目标） |
| **M-7** | 公开分享链接永久有效 | `backend/src/controllers/albumController.ts:501` | `expiresAt` 字段存在，但创建时默认为 null（永不过期） | 分享链接默认设 30 天过期，允许创建时自定义 |
| **M-8** | CORS 未限制 Origin | `backend/src/server.ts`（待确认） | 如果没有配置 CORS Origin 白名单，任意网站的脚本都可以尝试调用 API（受 Cookie SameSite 保护，但仍有风险） | 明确配置 `Access-Control-Allow-Origin` 为允许的域名列表，而非 `*` |

### 🟢 低风险（4 项）

| # | 风险项 | 位置 | 说明 | 修复建议 |
|---|--------|------|------|---------|
| **L-1** | 相册 ID 用自增 hex（可枚举） | `backend/src/controllers/albumController.ts:124` | `generateRandomId()` 是随机 16 字节 hex，实际上**不可枚举** ✅（当前代码已安全） | 保持现状 |
| **L-2** | 公开分享页无 CSP | `backend/src/controllers/shareController.ts:123` | `/share/album/:token` 返回的 HTML 没有 `Content-Security-Policy` 头 | 加 `CSP: default-src 'self'` 等严格策略 |
| **L-3** | 公开分享页无速率限制 | `backend/src/controllers/shareController.ts` | 分享链接被大量抓取可能产生带宽消耗 | 加 IP 维度的简单速率限制（如 60 次/分钟） |
| **L-4** | 数据库文件权限 | Docker volume | SQLite 数据库文件在宿主机的权限如果是 644，可能被其他进程读取 | 容器不以 root 运行，volume 目录权限设 600 |

---

## 三、已做得不错的地方（防御层）

| 项 | 说明 |
|---|------|
| 密码哈希 | PBKDF2-SHA256, 100,000 次迭代, 16 字节随机 salt, 32 字节哈希；`timingSafeEqual()` 防时序攻击 |
| 会话管理 | HttpOnly Cookie（30 天），服务端存储 session；改密后清所有 session |
| 初始化密码强制改密 | `must_change_password=true` 机制，初始化密码只在首次登录时有效 |
| 前端路由守卫 | `requiresAuth` / `requiresAdmin` 标记，未登录自动跳 `/login` |
| Admin 重置需物理操作 | 只有能操作数据库才能重置 Admin，公网 HTTP 做不到 |
| 相册 owner 权限 | 每个写操作都校验 `ownerId === req.user.id`，水平越权被阻断 |

---

## 四、风险状态追踪

| 编号 | 状态 | 修复日期 | 备注 |
|------|------|---------|------|
| H-1 | 待修复 | — | |
| H-2 | 待修复 | — | |
| H-3 | 已确认安全 | — | 当前 `canViewAlbum()` + visibility 白名单已覆盖 |
| H-4 | 已确认安全 | — | 后端每个写操作都有 owner 校验 |
| H-5 | 已确认安全 | — | `must_change_password=true` 使初始化密码仅一次性有效 |
| M-1 | 待修复 | — | |
| M-2 | 待修复 | — | |
| M-3 | 待修复 | — | |
| M-4 | 待修复 | — | |
| M-5 | 待修复 | — | |
| M-6 | 待修复 | — | |
| M-7 | 待修复 | — | |
| M-8 | 待修复 | — | |
| L-1 | 已确认安全 | — | `generateRandomId()` 随机不可枚举 |
| L-2 | 待修复 | — | |
| L-3 | 待修复 | — | |
| L-4 | 待修复 | — | |

---

## 五、修复优先级建议

**P0（下次迭代必须处理）**：H-1、H-2（暴力破解防护）
**P1（近期处理）**：M-1、M-5（Cookie SameSite 升级 + 邀请码重生成清 session）
**P2（有空处理）**：M-3、M-4、M-6、M-7、M-8（session 清理、密码策略、审计日志、分享过期、CORS）
**P3（可延后）**：L-2、L-3、L-4（CSP、分享限速、数据库权限）