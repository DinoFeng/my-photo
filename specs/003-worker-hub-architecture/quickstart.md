# Quickstart: Worker Hub Architecture

**Feature**: 003-worker-hub-architecture  
**Date**: 2026-06-23

## Prerequisites

- Node.js 20+
- pnpm 9+
- PM2 (for production)

## Installation

```bash
# Install ws dependency
cd backend && pnpm add ws
cd ../worker && pnpm add ws
cd ..

# Install ws types
cd backend && pnpm add -D @types/ws
cd ../worker && pnpm add -D @types/ws
cd ..
```

## Configuration

Add to `.env`:

```env
# WS Hub port (Worker listens on this)
WS_HUB_PORT=3001

# WS Hub URL (Backend connects to this)
WS_HUB_URL=ws://localhost:3001
```

## Development

```bash
# Terminal 1: Start Backend (DB init + WS client)
cd backend && pnpm run dev

# Terminal 2: Start Worker (WS Hub + queues)
cd worker && pnpm run dev
```

## Production (PM2)

```bash
# Update ecosystem.config.js with WS_HUB_PORT env
# Then:
pm2 start ecosystem.config.js
```

## Verification

1. Check Backend logs: `[ws-client] Connected to Hub` → `[ws-client] Received ready signal`
2. Check Worker logs: `[ws-hub] Server started on port 3001` → `[ws-hub] Client 'backend' registered`
3. Open frontend: should show "system ready" status
4. Trigger scan: progress updates should appear in real-time

## Key Files

| File | Purpose |
|------|---------|
| `packages/shared/src/types/messages.ts` | WS message type definitions |
| `backend/src/utils/wsClient.ts` | Backend WS client: connect, reconnect, forward to SSE |
| `worker/src/utils/wsHub.ts` | Worker WS server: connection management, message routing |
| `worker/src/worker.ts` | Startup flow: WS Hub + parallel watchers |
| `backend/src/server.ts` | Startup flow: DB init → WS connect → set ready |

## Architecture

```
                    ┌──────────────────────┐
                    │   Node.js Worker     │
                    │   WS Hub :3001       │
                    │   ┌──────────────┐   │
                    │   │ 队列管理器    │   │
                    │   │ scan-folder   │   │
                    │   │ read-file     │   │
                    │   └──────────────┘   │
                    └──┬───────────────────┘
               WS ────┘
               │
    ┌──────────┴──────────┐
    │     Backend         │
    │   WS Client         │
    │   SSE → 前端         │
    └─────────────────────┘
```

## Troubleshooting

| Symptom | Cause | Solution |
|---------|-------|----------|
| Worker: `no such table: scan_checkpoint` | Worker started before Backend DB init | Backend connects WS first, Worker waits |
| Backend: `ECONNREFUSED :3001` | Worker not started yet | Backend retries with exponential backoff |
| Frontend: "system ready" never appears | WS connection failed | Check both logs, verify WS_HUB_PORT matches |