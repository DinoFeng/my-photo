# Implementation Tasks: NAS 照片管理应用

**Feature**: `002-nas-photo-manager` | **Date**: 2026-05-10  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Data Model**: [data-model.md](./data-model.md)

## Overview

本任务清单按照用户故事优先级组织，每个阶段都是独立可测试的增量。

## Phase 1: Setup (项目初始化)

- [x] T001 Create backend directory structure with package.json and tsconfig.json
- [x] T002 Create frontend directory structure with Vue 3 + Vite + TypeScript
- [x] T003 Install backend dependencies: express, prisma, @prisma/client, chokidar, queue-manager-pro, sharp, exifreader, cors, dotenv
- [x] T004 Install frontend dependencies: vue, @vueuse/core, naive-ui, lucide-vue-next, pinia, vue-router, vue-i18n
- [x] T005 Initialize Prisma with SQLite database
- [x] T006 Create .env.example with all environment variables
- [x] T007 Create docker/ directory with Dockerfile and docker-compose.yml

## Phase 2: Foundational (基础任务)

- [x] T008 [P] Create Prisma schema with SourceDirectory, Media, Setting, ScanCheckpoint models
- [x] T009 [P] Create Express app with basic middleware (cors, json, static)
- [x] T010 [P] Create HTTP Basic Auth middleware for first phase security
- [x] T011 [P] Create task queue service using queue-manager-pro
- [x] T012 [P] Create file utilities for scanning, hash calculation, metadata extraction
- [x] T013 [P] Create Vue 3 app with Pinia store and Vue Router
- [x] T014 [P] Create i18n configuration with Chinese and English locales
- [x] T015 Run Prisma generate and db push to initialize database

## Phase 3: User Story 1 - 添加并扫描照片源目录 (P1)

**Story Goal**: 用户能够添加多个照片源目录，系统扫描并建立索引，不修改原文件。

**Independent Test Criteria**: 
1. 添加存在的目录 → 目录被保存且扫描开始
2. 扫描完成后 → 源目录文件保持不变
3. 扫描过程中 → 可查看进度

### Tasks

- [x] T016 [US1] Create SourceDirectory controller with CRUD endpoints
- [x] T017 [US1] Create ScanService with incremental scanning and checkpoint support
- [x] T018 [US1] Create ScanCheckpoint controller for scan status management
- [x] T019 [US1] Create routes for source-dirs API endpoints
- [x] T020 [US1] Create Media controller with listing and detail endpoints
- [x] T021 [US1] Create Vue page for source directory management
- [x] T022 [US1] Create Vue component for scan progress display
- [x] T023 [US1] Create Pinia store for source directories and scan status
- [x] T024 [US1] Integrate file watcher (chokidar) for source directory changes

## Phase 4: User Story 2 - 从导入目录整理照片 (P1)

**Story Goal**: 用户配置导入目录，系统监控新文件并按规则整理到源目录。

**Independent Test Criteria**:
1. 导入目录有新文件 → 系统按规则整理到源目录
2. 整理完成 → 照片按规则命名和组织
3. 遇到重复 → 按配置策略处理

### Tasks

- [x] T025 [US2] Create Setting controller with CRUD endpoints
- [x] T026 [US2] Create ImportService with organize pattern processing
- [x] T027 [US2] Create duplicate detection service with SHA256 hash
- [x] T028 [US2] Create routes for settings and import API endpoints
- [x] T029 [US2] Create Vue page for settings management
- [x] T030 [US2] Create Vue component for import task status
- [x] T031 [US2] Create Pinia store for settings and import tasks
- [x] T032 [US2] Integrate file watcher for import directory monitoring

## Phase 5: User Story 3 - 浏览和搜索照片 (P2)

**Story Goal**: 用户能够通过 Web 界面浏览、筛选和搜索已索引的照片和视频。

**Independent Test Criteria**:
1. 访问界面 → 显示缩略图和元数据
2. 按日期筛选 → 显示该日期范围媒体
3. 输入关键词 → 返回匹配结果

