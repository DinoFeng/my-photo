# NAS 照片管理应用 - 架构文档

> 最后更新：2026-06-21

## 1. 架构概览

### 1.1 产品定位

本应用是一个运行在 NAS Docker 容器上的照片管理系统，核心设计理念：

| 特性 | 说明 |
|------|------|
| **多源目录支持** | 支持配置多个照片源目录，只读索引，不移动原文件 |
| **导入目录** | 监控导入目录，按规则自动整理照片到源目录 |
| **Docker 部署** | 单镜像一键部署，支持 x86-64 和 ARM64 架构 |
| **Web 界面** | 通过浏览器访问，无需安装客户端 |

### 1.2 架构风格

- **多进程隔离**：API Server 与 Processing Worker 分离，互不阻塞
- **事件驱动**：文件监控、队列消费、SSE 实时推送
- **流水线处理**：扫描 → EXIF → 缩略图 → 人脸识别，逐级流转
- **单镜像部署**：PM2 管理多进程，单 Docker 镜像一键运行

### 1.3 整体架构图

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Docker 容器 (my-photo)                        │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                      PM2 进程管理器                              │  │
│  │                                                                  │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │  │
│  │  │  Nginx :80   │  │ API Server   │  │  Processing  │          │  │
│  │  │  前端 + 反代 │  │ (Express)    │  │  Worker      │          │  │
│  │  │              │  │  :3000       │  │  (Node.js)   │          │  │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │  │
│  │         │                 │                  │                   │  │
│  │         │    ┌────────────┼──────────────────┼──────┐           │  │
│  │         │    │            │   HTTP 回调       │      │           │  │
│  │         │    │  ┌─────────▼─────────┐        │      │           │  │
│  │         │    │  │  REST API + SSE   │◄───────┘      │           │  │
│  │         │    │  └───────────────────┘               │           │  │
│  │         │    │                                      │           │  │
│  │         │    │  ┌───────────────────────────────────┼──────┐   │  │
│  │         │    │  │        队列系统                    │      │   │  │
│  │         │    │  │  scan-folder → read-file          │      │   │  │
│  │         │    │  │                    ├→ thumbnail   │      │   │  │
│  │         │    │  │                    └→ face-detect─┼──┐   │   │  │
│  │         │    │  └───────────────────────────────────┘  │   │   │  │
│  │         │    │                                          │   │   │  │
│  │         │    │            ┌─────────────────────────────┘   │   │  │
│  │         │    │            ▼                                  │   │  │
│  │         │    │  ┌──────────────────┐                        │   │  │
│  │         │    │  │ AI Worker (可选) │  Python / Flask         │   │  │
│  │         │    │  │ :5001            │  face_recognition       │   │  │
│  │         │    │  └──────────────────┘                        │   │  │
│  │         │    └──────────────────────────────────────────────┘   │  │
│  └─────────┼──────────────────────────────────────────────────────┘  │
│            │                                                          │
│  ┌─────────┴───────────────────────────────────────────────────────┐ │
│  │                         数据层                                   │ │
│  │                                                                   │ │
│  │  ┌────────────────────┐  ┌──────────────────────────────────┐   │ │
│  │  │ db.sqlite (WAL)    │  │ 队列持久化 (独立 SQLite 文件)      │   │ │
│  │  │ ├─ media           │  │ ├─ scan-folder.db                 │   │ │
│  │  │ ├─ scan_checkpoint │  │ ├─ read-file.db                   │   │ │
│  │  │ └─ setting         │  │ └─ face-detect.db (新增)          │   │ │
│  │  └────────────────────┘  └──────────────────────────────────┘   │ │
│  │                                                                   │ │
│  │  ┌────────────────────────────────────────────────────────────┐  │ │
│  │  │ 文件系统: /app/media/  /app/thumbnails/  /app/data/        │  │ │
│  │  └────────────────────────────────────────────────────────────┘  │ │
│  └──────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
                                       │
                                       │ HTTP :80
                                       ▼
                          ┌─────────────────────────┐
                          │       用户浏览器          │
                          │  Vue 3 + Naive UI        │
                          │  REST API + SSE          │
                          └─────────────────────────┘
