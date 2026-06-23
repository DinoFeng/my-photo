# Feature Specification: Worker Hub Architecture

**Feature Branch**: `003-worker-hub-architecture`  
**Created**: 2026-06-23  
**Status**: Draft  
**Input**: User description: "Worker as WebSocket Hub for real-time cross-process coordination, with Backend as WS client and multi-worker support"

## Clarifications

### Session 2026-06-23

- Q: FR-009 请求-响应超时行为？ → A: v1 不做超时规范，Python Worker 为未来扩展，当前只有 Node.js Worker 内部消费者。
- Q: Hub 重启时正在处理的消息是否丢失？ → A: 消息必须由消费者确认完成后才算消费成功（at-least-once），未确认的消息在重启后重新入队等待处理。
- Q: WS Hub 监听接口范围？ → A: 监听 localhost（127.0.0.1），仅本机进程可连接。WS Hub 是内部进程通信，不对外暴露。
- Q: at-least-once 是否修改现有队列 schema？ → A: v1 完整实现。队列消息表增加 `status` 字段（pending/processing/completed），消费者取消息标记 processing，完成标记 completed，Hub 重启时 processing 恢复为 pending。

## User Scenarios & Testing *(mandatory)*

### User Story 1 - System Startup with Coordinated Process Readiness (Priority: P1)

As a system operator, when I start the NAS photo manager, all processes should coordinate their startup so that the Backend initializes the database first, the Worker waits for database readiness, and the frontend only shows "ready" after all components are prepared.

**Why this priority**: Without coordinated startup, the Worker crashes on first database query (current bug), and the frontend shows incomplete state. This is the foundation for all other functionality.

**Independent Test**: Start both processes via PM2. Verify the Backend starts accepting API requests, the Worker begins scanning without errors, and the frontend displays "system ready" status.

**Acceptance Scenarios**:

1. **Given** both processes are stopped, **When** PM2 starts both simultaneously, **Then** the Worker does not query the database until Backend has initialized it.
2. **Given** the Worker starts first, **When** Backend connects later, **Then** the Worker detects the connection and begins its scanning workflow.
3. **Given** the Backend starts first, **When** the Worker connects later, **Then** the Backend accepts the connection and sets system ready status.
4. **Given** the Worker is waiting for Backend, **When** the Worker detects Backend connection, **Then** the Worker starts directory watchers, registers queue handlers, and begins scanning.

---

### User Story 2 - Real-Time Scanning Progress to Frontend (Priority: P1)

As a user viewing the web interface, I want to see real-time scanning progress updates (which folder is being scanned, how many files found, any errors encountered) without needing to refresh the page.

**Why this priority**: The current HTTP-based notification creates unnecessary overhead (50+ requests per second during peak scanning) and may lose notifications. Replacing it with a persistent connection provides real-time updates with zero polling overhead.

**Independent Test**: Trigger a scan from the frontend. Verify progress updates appear on the screen in real-time (within 1 second of each file being processed) without page refresh.

**Acceptance Scenarios**:

1. **Given** a scan is in progress, **When** a file is processed by the Worker, **Then** the frontend receives a progress update within 1 second.
2. **Given** multiple consumers are processing files simultaneously, **When** each consumer completes a task, **Then** progress notifications are delivered without delay or loss.
3. **Given** the Backend's connection to the Worker is lost, **When** the connection is re-established, **Then** the Backend receives the latest progress state (not a replay of missed events).

---

### User Story 3 - Multi-Worker Extensibility (Priority: P2)

As a system architect, I want to add new types of workers (e.g., Python-based face recognition, video transcoding) without modifying the existing Backend or Node.js Worker, by simply connecting to the Hub.

**Why this priority**: The current architecture tightly couples workers to specific communication patterns. A unified Hub enables future workers to plug in with minimal effort, reducing time-to-feature for new capabilities.

**Independent Test**: Add a Python worker that connects to the Hub. Verify it can receive tasks from the Node.js Worker's face-detect queue consumer and return results.

**Acceptance Scenarios**:

1. **Given** a new worker connects to the Hub, **When** it registers its identity, **Then** the Hub accepts the connection and routes messages to/from it.
2. **Given** the Node.js Worker's face-detect consumer dispatches a task, **When** the task is routed through the Hub to the Python worker, **Then** the Python worker receives the task and processes it.
3. **Given** the Python worker completes a task, **When** it sends the result back through the Hub, **Then** the Node.js Worker's consumer receives the result and stores it.
4. **Given** a Python worker disconnects unexpectedly, **When** the Hub detects the disconnection, **Then** in-flight tasks to that worker are marked as failed and the system continues operating.

---

### User Story 4 - Connection Resilience (Priority: P2)

As a system operator, I want the system to automatically recover from temporary connection failures between processes without requiring manual intervention.

**Why this priority**: In a NAS deployment, processes may restart independently (PM2 auto-restart, system updates). The system must handle transient disconnections gracefully.

