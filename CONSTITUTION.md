# MyPhoto 项目开发宪章

## 概述

本文档记录了 MyPhoto 照片相册管理应用开发过程中的经验教训、最佳实践和改进建议。

**创建日期**: 2026-05-04
**项目**: MyPhoto (001-photo-album-manager)
**完成度**: 91/91 任务 (100%)

---

## 一、开发流程规范

### 1.1 项目初始化检查清单

在新项目开始前，必须完成以下验证：

```bash
# 1. 安装依赖
pnpm install

# 2. 运行类型检查
pnpm typecheck

# 3. 尝试构建
pnpm build

# 4. 启动开发服务器
pnpm dev
```

### 1.2 任务执行顺序

按照以下优先级执行任务：

| 优先级 | 阶段 | 说明 |
|-------|------|------|
| P0 | Phase 1-2 | 基础设置和数据库模型 |
| P1 | Phase 3-4 | 核心功能（US1-US2） |
| P2 | Phase 5-7 | 高级功能（US3-US5） |
| P3 | Phase 8-9 | 辅助功能（US6-US7） |
| P4 | Phase 10 | 测试和文档 |

---

## 二、技术规范

### 2.1 TypeScript 类型规范

#### ✅ 推荐做法

```typescript
// 1. 为 ref 添加显式类型
const settings = ref<Settings>({
  photoSourcePath: '',
  duplicateDetection: 'hash'
})

// 2. 为函数参数添加类型
function processPhoto(photo: Photo): Promise<Result> {
  // ...
}

// 3. 使用接口定义复杂类型
interface Photo {
  id: string
  filePath: string
  thumbnailPath: string | null  // 明确可空类型
  fileHash: string | null
}
```

#### ❌ 避免做法

```typescript
// 避免：使用 any
const data: any = fetchData()

// 避免：依赖类型推断
const settings = ref({
  duplicateDetection: 'hash'  // TypeScript 可能推断为 string
})

// 避免：隐式 any
function process(data) {  // 参数应该有类型
  // ...
}
```

### 2.2 模块导入规范

#### 路径别名使用

```typescript
// ✅ 正确：使用 @ 别名
import { api } from '@/api'
import { usePhotoStore } from '@/stores/photo'

// ❌ 错误：使用相对路径
import { api } from 'src/api'
```

#### 类型声明文件

当使用全局变量（如 Electron API）时，创建类型声明文件：

```typescript
// src/electron-api.d.ts
export {}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
```

### 2.3 Vue/Quasar 组件规范

```vue
<script setup lang="ts">
// 1. 定义 Props 类型
interface Props {
  photo: Photo
  selected?: boolean
  draggable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selected: false,
  draggable: false
})

// 2. 使用 computed 派生值
const thumbnailUrl = computed(() => {
  if (!props.photo.thumbnailPath) return ''
  return `/api/photos/thumbnail/${props.photo.thumbnailPath}`
})

// 3. 事件使用 defineEmits
const emit = defineEmits<{
  (e: 'click', photo: Photo): void
  (e: 'delete', photo: Photo): void
}>()
</script>
```

---

## 三、问题处理指南

### 3.1 常见问题及解决方案

| 问题 | 症状 | 解决方案 |
|-----|------|---------|
| 模块找不到 | `Cannot find module 'xxx'` | 检查路径别名配置和 package.json |
| 类型推断错误 | `Type 'string' not assignable` | 添加显式类型注解 |
| 原生模块构建失败 | `Could not locate bindings` | 使用 `pnpm install --force` 或切换方案 |
| 装饰器错误 | `Cannot resolve decorator` | tsconfig.json 启用 `experimentalDecorators` |

### 3.2 降级策略

当遇到复杂问题无法快速解决时，采用降级策略：

```typescript
// 问题：TypeORM 循环依赖
// 降级方案：创建简化版本

// server/app-simple.ts - 内存数据版本
const photos: any[] = [
  { id: '1', fileName: 'photo1.jpg' },
  // ...
]

app.get('/api/photos', (req, res) => {
  res.json(photos)
})
```

### 3.3 数据库问题处理

#### 问题：better-sqlite3 编译失败

```bash
# 方案1：重新安装
pnpm config set ignore-scripts false
Remove-Item -Recurse -Force node_modules
pnpm install

# 方案2：使用替代方案
# 修改 server/db/index.ts 使用 sqlite3 而非 better-sqlite3
```

---

## 四、代码质量检查

### 4.1 必须执行的检查

```bash
# 类型检查
pnpm typecheck

# Lint 检查
pnpm lint

# 构建测试
pnpm build

# 运行测试
pnpm test
```

### 4.2 Git 提交规范

```
<type>(<scope>): <subject>

Types:
- feat: 新功能
- fix: 修复 bug
- docs: 文档更新
- style: 代码格式
- refactor: 重构
- test: 测试
- chore: 构建/工具
```

---

## 五、经验教训总结

### 5.1 做得好

1. **渐进式实现**：从基础开始，逐步完成复杂功能
2. **快速原型**：遇到问题时先创建简化版本绕过
3. **类型声明**：及时创建全局类型声明文件
4. **任务追踪**：使用 todo list 跟踪进度

### 5.2 需要改进

1. **前期验证不足**：
   - 应该在项目初期验证所有关键依赖的兼容性
   - 建议：建立依赖兼容性检查清单

2. **类型系统使用不够严格**：
   - 建议：开启 TypeScript `strict: true`
   - 建议：配置 pre-commit hook 运行类型检查

3. **模块组织不一致**：
   - 建议：建立统一的命名规范
   - 建议：使用 barrel 文件统一导出

---

## 六、推荐的工具配置

### 6.1 VS Code 配置

```json
{
  "typescript.preferences.importModuleSpecifier": "non-relative",
  "typescript.tsdk": "node_modules/typescript/lib",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll": true
  }
}
```

### 6.2 Git Hooks (husky)

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "pnpm typecheck && pnpm lint",
      "pre-push": "pnpm test"
    }
  }
}
```

---

## 七、附录

### 7.1 相关文档

- 规格说明：`specs/001-photo-album-manager/spec.md`
- 架构文档：`ARCHITECTURE.md`
- 数据模型：`specs/001-photo-album-manager/data-model.md`
- 快速开始：`specs/001-photo-album-manager/quickstart.md`

### 7.2 变更历史

| 日期 | 版本 | 变更说明 |
|-----|------|---------|
| 2026-05-04 | 1.0 | 初始版本 |

---

*本文档为 MyPhoto 项目经验总结，适用于指导未来类似项目的开发流程。*
