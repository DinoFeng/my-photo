# NAS 照片管理应用 - 最终方案

## 一、项目定位

| 项目 | 方案 |
|------|------|
| **产品名称** | NAS Media Manager（暂定） |
| **部署方式** | Docker 容器（NAS 环境） |
| **架构模式** | 前后端分离（Vue 3 SPA + Express API） |
| **核心设计** | 多源目录只读索引 + 导入目录自动整理 |
| **资源限制** | 内存 512MB、CPU 0.5核 |

---

## 二、核心功能

### 2.1 媒体类型支持

| 媒体类型 | 格式支持 | 缩略图 | 元数据提取 |
|----------|----------|--------|------------|
| **图片** | JPEG, PNG, GIF, WebP, BMP, RAW (NEF, CR2, ARW) | ✅ 生成缩略图 | ✅ EXIF（日期、相机、GPS 等） |
| **视频** | MP4, MOV, AVI, MKV, WebM | ⬜ 固定图标 | ✅ 时长、分辨率、编码格式 |
| **音频** | MP3, WAV, FLAC, AAC, OGG | ⬜ 固定图标 | ✅ 时长、歌手、标题、专辑 |

### 2.2 功能列表

| 优先级 | 功能 | 描述 |
|--------|------|------|
| P1 | 多源目录管理 | 支持配置多个媒体源目录（照片/视频/音频），只读索引不移动文件 |
| P1 | **源目录实时监控** | 监控所有源目录的文件变化（增删改），自动更新索引状态 |
| P1 | 导入目录监控 | 监控导入目录，按用户定义的规则自动整理媒体文件到源目录 |
| P1 | 媒体浏览 | Web 界面浏览、筛选、搜索已索引的媒体 |
| P1 | 重复检测 | 导入时使用文件哈希检测重复文件 |
| P2 | 文件变更检测 | 启动时检测文件缺失和新增，更新索引状态 |
| P2 | 批量导出 | 按组织规则批量导出媒体到外部目录 |
| P3 | 多语言支持 | 支持中文/英文本地化 |

## 七、监控策略

### 7.1 监控架构

```
┌─────────────────────────────────────────────────────────────┐
│                      WatchService                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              chokidar 监控器                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│  │  │ /photos     │  │ /videos     │  │ /music      │  │   │
│  │  │ (源目录)    │  │ (源目录)    │  │ (源目录)    │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
│                            │                               │
│                            ▼                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              事件处理器                               │   │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐        │   │
│  │  │ add       │ │ unlink    │ │ change    │        │   │
│  │  │ (新增)    │ │ (删除)    │ │ (修改)    │        │   │
│  │  └───────────┘ └───────────┘ └───────────┘        │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 事件处理流程

| 事件类型 | 触发条件 | 处理流程 |
|----------|----------|----------|
| **add** | 源目录新增文件 | 1. 验证文件类型<br>2. 读取元数据<br>3. 计算哈希<br>4. 生成缩略图（图片）<br>5. 创建 Media 记录 |
| **unlink** | 源目录删除文件 | 1. 更新 status = 'missing'<br>2. 记录删除时间 |
| **change** | 源目录修改文件 | 1. 重新计算哈希<br>2. 更新元数据<br>3. 重新生成缩略图（如需要） |
| **addDir** | 源目录新增子目录 | 1. 递归扫描新目录<br>2. 索引所有媒体文件 |

### 7.3 资源优化

| 策略 | 说明 |
|------|------|
| **批量处理** | 短时间内多次变更合并处理 |
| **延迟扫描** | 新增文件延迟 1 秒后开始处理，避免文件未写入完成 |
| **忽略隐藏文件** | 忽略以 `.` 开头的文件和目录 |
| **忽略临时文件** | 忽略 `.tmp`, `.temp` 等临时文件 |

### 7.4 大规模文件扫描（百万级文件）

当源目录包含上百万个文件时，需要特殊的处理策略：

#### 7.4.1 问题分析

| 问题 | 影响 | 解决方案 |
|------|------|----------|
| **内存** | 一次性加载所有文件 → OOM | 分批扫描 |
| **CPU** | 大量哈希计算 → CPU 100% | 限流处理 |
| **数据库** | 大量并发写入 → SQLite 锁 | 事务批量写入 |
| **时间** | 可能需要几小时甚至几天 | 断点续扫 |
| **用户体验** | 扫描期间 UI 无响应 | 后台处理 + 进度反馈 |

#### 7.4.2 处理策略

| 策略 | 参数 | 说明 |
|------|------|------|
| **分批扫描** | 每批 50 个文件 | 避免内存溢出 |
| **并发控制** | 同时处理 2 个文件 | 控制 CPU 使用 |
| **限流** | 每秒处理 10 个文件 | 避免资源耗尽 |
| **批量写入** | 每 1000 个文件写入一次 | 减少数据库压力 |
| **断点续扫** | 数据库记录扫描进度 | 支持中断后恢复 |

#### 7.4.3 任务队列

使用 **queue-manager-pro** 作为任务队列库：

| 特性 | 说明 |
|------|------|
| **零依赖** | 无外部服务依赖 |
| **多存储后端** | 支持内存/文件/SQLite/Redis/Postgres |
| **任务持久化** | 文件模式支持重启恢复 |
| **并发控制** | 可配置同时处理任务数 |
| **重试机制** | 支持自动重试和退避 |
| **优先级** | 支持任务优先级 |

**为什么选择 queue-manager-pro**：
- 零依赖，比其他队列库更轻量
- 使用文件存储模式，不需要单独运行 SQLite 服务
- 可以与现有的 Prisma SQLite 数据库无缝集成
- MIT 许可证，无版权问题

```typescript
// queue-manager-pro 使用示例
import { QueueManager } from 'queue-manager-pro';

