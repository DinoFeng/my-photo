# Implementation Plan: NAS 照片管理应用

**Branch**: `002-nas-photo-manager` | **Date**: 2026-05-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/speckit.specify` command

## Summary

NAS 照片管理应用是一款运行在 Docker 容器中的多媒体索引管理系统。核心功能包括：多源目录只读索引、导入目录自动整理、图片和视频浏览搜索。采用前后端分离架构，前端 Vue 3 SPA，后端 Express REST API，统一通过 queue-manager-pro 任务队列处理文件变化事件。

## Technical Context

| 项目 | 选择 | 说明 |
|------|------|------|
| **语言/版本** | Node.js 20+ / TypeScript 5+ | LTS 版本，稳定性好 |
| **主要依赖** | Express, Prisma, chokidar, queue-manager-pro, Sharp, exifreader | 轻量级，资源占用低 |
| **数据库** | SQLite | 嵌入式，无需独立服务 |
| **测试** | Vitest | Vite 原生支持，TypeScript 友好 |
| **目标平台** | Linux (Docker on NAS) | x86-64 和 ARM64 |
| **项目类型** | Web Service (前后端分离) | REST API + Vue 3 SPA |
| **性能目标** | 512MB 内存，支持百万级文件 | NAS 环境限制 |
| **约束条件** | <512MB memory, <0.5 CPU | Docker 资源限制 |
| **规模范围** | 百万级文件，单用户(第一阶段) | 可扩展到多用户 |

## Constitution Check

*Note: constitution.md is a template without specific rules. All standard development practices apply.*

| Gate | Status | Notes |
|------|--------|-------|
| TypeScript strict mode | ✅ | tsconfig strict enabled |
| Error handling | ✅ | All async operations wrapped in try-catch |
| Resource limits | ✅ | Docker 512MB memory limit defined |
| Security (Phase 1) | ✅ | HTTP Basic Auth + Firewall |

## Project Structure

### Documentation (this feature)

```text
specs/002-nas-photo-manager/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output (if needed)
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API contracts)
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code

```text
my-photo/
├── frontend/                    # Vue 3 SPA
│   ├── src/
│   │   ├── components/         # UI 组件
│   │   ├── pages/             # 页面视图
│   │   ├── stores/            # Pinia 状态管理
│   │   ├── i18n/              # 国际化配置
│   │   └── api/               # API 客户端
│   ├── index.html
│   └── package.json
├── backend/                    # Express API
│   ├── src/
│   │   ├── controllers/       # REST API 控制器
│   │   ├── services/          # 业务逻辑服务
│   │   ├── routes/            # 路由定义
│   │   ├── middleware/         # Express 中间件
│   │   └── app.ts             # Express 应用
│   ├── prisma/
│   │   └── schema.prisma      # 数据库 Schema
│   └── package.json
├── docker/                     # Docker 配置
│   ├── Dockerfile
│   └── docker-compose.yml
├── .env.example                # 环境变量示例
└── .gitignore
```

**Structure Decision**: Web application (前后端分离). Backend provides REST API, frontend is Vue 3 SPA served by Express.

## Technical Decisions

### Backend Framework: Express

| Decision | Rationale |
|----------|------------|
| Express vs Fastify | 更成熟，文档更丰富，NAS 场景性能差异可忽略 |
| Express vs Koa | 更广泛的社区支持，中间件选择更多 |
| Express vs NestJS | 资源占用更低，不需要依赖注入复杂度 |

### Database: SQLite + Prisma

| Decision | Rationale |
|----------|------------|
| SQLite vs PostgreSQL | 嵌入式，无需独立服务，适合 NAS 单容器部署 |
| Prisma vs TypeORM | 类型安全，自动生成客户端，性能更好 |

### Task Queue: queue-manager-pro

| Decision | Rationale |
|----------|------------|
| queue-manager-pro vs Bull | 零依赖，支持文件存储，不需要 Redis |
| queue-manager-pro vs 自实现 | 功能完整，支持重试、优先级、持久化 |

### Frontend: Vue 3 + Naive UI

| Decision | Rationale |
|----------|------------|
| Vue 3 vs React | 团队熟悉度更高，Composition API 简洁 |
| Naive UI vs Element Plus | 体积更小 (~28KB)，性能更好 |
| SPA vs SSR | 前端独立构建，更灵活 |

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| 前后端分离 | 更好的开发体验和扩展性 | 单体架构难以维护和扩展 |
| Prisma ORM | 类型安全，开发效率高 | 放弃 TypeScript 类型安全得不偿失 |

## Phase 1 Artifacts

- [ ] `data-model.md` - Database schema and entities
- [ ] `quickstart.md` - Development setup guide
- [ ] `contracts/` - API endpoint specifications

## Next Steps

1. Run `/speckit-tasks` to generate implementation tasks
2. Set up development environment
3. Implement backend database schema with Prisma
4. Implement Express API endpoints
5. Implement frontend Vue 3 components
6. Set up Docker configuration
