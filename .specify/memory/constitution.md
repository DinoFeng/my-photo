# NAS 照片管理应用 - 开发宪章

## Core Principles

### I. 依赖注入解耦原则

**定义**：核心基础设施服务（如队列、数据库连接等）不应直接依赖业务逻辑模块。

**实施规则**：
- 通用服务组件必须保持无业务依赖
- 业务逻辑通过依赖注入模式注册到基础设施服务
- 使用独立的注册模块（如 `listeners/queueHandlers.ts`）集中管理业务绑定
- 新增业务功能只需在注册模块中添加，不修改核心服务

**优势**：
- 提高代码可测试性和可复用性
- 便于独立演进和替换基础设施
- 降低模块间耦合度，提升代码维护性

### II. 生产者-消费者分离原则

**定义**：消息发布者（生产者）与消息处理者（消费者）必须完全解耦。

**实施规则**：
- 生产者只知道队列名称，不关心处理逻辑
- 消费者独立注册，不影响生产者代码
- 使用统一的消息队列服务作为中间层
- 支持动态注册和卸载消费者

**优势**：
- 支持异步处理和任务队列化
- 便于扩展和并行处理
- 提高系统稳定性和可扩展性

### III. 单一职责原则

**定义**：每个模块/类只负责一个明确的功能。

**实施规则**：
- `utils/queue.ts`：仅提供通用队列操作接口
- `listeners/queueHandlers.ts`：仅负责注册队列处理器
- 业务服务（如 `services/scanService.ts`）：仅实现具体业务逻辑

**优势**：
- 代码结构清晰，易于理解
- 便于定位和修复问题
- 提高代码复用率

### IV. 延迟初始化原则

**定义**：资源密集型组件仅在首次使用时初始化。

**实施规则**：
- 队列管理器采用延迟加载模式
- 通过动态导入减少启动时间
- 避免不必要的资源占用

**优势**：
- 优化应用启动性能
- 减少内存占用
- 支持按需加载

### V. 模块化设计原则

**定义**：系统应划分为独立、可替换的模块。

**实施规则**：
- 按功能边界划分模块（照片管理、扫描服务、导入服务等）
- 模块间通过明确的接口交互
- 避免循环依赖

**优势**：
- 便于并行开发和维护
- 支持独立测试和部署
- 提高代码可扩展性

### VI. 层级职责分离原则

**定义**：后端应用应按照职责清晰划分层次，每层只负责特定类型的工作。

**实施规则**：

| 层级 | 目录 | 职责 | 禁止行为 |
|------|------|------|----------|
| **基础设施层** | `utils/` | 技术工具、通用服务（队列、事件总线、SSE） | ❌ 业务逻辑 |
| **中间件层** | `middleware/` | HTTP中间件（认证、日志、错误处理） | ❌ 业务逻辑、数据库操作 |
| **注册层** | `listeners/` | 事件/消息处理器注册 | ❌ 业务逻辑实现 |
| **业务服务层** | `services/` | 业务逻辑、数据操作 | ❌ 访问req/res对象 |
| **API控制层** | `controllers/` | 请求/响应处理 | ❌ 直接操作数据库 |
| **路由层** | `routes/` | 路由注册、中间件配置 | ❌ 业务逻辑 |

**数据流向**：

**请求处理流**：
```
HTTP请求 → Route → Controller → Service → Database
                      ↓
            Controller → Utils/SSEService (建立连接)
```

**事件广播流**：
```
Service → Utils/eventBus (发布事件)
              ↓
    Listeners层 (订阅事件)
              ↓
    Utils/SSEService (触发广播)
```

**优势**：
- 职责清晰，易于理解和维护
- 便于单元测试（Service层可独立测试）
- 提高代码复用率
- 降低模块间耦合度

## 目录结构

```
src/
├── utils/                    # 基础设施层
│   ├── sse.ts               # SSE基础设施
│   ├── eventBus.ts           # 事件总线
│   ├── queue.ts             # 队列服务
│   └── fileUtils.ts         # 文件工具函数
├── middleware/               # 中间件层
│   ├── authMiddleware.ts    # 认证中间件
│   ├── loggerMiddleware.ts  # 日志中间件
│   └── errorHandlerMiddleware.ts # 错误处理中间件
├── listeners/                # 注册层
│   ├── queueHandlers.ts     # 队列消息处理器
│   └── eventHandlers.ts     # 事件总线处理器
├── services/                # 业务服务层
│   ├── scanService.ts       # 扫描业务
│   ├── mediaService.ts      # 媒体业务
│   └── ...
├── controllers/              # API控制层
│   └── ...
└── routes/                  # 路由层
    └── ...
```

## 命名规范

### 文件命名规则