### Tasks

- [x] T033 [US3] Create Media controller with pagination, filtering and search
- [x] T034 [US3] Create thumbnail generation service using Sharp
- [x] T035 [US3] Create Vue page for photo gallery with grid layout
- [x] T036 [US3] Create Vue component for photo detail view
- [x] T037 [US3] Create Vue component for search and filter
- [x] T038 [US3] Create Pinia store for media browsing state

## Phase 6: User Story 4 - 导出和整理照片 (P3)

**Story Goal**: 用户能够将照片按指定规则批量导出到外部目录。

**Independent Test Criteria**:
1. 选择照片 + 指定规则 → 按规则导出到目标目录
2. 导出过程中 → 可查看进度

### Tasks

- [x] T039 [US4] Create ExportService with organize pattern support
- [x] T040 [US4] Create Export controller with batch export endpoints
- [x] T041 [US4] Create routes for export API endpoints
- [x] T042 [US4] Create Vue component for export dialog
- [x] T043 [US4] Create Vue component for export progress
- [x] T044 [US4] Create Pinia store for export tasks

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T045 Create error handling middleware for Express
- [x] T046 Create health check endpoint
- [x] T047 Create watch status endpoint for monitoring services
- [x] T048 Add responsive design to Vue components
- [x] T049 Add loading states and error messages to UI
- [x] T050 Create global error handling in Vue
- [x] T051 Optimize frontend bundle size with code splitting
- [x] T052 Update docker-compose.yml with resource limits
- [x] T053 Update quickstart.md with deployment instructions
- [x] T054 Add logging middleware for production

## Phase 8: Security Phase 2 - JWT Authentication (后续阶段)

**Note**: FR-013 - Second phase JWT authentication support

- [ ] T055 [P2] Create User model and authentication service
- [ ] T056 [P2] Create JWT middleware for authentication
- [ ] T057 [P2] Create login/logout API endpoints
- [ ] T058 [P2] Create Vue login page and authentication store

## Phase 9: Security Phase 3 - HTTPS & TOTP (后续阶段)

**Note**: FR-014 - Third phase HTTPS + TOTP 2FA support

- [ ] T059 [P3] Integrate Let's Encrypt for HTTPS
- [ ] T060 [P3] Create TOTP 2FA service
- [ ] T061 [P3] Create rate limiting middleware
- [ ] T062 [P3] Add 2FA verification to login flow

## Task Dependencies

```
Phase 1 ─┬─→ Phase 2 ─┬─→ Phase 3 (US1)
         │             ├─→ Phase 4 (US2)
         │             ├─→ Phase 5 (US3)
         │             └─→ Phase 6 (US4)
         └────────────────→ Phase 7
```

## Parallel Opportunities

| Phase | Parallel Tasks |
|-------|----------------|
| Phase 2 | T008, T009, T010, T011, T012, T013, T014 can run in parallel |
| Phase 3 | T016, T017, T021 can run in parallel |
| Phase 4 | T025, T026, T029 can run in parallel |
| Phase 5 | T033, T035 can run in parallel |

## MVP Scope

建议 MVP 包含：
- Phase 1: Setup
- Phase 2: Foundational
- Phase 3: User Story 1 (源目录管理和扫描)
- Phase 4: User Story 2 (导入目录整理)

## Task Summary

| User Story | Task Count | Completed | Priority |
|------------|------------|-----------|----------|
| Setup | 7 | 7 | - |
| Foundational | 8 | 8 | - |
| US1 - 添加并扫描照片源目录 | 9 | 9 | P1 |
| US2 - 从导入目录整理照片 | 8 | 8 | P1 |
| US3 - 浏览和搜索照片 | 6 | 6 | P2 |
| US4 - 导出和整理照片 | 6 | 6 | P3 |
| Polish | 12 | 12 | - |
| **Total** | **56** | **56** | **100%** |