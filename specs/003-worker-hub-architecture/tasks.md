# Tasks: Worker Hub Architecture

**Input**: Design documents from `/specs/003-worker-hub-architecture/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ws-messages.md, quickstart.md

**Tests**: Not requested in spec — no test tasks generated.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- `packages/shared/src/` — shared types, config, db
- `backend/src/` — API Server
- `worker/src/` — Node.js Worker (Hub)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and prepare project for WS integration.

- [x] T001 Add `ws` dependency to `backend/package.json` and `worker/package.json` via `pnpm add ws`
- [x] T002 [P] Add `@types/ws` dev dependency to `backend/package.json` and `worker/package.json` via `pnpm add -D @types/ws`
- [x] T003 [P] Add `WS_HUB_PORT` and `WS_HUB_URL` environment variables to `.env` (WS_HUB_PORT=3001, WS_HUB_URL=ws://localhost:3001)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story implementation.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T004 [P] Define WS message types (WsMessage, NotifyMessage, SystemMessage, RouteMessage, RouteResponseMessage) in `packages/shared/src/types/messages.ts` per contracts/ws-messages.md
- [x] T005 [P] Export WS message types from `packages/shared/src/index.ts`
- [x] T006 [P] Add at-least-once recovery logic in `worker/src/services/startupService.ts` — on Hub startup, iterate queue files `['scan-folder.db', 'read-file.db']` in `config.DATA_DIR`, execute `UPDATE tasks SET status = 'pending' WHERE status = 'processing'` on each file's task table

**Checkpoint**: Foundation ready — shared types available, queue recovery logic in place. User story implementation can now begin.

---

## Phase 3: User Story 1 - Coordinated Startup (Priority: P1) 🎯 MVP

**Goal**: Backend initializes DB, then connects to Worker Hub via WS. Worker waits for Backend connection before starting queue consumers and scanning. Frontend shows "ready" only after all components are coordinated.

**Independent Test**: Start both processes via PM2. Verify Backend accepts API requests, Worker begins scanning without errors, and frontend displays "system ready" status.

### Implementation for User Story 1

- [x] T007 [US1] Implement WS Hub server in `worker/src/utils/wsHub.ts` — create WebSocketServer on WS_HUB_PORT, accept connections, handle `system` register/registered messages, broadcast `ready` event when Backend connects, manage connected clients map (clientId → ws)
- [x] T008 [US1] Implement WS client in `backend/src/utils/wsClient.ts` — connect to WS_HUB_URL, send register message with clientId "backend", expose `onReady` callback, forward notify messages to callback
- [x] T009 [US1] Integrate WS Hub startup into `worker/src/worker.ts` — create WsHub instance on startup, start WS server, register `onReady` handler that triggers queue initialization
- [x] T010 [US1] Modify `worker/src/listeners/eventHandlers.ts` — remove `ensureDatabaseReady()` call, split `startWorker()` into: (a) `startDirectoryWatchers()` launched immediately, (b) queue registration + scanning deferred until Hub ready signal
- [x] T011 [US1] Integrate WS client into `backend/src/server.ts` — after `ensureDatabaseReady()`, connect to WS Hub, set `app.locals.isReady = true` and broadcast SSE `ready` event only after receiving Hub `ready` confirmation
- [x] T012 [US1] Add logging for connection lifecycle events (connect, disconnect, register, ready) in both `wsHub.ts` and `wsClient.ts` per FR-012

**Checkpoint**: At this point, Backend and Worker coordinate startup via WS. Worker starts watchers in parallel, queues only after Backend connects. Frontend shows "ready" correctly.

---

## Phase 4: User Story 2 - Real-Time Scanning Progress (Priority: P1)

**Goal**: Worker sends progress notifications via WS to Backend, Backend forwards to frontend via SSE. Replace HTTP-based `notifyAPI()` with WS.

**Independent Test**: Trigger a scan from frontend. Verify progress updates appear within 1 second of each file being processed. No page refresh needed.

### Implementation for User Story 2

- [x] T013 [US2] Implement `wsHub.sendToBackend()` helper in `worker/src/utils/wsHub.ts` — send notify message to all connected clients with clientId "backend"
- [x] T014 [US2] Modify `worker/src/listeners/queueHandlers.ts` — replace `notifyAPI()` HTTP call with `wsHub.sendToBackend()` WS call, remove `API_INTERNAL_URL` constant
- [x] T015 [US2] Implement message forwarding in `backend/src/utils/wsClient.ts` — on receiving notify message from Hub, read `scan_checkpoint` table for scan progress and `media` table for processed-file count, invoke `monitorService.broadcast()` for SSE push to frontend
- [x] T016 [US2] Verify SSE integration — ensure existing `monitorService` SSE broadcast works correctly with WS-delivered progress events (task-complete, task-error, scan-progress)

**Checkpoint**: Scanning progress appears in real-time on frontend. No HTTP notification path remains for progress updates.

---

## Phase 5: User Story 3 - Multi-Worker Extensibility (Priority: P2)

**Goal**: Hub supports message routing to specific clients, enabling future workers (Python face detection, etc.) to connect and receive tasks.

**Independent Test**: Connect a second WebSocket client to the Hub with a different clientId. Verify it can register and receive routed messages.

### Implementation for User Story 3

- [x] T017 [P] [US3] Implement `wsHub.sendToClient(clientId, message)` in `worker/src/utils/wsHub.ts` — route a message to a specific connected client by clientId
- [x] T018 [P] [US3] Implement `wsHub.broadcast(message)` in `worker/src/utils/wsHub.ts` — send a system message to all connected clients (for connected/disconnected events)
- [x] T019 [US3] Implement duplicate clientId rejection in `worker/src/utils/wsHub.ts` — reject new connections with already-registered clientId, send error message before closing
- [x] T020 [US3] Broadcast system events when clients connect/disconnect — `{ type: "system", event: "connected" | "disconnected", clientId }` to all clients

**Checkpoint**: Hub supports multiple client connections with unique identities. Ready for future Python Worker integration.

---

## Phase 6: User Story 4 - Connection Resilience (Priority: P2)

**Goal**: Backend automatically reconnects to Hub on disconnection with exponential backoff. Worker Hub continues operating when Backend disconnects.

**Independent Test**: Kill the Backend process while Worker is running. Verify Backend reconnects automatically upon restart within 10 seconds.

### Implementation for User Story 4

- [x] T021 [US4] Implement exponential backoff reconnection in `backend/src/utils/wsClient.ts` — initial 1s, multiplier 2x, max 30s, no retry limit, per research.md §4
- [x] T022 [US4] Handle Hub disconnection gracefully in `worker/src/utils/wsHub.ts` — remove disconnected client from map, continue serving remaining clients, no crash
- [x] T023 [US4] Handle message routing to disconnected clients in `worker/src/utils/wsHub.ts` — log warning, drop message (v1), per spec.md Edge Cases: "What happens when the Hub receives a message for a client that has disconnected?"
- [x] T024 [US4] Add reconnection logging — log each reconnect attempt with attempt number and delay in `backend/src/utils/wsClient.ts`

**Checkpoint**: System survives temporary disconnections. Backend reconnects automatically. Worker continues operating during Backend downtime.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup, documentation, and final validation.

- [x] T025 [P] Remove dead `notifyAPI()` function and related imports from `worker/src/listeners/queueHandlers.ts` (if any remaining after T014)
- [x] T026 [P] Remove `API_INTERNAL_URL` from `.env` and any config references if no longer used by other components
- [x] T027 [P] Update `backend/ecosystem.config.js` — add `WS_HUB_URL` environment variable to Worker and Backend process definitions
- [x] T028 Run quickstart.md validation — verify all steps work end-to-end (install, configure, dev start, PM2 start, verify)
- [ ] T029 Code review against checklist.md — verify all 42 PR review items are addressed
- [ ] T030 [P] Stress test SC-003 — send 50+ rapid WS notify messages from Worker to Backend, verify no dropped messages and each notification reaches frontend SSE within 1s

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2) — No dependencies on other stories
- **User Story 2 (Phase 4)**: Depends on US1 (needs Hub + Client to be functional) — integrates with US1
- **User Story 3 (Phase 5)**: Depends on US1 (needs Hub server) — extends Hub capabilities
- **User Story 4 (Phase 6)**: Depends on US1 (needs Client connection) — extends Client capabilities
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

```
Phase 1: Setup
    ↓
