# 项目开发经验 Skill

## 触发条件

当用户要求以下操作时，自动激活此 Skill：

1. 开启新项目
2. 总结开发经验
3. 创建项目规范
4. 遇到 TypeScript/模块/数据库问题

## 执行流程

### 1. 项目初始化检查

在项目开始前，必须验证以下内容：

```bash
# 基础验证
pnpm install
pnpm typecheck
pnpm build
pnpm dev

# 检查关键依赖兼容性
pnpm list <package-name>
```

### 2. 问题处理策略

当遇到问题时，按照以下优先级处理：

| 优先级 | 问题类型 | 处理方式 |
|-------|---------|---------|
| P0 | 依赖安装失败 | 检查 pnpm 配置，尝试 `--force` |
| P1 | TypeScript 类型错误 | 添加显式类型注解 |
| P2 | 模块导入错误 | 检查路径别名和导出 |
| P3 | 运行时错误 | 查看日志，创建最小复现 |

### 3. TypeScript 最佳实践

#### 3.1 ref/reactive 类型

```typescript
// ✅ 推荐：显式类型
const count = ref<number>(0)
const settings = ref<Settings>({
  photoSourcePath: '',
  duplicateDetection: 'hash'
})

// ❌ 避免：隐式类型
const count = ref(0)  // 推断为 number，但不如显式清晰
```

#### 3.2 函数类型

```typescript
// ✅ 推荐：完整类型
async function processPhoto(photo: Photo): Promise<Result> {
  // ...
}

// ❌ 避免：隐式 any
async function processPhoto(photo) {  // photo 是 any
  // ...
}
```

#### 3.3 接口和类型别名

```typescript
// ✅ 推荐：接口定义复杂类型
interface Photo {
  id: string
  filePath: string
  thumbnailPath: string | null  // 明确可空
  fileHash: string | null
  exif?: ExifData  // 可选属性
}

// ❌ 避免：使用 any
const photo: any = fetchPhoto()
```

### 4. 模块导入规范

#### 4.1 路径别名

项目应配置 `@` 指向 `src` 目录：

```typescript
// ✅ 正确
import { api } from '@/api'
import PhotoCard from '@/components/PhotoCard.vue'

// ❌ 错误
import { api } from 'src/api'
```

#### 4.2 全局类型声明

当使用全局变量（如 Electron API）时：

```typescript
// src/electron-api.d.ts
export {}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
```

### 5. Vue/Quasar 组件规范

```vue
<script setup lang="ts">
// 1. Props 类型定义
interface Props {
  photo: Photo
  selected?: boolean
  draggable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selected: false,
  draggable: false
})

// 2. Emits 类型定义
const emit = defineEmits<{
  (e: 'click', photo: Photo): void
  (e: 'delete', photo: Photo): void
}>()

// 3. Computed
const thumbnailUrl = computed(() => {
  return props.photo.thumbnailPath 
    ? `/api/photos/thumbnail/${props.photo.thumbnailPath}`
    : 'https://picsum.photos/200/150'
})
</script>
```

### 6. 降级策略

当遇到复杂问题无法快速解决时：

```typescript
// 问题：TypeORM 循环依赖导致编译失败
// 降级方案：创建简化版本

// server/app-simple.ts - 使用内存存储
const photos: any[] = [
  { id: '1', fileName: 'photo1.jpg' },
  // ...
]

app.get('/api/photos', (req, res) => {
  res.json(photos)
})
```

### 7. 数据库问题处理

#### 7.1 better-sqlite3 编译失败

```bash
# 方案1：强制重新安装
pnpm config set ignore-scripts false
Remove-Item -Recurse -Force node_modules, pnpm-lock.yaml
pnpm install

# 方案2：切换到 sqlite3（无需编译）
# 修改 package.json 依赖
```

#### 7.2 TypeORM 循环依赖

```typescript
// 问题：Album 和 Photo 之间的多对多关系导致循环依赖
// 解决：暂时移除关系定义，使用简化的服务层

// 临时方案：在 ImportService 中手动处理关联
async function addPhotoToSystemAlbums(photo: Photo, exif: any) {
  const albums = await getSystemAlbums()
  // 手动创建关联记录
}
```

### 8. 文档归档

完成项目后，应归档以下文档：

| 文档 | 位置 | 内容 |
|-----|------|------|
| 宪章 | `CONSTITUTION.md` | 开发规范、经验教训 |
| 规则 | `.trae/rules/project_rules.md` | 项目特定规则 |
| README | `README.md` | 使用说明 |
| 变更日志 | `CHANGELOG.md` | 版本变更记录 |

### 9. 代码审查清单

提交代码前，确认以下内容：

- [ ] `pnpm typecheck` 通过
- [ ] `pnpm lint` 无错误
- [ ] 新组件/服务已添加类型声明
- [ ] 导出的函数有 JSDoc 注释（如需要）
- [ ] 敏感信息（API keys）未硬编码

---

## 输出要求

当总结开发经验时，输出以下内容：

1. **项目概述**：完成了什么，功能列表
2. **遇到的问题**：按类型分类，附解决方案
3. **经验教训**：做得好 + 需要改进
4. **推荐实践**：最佳做法代码示例
5. **归档位置**：更新了哪些文档

---

## 相关文档

- [CONSTITUTION.md](../../CONSTITUTION.md) - 完整开发宪章
- [project_rules.md](../../.trae/rules/project_rules.md) - 项目规则