```

---

## 2. 技术选型

### 2.1 前端技术栈

| 分类 | 技术 | 版本 | 选型理由 |
|------|------|------|----------|
| 框架 | Vue 3 | 3.4+ | 轻量级，响应式设计，Composition API |
| UI 组件 | Naive UI | 2.38+ | 体积小，性能好，TypeScript 支持完善 |
| 状态管理 | Pinia | 2.1+ | Vue 3 官方推荐 |
| 路由 | Vue Router | 4.3+ | 标准 SPA 路由 |
| 国际化 | Vue I18n | 9+ | 多语言支持 |
| 构建工具 | Vite | 5+ | 快速构建，冷启动快 |
| 图标 | Lucide Icons | 1.6+ | 轻量级图标库 |

### 2.2 后端技术栈

| 分类 | 技术 | 版本 | 选型理由 |
|------|------|------|----------|
| 框架 | Express | 4.18+ | 轻量级，成熟稳定 |
| ORM | Drizzle ORM | 0.45+ | 类型安全，SQL-like API，轻量 |
| 数据库 | SQLite + libsql | - | 嵌入式，WAL 模式，无需独立服务 |
| 进程管理 | PM2 | 5+ | 多进程管理，自动重启，日志聚合 |
| 文件监控 | chokidar | 3.6+ | 跨平台文件系统监控 |
| EXIF 解析 | exifreader | 4+ | 轻量级元数据解析 |
| 图片处理 | sharp | 0.33+ | 基于 libvips，高性能缩略图 |
| 任务队列 | queue-manager-pro | 1.0+ | SQLite 持久化，零外部依赖 |
| 日志 | pino | 10+ | 高性能结构化日志 |

### 2.3 AI 服务（可选）

| 分类 | 技术 | 选型理由 |
|------|------|----------|
| 框架 | Flask / FastAPI | 轻量级 Python Web 框架 |
| 人脸识别 | face_recognition | 基于 dlib，准确度高 |

---

## 3. 进程架构

### 3.1 进程职责分离

```
┌─────────────────────────────────────────────────────────────────┐
│  PM2 管理的 4 个进程（3 个必选 + 1 个可选）                        │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Nginx :80                                                   │ │
│  │  - 前端静态文件服务                                           │ │
│  │  - 反向代理 /api/* → API Server :3000                        │ │
│  │  - 反向代理 /sse/* → API Server :3000                        │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  API Server (Express) :3000                                  │ │
│  │  - REST API：/api/media, /api/export, /api/health, /api/queue│ │
│  │  - SSE 推送：/sse/monitor, /sse/media                        │ │
│  │  - 内部端点：/api/internal/notify（接收 Worker 回调）         │ │
│  │  - 轻量 DB 查询（只读）                                       │ │
│  │  - 认证中间件                                                 │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Processing Worker (Node.js)                                  │ │
│  │  - chokidar 文件监听                                          │ │
│  │  - 队列系统：scan-folder, read-file, thumbnail, face-detect  │ │
│  │  - 目录扫描 + 增量检测                                        │ │
│  │  - EXIF 解析 + 文件哈希                                       │ │
│  │  - 缩略图生成 (sharp)                                         │ │
│  │  - 人脸识别任务分发（HTTP → Python）                           │ │
│  │  - DB 写入（media 表）                                        │ │
│  │  - 任务完成回调 API Server（SSE 通知）                         │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  AI Worker (Python) :5001  [可选]                             │ │
│  │  - POST /api/detect → 人脸检测                                │ │
│  │  - GET /health → 健康检查                                     │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 为什么分进程

| 维度 | 单进程 | 多进程（当前设计） |
|------|--------|-------------------|
| Event Loop | 队列处理抢占 API 的 CPU 时间片 | 各自独立，互不干扰 |
| libuv 线程池 | 共享 4 线程，read-file × 9 直接饥饿 | 各 4 线程，API I/O 不受影响 |
| GC 暂停 | 队列处理大量 Buffer 导致 GC，API 响应卡顿 | 各自独立堆空间 |
| 内存 | 共享堆，大文件读取导致内存压力 | 各自独立，Worker 可设更高上限 |
| 崩溃隔离 | 队列处理损坏文件 → 整个 API 挂掉 | Worker 崩溃不影响 API 服务 |

---

## 4. 队列流水线设计

### 4.1 队列拓扑

```
文件变更（新增/修改/启动扫描）
    │
    ▼
┌──────────────────────────────────────────────────────────────┐
│  [scan-folder] 队列                                           │
│  并发: 2  优先级: 🔴 高                                       │
│                                                               │
│  scanDirectory() → hasDirectoryChanged() → processDirectory() │
│  增量扫描：对比 mtime，跳过未变化目录                            │
│  输出：publishScanEntry() → 目录递归 / 文件分发                 │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  [read-file] 队列                                             │
│  并发: 4  优先级: 🔴 高                                       │
│                                                               │
│  processReadFile()                                            │
│  ├─ isMediaFile() → 过滤非媒体文件                             │
│  ├─ fs.stat() → 文件大小、修改时间                              │
│  ├─ calculateFileHash() → SHA256 (头尾 64KB + size)           │
│  ├─ 哈希相同 → 跳过（文件未变）                                  │
│  ├─ getFileMetadata() → ExifReader.load()                     │
│  │   ├─ 分辨率、相机型号、拍摄日期                               │
│  │   ├─ GPS 经纬度                                             │
│  │   └─ 全量 metadata 存 JSON                                  │
│  ├─ upsertMedia() → INSERT or UPDATE media 表                  │
│  └─ publishImportEntry() → 分发到下游队列                       │
└──────────────────────────┬───────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
┌──────────────────────────┐  ┌──────────────────────────────┐
│  [thumbnail] 队列         │  │  [face-detect] 队列           │
│  并发: 2  🟡 中优先级     │  │  并发: 1  🔵 低优先级         │
│                           │  │                               │
│  sharp() 本地处理          │  │  HTTP POST → Python AI Worker │
│  ├─ resize + webp 压缩    │  │  ├─ POST /api/detect          │
│  ├─ 写入 /app/thumbnails/ │  │  │  await 5-30s               │
│  ├─ UPDATE media          │  │  ├─ face_locations()          │
│  │   .thumbnailPath       │  │  ├─ face_encodings()          │
│  └─ HTTP POST /api/       │  │  └─ return { faces: [...] }   │
│     internal/notify       │  │                               │
│     → SSE 推送前端         │  │  INSERT face 表               │
│                           │  │  UPDATE media.faceScanned     │
│                           │  │  HTTP POST /api/internal/     │
│                           │  │  notify → SSE 推送前端         │
└──────────────────────────┘  └──────────────────────────────┘
```

### 4.2 队列优先级设计

| 队列 | 并发数 | 优先级 | 延迟 | 重试 | 超时 | 理由 |
|------|--------|--------|------|------|------|------|
| scan-folder | 2 | 高 | 100ms | 3 | 60s | 扫描是入口，需要快速发现文件 |
| read-file | 4 | 高 | 100ms | 3 | 120s | EXIF + 哈希，用户需要尽快看到照片 |
| thumbnail | 2 | 中 | 0 | 3 | 60s | 缩略图影响浏览体验，但不阻塞入库 |
| face-detect | 1 | 低 | 5000ms | 3 | 300s | 人脸识别最慢，低优先级，可过夜处理 |

### 4.3 队列持久化

所有队列使用 `queue-manager-pro` + `SqliteQueueRepository`，每个队列独立 SQLite 文件：

```
data/
├── db.sqlite          # 主数据库
├── scan-folder.db     # scan-folder 队列
├── read-file.db       # read-file 队列
└── face-detect.db     # face-detect 队列（新增）
```

任务表结构：
```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  handler TEXT NOT NULL,
  payload TEXT NOT NULL,        -- JSON
  status TEXT DEFAULT 'pending', -- pending → processing → completed/failed
  retryCount INTEGER DEFAULT 0,
  maxRetries INTEGER NOT NULL,
  maxProcessingTime INTEGER NOT NULL,
  priority INTEGER DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
)
```

---

## 5. 数据模型

### 5.1 Drizzle ORM Schema

```typescript
// media 表 - 照片/视频索引
export const media = sqliteTable('media', {
  id:            text('id').primaryKey(),
  sourcePath:    text('source_path').notNull(),
  filename:      text('filename').notNull(),
  filepath:      text('filepath').notNull(),
  fileSize:      integer('file_size').notNull(),
  fileType:      text('file_type').notNull(),      // image | video | other
  hash:          text('hash'),
  width:         integer('width'),
  height:        integer('height'),
  duration:      real('duration'),
  make:          text('make'),
  model:         text('model'),
  dateTaken:     text('date_taken'),
  latitude:      real('latitude'),
  longitude:     real('longitude'),
  metadata:      text('metadata'),                  // JSON
  thumbnailPath: text('thumbnail_path'),
  faceScanned:   integer('face_scanned').default(0), // 0=未扫描 1=已扫描
  faceCount:     integer('face_count').default(0),
  status:        text('status').default('active'),  // active | missing | removed
  createdAt:     text('created_at').notNull(),
  updatedAt:     text('updated_at').notNull(),
})

// scan_checkpoint 表 - 目录扫描状态
export const scanCheckpoint = sqliteTable('scan_checkpoint', {
  id:               text('id').primaryKey(),
  path:             text('path').unique().notNull(),
  isRoot:           integer('is_root', { mode: 'boolean' }).default(false),
  lastScannedMtime: integer('last_scanned_mtime'),
  lastScannedFile:  text('last_scanned_file'),
  status:           text('status').default('idle'), // idle | scanning | completed | error
  progress:         real('progress').default(0),
  totalFiles:       integer('total_files').default(0),
  scannedFiles:     integer('scanned_files').default(0),
  errorCount:       integer('error_count').default(0),
  startedAt:        text('started_at'),
  completedAt:      text('completed_at'),
  createdAt:        text('created_at').notNull(),
  updatedAt:        text('updated_at').notNull(),
})

// setting 表 - 系统设置
export const setting = sqliteTable('setting', {
  id:          text('id').primaryKey(),
  key:         text('key').unique().notNull(),
  value:       text('value').notNull(),
  description: text('description'),
  createdAt:   text('created_at').notNull(),
  updatedAt:   text('updated_at').notNull(),
})
```

### 5.2 人脸表（新增，规划中）

```sql
CREATE TABLE face (
  id         TEXT PRIMARY KEY,
  media_id   TEXT NOT NULL REFERENCES media(id),
  person_id  TEXT,              -- 聚类后的人物 ID
  embedding  BLOB,              -- 人脸特征向量 (128维 float32)
  bbox_x     REAL,              -- 人脸框左上角 x
  bbox_y     REAL,              -- 人脸框左上角 y
  bbox_w     REAL,              -- 人脸框宽度
  bbox_h     REAL,              -- 人脸框高度
  confidence REAL,              -- 置信度
  created_at TEXT NOT NULL
)
```

---

## 6. 通信协议

| 发送方 | 接收方 | 协议 | 用途 |
|--------|--------|------|------|
| 浏览器 | Nginx :80 | HTTP | 前端页面 + 静态资源 |
| 浏览器 | API Server :3000 | HTTP REST | 照片列表/详情/搜索/设置/导出 |
| 浏览器 | API Server :3000 | SSE | 实时监控：扫描进度/任务状态 |
| Processing Worker | API Server :3000 | HTTP POST | 任务完成 → 广播 SSE 到前端 |
| Processing Worker | AI Worker :5001 | HTTP POST | 发送图片路径，等待人脸结果 |
| AI Worker | API Server :3000 | HTTP POST | 人脸识别完成 → 广播 SSE |
| Processing Worker | SQLite | libsql (内嵌) | 队列读写 + media 表写入 |
| API Server | SQLite | libsql (内嵌) | media 表查询（只读） |

### 6.1 内部通知端点

API Server 暴露内部端点供 Worker 和 AI Worker 回调（仅 localhost 可访问）：

```typescript
// POST /api/internal/notify
// Body: { event: string, type: string, payload: any, error?: string }
// 响应: { ok: true }
// 用途: Worker 完成任务后通知 API Server 广播 SSE
```

### 6.2 AI Worker HTTP 接口

```
POST /api/detect
Body:   { "mediaId": "xxx", "filepath": "/media/photo.jpg" }
响应:   { "faces": [{ "bbox": [x,y,w,h], "embedding": [...], "confidence": 0.98 }] }

GET /health
响应:   { "status": "ok" }
```

---

## 7. 核心业务流程

### 7.1 系统启动流程

```
server.ts 启动
  │
  ├─ express 监听 :3000
  ├─ registerEventHandlers() → eventBus.on(DB_READY, ...)
  │
  └─ ensureDatabaseReady()
       ├─ PRAGMA journal_mode = WAL
       ├─ PRAGMA busy_timeout = 5000
       ├─ CREATE TABLE IF NOT EXISTS (media, scan_checkpoint, setting)
       ├─ CREATE INDEX (status, date_taken, filepath, ...)
       └─ eventBus.emit(DB_READY) ──────────────────────┐
                                                         │
  ┌──────────────────────────────────────────────────────┘
  ▼
  eventHandlers (DB_READY)
    │
    ├─ startDirectoryWatchers()
    │    └─ 遍历 /app/media 子目录 → createFileWatcher(chokidar)
    │         ├─ on('add')    → publishScanEntry()
    │         ├─ on('change') → publishScanEntry()
    │         ├─ on('unlink') → 标记 missing
    │         └─ on('addDir') → publishScanEntry()
    │
    ├─ registerQueueHandlers()
    │    ├─ folderFanout.register('scan-folder')
    │    └─ fileFanout.register('read-file')
    │
    ├─ startAllQueues()
    │    ├─ folderFanout.startAll()
    │    └─ fileFanout.startAll()
    │
    └─ scanDirectories()
         └─ scanKnownDirectories() → 逐页读取 checkpoint，对比 mtime
         └─ 补充扫描新发现的子目录
```

### 7.2 文件处理完整链路

```
文件变更（chokidar 检测 / 启动扫描）
  │
  ▼
[scan-folder] 发现目录中有文件
  │
  ├─ 是目录 → 递归加入 scan-folder 队列
  └─ 是文件 → 加入 read-file 队列
                  │
                  ▼
            [read-file] 处理文件
                  │
                  ├─ 非媒体文件 → 跳过
                  ├─ 哈希未变 → 跳过
                  └─ 新文件/已变更 → 入库
                         │
                         ├─ 是图片 → 加入 thumbnail 队列
                         └─ 是图片 → 加入 face-detect 队列
                                        │
                                        ▼
                                  [face-detect]
                                        │
                                  HTTP POST → Python AI Worker
                                        │
                                        ├─ 无人脸 → 标记 faceScanned=1
                                        └─ 有人脸 → 写入 face 表 + 标记
```

### 7.3 增量扫描机制

```
扫描目录时:
  1. fs.stat(dirPath) → 获取当前 mtime
  2. SELECT lastScannedMtime FROM scan_checkpoint WHERE path = dirPath
  3. 当前 mtime > 记录 mtime → 有变化，执行扫描
  4. 当前 mtime <= 记录 mtime → 无变化，跳过

处理文件时:
  1. SELECT hash FROM media WHERE filepath = payload.currentPath
  2. 计算当前文件哈希
  3. 哈希相同 → 跳过，文件未变
  4. 哈希不同 → 更新记录
```

---

## 8. 目录结构

```
my-photo/
├── frontend/                        # Vue 3 前端
│   └── src/
│       ├── components/              # UI 组件
│       │   ├── PhotoDetail.vue
│       │   ├── ExportDialog.vue
│       │   └── ImportTaskStatus.vue
│       ├── stores/                  # Pinia 状态管理
│       │   ├── mediaStore.ts
│       │   ├── exportStore.ts
│       │   ├── monitorStore.ts
│       │   └── settingsStore.ts
│       ├── utils/
│       │   ├── apiClient.ts         # API 封装
│       │   └── errorHandler.ts
│       ├── views/
│       │   ├── Gallery.vue
│       │   └── Settings.vue
│       ├── App.vue
│       ├── main.ts
│       └── routes.ts
│
├── backend/                         # API Server (当前，后续拆分)
│   └── src/
│       ├── controllers/             # 控制器
│       │   ├── mediaController.ts
│       │   └── exportController.ts
│       ├── db/                      # 数据库
│       │   ├── index.ts             # Drizzle + libsql 客户端
│       │   └── schema.ts            # 表定义
│       ├── instances/               # 单例实例
│       │   ├── eventBus.ts          # AppEventBus
│       │   ├── fanoutQueues.ts      # 队列定义
│       │   └── sse.ts               # SSE 服务
│       ├── listeners/               # 事件监听
│       │   ├── eventHandlers.ts     # 启动入口
│       │   ├── fileWatcher.ts       # chokidar
│       │   └── queueHandlers.ts     # 队列处理器
│       ├── middleware/              # 中间件
│       │   ├── authMiddleware.ts
│       │   ├── errorHandlerMiddleware.ts
│       │   └── loggerMiddleware.ts
│       ├── repositories/
│       │   └── SqliteQueueRepository.ts
│       ├── routes/
│       │   ├── api/                 # REST API 路由
│       │   │   ├── index.ts
│       │   │   ├── mediaRoutes.ts
│       │   │   ├── exportRoutes.ts
│       │   │   ├── healthRoutes.ts
│       │   │   └── queueRoutes.ts
│       │   └── sse/                 # SSE 路由
│       │       ├── index.ts
│       │       └── sseRoutes.ts
│       ├── services/                # 业务服务
│       │   ├── mediaService.ts      # 文件处理 + EXIF
│       │   ├── scanService.ts       # 目录扫描
│       │   ├── startupService.ts    # 启动 + 文件监听
│       │   └── dbInitService.ts     # 数据库初始化
│       ├── types/                   # 类型定义
│       │   ├── fanout.ts
│       │   └── media.ts
│       ├── utils/                   # 工具函数
│       │   ├── eventBus.ts          # 事件总线
│       │   ├── eventFanoutManager.ts
│       │   ├── fileUtils.ts         # 哈希 + EXIF + 文件类型
│       │   ├── logging.ts           # pino 日志
│       │   ├── sse.ts               # SSE 服务类
│       │   └── stepTracker.ts       # 步骤追踪
│       └── server.ts                # 入口
│
├── worker/                          # Processing Worker (规划中，从 backend 拆分)
│   └── src/
│       ├── instances/
│       │   └── fanoutQueues.ts      # 所有队列定义
│       ├── listeners/
│       │   ├── eventHandlers.ts
│       │   ├── fileWatcher.ts
│       │   └── queueHandlers.ts
│       ├── repositories/
│       │   └── SqliteQueueRepository.ts
│       ├── services/
│       │   ├── mediaService.ts
│       │   ├── scanService.ts
│       │   ├── startupService.ts
│       │   └── thumbnailService.ts  # 缩略图生成 (新增)
│       ├── types/
│       └── utils/
│           ├── eventFanoutManager.ts
│           ├── fileUtils.ts
│           └── stepTracker.ts
│
├── ai-worker/                       # AI Worker (规划中，可选)
│   ├── main.py                      # Flask 入口
│   ├── requirements.txt
│   └── services/
│       └── face_detector.py         # 人脸检测逻辑
│
├── docker/                          # Docker 配置
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── nginx.conf
│
├── ecosystem.config.js              # PM2 多进程配置 (新增)
└── ARCHITECTURE.md                  # 本文档
```

---

## 9. Docker 部署

### 9.1 单镜像架构

```
┌─────────────────────────────────────┐
│  Dockerfile (多阶段构建)             │
│                                      │
│  Stage 1: build-frontend            │
│    node:20-alpine → npm build       │
│                                      │
│  Stage 2: build-backend             │
│    node:20-alpine → npm build       │
│                                      │
│  Stage 3: build-worker              │
│    node:20-alpine → npm build       │
│                                      │
│  Stage 4: runtime                   │
│    node:20-alpine                   │
│    + nginx + PM2 + Python (可选)    │
│    + 复制所有构建产物                │
│    CMD: pm2-runtime ecosystem.config│
│                                      │
│  构建参数:                           │
│    INCLUDE_AI=false  (控制 Python)  │
└─────────────────────────────────────┘
```

### 9.2 PM2 配置

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    { name: 'api',    script: 'dist/server.js',  cwd: '/app/backend', max_memory_restart: '512M' },
    { name: 'worker', script: 'dist/worker.js',  cwd: '/app/worker',  max_memory_restart: '1G' },
    { name: 'ai',     script: 'main.py',         cwd: '/app/ai-worker', interpreter: 'python3', max_memory_restart: '1.5G' },
    { name: 'nginx',  script: 'nginx', args: ['-g','daemon off;'], interpreter: 'none' },
  ]
}
```

### 9.3 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | API 服务端口 | `3000` |
| `DATABASE_URL` | 数据库路径 | `file:/app/data/db.sqlite` |
| `MEDIA_PATH` | 照片源目录 | `/app/media` |
| `THUMBNAIL_PATH` | 缩略图缓存目录 | `/app/thumbnails` |
| `PYTHON_AI_URL` | AI Worker 地址 | `http://localhost:5001` |

### 9.4 资源预估

| 配置 | 基础版（无 AI） | AI 版 |
|------|:------------:|:----:|
| 镜像大小 | ~300MB | ~800MB |
| 内存（推荐） | 1GB | 2GB |
| CPU（推荐） | 2 核 | 4 核 |

---

## 10. 关键设计决策

| 决策点 | 选择 | 原因 |
|--------|------|------|
| 部署形态 | 单镜像 + PM2 多进程 | NAS 场景一键部署，运维简单 |
| 进程拆分 | API Server + Processing Worker | 按资源画像分离，API 不阻塞 |
| 队列引擎 | SQLite 持久化 (queue-manager-pro) | 零外部依赖，重启不丢任务 |
| Worker ↔ Python | HTTP 请求-响应 | 天然背压控制 + 自动重试 + 无状态 |
| SSE 通知 | HTTP POST 回调 /api/internal/notify | 最简单的跨进程通知 |
| 缩略图 | sharp 本地处理 | 快速，C 库高效，与 Worker 同进程 |
| 人脸识别 | 独立 Python 容器（可选） | Python 生态最优，可选部署，独立扩缩 |
| 增量扫描 | mtime 对比 + checkpoint | 避免重复扫描，支持百万级文件 |
| 文件去重 | SHA256 哈希（头尾 64KB + 文件大小） | 快速且准确 |
| 数据库 | SQLite WAL 模式 | 读写并发，单文件部署，零运维 |
| MQ 选型 | 不引入外部 MQ | NAS 场景 SQLite 队列完全够用，Kafka/RabbitMQ 等资源开销过大 |