Phase 2: Foundational
    ↓
Phase 3: US1 (Coordinated Startup) ← BLOCKS all other US
    ↓
    ├── Phase 4: US2 (Real-Time Progress) ← depends on US1
    ├── Phase 5: US3 (Multi-Worker)       ← depends on US1, parallel with US2/US4
    └── Phase 6: US4 (Connection Resilience) ← depends on US1, parallel with US2/US3
    ↓
Phase 7: Polish
```

### Within Each User Story

- WS Hub tasks before WS Client tasks (Hub must exist before Client can connect)
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- T001, T002, T003 can all run in parallel (Phase 1)
- T004, T005, T006 can all run in parallel (Phase 2)
- T017, T018 can run in parallel (US3)
- T025, T026, T027 can run in parallel (Phase 7)
- US3 and US4 can run in parallel after US1 completes

---

## Parallel Example: User Story 1 (Sequential)

```bash
# Must execute in order (Hub → Client → Integration):
Task T007: "Implement WS Hub server in worker/src/utils/wsHub.ts"
Task T008: "Implement WS client in backend/src/utils/wsClient.ts"
Task T009: "Integrate WS Hub startup into worker/src/worker.ts"
Task T010: "Modify worker/src/listeners/eventHandlers.ts"
Task T011: "Integrate WS client into backend/src/server.ts"
Task T012: "Add logging for connection lifecycle events"
```

## Parallel Example: US3 + US4 (After US1)

```bash
# Terminal 1: US3 (Multi-Worker)
Task T017: "Implement wsHub.sendToClient()"
Task T018: "Implement wsHub.broadcast()"
Task T019: "Implement duplicate clientId rejection"
Task T020: "Broadcast system events on connect/disconnect"

