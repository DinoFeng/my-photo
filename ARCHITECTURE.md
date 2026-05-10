# NAS 照片管理应用 - 架构文档

## 1. 架构概览

### 1.1 产品定位

本应用是一个运行在 NAS Docker 容器上的照片管理系统，核心设计理念：

| 特性 | 说明 |
|------|------|
| **多源目录支持** | 支持配置多个照片源目录，只读索引，不移动原文件 |
| **导入目录** | 监控导入目录，按规则自动整理照片到源目录 |
| **Docker 部署** | 轻量级容器化部署，支持 x86-64 和 ARM64 架构 |
| **Web 界面** | 通过浏览器访问，无需安装客户端 |

### 1.2 架构风格

- **分层架构**: 前端 → API 层 → 业务逻辑层 → 数据层
- **事件驱动**: 文件监控和异步任务处理
- **微服务思想**: 模块化设计，便于扩展

### 1.3 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                       用户层                                    │
│  ┌─────────────────┐  ┌─────────────────┐                       │
│  │   Web Browser   │  │   Mobile App    │                       │
│  └────────┬────────┘  └────────┬────────┘                       │
└───────────┼─────────────────────┼───────────────────────────────┘
            │                     │
            ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                       前端层 (Vue 3)                            │
│  ┌─────────────────┐  ┌─────────────────┐                       │
│  │   Photo Gallery │  │   Settings      │                       │
│  │   (浏览搜索)    │  │   (配置管理)    │                       │
│  └────────┬────────┘  └────────┬────────┘                       │
└───────────┼─────────────────────┼───────────────────────────────┘
            │                     │
            ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                       API 层 (Express)                          │
│  ┌─────────────────┐  ┌─────────────────┐                       │
│  │   /api/photos   │  │   /api/settings │                       │
│  │   /api/search   │  │   /api/import   │                       │
│  └────────┬────────┘  └────────┬────────┘                       │
└───────────┼─────────────────────┼───────────────────────────────┘
            │                     │
            ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    业务逻辑层                                    │
│  ┌─────────────────┐  ┌─────────────────┐                       │
│  │  PhotoService   │  │  ScanService    │                       │
│  │  (照片管理)     │  │  (目录扫描)     │                       │
│  ├─────────────────┤  ├─────────────────┤                       │
│  │  ImportService  │  │  WatchService   │                       │
│  │  (导入整理)     │  │  (文件监控)     │                       │
│  └────────┬────────┘  └────────┬────────┘                       │
└───────────┼─────────────────────┼───────────────────────────────┘
            │                     │
            ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    数据层 (SQLite)                              │
