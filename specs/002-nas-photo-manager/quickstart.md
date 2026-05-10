# Quickstart: NAS 照片管理应用

**Feature**: `002-nas-photo-manager`
**Date**: 2026-05-10

## Prerequisites

- Node.js 20+
- pnpm 8+ (或 npm/yarn)
- Docker & Docker Compose

## Development Setup

### 1. Clone and Install

```bash
# 克隆项目
git clone <repository>
cd my-photo

# 安装后端依赖
cd backend
pnpm install

# 安装前端依赖
cd ../frontend
pnpm install
```

### 2. Environment Configuration

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件
PORT=3000
DATABASE_URL=file:../data/photos.db
PHOTO_PATH=/path/to/photos
VIDEO_PATH=/path/to/videos
IMPORT_PATH=/path/to/import
```

### 3. Initialize Database

```bash
cd backend
pnpm prisma generate    # 生成 Prisma 客户端
pnpm prisma db push     # 创建数据库表
```

### 4. Start Development Server

```bash
# 终端 1: 启动后端
cd backend
pnpm dev

# 终端 2: 启动前端
cd frontend
pnpm dev
```

访问 `http://localhost:5173`

## Docker Deployment

### Using Docker Compose (Recommended)

```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止
docker-compose down
```

### Manual Docker Run

```bash
# 构建镜像
docker build -t my-photo ./docker

# 运行容器
docker run -d \
  --name my-photo \
  -p 3000:3000 \
  -v /path/to/photos:/photos:ro \
  -v /path/to/videos:/videos:ro \
  -v /path/to/import:/import:rw \
  -v /path/to/data:/data \
  -e PORT=3000 \
  --memory=512m \
  my-photo
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3000 | 服务端口 |
| DATABASE_URL | file:/data/photos.db | SQLite 数据库路径 |
| PHOTO_PATH | /photos | 照片源目录 |
| VIDEO_PATH | /videos | 视频源目录 |
| IMPORT_PATH | /import | 导入目录 |
| BASIC_AUTH_USERNAME | - | Basic Auth 用户名 |
| BASIC_AUTH_PASSWORD | - | Basic Auth 密码 |

## Project Structure

```
my-photo/
├── frontend/           # Vue 3 SPA
│   ├── src/
│   │   ├── components/  # UI 组件
│   │   ├── pages/       # 页面
│   │   ├── stores/       # Pinia 状态
│   │   └── api/         # API 客户端
│   └── package.json
├── backend/            # Express API
│   ├── src/
│   │   ├── controllers/  # API 控制器
│   │   ├── services/     # 业务逻辑
│   │   └── routes/       # 路由
│   ├── prisma/
│   │   └── schema.prisma # 数据库 Schema
│   └── package.json
└── docker/            # Docker 配置
    ├── Dockerfile
    └── docker-compose.yml
```

## Common Commands

```bash
# 后端
cd backend
pnpm dev           # 开发模式
pnpm build         # 构建
pnpm typecheck     # 类型检查
pnpm test          # 测试

# 前端
cd frontend
pnpm dev           # 开发模式
pnpm build         # 构建
pnpm typecheck     # 类型检查
pnpm test          # 测试

# 数据库
pnpm prisma studio # 打开 Prisma Studio
pnpm prisma migrate # 数据库迁移
```

## Troubleshooting

### Docker Memory Issues

```yaml
# docker-compose.yml
services:
  my-photo:
    deploy:
      resources:
        limits:
          memory: 512M
```

### Permission Issues

确保挂载的目录有正确的读写权限：

```bash
# Linux
chmod -R 755 /path/to/photos
chmod -R 777 /path/to/import
```