| 层级 | 目录 | 命名模式 | 示例文件 |
|------|------|----------|----------|
| **基础设施层** | `utils/` | `<功能>.ts` 或 `<功能>Utils.ts` | `fileUtils.ts`, `queue.ts`, `sse.ts`, `eventBus.ts` |
| **中间件层** | `middleware/` | `<功能>Middleware.ts` | `authMiddleware.ts`, `loggerMiddleware.ts`, `errorHandlerMiddleware.ts` |
| **注册层** | `listeners/` | `<事件类型>Handlers.ts` | `eventHandlers.ts`, `queueHandlers.ts` |
| **业务服务层** | `services/` | `<业务领域>Service.ts` | `scanService.ts`, `mediaService.ts`, `settingService.ts` |
| **API控制层** | `controllers/` | `<业务领域>Controller.ts` | `scanController.ts`, `mediaController.ts`, `settingController.ts` |
| **路由层** | `routes/` | `<业务领域>Routes.ts` | `scanRoutes.ts`, `mediaRoutes.ts`, `settingRoutes.ts` |

### 命名约定

1. **使用小写字母和连字符**：文件名全部小写，单词之间用连字符分隔（如 `source-directory-service.ts`）
2. **避免缩写**：使用完整单词，提高可读性（如 `setting` 而非 `set`）
3. **后缀标识**：
   - `Service`：表示业务服务类（仅 `services/` 目录使用）
   - `Controller`：表示API控制器
   - `Routes`：表示路由注册
   - `Utils`：表示工具函数集合（`utils/` 目录可选）
   - `Handlers`：表示事件/消息处理器（`listeners/` 目录）

### 目录选择决策树

```
文件应该放在哪里？
    ↓
是否是通用技术工具/基础设施？
    ├─ 是 → utils/ (如：sse.ts, eventBus.ts, queue.ts)
    └─ 否 → 是否是事件/队列注册绑定？
       │       ├─ 是 → listeners/ (如：eventHandlers.ts, queueHandlers.ts)
              └─ 否 → 是否处理HTTP请求/响应？
                        ├─ 是 → 是否只负责路由注册？
                        │       ├─ 是 → routes/ (如：mediaRoutes.ts)
                        │       └─ 否 → controllers/ (如：mediaController.ts)
                        └─ 否 → services/ (如：mediaService.ts)
```

## 架构约束

### 依赖方向

- 基础设施层 → 注册层 → 业务服务层：不允许直接依赖
- 业务服务层 → 基础设施层：通过依赖注入方式
- 模块间依赖必须单向流动
- 层次间依赖：Route → Controller → Service → (Utils | Listeners)

### 模块划分标准

| 模块类型 | 目录 | 职责 | 示例文件 |
|---------|------|------|----------|
| 基础设施层 | `utils/` | 提供通用服务 | `utils/queue.ts`, `utils/sse.ts` |
| 中间件层 | `middleware/` | HTTP中间件处理 | `middleware/authMiddleware.ts`, `middleware/loggerMiddleware.ts` |
| 注册层 | `listeners/` | 事件/消息处理器注册 | `listeners/queueHandlers.ts` |
| 业务服务层 | `services/` | 实现业务逻辑 | `services/scanService.ts` |
| API控制层 | `controllers/` | 处理HTTP请求 | `controllers/` |
| 路由层 | `routes/` | 注册端点与中间件 | `routes/` |

## 开发工作流程

1. **需求分析**：明确功能需求和边界
2. **模块设计**：确定模块划分和接口定义
3. **注册绑定**：在 `listeners/` 中注册事件/消息处理器（如适用）
4. **业务实现**：在对应的业务服务中实现处理逻辑
5. **Controller实现**：处理请求/响应，调用Service层
6. **Route注册**：绑定HTTP端点到Controller方法
7. **测试验证**：独立测试各模块功能

## SSE与事件处理规范

### 职责划分
- **Controller层**：负责建立SSE连接、发送初始数据、管理连接生命周期
- **Service层**：负责发布领域事件（不直接依赖SSE）
- **Listeners层**：负责订阅事件并触发SSE广播
- **Utils层**：提供SSE基础设施和事件总线

### 实现模式
```typescript
// Service层 - 发布领域事件
eventBus.emit('scanProgressUpdated', { sourceDirectoryId, checkpoint })

// Listeners层 - 订阅并广播
eventBus.on('scanProgressUpdated', ({ sourceDirectoryId, checkpoint }) => {
  scanProgressService.broadcastToFiltered(...)
})
```

## Governance

- 所有代码变更必须符合本宪章规定的原则
- 架构变更需经过团队评审
- 新增模块必须遵循单一职责和依赖注入原则
- 违反原则的代码提交将被拒绝

**Version**: 3.0.0 | **Ratified**: 2026-05-10 | **Last Amended**: 2026-05-13