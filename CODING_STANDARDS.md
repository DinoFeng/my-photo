# 前端开发规范

## 1. API 调用规范

### 1.1 统一封装原则
- **禁止**在多个文件中重复处理 `fetch` 请求和认证头
- **必须**使用统一的 API 客户端工具：`src/utils/apiClient.ts`
- **示例**：
  ```typescript
  // ✅ 正确
  import { apiClient } from '../utils/apiClient'
  const data = await apiClient.get<MediaResponse>('/api/media')
  
  // ❌ 错误 - 重复代码
  const response = await fetch('http://localhost:3000/api/media', {
    headers: { 'Authorization': 'Basic ' + btoa('admin:password') }
  })
  ```

### 1.2 SSE 实时推送
- **禁止**使用轮询方式获取实时数据
- **必须**使用 SSE（Server-Sent Events）实现实时更新
- **示例**：
  ```typescript
  import { sseRequest } from '../utils/apiClient'
  
  await sseRequest<ScanProgress>(
    `/api/sse/scan-progress/${id}`,
    async (progress) => {
      // 处理进度更新
    },
    abortController.signal
  )
  ```

## 2. 用户体验规范

### 2.1 自动触发原则
- 添加源目录后**必须**自动触发扫描
- **禁止**让用户手动触发扫描（除非用户明确需要重新扫描）
- **示例**：
  ```typescript
  const newDir = await sourceDirStore.createDirectory(formData)
  if (newDir) {
    await sourceDirStore.startScan(newDir.id)
    connectSSE(newDir.id)
  }
  ```

## 3. 代码结构规范

### 3.1 Store 层职责
- **数据管理**：集中管理应用状态
- **API 调用**：封装所有数据获取和修改逻辑
- **业务逻辑**：处理数据转换和业务规则
- **禁止**在组件中直接调用 API

### 3.2 组件层职责
- **UI 展示**：负责界面渲染
- **用户交互**：处理用户输入和事件
- **状态订阅**：从 Store 获取数据并响应变化
- **禁止**在组件中编写业务逻辑

## 4. 错误处理规范

### 4.1 统一错误处理
- API 调用**必须**包含 try-catch 块
- 错误信息**必须**记录到控制台
- 用户界面**应该**显示友好的错误提示

### 4.2 资源清理
- SSE 连接**必须**在组件卸载时关闭
- AbortController**必须**正确管理
- **示例**：
  ```typescript
  onUnmounted(() => {
    sseAbortControllers.forEach((controller) => controller.abort())
    sseAbortControllers.clear()
  })
  ```

## 5. 命名规范

### 5.1 文件命名
- 使用 **kebab-case**：`source-dirs.vue`, `api-client.ts`
- 组件文件**必须**以 `.vue` 结尾
- 工具文件**必须**以 `.ts` 结尾

### 5.2 变量命名
- 使用 **camelCase**：`sourceDirectoryId`, `scanProgress`
- 组件引用使用 **PascalCase**：`SourceDirs`, `PhotoDetail`

## 6. TypeScript 规范

### 6.1 类型定义
- **必须**为所有函数参数和返回值定义类型
- **必须**为复杂数据结构定义 interface 或 type
- **禁止**使用 `any` 类型（除非有充分理由）

### 6.2 泛型使用
- API 响应**应该**使用泛型定义：`apiClient.get<MediaResponse>('/api/media')`

## 7. 性能优化规范

### 7.1 避免不必要的更新
- 使用 Vue 的响应式系统优化渲染
- **禁止**在循环中调用 API
- 使用 computed 属性优化数据计算

### 7.2 连接管理
- SSE 连接**应该**按需建立和销毁
- **禁止**保持不必要的长连接

## 8. 安全规范

### 8.1 认证处理
- 认证信息**必须**集中管理
- **禁止**在代码中硬编码敏感信息
- 使用环境变量管理配置

### 8.2 请求安全
- **必须**对所有 API 请求进行认证
- **必须**验证用户输入

---

## 总结

| 规范类别 | 核心原则 |
|---------|---------|
| API调用 | 统一封装，避免重复 |
| 实时更新 | 使用SSE，禁止轮询 |
| 用户体验 | 自动触发，减少操作步骤 |
| 代码结构 | 分层清晰，职责分离 |
| 错误处理 | 统一处理，资源清理 |
| 类型安全 | 严格定义，避免any |