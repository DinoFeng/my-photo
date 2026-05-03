# Quickstart: My-Photo Development

**Feature**: [spec.md](file:///mnt/c/Git/Dino/my-photo/specs/001-photo-album-manager/spec.md)
**Updated**: 2026-05-03

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 18+ | LTS recommended |
| pnpm | 8+ | Package manager (required) |
| Python | 3.10+ | Only for AI service (Phase 2) |
| Git | 2.0+ | Version control |

## Initial Setup

### 1. Clone and Install

```bash
# Clone repository
git clone <repository-url>
cd my-photo

# Install pnpm if not already installed
npm install -g pnpm

# Install dependencies
pnpm install
```

### 2. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit configuration
vim .env
```

### 3. Database Initialization

```bash
# Run database migrations
pnpm run db:migrate

# Seed initial data (if needed)
pnpm run db:seed
```

### 4. Start Development Server

```bash
# Start Electron app with hot reload
pnpm run dev

# Or start backend only (for web testing)
pnpm run server:dev

# Start frontend only
pnpm run client:dev
```

## Project Structure Overview

```
my-photo/
├── electron/          # Electron main process
├── src/              # Quasar frontend
├── server/           # Express backend
└── ai-service/       # Python AI (Phase 2)
```

## Key Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start full development mode (Electron) |
| `npm run build` | Build for production |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run lint` | Run linter |
| `npm run typecheck` | Run TypeScript checker |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Seed database with test data |

## Development Workflow

### 1. Frontend Development

```bash
# Start frontend dev server (port 9000)
npm run client:dev

# Access at http://localhost:9000
```

Frontend auto-reloads on code changes.

### 2. Backend Development

```bash
# Start backend dev server (port 3000)
npm run server:dev

# API available at http://localhost:3000/api
```

### 3. Full Stack Development

```bash
# Start both frontend and backend
npm run dev

# Electron window opens automatically
```

## Testing

### Unit Tests

```bash
# Run all unit tests
npm run test

# Run with coverage
npm run test:coverage

# Run specific test file
npm run test -- src/server/services/PhotoService.spec.js
```

### End-to-End Tests

```bash
# Start dev servers in background
npm run dev &

# Run Playwright tests
npm run test:e2e

# Run specific test
npm run test:e2e -- tests/e2e/photo-import.spec.js
```

## Build for Production

```bash
# Build Electron app for current platform
npm run build:electron

# Build for all platforms
npm run build:all

# Output in dist/ folder
```

## Common Issues

### Sharp native module build fails

```bash
# Rebuild native modules
npm rebuild sharp

# Or reinstall
npm install sharp
```

### Port already in use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Database migration errors

```bash
# Reset database (WARNING: deletes all data)
npm run db:reset

# Recreate from migrations
npm run db:migrate:reset
```

## Next Steps

1. Review [data-model.md](file:///mnt/c/Git/Dino/my-photo/specs/001-photo-album-manager/data-model.md) for database schema
2. Check [plan.md](file:///mnt/c/Git/Dino/my-photo/specs/001-photo-album-manager/plan.md) for architecture details
3. See [tasks.md](file:///mnt/c/Git/Dino/my-photo/specs/001-photo-album-manager/tasks.md) for implementation tasks
