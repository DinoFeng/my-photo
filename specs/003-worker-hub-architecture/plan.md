# Implementation Plan: Worker Hub Architecture

**Branch**: `003-worker-hub-architecture` | **Date**: 2026-06-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-worker-hub-architecture/spec.md`

## Summary

将 Node.js Worker 改造为 WebSocket Hub（中央统筹者），统一内部进程通信协议。Backend 作为 WS 客户端连接 Hub，接收实时进度通知并通过 SSE 推送到前端。Worker 协调启动流程：Backend 初始化 DB 后连接 Hub，Worker 收到连接后开始队列消费与目录扫描。未来 Python Worker 等新 Worker 只需实现 WS 客户端即可接入。

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+  
**Primary Dependencies**: `ws` (WebSocket server/client), `express` (HTTP), `drizzle-orm` + `@libsql/client` (SQLite), `chokidar` (file watching)  
**Storage**: SQLite via libsql (shared database file)  
**Testing**: vitest (unit), manual integration testing via PM2  
**Target Platform**: NAS (Linux) via Docker, managed by PM2  
**Project Type**: Monorepo (pnpm workspaces) — `packages/shared`, `backend`, `worker`  
**Performance Goals**: 50+ WS messages/s during peak scan, <1s notification latency, <10s reconnection recovery  
**Constraints**: Single machine deployment, no external dependencies, all processes share one SQLite file  
**Scale/Scope**: 3 processes (Backend, Worker, future Python Worker), 2 persistent WS connections

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. 依赖注入解耦 | ✅ PASS | WS Hub 作为基础设施（`worker/src/utils/`），业务逻辑通过 `listeners/` 注册，不直接依赖业务模块 |
| II. 生产者-消费者分离 | ✅ PASS | WS Hub 只管连接和路由，消息生产/消费由 `queueHandlers.ts` 独立注册 |
| III. 单一职责 | ✅ PASS | `wsHub.ts` — 连接管理 + 消息路由；`wsClient.ts` — 客户端连接 + 重连；`messsages.ts` — 类型定义 |
| IV. 延迟初始化 | ✅ PASS | 无违反，WS Hub 在 `worker.ts` 启动时创建，WS Client 在 `server.ts` 启动时创建 |
| V. 模块化设计 | ✅ PASS | WS 模块独立，通过类型定义与外部交互，可替换 |
| VI. 层级职责分离 | ✅ PASS | Backend: `wsClient.ts` → `utils/`（基础设施层）；Worker: `wsHub.ts` → `utils/`（基础设施层） |

**Gate Result**: ALL PASS — No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/003-worker-hub-architecture/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── ws-messages.md   # WebSocket message protocol
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
packages/shared/
├── src/
│   ├── db/
│   │   ├── schema.ts          # (no change) Table definitions
│   │   └── index.ts           # (no change) DB client
│   ├── config.ts              # (no change) Shared configuration
│   └── types/
│       └── messages.ts        # NEW: WS message type definitions

backend/
├── src/
│   ├── server.ts              # MODIFY: Integrate WS client, connect to Hub after DB init
│   ├── utils/
│   │   └── wsClient.ts        # NEW: WS client, reconnect, forward to SSE
│   ├── services/
│   │   └── dbInitService.ts   # (no change) ensureDatabaseReady()
│   └── listeners/
│       └── eventHandlers.ts   # MODIFY: Wait for WS ready before set isReady

worker/
├── src/
│   ├── worker.ts              # MODIFY: Start WS Hub, wait for Backend before queues
│   ├── utils/
│   │   └── wsHub.ts           # NEW: WS server, connection management, message routing
│   ├── listeners/
│   │   ├── eventHandlers.ts   # MODIFY: Remove ensureDatabaseReady, wait for WS connection
│   │   └── queueHandlers.ts   # MODIFY: Replace notifyAPI HTTP with wsHub.send
│   └── services/
│       └── startupService.ts  # (no change) scanDirectories, startDirectoryWatchers
```

**Structure Decision**: Monorepo option. New files in `packages/shared/src/types/`, `backend/src/utils/`, `worker/src/utils/`. Modifications to existing files in `backend/src/` and `worker/src/`.

## Complexity Tracking

> No violations to justify. All constitution principles pass.