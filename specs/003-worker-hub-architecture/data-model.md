# Data Model: Worker Hub Architecture

**Feature**: 003-worker-hub-architecture  
**Date**: 2026-06-23

## 1. Hub Connection

内存中的数据结构，表示一个活跃的 WS 连接。

| Field | Type | Description |
|-------|------|-------------|
| `clientId` | `string` | 唯一标识（如 "backend", "python-face"） |
| `ws` | `WebSocket` | 底层 WS 连接对象 |
| `connectedAt` | `Date` | 连接建立时间 |
| `lastHeartbeat` | `Date` | 最近心跳时间（可选，v1 不实现） |

**行为规则**:
- `clientId` 必须唯一，重复连接时拒绝新连接
- 连接断开时从 Hub 中移除
- 内存结构，进程重启后重建

## 2. Message (WS Message)

内存中传输的 WS 消息，不持久化。

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"notify" \| "route" \| "route-response" \| "system"` | 消息类别 |
| `event` | `string` | 事件名称（notify/system 类型） |
| `queue` | `string` | 队列名称（notify 类型可选） |
| `id` | `string` | 关联 ID（route 类型） |
| `from` | `string` | 发送方 clientId |
| `to` | `string` | 接收方 clientId |
| `payload` | `Record<string, unknown>` | 消息载荷 |
| `result` | `Record<string, unknown>` | 响应结果（route-response 类型） |

**消息类别**:
- `notify`: 单向通知，Hub 转发给所有 Backend 客户端
- `route`: 路由消息，Hub 根据 `to` 字段转发给指定客户端
- `route-response`: 路由响应，Hub 转发给 `to` 字段指定的客户端
- `system`: 系统消息（连接/断开/就绪），Hub 本地处理 + 广播

## 3. Queue Message (DB)

现有的队列表结构，新增 `status` 字段支持 at-least-once 语义。

**表**: `queue_messages`（假设现有表名，需确认实际 schema）

| Field | Type | Description |
|-------|------|-------------|
| `id` | `INTEGER PRIMARY KEY` | 消息 ID |
| `queue_name` | `TEXT` | 队列名称 |
| `payload` | `TEXT` | JSON 序列化的消息载荷 |
| `status` | `TEXT` | `pending` / `processing` / `completed` |
| `created_at` | `DATETIME` | 创建时间 |
| `updated_at` | `DATETIME` | 更新时间 |

**状态转换**:
```
pending → processing → completed
                    ↘ (Hub 重启) → pending
```

**注意**: 当前项目使用自定义队列实现（`SqliteQueueRepository`），需增加 `status` 字段以支持 at-least-once 语义。**已确认 v1 实现。**

## 4. Progress Notification (概念)

从 Worker 到 Backend 再到前端的进度通知，不持久化，仅通过 WS + SSE 传输。

| Field | Type | Description |
|-------|------|-------------|
| `event` | `string` | 事件类型（`task-complete`, `task-error`, `scan-progress`, ...） |
| `queue` | `string` | 来源队列名称 |
| `status` | `string` | 任务状态 |
| `timestamp` | `number` | 事件时间戳（epoch ms） |
| `payload` | `Record<string, unknown>` | 附加数据 |

**已有事件类型**（来自现有 `notifyAPI` 实现）:
- `task-complete`: 任务完成
- `task-error`: 任务错误
- `scan-progress`: 扫描进度更新

## 5. 现有表结构（无变更）

以下表不在此功能范围内修改：

| 表 | 用途 | 状态 |
|----|------|------|
| `media` | 媒体文件元数据 | 无变更 |
| `scan_checkpoint` | 扫描检查点 | 无变更 |
| `setting` | 系统设置 | 无变更 |
| `directories` | 被监控的目录 | 无变更 |