// 创建队列（使用文件存储）
const queue = QueueManager.getInstance({
  backend: { type: 'file', filePath: './data/tasks.json' },
  maxRetries: 3,
  delay: 1000
});

// 注册处理器
queue.register('processPhoto', async ({ filePath }) => {
  await processMediaFile(filePath);
});

queue.register('generateThumbnail', async ({ filePath }) => {
  await generateThumbnail(filePath);
});

// 添加任务
await queue.addTaskToQueue('processPhoto', { filePath: '/photos/IMG_001.jpg' });

// 启动 worker
queue.startWorker();
```

#### 7.4.4 断点续扫

```typescript
// 数据库记录扫描进度
model ScanCheckpoint {
  id: String
  sourceDirId: String
  lastScannedPath: String
  lastScannedAt: DateTime
  filesProcessed: Int
  totalFiles: Int
  status: String  // 'running', 'completed', 'paused'
}

// 每次扫描前检查断点
async function resumeScan(sourceDirId: string) {
  const checkpoint = await db.scanCheckpoint.find({ sourceDirId })
  
  if (checkpoint && checkpoint.status === 'running') {
    console.log(`恢复扫描: 已处理 ${checkpoint.filesProcessed}/${checkpoint.totalFiles}`)
    await scanFrom(checkpoint.lastScannedPath)
  } else {
    await startNewScan(sourceDirId)
  }
}
```

#### 7.4.5 进度反馈

| API | 说明 |
|------|------|
| `GET /api/source-dirs/:id/scan-status` | 获取扫描进度 |
| `POST /api/source-dirs/:id/scan-pause` | 暂停扫描 |
| `POST /api/source-dirs/:id/scan-resume` | 恢复扫描 |
| `POST /api/source-dirs/:id/scan-cancel` | 取消扫描 |

---

## 三、技术栈

### 3.1 前端技术栈

| 分类 | 技术 | 版本 | 许可证 |
|------|------|------|--------|
| 框架 | Vue 3 | 3.4+ | MIT |
| 构建 | Vite | 5+ | MIT |
| UI组件 | Naive UI | 2.38+ | MIT |
| 状态管理 | Pinia | 2.1+ | MIT |
| 路由 | Vue Router | 4.3+ | MIT |
| 国际化 | Vue I18n | 9+ | MIT |
| 图标 | Lucide Vue | 1.6+ | ISC |

### 3.2 后端技术栈

| 分类 | 技术 | 版本 | 许可证 |
|------|------|------|--------|
| 框架 | Express | 4.18+ | MIT |
| ORM | Prisma | 5+ | Apache 2.0 |
| 数据库 | SQLite | 3.45+ | Public Domain |
| 文件监控 | chokidar | 3.6+ | MIT |
| EXIF解析 | exifreader | 4+ | MIT |
| 图片处理 | Sharp | 0.33+ | Apache 2.0 |
| 音频解析 | music-metadata | 7+ | MIT |
| 哈希计算 | crypto | Node.js 内置 | - |
| 任务队列 | queue-manager-pro | 1.0+ | MIT |

### 3.3 后端服务模块

| 模块 | 职责 |
|------|------|
| ScanService | 扫描源目录，建立媒体索引 |
| WatchService | 监控源目录文件变化，实时更新索引 |
| ImportService | 监控导入目录，按规则整理媒体文件 |
| HashService | 计算文件哈希，用于重复检测 |
| ThumbnailService | 生成图片缩略图 |

---

## 四、数据模型

### 4.1 SourceDirectory（媒体源目录）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 主键 (cuid) |
| path | String | 目录路径（唯一） |
| name | String | 显示名称 |
| type | String | 媒体类型：photo/video/audio |
| status | String | 状态：active/disabled/missing |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

### 4.2 Media（媒体文件）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 主键 (cuid) |
| filename | String | 文件名 |
| path | String | 完整路径（唯一） |
| type | String | 媒体类型：photo/video/audio |
| size | Int | 文件大小（字节） |
| mimeType | String | MIME 类型 |
| width | Int? | 宽度（图片/视频） |
| height | Int? | 高度（图片/视频） |
| duration | Int? | 时长秒数（视频/音频） |
| hash | String | 文件哈希（SHA256）用于重复检测 |
| metadata | Json | 媒体元数据 |
| thumbnailPath | String? | 缩略图路径（仅图片） |
| status | String | 状态：active/missing/removed |
| sourceDirId | String | 关联源目录 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

### 4.3 Setting（系统设置）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 主键（默认 "default"） |
| importPath | String? | 导入目录路径 |
| organizePattern | String | 组织规则模板 |
| duplicatePolicy | String | 重复处理：skip/rename/hash |
| language | String | 语言：zh/en |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

### 4.4 ImportTask（导入任务）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 主键 (cuid) |
| status | String | 状态：pending/running/completed/failed |
| sourcePath | String | 源文件路径 |
| targetPath | String? | 目标路径（整理后） |
| hash | String | 文件哈希 |
| error | String? | 错误信息 |
| createdAt | DateTime | 创建时间 |
| completedAt | DateTime? | 完成时间 |

---

## 五、API 设计

### 5.1 媒体管理 API

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/media` | GET | 获取媒体列表（分页、筛选、搜索） |
| `/api/media/:id` | GET | 获取单个媒体详情 |
| `/api/media/:id` | DELETE | 删除媒体索引（不删除原文件） |
| `/api/media/search` | GET | 搜索媒体 |

