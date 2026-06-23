# Research: Worker Hub Architecture

**Feature**: 003-worker-hub-architecture  
**Date**: 2026-06-23

## 1. WebSocket Library Selection

**Decision**: `ws` (npm package)

**Rationale**:
- 零外部依赖，纯 Node.js 实现
- 与 Express 共享同一端口（HTTP Upgrade）无需额外端口
- 同时提供 Server 和 Client API
- 社区成熟（20k+ stars），长期维护
- 比 `socket.io` 更轻量，无需自定义协议层

**Alternatives considered**:
- `socket.io`: 过度设计，自带重连/房间/ACK 等机制，但这些功能我们不需要（只需简单消息路由），增加包体积和性能开销
- `uWebSockets.js`: 性能最高但需要原生编译，NAS Docker 部署增加复杂度
- Node.js 原生 `http` 模块手动 Upgrade: 实现复杂度高，`ws` 已封装好

## 2. WS Hub 端口策略

**Decision**: 独立端口，通过环境变量 `WS_HUB_PORT` 配置（默认 3001）

**Rationale**:
- Worker 不运行 Express，无法共享 HTTP 端口
- 分离端口便于独立调试和监控
- 环境变量配置，灵活适配不同部署环境

**Alternatives considered**:
- 与 Express 共享端口: Worker 没有 HTTP 服务，无法共享
- 随机端口 + 发现机制: 过度设计，NAS 部署无需动态端口

## 3. 消息协议设计

**Decision**: 统一 JSON 消息格式，基于 `type` 字段区分消息类别

```typescript
// 通知消息（Worker → Backend，单向）
{ type: "notify", event: "task-complete", queue: "read-file", payload: {...} }

// 路由消息（未来 Worker → Python Worker，Hub 转发）
{ type: "route", id: "uuid", from: "node-worker", to: "python-face", action: "face-detect", payload: {...} }

// 路由响应
{ type: "route-response", id: "uuid", from: "python-face", to: "node-worker", result: {...} }

// 系统消息
{ type: "system", event: "ready", clientId: "backend" }
{ type: "system", event: "connected", clientId: "python-face" }
{ type: "system", event: "disconnected", clientId: "backend" }
```

**Rationale**:
- 基于 `type` 区分消息类别，简洁清晰
- 通知消息不包含 `to` 字段（Hub 默认转发给所有已注册的 Backend 客户端）
- 路由消息包含 `from`/`to`/`id`，支持请求-响应匹配（未来）

**Alternatives considered**:
- Protocol Buffers: 二进制协议，减少带宽但增加构建复杂度，对于 50 msg/s 无必要
- MessagePack: 同样为二进制优化，JSON 对于当前规模足够

## 4. 重连策略

**Decision**: 指数退避，初始 1s，最大 30s，无上限重试

**Rationale**:
- 初始 1s 快速恢复短暂断连
- 最大 30s 避免在长时间不可用时频繁重试
- 无上限重试确保不丢失连接（PM2 会重启进程，重连必然成功）

**Alternatives considered**:
- 固定间隔重试: 要么太频繁（浪费资源），要么太慢（恢复慢）
- 有限次数重试 + 放弃: 不适合，进程间通信必须恢复

## 5. 启动协调流程

**Decision**: Worker 并行启动 `startDirectoryWatchers()` 和等待 Backend WS 连接，两个条件都满足后开始队列消费和扫描

**Rationale**:
- `startDirectoryWatchers()` 不依赖 DB，可独立启动
- Backend 连接 = DB 已就绪的信号
- 并行等待缩短启动时间
- 无需额外的健康检查端点

**Alternatives considered**:
- Worker 轮询 Backend `/health` 端点: 增加轮询开销，Backend 连接 WS 本身就是信号
- Worker 自己调用 `ensureDatabaseReady()`: 职责不清，DB 初始化应归 Backend

## 6. 消息持久化与 at-least-once 语义

**Decision**: 队列消息在 SQLite 中增加 `status` 字段（pending / processing / completed），消费者取消息时标记为 `processing`，完成时标记为 `completed`。Hub 重启时扫描 `processing` 状态的消息，恢复为 `pending`。

**Rationale**:
- 已有 SQLite 队列表，复用现有基础设施
- `status` 字段简单可靠，无需额外中间件
- 重启恢复逻辑在 Hub 启动时执行一次，开销小

**Alternatives considered**:
- Redis / RabbitMQ 作为独立队列: 增加部署依赖，违反 NAS 轻量部署原则
- 无状态恢复（消息丢失后靠下次扫描重跑）: 用户明确要求 at-least-once

## 7. 移除旧 HTTP 通知路径

**Decision**: 删除 `worker/src/listeners/queueHandlers.ts` 中的 `notifyAPI()` 函数和 `API_INTERNAL_URL` 相关代码，Backend 的 `/api/internal/notify` 端点可以保留（未来可能被其他客户端使用）或删除（如果确认无其他使用者）。

**Rationale**:
- WS 通道替代 HTTP 通知后，旧路径成为死代码
- 减少维护负担，避免两条路径数据不一致

**Alternatives considered**:
- 保留 HTTP 通知作为 fallback: 增加复杂度，WS 已覆盖所有场景