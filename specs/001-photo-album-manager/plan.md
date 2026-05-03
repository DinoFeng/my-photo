# Implementation Plan: My-Photo 照片整理应用

**Branch**: `001-photo-album-manager` | **Date**: 2026-05-03 | **Spec**: [spec.md](file:///mnt/c/Git/Dino/my-photo/specs/001-photo-album-manager/spec.md)
**Input**: My-Photo照片整理应用项目规范

## Summary

My-Photo是一款跨平台照片整理应用，基于Quasar+Electron桌面框架和Node.js后端构建。核心功能包括：照片导入监控与自动整理、基于EXIF的虚拟相册管理、用户自定义相册、照片搜索筛选、以及局域网远程访问。第一阶段聚焦基础功能，第二阶段扩展AI辅助能力。

## Technical Context

**Language/Version**: TypeScript (前端) + JavaScript (后端) | Node.js 22+
**Package Manager**: pnpm 8+ (NOT npm)
**Primary Dependencies**: Quasar 2.x, Electron 28+, Express.js 4.x, Sharp, exifr, chokidar, better-sqlite3, TypeORM
**Storage**: SQLite (元数据/索引) + 文件系统 (照片原始文件/缩略图)
**Testing**: Vitest (单元测试), Playwright (集成测试)
**Target Platform**: Windows/macOS/Linux (Electron桌面) + Web浏览器 (PWA) + 移动端浏览器
**Project Type**: 桌面应用程序 + 远程Web服务
**Performance Goals**:
- 首次配置 < 5分钟
- 1000张照片扫描索引 < 60秒
- 缩略图加载 < 500ms
- 搜索响应 < 2秒 (10000张照片)
- 照片浏览流畅 60fps
**Constraints**:
- 交互操作响应 < 200ms
- >2秒操作需显示进度
- 支持至少50000张照片
- 局域网远程访问无认证
**Scale/Scope**: 50000+照片，数十个相册，多设备访问

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| I. Code Quality | ✅ PASS | 自文档化代码、单一职责、错误处理明确 |
| II. Testing Standards | ⚠️ IN PROGRESS | 需在实现中确保 >80% 覆盖率 |
| III. User Experience Consistency | ✅ PASS | Quasar响应式设计保证一致性 |
| IV. Performance Requirements | ✅ PASS | 性能目标已量化定义 |

**结论**: 门控检查通过，可以继续。

## Project Structure

### Documentation (this feature)

```
specs/001-photo-album-manager/
├── plan.md              # 本文件
├── research.md          # Phase 0 输出 (如需要)
├── data-model.md        # Phase 1 输出
├── quickstart.md        # Phase 1 输出
├── contracts/           # Phase 1 输出 (API契约)
└── tasks.md             # Phase 2 输出 (/speckit-tasks)
```

### Source Code (repository root)

```
my-photo/
├── electron/                     # Electron主进程
│   ├── main.js                   # Electron入口
│   ├── preload.js                # 预加载脚本 (IPC桥接)
│   └── ipc/
│       └── handlers.js           # IPC处理器
│
├── src/                          # Quasar前端源码
│   ├── App.vue                   # 根组件
│   ├── router/
│   │   └── index.js             # 路由配置
│   ├── stores/                   # Pinia状态管理
│   │   ├── photo.js             # 照片状态
│   │   ├── album.js             # 相册状态
│   │   ├── settings.js          # 设置状态
│   │   └── import.js            # 导入状态
│   ├── pages/                    # 页面组件
│   │   ├── Index.vue            # 首页/照片网格
│   │   ├── Albums.vue           # 相册列表
│   │   ├── PhotoDetail.vue      # 照片详情
│   │   └── Settings.vue         # 设置页面
│   ├── components/               # 可复用组件
│   │   ├── PhotoCard.vue        # 照片卡片
│   │   ├── AlbumCard.vue        # 相册卡片
│   │   ├── PhotoViewer.vue      # 照片查看器
│   │   ├── FileTree.vue         # 文件目录树
│   │   ├── ImportDialog.vue     # 导入对话框
│   │   ├── DuplicateDialog.vue  # 重复处理对话框
│   │   └── OrganizePreview.vue  # 整理预览对话框
│   ├── layouts/
│   │   └── MainLayout.vue       # 主布局
│   └── css/
│       └── app.scss
│
├── server/                       # Node.js后端服务
│   ├── index.js                  # 服务入口
│   ├── app.js                   # Express应用
│   ├── routes/                   # API路由
│   │   ├── photos.js            # 照片相关API
│   │   ├── albums.js            # 相册相关API
│   │   ├── scanner.js           # 文件扫描API
│   │   ├── import.js            # 导入API
│   │   └── settings.js          # 设置API
│   ├── services/                 # 业务逻辑
│   │   ├── PhotoService.js      # 照片处理
│   │   ├── AlbumService.js      # 相册管理
│   │   ├── ImportService.js     # 导入处理
│   │   ├── OrganizeService.js   # 磁盘组织
│   │   ├── ExifService.js       # EXIF解析
│   │   ├── ThumbnailService.js  # 缩略图生成
│   │   ├── DuplicateService.js  # 重复检测
│   │   └── SearchService.js     # 搜索服务
│   ├── db/                       # 数据库
│   │   ├── index.js             # 数据库连接
│   │   ├── models/              # 数据模型
│   │   │   ├── Photo.js
│   │   │   ├── Album.js
│   │   │   ├── Setting.js
│   │   │   └── ImportTask.js
│   │   └── migrations/           # 数据库迁移
│   └── utils/                   # 工具函数
│       ├── fileUtils.js         # 文件操作
│       ├── pathUtils.js         # 路径处理
│       └── hashUtils.js         # Hash计算
│
├── ai-service/                   # Python AI服务 (第二阶段)
│   ├── main.py
│   ├── face_recognition/
│   ├── similarity/
│   └── scene/
│
├── src-cordova/                 # Capacitor移动端配置
├── src-electron/                 # Electron打包配置
├── public/                       # 静态资源
├── quasar.config.js              # Quasar配置
├── package.json
├── tsconfig.json                 # TypeScript配置
└── vitest.config.js             # Vitest测试配置
```

**Structure Decision**: 采用多层级架构 - Quasar前端 + Express后端 + Electron主进程。前端负责UI和状态管理，后端处理业务逻辑和数据库操作，Electron主进程管理系统级功能和IPC通信。

## Phase 1 Design Decisions

### 1. 技术栈选型

| 组件 | 选型 | 理由 |
|------|------|------|
| 前端框架 | Quasar 2.x | 一次开发多端输出，响应式布局 |
| 桌面打包 | Electron 28+ | 成熟稳定，跨平台支持 |
| 后端框架 | Express.js 4.x | 轻量灵活，生态丰富 |
| 数据库 | SQLite + better-sqlite3 | 嵌入式，高性能，无依赖 |
| ORM | TypeORM | TypeScript友好，迁移支持 |
| 图像处理 | Sharp | 基于libvips，高性能 |
| EXIF解析 | exifr | 轻量，支持HEIC |
| 目录监控 | chokidar | 跨平台，事件丰富 |
| 状态管理 | Pinia | Vue 3官方推荐 |

### 2. API设计

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/photos` | GET | 获取照片列表 (分页/筛选) |
| `/api/photos/:id` | GET | 获取照片详情 |
| `/api/albums` | GET/POST | 获取/创建相册 |
| `/api/albums/:id` | PUT/DELETE | 更新/删除相册 |
| `/api/albums/:id/photos` | POST | 添加照片到相册 |
| `/api/settings` | GET/PUT | 获取/更新设置 |
| `/api/scanner/scan` | POST | 触发目录扫描 |
| `/api/import/start` | POST | 启动导入任务 |
| `/api/organize/preview` | POST | 预览整理方案 |
| `/api/organize/execute` | POST | 执行整理 |

### 3. 数据模型

详见 `data-model.md`

### 4. 目录组织规则

| 规则ID | 名称 | 路径模板 |
|--------|------|----------|
| R001 | 按日期 | `{year}/{month}/{day}/{filename}` |
| R002 | 按相机 | `{camera}/{year}/{filename}` |
| R003 | 按地点 | `Locations/{city}/{year}/{filename}` |
| R004 | 自定义 | 用户定义 |

### 5. 重复检测算法

| 模式 | 算法 | 性能 |
|------|------|------|
| hash (默认) | MD5/SHA计算文件内容hash | 中等，精确 |
| filename+size | 文件名+大小比较 | 快速，不精确 |
| exif+filename | EXIF日期+相机+文件名 | 快速，依赖EXIF |

## Complexity Tracking

> 本项目复杂度合理，无需额外复杂设计模式。

| 决策 | 理由 | 拒绝的替代方案 |
|------|------|----------------|
| SQLite嵌入式数据库 | 50000照片规模适中，嵌入式无运维成本 | PostgreSQL过度设计 |
| Express.js而非FastAPI | 统一JS/TS技术栈 | Python后端增加复杂度 |
| 分层架构 (前端/后端/主进程) | 职责分离，可维护性 | 单体增加复杂度 |
