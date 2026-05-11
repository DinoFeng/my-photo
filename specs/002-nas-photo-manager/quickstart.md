# Quickstart: NAS 照片管理应用

**Feature**: `002-nas-photo-manager`
**Date**: 2026-05-10

## 目录
- [前置准备](#prerequisites)
- [开发环境搭建](#development-setup)
- [生产环境部署](#production-deployment)
- [环境变量](#environment-variables)
- [项目结构](#project-structure)
- [常用命令](#common-commands)
- [故障排查](#troubleshooting)

---

## Prerequisites

- **Node.js 20+** (开发环境)
- **pnpm 8+** (或 npm/yarn)
- **Docker & Docker Compose** (推荐)
- **512MB+** 可用内存 (推荐)

## Development Setup

### 1. 项目克隆与依赖安装

```bash
# 克隆项目
git clone <repository>
cd my-photo

# 安装根依赖
pnpm install

# 安装后端依赖
cd backend
pnpm install

# 安装前端依赖
cd ../frontend
pnpm install
```

### 2. 环境配置

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，配置以下变量：
PORT=3000
NODE_ENV=development
DATABASE_URL=file:../data/photos.db
BASIC_AUTH_USERNAME=admin
BASIC_AUTH_PASSWORD=your_secure_password
```

### 3. 数据库初始化

```bash
cd backend
npx prisma generate    # 生成 Prisma 客户端
npx prisma db push     # 创建数据库表
```

### 4. 启动开发服务器

```bash
# 终端 1: 启动后端
cd backend
pnpm dev

# 终端 2: 启动前端
cd frontend
pnpm dev
```

访问 `http://localhost:5173` (前端) 或 `http://localhost:3000/api/health` (后端健康检查)

---

## Production Deployment

### 方式一: Docker Compose (推荐)

这是最简便的部署方式，适用于 NAS 或服务器环境。

#### 1. 准备部署环境

```bash
# 1. 在 NAS 上创建必要的目录
mkdir -p /volume1/docker/my-photo/{data,import}
mkdir -p /volume1/photos
mkdir -p /volume1/videos

# 2. 设置权限 (确保 Docker 容器可访问)
chmod 755 /volume1/photos /volume1/videos
chmod 777 /volume1/docker/my-photo/{data,import}
```

#### 2. 配置 `docker-compose.yml`

```yaml
version: '3.8'

services:
  my-photo:
    container_name: my-photo
    build:
      context: ..
      dockerfile: docker/Dockerfile
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_URL=file:/data/photos.db
      - BASIC_AUTH_USERNAME=admin
      - BASIC_AUTH_PASSWORD=your_secure_password
    volumes:
      - /volume1/photos:/photos:ro
      - /volume1/videos:/videos:ro
      - /volume1/docker/my-photo/data:/data:rw
      - /volume1/docker/my-photo/import:/import:rw
      - /volume1/docker/my-photo/logs:/app/logs:rw
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

#### 3. 启动服务

```bash
cd docker
docker-compose up -d --build

# 查看日志
docker-compose logs -f

# 查看服务状态
docker-compose ps
```

#### 4. 更新部署

```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker-compose up -d --build
```

### 方式二: 系统服务 (systemd)

如果您不想使用 Docker，可以直接部署为系统服务。

```bash
# 构建前端
cd frontend
pnpm build

# 构建后端
cd ../backend
pnpm build

# 复制到生产目录
sudo mkdir -p /opt/my-photo
sudo cp -r . /opt/my-photo/

# 创建 systemd 服务
sudo nano /etc/systemd/system/my-photo.service
```

```ini
[Unit]
Description=NAS Photo Manager
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/my-photo
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/node backend/dist/server.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# 启动服务
sudo systemctl daemon-reload
sudo systemctl enable my-photo
sudo systemctl start my-photo
sudo systemctl status my-photo
```

---

## Environment Variables

| 变量名 | 默认值 | 描述 | 必填 |
|--------|--------|------|------|
| `PORT` | `3000` | 服务端口 | 否 |
| `NODE_ENV` | `development` | 运行环境 (`development`/`production`) | 否 |
| `DATABASE_URL` | `file:/data/photos.db` | SQLite 数据库路径 | 否 |
| `BASIC_AUTH_USERNAME` | - | Basic Auth 用户名 | 是 |
| `BASIC_AUTH_PASSWORD` | - | Basic Auth 密码 | 是 |

---

## Project Structure

```
my-photo/
├── frontend/                 # Vue 3 SPA
│   ├── src/
│   │   ├── components/       # UI 组件
│   │   ├── views/            # 页面
│   │   ├── stores/           # Pinia 状态管理
│   │   ├── styles/           # 全局样式
│   │   ├── utils/            # 工具函数
│   │   ├── main.ts           # 应用入口
│   │   └── routes.ts         # 路由配置
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── backend/                  # Express API
│   ├── src/
│   │   ├── controllers/      # API 控制器
│   │   ├── services/         # 业务逻辑
│   │   ├── routes/           # 路由定义
│   │   ├── middleware/       # 中间件
│   │   └── server.ts         # 服务入口
│   ├── prisma/
│   │   └── schema.prisma     # 数据库 Schema
│   ├── data/
│   │   └── *.db              # SQLite 数据库 (gitignored)
│   ├── logs/
│   │   ├── access.log        # 访问日志 (gitignored)
│   │   └── error.log         # 错误日志 (gitignored)
│   └── package.json
├── docker/                   # Docker 配置
│   ├── Dockerfile
│   └── docker-compose.yml
├── specs/                    # 项目文档
│   └── 002-nas-photo-manager/
├── .gitignore
├── .env.example
├── pnpm-workspace.yaml
└── package.json
```

---

## Common Commands

```bash
# 根目录
pnpm build          # 构建前后端
pnpm clean          # 清理构建产物

# 后端
cd backend
pnpm dev            # 开发模式 (热重载)
pnpm build          # 生产构建
pnpm typecheck      # TypeScript 类型检查
pnpm lint           # 代码检查
npx prisma studio   # 打开 Prisma Studio (数据库 GUI)
npx prisma db push  # 同步数据库 schema

# 前端
cd frontend
pnpm dev            # 开发模式 (热重载)
pnpm build          # 生产构建
pnpm preview        # 预览生产构建
pnpm typecheck      # TypeScript 类型检查

# Docker
cd docker
docker-compose up -d          # 启动
docker-compose down           # 停止
docker-compose logs -f        # 查看日志
docker-compose restart        # 重启
docker-compose exec my-photo sh  # 进入容器
```

---

## Troubleshooting

### 问题 1: Docker 容器无法访问挂载目录

**症状**: 系统无法找到照片文件或权限错误

**解决方法**:
```bash
# 检查目录权限
ls -la /path/to/photos

# 修复权限
sudo chown -R 1000:1000 /path/to/data
sudo chmod -R 755 /path/to/photos
sudo chmod -R 777 /path/to/import
```

### 问题 2: 内存不足导致容器崩溃

**症状**: 容器不断重启，日志显示 "Out of memory"

**解决方法**:
- 减少并发扫描数量
- 增加 Docker 内存限制 (在 docker-compose.yml 中调整)
- 确保 NAS 有足够的可用内存

### 问题 3: 数据库损坏

**症状**: API 返回数据库错误

**解决方法**:
```bash
# 停止服务
docker-compose down

# 备份数据库
cp data/photos.db data/photos.db.bak

# 如果使用 Docker，重建数据库
# docker-compose up -d
# npx prisma db push
```

### 问题 4: 端口被占用

**症状**: 无法启动服务

**解决方法**:
```bash
# Linux/macOS
lsof -ti :3000 | xargs kill -9

# Windows (PowerShell)
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### 问题 5: 日志文件过大

**解决方法**: 配置日志轮转

```bash
# 创建 logrotate 配置
sudo nano /etc/logrotate.d/my-photo
```

```
/opt/my-photo/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
```

---

## API Endpoints 参考

| 方法 | 路径 | 描述 |
|------|------|------|
| `GET` | `/api/health` | 健康检查 |
| `GET` | `/api/monitor/status` | 系统状态 |
| `GET` | `/api/monitor/stats` | 统计数据 |
| `GET/POST` | `/api/source-dirs` | 源目录管理 |
| `GET/POST` | `/api/media` | 媒体文件浏览 |
| `GET/POST` | `/api/export` | 导出功能 |

---

## Security 最佳实践

1. **修改默认密码**: 首次部署务必修改 Basic Auth 密码
2. **启用 HTTPS**: 在生产环境使用反向代理 (如 Nginx) 启用 HTTPS
3. **防火墙限制**: 仅允许可信 IP 访问
4. **定期备份**: 备份数据库和配置
5. **日志监控**: 定期检查访问日志和错误日志

---

## Support

如有问题，请查看:
- 项目 Issue 页面
- 详细 spec 文档: `specs/002-nas-photo-manager/spec.md`