# Terminal 2: US4 (Connection Resilience) — parallel
Task T021: "Implement exponential backoff reconnection"
Task T022: "Handle Hub disconnection gracefully"
Task T023: "Handle message routing to disconnected clients"
Task T024: "Add reconnection logging"
```

---

## Implementation Strategy

### MVP (User Story 1 + 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US1 (Coordinated Startup) — fix current crash bug
4. Complete Phase 4: US2 (Real-Time Progress) — replace HTTP notifications
5. **STOP and VALIDATE**: PM2 start both processes, verify no crash, verify real-time progress
6. Deploy if ready

### Full Delivery

1. MVP above
2. Add Phase 5: US3 (Multi-Worker) — future-proof for Python Worker
3. Add Phase 6: US4 (Connection Resilience) — production hardening
4. Phase 7: Polish & cleanup

---

## Summary

| Phase | Story | Tasks | Parallel Tasks |
|-------|-------|-------|----------------|
| Phase 1 | Setup | T001–T003 | 3 |
| Phase 2 | Foundational | T004–T006 | 3 |
| Phase 3 | US1: Coordinated Startup | T007–T012 | 0 (sequential) |
| Phase 4 | US2: Real-Time Progress | T013–T016 | 0 (sequential) |
| Phase 5 | US3: Multi-Worker | T017–T020 | 2 |
| Phase 6 | US4: Connection Resilience | T021–T024 | 0 (sequential) |
| Phase 7 | Polish | T025–T030 | 4 |
| **Total** | | **30 tasks** | **12 parallel** |