│  ┌─────────────────┐  ┌─────────────────┐                       │
│  │   Photo         │  │   SourceDir     │                       │
│  │   (照片索引)    │  │   (源目录)      │                       │
│  ├─────────────────┤  ├─────────────────┤                       │
│  │   Setting       │  │   ImportTask    │                       │
│  │   (系统设置)    │  │   (导入任务)    │                       │
│  └─────────────────┘  └─────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
```

## 2. 技术选型

### 2.1 前端技术栈

| 分类 | 技术 | 版本 | 选型理由 |
|------|------|------|----------|
| 框架 | Vue 3 | 3.4+ | 轻量级，响应式设计，适合 NAS 环境 |
| UI组件 | Naive UI | 2.38+ | 体积小，性能好，TypeScript 支持完善 |
| 构建工具 | Vite | 5+ | 快速构建，冷启动快 |
| 图标 | Lucide Icons | 1.6+ | 轻量级图标库 |

### 2.2 后端技术栈

| 分类 | 技术 | 版本 | 选型理由 |
|------|------|------|----------|
| 框架 | Express | 4.18+ | 轻量级，成熟稳定，资源占用低 |
| ORM | Prisma | 5+ | 类型安全，性能优于 TypeORM |
| 数据库 | SQLite | 3.45+ | 嵌入式，无需独立服务，适合容器 |
| 文件监控 | chokidar | 3.6+ | 跨平台文件系统监控 |
| EXIF解析 | exifreader | 4+ | 轻量级元数据解析 |

### 2.3 部署技术栈

| 分类 | 技术 | 版本 | 选型理由 |
|------|------|------|----------|
| 容器 | Docker | 24+ | 跨平台部署，资源隔离 |
| 构建 | Docker Compose | 2.23+ | 简化多容器编排 |

## 3. 目录结构

```
my-photo/
├── frontend/                    # 前端应用
│   ├── src/
│   │   ├── components/          # UI 组件
│   │   │   ├── PhotoGrid.vue    # 照片网格展示
│   │   │   ├── PhotoDetail.vue  # 照片详情
│   │   │   └── SettingsPanel.vue # 设置面板
│   │   ├── pages/               # 页面视图
│   │   │   ├── Home.vue         # 首页/照片浏览
│   │   │   ├── Search.vue       # 搜索页面
│   │   │   └── Settings.vue     # 设置页面
│   │   ├── stores/              # 状态管理
│   │   │   ├── photos.ts        # 照片状态
│   │   │   └── settings.ts      # 设置状态
│   │   ├── api/                 # API 客户端
│   │   │   └── index.ts         # API 封装
│   │   ├── App.vue              # 根组件
│   │   └── main.ts              # 入口文件
│   ├── public/                  # 静态资源
│   ├── index.html               # HTML 模板
│   ├── vite.config.ts           # Vite 配置
│   └── package.json             # 前端依赖
├── backend/                     # 后端服务
│   ├── src/
│   │   ├── controllers/         # 控制器
│   │   │   ├── photo.ts         # 照片 API
│   │   │   ├── settings.ts      # 设置 API
│   │   │   └── import.ts        # 导入 API
│   │   ├── services/            # 业务服务
│   │   │   ├── PhotoService.ts  # 照片管理
│   │   │   ├── ScanService.ts   # 目录扫描
│   │   │   ├── ImportService.ts # 导入整理
│   │   │   └── WatchService.ts  # 文件监控
│   │   ├── models/              # 数据模型
│   │   │   └── index.ts         # Prisma 模型
│   │   ├── middleware/          # 中间件
│   │   ├── routes/              # 路由定义
│   │   ├── app.ts               # Express 应用
│   │   └── server.ts            # 服务器入口
│   ├── prisma/                  # Prisma 配置
│   │   └── schema.prisma        # 数据库schema
│   └── package.json             # 后端依赖
├── docker/                      # Docker 配置
│   ├── Dockerfile               # 主镜像配置
│   └── docker-compose.yml       # Compose 编排
├── .env.example                 # 环境变量示例
└── README.md                    # 项目说明
```

## 4. 核心数据模型

### 4.1 数据库 Schema (Prisma)

```prisma
model SourceDirectory {
  id          String    @id @default(cuid())
  path        String    @unique
  name        String
  description String?
  status      String    @default("active") // active, disabled, missing
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  photos      Photo[]
}

model Photo {
  id             String         @id @default(cuid())
  filename       String
  path           String         @unique
  size           Int            // 文件大小(字节)
  mimeType       String
  width          Int?           // 宽度(像素)
  height         Int?           // 高度(像素)
  exifData       Json?          // EXIF 元数据
  thumbnailPath  String?        // 缩略图路径
  status         String         @default("active") // active, missing, removed
  sourceDirId    String
  sourceDir      SourceDirectory @relation(fields: [sourceDirId], references: [id])
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
}

