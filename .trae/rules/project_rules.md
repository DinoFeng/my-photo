<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
at: specs/001-photo-album-manager/plan.md

Key Documents:
- Specification: specs/001-photo-album-manager/spec.md
- Architecture: ARCHITECTURE.md
- Data Model: specs/001-photo-album-manager/data-model.md
- Quickstart: specs/001-photo-album-manager/quickstart.md
- Development Constitution: CONSTITUTION.md (开发经验与最佳实践)
<!-- SPECKIT END -->

# 项目规则

## 开发命令

```bash
# 安装依赖
pnpm install

# 启动开发（前端+后端）
pnpm dev

# 单独启动后端（简化版）
pnpm dev:server-simple

# 单独启动前端
pnpm dev:client

# 类型检查
pnpm typecheck

# 构建
pnpm build
```

## 技术栈

- **前端**: Quasar + Vue 3 + TypeScript + Vite
- **后端**: Express + TypeORM + SQLite (简化版使用内存存储)
- **桌面**: Electron
- **状态管理**: Pinia

## 重要规范

### 1. TypeScript 类型规范

- 为所有 `ref` 和 `reactive` 添加显式类型
- 为函数参数和返回值添加类型注解
- 使用 `interface` 定义复杂对象类型

### 2. 模块导入

- 使用 `@/` 路径别名而非相对路径
- 外部 API 使用 `window.electronAPI`，需先确保类型声明存在

### 3. 组件开发

- 使用 `<script setup lang="ts">` 语法
- Props 使用 `withDefaults(defineProps<Props>())` 
- 事件使用 `defineEmits`

### 4. 问题处理

- 遇到原生模块问题：使用简化版本绕过
- 遇到类型错误：添加显式类型注解
- 遇到模块导入错误：检查路径别名配置

## 已知问题

1. `better-sqlite3` 在 pnpm 环境下可能需要 `pnpm install --force`
2. TypeORM 存在循环依赖问题，当前使用简化版 API

## 文档位置

- 完整开发宪章：`CONSTITUTION.md`
- 规格说明：`specs/001-photo-album-manager/spec.md`
- 架构文档：`ARCHITECTURE.md`
