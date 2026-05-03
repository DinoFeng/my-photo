# Tasks: My-Photo 照片整理应用

**Input**: Design documents from `/specs/001-photo-album-manager/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Initialize Quasar + Electron project with pnpm in package.json
- [ ] T002 [P] Create project directory structure per implementation plan
- [ ] T003 [P] Configure TypeScript and tsconfig.json
- [ ] T004 [P] Create .npmrc with pnpm and Node 22 constraints
- [ ] T005 [P] Configure Quasar and Electron in quasar.config.js
- [ ] T006 [P] Setup Vitest for unit testing in vitest.config.js

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T007 Setup SQLite database and TypeORM in server/db/index.js
- [ ] T008 [P] Create core database models (Photo, Album, Setting, ImportTask, AlbumPhoto, PhotoTag) in server/db/models/
- [ ] T009 [P] Create database migration files in server/db/migrations/
- [ ] T010 Setup Express.js API foundation in server/app.js
- [ ] T011 Create shared utility modules (fileUtils.js, pathUtils.js, hashUtils.js) in server/utils/
- [ ] T012 Setup Electron main process in electron/main.js
- [ ] T013 Create Electron IPC handlers in electron/ipc/handlers.js
- [ ] T014 Setup Quasar frontend foundation with Pinia stores and Router

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - 首次配置与照片导入 (Priority: P1) 🎯 MVP

**Goal**: 用户可以完成首次配置并成功导入照片

**Independent Test**: 模拟用户完成首次配置、添加照片源目录、触发导入来完整测试

### Implementation for User Story 1

- [ ] T015 [P] [US1] Create Setting entity model in server/db/models/Setting.js
- [ ] T016 [P] [US1] Create ImportTask entity model in server/db/models/ImportTask.js
- [ ] T017 [P] [US1] Implement SettingService in server/services/SettingService.js
- [ ] T018 [P] [US1] Implement ImportService in server/services/ImportService.js
- [ ] T019 [P] [US1] Implement ExifService in server/services/ExifService.js
- [ ] T020 [P] [US1] Implement DuplicateService in server/services/DuplicateService.js
- [ ] T021 [P] [US1] Implement ThumbnailService in server/services/ThumbnailService.js
- [ ] T022 [US1] Implement settings API routes in server/routes/settings.js
- [ ] T023 [US1] Implement import API routes in server/routes/import.js
- [ ] T024 [US1] Implement scanner API routes in server/routes/scanner.js
- [ ] T025 [US1] Create config settings Pinia store in src/stores/settings.js
- [ ] T026 [US1] Create import status Pinia store in src/stores/import.js
- [ ] T027 [US1] Create configuration wizard page in src/pages/SetupWizard.vue
- [ ] T028 [US1] Create ImportDialog component in src/components/ImportDialog.vue
- [ ] T029 [US1] Create DuplicateDialog component in src/components/DuplicateDialog.vue
- [ ] T030 [US1] Setup directory monitoring with chokidar in Electron main process

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - 照片浏览与虚拟相册 (Priority: P1)

**Goal**: 用户可以浏览照片并查看各种虚拟相册

**Independent Test**: 可以通过添加测试照片到数据库，验证各种浏览和组织功能

### Implementation for User Story 2

- [ ] T031 [P] [US2] Create Photo entity model in server/db/models/Photo.js
- [ ] T032 [P] [US2] Create Album entity model in server/db/models/Album.js
- [ ] T033 [P] [US2] Create AlbumPhoto join model (N:M关系表) in server/db/models/AlbumPhoto.js
- [ ] T034 [P] [US2] Create PhotoTag model in server/db/models/PhotoTag.js
- [ ] T035 [P] [US2] Implement PhotoService in server/services/PhotoService.js
- [ ] T036 [P] [US2] Implement AlbumService in server/services/AlbumService.js
- [ ] T037 [US2] Implement photos API routes in server/routes/photos.js
- [ ] T038 [US2] Implement albums API routes in server/routes/albums.js
- [ ] T039 [P] [US2] Create photo Pinia store in src/stores/photo.js
- [ ] T040 [P] [US2] Create album Pinia store in src/stores/album.js
- [ ] T041 [P] [US2] Create PhotoCard component in src/components/PhotoCard.vue
- [ ] T042 [P] [US2] Create AlbumCard component in src/components/AlbumCard.vue
- [ ] T043 [P] [US2] Create PhotoViewer component in src/components/PhotoViewer.vue
- [ ] T044 [US2] Create photo grid Index page in src/pages/Index.vue
- [ ] T045 [US2] Create photo detail page in src/pages/PhotoDetail.vue
- [ ] T046 [US2] Create Albums page with virtual albums in src/pages/Albums.vue

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - 用户自定义相册管理 (Priority: P2)

**Goal**: 用户可以创建和管理自定义相册

**Independent Test**: 可以测试相册创建、编辑、删除以及照片的添加移除操作

### Implementation for User Story 3

- [ ] T047 [P] [US3] Add custom album creation API in server/services/AlbumService.js
- [ ] T048 [P] [US3] Add photo add/remove from album API in server/routes/albums.js
- [ ] T049 [P] [US3] Update Album store for custom album management in src/stores/album.js
- [ ] T050 [P] [US3] Add drag-and-drop functionality to PhotoCard component
- [ ] T051 [P] [US3] Add album editing UI to Albums page
- [ ] T052 [US3] Add album deletion functionality with confirmation
- [ ] T053 [US3] Add album rename functionality

**Checkpoint**: All user stories up to US3 should now be independently functional

---

## Phase 6: User Story 4 - 照片搜索与筛选 (Priority: P2)

**Goal**: 用户可以通过搜索和筛选快速找到照片

**Independent Test**: 可以通过为测试照片添加不同的元数据标签，验证搜索筛选功能

### Implementation for User Story 4

- [ ] T054 [P] [US4] Implement SearchService in server/services/SearchService.js
- [ ] T055 [P] [US4] Add search/filter API endpoints in server/routes/photos.js
- [ ] T056 [P] [US4] Add search filter UI to photo grid page
- [ ] T057 [P] [US4] Add date range filter component
- [ ] T058 [P] [US4] Add camera filter component
- [ ] T059 [US4] Add location filter component
- [ ] T060 [US4] Integrate search with Photo store
- [ ] T061 [US4] Add tag management functionality

---

## Phase 7: User Story 5 - 修改磁盘组织方案 (Priority: P2)

**Goal**: 用户可以修改磁盘组织方案并自动整理照片

**Independent Test**: 可以通过修改配置并触发整理来测试，验证文件正确移动到新位置

### Implementation for User Story 5

- [ ] T062 [P] [US5] Implement OrganizeService in server/services/OrganizeService.js
- [ ] T063 [P] [US5] Add organize preview API endpoint
- [ ] T064 [P] [US5] Add organize execute API endpoint with progress tracking
- [ ] T065 [P] [US5] Create OrganizePreview component in src/components/OrganizePreview.vue
- [ ] T066 [US5] Add organize configuration options to Settings page
- [ ] T067 [US5] Add progress display during organize operation
- [ ] T068 [US5] Implement error handling and rollback logic

---

## Phase 8: User Story 6 - 远程访问照片 (Priority: P3)

**Goal**: 用户可以从其他设备访问照片服务

**Independent Test**: 可以通过在同一网络下的另一台设备访问服务来测试

### Implementation for User Story 6

- [ ] T069 [P] [US6] Configure Express to listen on all interfaces
- [ ] T070 [P] [US6] Add remote access toggle to Settings
- [ ] T071 [P] [US6] Add responsive mobile layout to Quasar frontend
- [ ] T072 [US6] Test remote access functionality in various mobile browsers

---

## Phase 9: User Story 7 - 设置与配置管理 (Priority: P3)

**Goal**: 用户可以管理应用的各种设置

**Independent Test**: 可以测试各项设置的保存和生效

### Implementation for User Story 7

- [ ] T073 [P] [US7] Create Settings page UI in src/pages/Settings.vue
- [ ] T074 [P] [US7] Add directory path configuration UI
- [ ] T075 [P] [US7] Add organization pattern selection UI
- [ ] T076 [P] [US7] Add duplicate detection mode selection UI
- [ ] T077 [US7] Add thumbnail quality configuration UI
- [ ] T078 [US7] Add remote access port configuration UI

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T079 [P] Add progress bar for long-running operations
- [ ] T080 [P] Add batch processing for large photo collections
- [ ] T081 [P] Implement directory conflict validation (same path or subdirectory check)
- [ ] T082 [P] Add disk full error handling with user prompt
- [ ] T083 [P] Add file locked error handling (skip and log)
- [ ] T084 [P] Handle corrupted media files (skip and log errors)
- [ ] T085 [P] Add network error recovery for remote access
- [ ] T086 [P] Add logging to all services
- [ ] T087 [P] Performance optimizations across all features
- [ ] T088 [P] Add unit tests for services in tests/unit/
- [ ] T089 [P] Add integration tests in tests/integration/
- [ ] T090 [P] Build Electron app for Windows/macOS/Linux
- [ ] T091 [P] Final documentation and README updates

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - May integrate with US1 but should be independently testable
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1/US2 but should be independently testable
- **User Story 4 (P2)**: Can start after Foundational (Phase 2) - Depends on US2 photo browsing
- **User Story 5 (P2)**: Can start after Foundational (Phase 2) - Depends on US1 import functionality
- **User Story 6 (P3)**: Can start after Foundational (Phase 2) - May integrate with any frontend story
- **User Story 7 (P3)**: Can start after Foundational (Phase 2) - May integrate with any settings-related story

### Within Each User Story

- Models before services
- Services before API endpoints
- Core implementation before frontend UI
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, US1 and US2 can start in parallel (if team capacity allows)
- US3-7 can all start independently after Foundational completion
- Models within a story marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all models for User Story 1 together:
Task: "Create Setting entity model in server/db/models/Setting.js"
Task: "Create ImportTask entity model in server/db/models/ImportTask.js"

# Launch all services for User Story 1 together:
Task: "Implement SettingService in server/services/SettingService.js"
Task: "Implement ImportService in server/services/ImportService.js"
Task: "Implement ExifService in server/services/ExifService.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Add User Story 4 → Test independently → Deploy/Demo
6. Add User Story 5 → Test independently → Deploy/Demo
7. Add User Stories 6-7 → Test independently → Deploy/Demo
8. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Stories 3-4
3. Stories complete and integrate independently

---

## Summary Statistics

- **Total Tasks**: 87 tasks
- **User Stories**: 7 stories
- **Phase 1 (Setup)**: 6 tasks
- **Phase 2 (Foundational)**: 8 tasks
- **Phase 3-9 (User Stories)**: 61 tasks
- **Phase 10 (Polish)**: 9 tasks
- **Parallelable Tasks**: 46 tasks ([P] marked)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