### 5.2 源目录 API

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/source-dirs` | GET | 获取所有源目录 |
| `/api/source-dirs` | POST | 添加新源目录（同时启动监控） |
| `/api/source-dirs/:id` | GET | 获取目录详情 |
| `/api/source-dirs/:id` | PUT | 更新目录信息 |
| `/api/source-dirs/:id` | DELETE | 删除源目录（停止监控） |
| `/api/source-dirs/:id/scan` | POST | 触发全量扫描 |
| `/api/source-dirs/:id/scan-status` | GET | 获取扫描进度 |
| `/api/source-dirs/:id/scan-pause` | POST | 暂停扫描 |
| `/api/source-dirs/:id/scan-resume` | POST | 恢复扫描 |
| `/api/source-dirs/:id/scan-cancel` | POST | 取消扫描 |
| `/api/watch/status` | GET | 获取所有监控服务状态 |
| `/api/watch/events` | GET | 获取最近的文件变更事件 |

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
| `/api/import/scan` | POST | 手动扫描导入目录 |

---

## 六、组织规则

### 6.1 预定义模板

| 模板 | 说明 | 示例输出 |
|------|------|----------|
| `{year}/{month}/{day}` | 按日期 | 2024/05/10/photo.jpg |
| `{type}/{year}/{month}` | 按类型和日期 | photos/2024/05/photo.jpg |
| `{album}/` | 按专辑/相册 | SummerVacation/photo.jpg |
| `{artist}/{album}/` | 按艺术家-专辑 | ArtistName/AlbumName/track.mp3 |

### 6.2 可用变量

| 变量 | 说明 | 适用类型 |
|------|------|----------|
| `{year}` | 拍摄年份（4位） | photo/video/audio |
| `{month}` | 拍摄月份（2位） | photo/video/audio |
| `{day}` | 拍摄日期（2位） | photo/video/audio |
| `{type}` | 媒体类型 | photo/video/audio |
| `{camera}` | 相机型号 | photo |
| `{album}` | 专辑名称 | audio |
| `{artist}` | 艺术家 | audio |
| `{title}` | 标题 | audio |
| `{original}` | 原文件名 | all |

### 6.3 重复处理策略

| 策略 | 说明 |
|------|------|
| skip | 跳过重复文件 |
| rename | 重命名后导入（如 photo_1.jpg） |
| overwrite | 覆盖已有文件 |

---

## 八、资源优化策略

| 策略 | 实施方式 |
|------|----------|
| **内存控制** | Docker 配置 `memory: 512M` |
| **流式处理** | 扫描时逐文件处理，避免内存峰值 |
| **延迟缩略图** | 图片按需生成缩略图，视频/音频使用固定图标 |
| **增量扫描** | 记录时间戳，只处理新增/变更文件 |
| **SQLite WAL** | 开启 Write-Ahead Logging 提升性能 |
| **任务队列** | 导入任务队列化，避免并发压力 |
| **单进程模式** | Node.js 默认单进程，减少 CPU 上下文切换 |
| **监控节流** | 文件变化事件延迟 500ms 合并处理 |
| **监控忽略** | 忽略隐藏文件和临时文件（`.`, `~`, `.tmp`） |

---

## 八、Docker 部署

### 8.1 docker-compose.yml

```yaml
services:
  my-photo:
    image: my-photo:latest
    ports:
      - "3000:3000"
    volumes:
      - /path/to/photos:/photos:ro
      - /path/to/videos:/videos:ro
      - /path/to/music:/music:ro
      - /path/to/import:/import:rw
      - /path/to/data:/data
    environment:
      - NODE_ENV=production
      - DATABASE_URL=file:/data/photos.db
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: "0.5"
        reservations:
          memory: 256M
          cpus: "0.25"