**Independent Test**: Kill the Backend process while the Worker is running. Verify the Worker continues operating and the Backend reconnects automatically upon restart.

**Acceptance Scenarios**:

1. **Given** the Backend loses connection to the Worker Hub, **When** the Backend detects the disconnection, **Then** it attempts to reconnect automatically with exponential backoff.
2. **Given** the Worker Hub loses a client connection, **When** the client reconnects, **Then** the Hub resumes sending progress notifications to that client.
3. **Given** the Worker Hub crashes, **When** PM2 restarts it, **Then** all clients reconnect and resume normal operation.

---

### Edge Cases

- What happens when the Backend connects to the Worker but the database has not been initialized yet? (Should not happen: Backend initializes DB before connecting)
- What happens when the Worker Hub receives a message for a client that has disconnected? (Queue the message briefly, drop if reconnection exceeds timeout)
- What happens when the Python worker is not connected but a face-detect task is queued? (Task stays in queue, processed when Python worker connects)
- What happens when two workers register with the same identity? (Reject the duplicate connection, keep the first one)
- How does the system handle message ordering when clients reconnect? (Messages are time-ordered by queue; Hub does not guarantee cross-client ordering)
- What happens to messages being processed when the Hub restarts? (Consumers must acknowledge completion; unacknowledged messages are re-queued as pending on restart)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Node.js Worker MUST expose a persistent communication endpoint on localhost that accepts connections from other local processes.
- **FR-002**: The Backend MUST connect to the Worker's communication endpoint after completing database initialization.
- **FR-003**: The Worker MUST delay database-dependent operations (queue registration, scanning) until the Backend has connected, signaling database readiness.
- **FR-004**: The Worker MUST be able to start file system watchers in parallel with waiting for the Backend connection, without requiring database access.
- **FR-005**: The Worker MUST send real-time progress notifications (task completion, errors, status changes) to the Backend via the persistent connection.
- **FR-006**: The Backend MUST forward progress notifications to the frontend via Server-Sent Events (SSE) for real-time display.
- **FR-007**: The system MUST support a single, unified communication protocol for all internal inter-process communication.
- **FR-008**: The Worker Hub MUST support message routing based on recipient identity, allowing messages to be directed to specific connected clients.
- **FR-009**: [FUTURE] The Worker Hub MUST support request-response message patterns (with correlation IDs) for task dispatching to future workers. Timeout behavior is deferred to the Python Worker implementation phase.
- **FR-010**: All clients MUST implement automatic reconnection logic with exponential backoff when the connection to the Hub is lost.
- **FR-011**: The Worker Hub MUST persist queue state in the shared database, so that tasks are not lost if the Hub restarts.
- **FR-012**: The system MUST log all connection events (connect, disconnect, reconnect) for operational visibility.
- **FR-013**: Queue consumers MUST explicitly acknowledge message completion. The queue message table MUST have a `status` field with values `pending`, `processing`, `completed`. Messages not acknowledged before a Hub restart MUST be re-queued as `pending` (at-least-once delivery semantics).

### Key Entities

- **Hub Connection**: Represents an active connection from a client process to the Worker Hub. Attributes: client identity, connection state, registration time.
- **Message**: Represents a unit of work in a queue. Attributes: message ID, queue name, payload, status (pending / processing / completed), consumer acknowledgement.
- **Progress Notification**: A message sent from the Worker to the Backend indicating a change in scanning/processing state. Attributes: event type, queue name, task status, timestamp.
- **Task Message**: A message sent between workers via the Hub, representing a work item (e.g., face detection request). Attributes: correlation ID, source worker, target worker, action type, payload.
- **Worker Identity**: A unique identifier for each connected worker process (e.g., "backend", "python-face-detect", "video-transcoder").

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The Worker starts without database errors when both processes are launched simultaneously by PM2.
- **SC-002**: Progress notifications from the Worker appear on the frontend within 1 second of the event occurring.
- **SC-003**: The system handles 50+ progress notifications per second during peak scanning without dropped messages or visible delay.
- **SC-004**: A new worker type can be integrated by implementing a single client connection, with no changes required to the Hub or Backend.
- **SC-005**: After a forced disconnection (process kill), the affected client reconnects and resumes normal operation within 10 seconds.
- **SC-006**: The system operates with at most 2 persistent internal connections (Backend + Python Worker) during normal operation, regardless of the number of consumer processes.

## Assumptions

- The Backend and Worker share the same SQLite database file on the same machine (NAS deployment).
- The Backend is responsible for database schema initialization (table creation) on startup.
- PM2 is used for process management and will restart crashed processes automatically.
- The WebSocket protocol is the chosen unified communication protocol for internal inter-process communication, bound to localhost only.
- File system watchers (directory monitoring) do not require database access and can start independently.
- The frontend communicates exclusively with the Backend via HTTP/SSE and never directly with the Worker.
- Future Python workers will run on the same NAS machine as the Node.js processes.
- Queue state is persisted in the shared SQLite database and survives Worker restarts.