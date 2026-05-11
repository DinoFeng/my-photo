# NAS 照片管理器 - 项目规范

## 包管理
- 统一使用 **pnpm** 作为包管理器
- 安装依赖：`pnpm install`
- 添加依赖：`pnpm add <package-name>`
- 添加开发依赖：`pnpm add -D <package-name>`

## TypeScript 配置
- 配置文件：`tsconfig.json`
- 当前配置要点：
  - TypeScript 版本：5.5.4
  - `moduleResolution`: 使用 `node`（避免使用 `node10`）
  - 不需要 `ignoreDeprecations` 选项
- 注意：使用 TypeScript 6.x 时，`ignoreDeprecations` 选项可能与 VS Code 存在兼容性问题

## 数据库 ORM
- 使用 **Drizzle ORM** 替代 Prisma
- 数据库操作文件：
  - `src/db/schema.ts` - 数据模型定义
  - `src/db/index.ts` - 数据库连接配置
- 数据库脚本：
  - `pnpm run db:generate` - 生成迁移
  - `pnpm run db:push` - 推送 schema 变更
  - `pnpm run db:studio` - 启动 Drizzle Studio

## 项目启动
- 开发模式：`pnpm run dev`
- 构建：`pnpm run build`
- 生产启动：`pnpm start`

## 常见问题
1. TypeScript 版本兼容性：
   - 建议使用 TypeScript 5.x 版本以避免配置兼容性问题
   - 使用 `moduleResolution: "node"` 而非 `node10` 可避免弃用警告