```

### 8.2 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 服务端口 | 3000 |
| `DATABASE_URL` | SQLite 数据库路径 | file:/data/photos.db |
| `PHOTO_PATH` | 照片源目录 | /photos |
| `VIDEO_PATH` | 视频源目录 | /videos |
| `MUSIC_PATH` | 音频源目录 | /music |
| `IMPORT_PATH` | 导入目录 | /import |

---

## 九、目录结构

```
my-photo/
├── frontend/                    # 前端应用 (Vue 3 SPA)
│   ├── src/
│   │   ├── components/          # UI 组件
│   │   ├── pages/               # 页面视图
│   │   ├── stores/              # Pinia 状态管理
│   │   ├── i18n/                # 国际化配置
│   │   └── api/                 # API 客户端
│   └── package.json
├── backend/                     # 后端服务 (Express)
│   ├── src/
│   │   ├── controllers/         # REST API 控制器
│   │   ├── services/            # 业务逻辑服务
│   │   ├── routes/              # 路由定义
│   │   └── app.ts               # Express 应用
│   └── prisma/
│       └── schema.prisma        # 数据库 Schema
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
└── .env
```

---

## 十、技术栈许可证汇总

| 技术 | 许可证 | 版权状态 |
|------|--------|----------|
| Vue 3 | MIT | ✅ 无问题 |
| Vite | MIT | ✅ 无问题 |
| Naive UI | MIT | ✅ 无问题 |
| Pinia | MIT | ✅ 无问题 |
| Vue Router | MIT | ✅ 无问题 |
| Vue I18n | MIT | ✅ 无问题 |
| Express | MIT | ✅ 无问题 |
| Prisma | Apache 2.0 | ✅ 无问题 |
| SQLite | Public Domain | ✅ 无问题 |
| Sharp | Apache 2.0 | ✅ 无问题 |
| chokidar | MIT | ✅ 无问题 |
| exifreader | MIT | ✅ 无问题 |
| music-metadata | MIT | ✅ 无问题 |

---

## 十一、下一步计划

1. 创建详细的数据库 Schema 文档
2. 设计 REST API 接口规范
3. 创建前端页面和组件设计
4. 制定开发任务清单

---

**文档版本**: v1.0
**创建日期**: 2026-05-10
**状态**: 待确认后实施
