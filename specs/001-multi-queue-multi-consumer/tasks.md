
# 多队列多消费者架构 - 实现任务

## 任务列表

### Phase 1: 数据层实现

| 编号 | 任务 | 状态 | 依赖 |
|------|------|------|------|
| T001 | 添加 task_queue 表到 schema.ts | pending | - |
| T002 | 添加 queue_config 表到 schema.ts | pending | T001 |
| T003 | 运行数据库迁移 | pending | T002 |

### Phase 2: 队列核心实现

| 编号 | 任务 | 状态 | 依赖 |
|------|------|------|------|
| T004 | 创建新的队列服务 (queueService.ts) | pending | T003 |
| T005 | 实现任务入队方法 | pending | T004 |
| T006 | 实现任务获取方法（带乐观锁） | pending | T004 |
| T007 | 实现任务状态更新方法 | pending | T004 |
| T008 | 实现队列配置管理方法 | pending | T004 |

### Phase 3: 消费者实现

| 编号 | 任务 | 状态 | 依赖 |
|------|------|------|------|
| T009 | 创建消费者管理器 (consumerManager.ts) | pending | T004 |
| T010 | 实现消费者注册方法 | pending | T009 |
| T011 | 实现多消费者并行处理 | pending | T010 |
| T012 | 实现消费者轮询逻辑 | pending | T010 |

### Phase 4: 集成与迁移

| 编号 | 任务 | 状态 | 依赖 |
|------|------|------|------|
| T013 | 修改 instances/queue.ts 使用新服务 | pending | T004, T009 |
| T014 | 修改 queueHandlers.ts 注册多消费者 | pending | T013 |
| T015 | 测试队列隔离性 | pending | T014 |
| T016 | 测试多消费者并行处理 | pending | T014 |

### Phase 5: API 接口

| 编号 | 任务 | 状态 | 依赖 |
|------|------|------|------|
| T017 | 创建队列管理 API 路由 | pending | T004 |
| T018 | 实现队列状态查询接口 | pending | T017 |
| T019 | 实现队列配置管理接口 | pending | T017 |
| T020 | 实现任务状态查询接口 | pending | T017 |

---

## 任务详细说明

### T001: 添加 task_queue 表到 schema.ts

**描述**: 在 `backend/src/db/schema.ts` 中添加 `taskQueue` 表定义

**输出**: 更新后的 schema.ts

### T002: 添加 queue_config 表到 schema.ts

**描述**: 在 `backend/src/db/schema.ts` 中添加 `queueConfig` 表定义

**输出**: 更新后的 schema.ts

### T003: 运行数据库迁移

**描述**: 运行 drizzle-kit 迁移命令创建新表

**输出**: 数据库表创建成功

### T004: 创建新的队列服务

**描述**: 创建 `backend/src/services/queueService.ts`

**功能**:
- 任务入队
- 任务获取（乐观锁）
- 任务状态更新
- 队列配置管理

### T005: 实现任务入队方法

**描述**: 实现 `enqueue()` 方法

**功能**:
- 接受消息类型和 payload
- 生成 UUID
- 插入 task_queue 表

### T006: 实现任务获取方法

**描述**: 实现 `dequeue()` 方法

**功能**:
- 按类型查询待处理任务
- 使用乐观锁更新状态
- 返回任务详情

### T007: 实现任务状态更新方法

**描述**: 实现状态更新方法

**功能**:
- markAsRunning()
- markAsDone()
- markAsFailed()

### T008: 实现队列配置管理方法

**描述**: 实现配置管理方法

**功能**:
- getQueueConfig()
- updateQueueConfig()
- createQueueConfig()

### T009: 创建消费者管理器

**描述**: 创建 `backend/src/services/consumerManager.ts`

**功能**:
- 消费者注册
- 消费者启动/停止
- 负载均衡

### T010: 实现消费者注册方法

**描述**: 实现 `registerConsumer()` 方法

**功能**:
- 注册消息处理器
- 配置消费者数量

### T011: 实现多消费者并行处理

**描述**: 实现并行消费逻辑

**功能**:
- 同一队列多个消费者
- 任务均匀分配

### T012: 实现消费者轮询逻辑

**描述**: 实现轮询调度

**功能**:
- 定时轮询队列
- 获取并处理任务

### T013: 修改 instances/queue.ts

**描述**: 修改现有队列实例使用新服务

**输出**: 更新后的 instances/queue.ts

### T014: 修改 queueHandlers.ts

**描述**: 更新消费者注册使用多消费者模式

**输出**: 更新后的 queueHandlers.ts

### T015: 测试队列隔离性

**描述**: 验证不同队列独立处理

### T016: 测试多消费者并行处理

**描述**: 验证同一队列多消费者并行

### T017: 创建队列管理 API 路由

**描述**: 创建 `backend/src/routes/queueRoutes.ts`

### T018: 实现队列状态查询接口

**描述**: `GET /api/queue/status`

### T019: 实现队列配置管理接口

**描述**: 
- `GET /api/queue/config`
- `PUT /api/queue/config/:name`

### T020: 实现任务状态查询接口

**描述**: `GET /api/queue/tasks`
