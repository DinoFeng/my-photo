# WebSocket Message Protocol

**Feature**: 003-worker-hub-architecture  
**Version**: 1.0.0

## Connection

Backend 和未来 Worker 通过 WS 连接到 Hub：

```
ws://localhost:3001
```

连接建立后，客户端发送身份注册消息：

```json
{ "type": "system", "event": "register", "clientId": "backend" }
```

Hub 验证 `clientId` 唯一性，返回确认：

```json
{ "type": "system", "event": "registered", "clientId": "backend" }
```

## Message Types

### 1. Notify — 进度通知（Worker → Backend）

Worker 消费者完成/出错时发送。

```json
{
  "type": "notify",
  "event": "task-complete",
  "queue": "read-file",
  "payload": {
    "filePath": "/media/photos/IMG_001.jpg",
    "status": "success"
  }
}
```

**字段**:
- `type`: `"notify"`
- `event`: `"task-complete"` | `"task-error"` | `"scan-progress"`
- `queue`: 队列名称（`"scan-folder"` | `"read-file"` | `"face-detect"`）
- `payload`: 事件相关数据（可选）

**Hub 行为**: 转发给所有已注册的 `clientId === "backend"` 的客户端。

### 2. Route — 任务路由（未来）

任意 Worker 通过 Hub 发送任务给另一个 Worker。

```json
{
  "type": "route",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "from": "node-worker",
  "to": "python-face",
  "action": "face-detect",
  "payload": {
    "imagePath": "/media/photos/IMG_001.jpg"
  }
}
```

**字段**:
- `type`: `"route"`
- `id`: UUID v4，用于请求-响应匹配
- `from`: 发送方 clientId
- `to`: 接收方 clientId
- `action`: 操作名称
- `payload`: 操作相关数据

**Hub 行为**: 根据 `to` 字段查找目标客户端，转发消息。如果目标不在线，丢弃消息（v1）。

### 3. Route Response — 任务响应（未来）

```json
{
  "type": "route-response",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "from": "python-face",
  "to": "node-worker",
  "result": {
    "faces": [
      { "x": 100, "y": 200, "width": 50, "height": 50 }
    ]
  }
}
```

**字段**:
- `type`: `"route-response"`
- `id`: 与请求相同的 UUID
- `from`: 发送方 clientId
- `to`: 接收方 clientId
- `result`: 处理结果

### 4. System — 系统消息

```json
// 注册
{ "type": "system", "event": "register", "clientId": "backend" }

// 注册确认
{ "type": "system", "event": "registered", "clientId": "backend" }

// Hub 就绪（所有条件满足后广播）
{ "type": "system", "event": "ready" }

// 客户端连接通知（广播给所有客户端）
{ "type": "system", "event": "connected", "clientId": "python-face" }

// 客户端断开通知（广播给所有客户端）
{ "type": "system", "event": "disconnected", "clientId": "backend" }
```

## Error Handling

### 注册被拒绝

```json
{ "type": "system", "event": "error", "message": "Client ID 'backend' already registered" }
```

之后 Hub 关闭该连接。

### 无效消息

Hub 忽略格式不正确的消息，记录警告日志，不关闭连接。

## Reconnection

客户端断开后自动重连，指数退避：
- 间隔: 1s → 2s → 4s → 8s → 16s → 30s (max)
- 乘数: 2x
- 最大: 30s
- 次数: 无上限

重连成功后重新发送注册消息。

## Versioning

当前版本 1.0.0。未来协议变更通过 `type` 字段新增类别实现，不破坏现有消息格式。重大变更通过 `version` 字段协商（当前不实现）。