model Setting {
  id              String   @id @default("default")
  importPath      String?  // 导入目录路径
  organizePattern String   @default("{year}/{month}/{day}")
  duplicatePolicy String   @default("skip") // skip, rename, overwrite
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model ImportTask {
  id         String   @id @default(cuid())
  status     String   @default("pending") // pending, running, completed, failed
  sourcePath String
  targetPath String
  error      String?
  createdAt  DateTime @default(now())
  completedAt DateTime?
}
```

### 4.2 核心实体关系

```
SourceDirectory 1 ── * Photo
  │                      │
  └── path               └── path (完整文件路径)
      └── status          └── status (active/missing)
```

## 5. API 设计

### 5.1 照片管理 API

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/photos` | GET | 获取照片列表（支持分页、筛选、搜索） |
| `/api/photos/:id` | GET | 获取单张照片详情 |
| `/api/photos/:id` | DELETE | 删除照片索引（不删除原文件） |
| `/api/photos/search` | GET | 搜索照片 |

#### GET /api/photos 查询参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `page` | number | 页码（默认 1） |
| `limit` | number | 每页数量（默认 20） |
| `sourceDirId` | string | 按源目录筛选 |
| `startDate` | string | 开始日期（ISO格式） |
| `endDate` | string | 结束日期（ISO格式） |

### 5.2 源目录 API

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/source-dirs` | GET | 获取所有源目录 |
| `/api/source-dirs` | POST | 添加新源目录 |
| `/api/source-dirs/:id` | GET | 获取目录详情 |
| `/api/source-dirs/:id` | PUT | 更新目录信息 |
| `/api/source-dirs/:id` | DELETE | 删除源目录（不删除原文件） |
| `/api/source-dirs/:id/scan` | POST | 扫描指定目录 |

### 5.3 设置 API

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/settings` | GET | 获取当前设置 |
| `/api/settings` | PUT | 更新设置 |

### 5.4 导入 API

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/import` | GET | 获取导入任务列表 |
| `/api/import` | POST | 触发导入任务 |
| `/api/import/:id` | GET | 获取导入任务详情 |
| `/api/import/scan` | POST | 手动扫描导入目录 |

## 6. 核心业务流程

### 6.1 照片索引流程

```
用户添加源目录 → ScanService 扫描目录 → 读取文件元数据 → 创建 Photo 记录 → 生成缩略图
                                                      ↓
                                            标记文件状态为 active
```

### 6.2 导入整理流程

```
WatchService 检测新文件 → ImportService 获取组织规则 → 计算目标路径 → 复制/移动文件 → 更新索引
                                                               ↓
                                                      创建 ImportTask 记录
```

### 6.3 文件变更检测流程

```
系统启动 → 扫描所有源目录 → 对比数据库记录 → 更新缺失文件状态 → 发现新文件 → 添加索引
```

## 7. Docker 部署

### 7.1 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PHOTO_SOURCE_PATH` | 默认照片源目录 | `/photos` |
| `IMPORT_PATH` | 默认导入目录 | `/import` |
| `DATABASE_PATH` | 数据库存储路径 | `/data/db` |
| `PORT` | 服务端口 | `3000` |

### 7.2 docker-compose.yml

```yaml
services:
  my-photo:
    image: my-photo:latest
    ports:
      - "3000:3000"
    volumes:
      - /path/to/photos:/photos
      - /path/to/import:/import
      - /path/to/data:/data
    environment:
      - PHOTO_SOURCE_PATH=/photos
      - IMPORT_PATH=/import
      - DATABASE_PATH=/data/db
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
```

## 8. 安全考虑

### 8.1 文件路径安全

- 禁止路径遍历攻击（`../` 检测）
- 限制可访问的目录范围
- 验证目录存在和权限

### 8.2 API 安全

- 输入验证和参数校验
- 错误处理不泄露敏感信息
- CORS 配置限制访问来源

### 8.3 数据安全

- 数据库文件权限控制
- 敏感配置使用环境变量
- 定期备份机制

## 9. 性能优化

### 9.1 索引优化

- 数据库索引：`Photo.path`, `Photo.sourceDirId`, `Photo.createdAt`
- 增量扫描：记录扫描时间戳，只处理新增/变更文件

### 9.2 缓存策略

- 缩略图缓存（文件系统缓存）
- 查询结果缓存（内存缓存）
- 静态资源缓存（HTTP 缓存头）

### 9.3 异步处理

- 文件扫描异步执行
- 缩略图生成后台任务
- 导入任务队列化处理

### 9.4 消息队列服务设计

#### 架构设计

采用生产者-消费者解耦模式，实现完全解耦的消息队列服务：

```
┌─────────────────────────────────────────────────────────────────┐
│                      队列服务架构                              │
├─────────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              queueService.ts (基础设施层)                │   │
│  │  - 通用队列操作接口                                      │   │
│  │  - 无业务依赖                                           │   │
│  │  - 延迟初始化                                           │   │
│  └─────────────────┬───────────────────────────────────────┘   │
│                    │                                           │
│                    │ bindConsumer (依赖注入)                    │
│                    ▼                                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │             queueConsumers.ts (消费者注册层)             │   │
│  │  - 扫描任务消费者 → scanService                          │   │
│  │  - 导入任务消费者 → importService                        │   │
│  │  - 导出任务消费者 → exportMedia                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   业务服务层                              │   │
│  │  scanService | importService | exportService            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────────┘
```

#### 核心组件

| 组件 | 文件 | 职责 |
|------|------|------|
| MessageQueue | queueService.ts | 通用队列管理器，提供 publish/bindConsumer 接口 |
| queueService | queueService.ts | 对外暴露的队列服务接口 |
| queueConsumers | queueConsumers.ts | 消费者注册中心，绑定业务逻辑 |

#### 设计原则

1. **依赖注入解耦**：基础设施服务不依赖业务逻辑
2. **生产者-消费者分离**：发布者与处理者完全解耦
3. **单一职责**：每个模块只负责一个功能
4. **延迟初始化**：队列管理器按需加载

#### 使用方式

```typescript
// 生产者（控制器/服务层）
await queueService.enqueue('scan', { sourceDirectoryId: 'xxx' })

// 消费者注册（queueConsumers.ts）
messageQueue.bindConsumer('scan', async (payload) => {
  await startScan(payload.sourceDirectoryId)
})
```

## 10. 扩展规划

### 10.1 功能扩展

- [ ] 面部识别
- [ ] 标签管理
- [ ] 地理标记
- [ ] 批量导出
- [ ] 照片分享

### 10.2 技术扩展

- [ ] Redis 缓存支持
- [ ] PostgreSQL 支持
- [ ] 多节点部署
- [ ] WebSocket 实时更新