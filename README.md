# MyPhoto

A modern photo album management application built with Quasar, Electron, and TypeScript.

## Features

- 📷 **Photo Import** - Import photos from various sources with automatic organization
- 📁 **Album Management** - Create and manage custom photo albums
- 🔍 **Smart Search** - Search and filter photos by date, camera, location
- 🗂️ **Auto Organization** - Automatically organize photos by date, camera, or location
- 📱 **Remote Access** - Access your photos from other devices
- 🔄 **Duplicate Detection** - Find and manage duplicate photos

## Development

```bash
# Install dependencies
pnpm install

# Start development server (frontend + backend)
pnpm dev

# Start frontend only
pnpm dev:client

# Start backend only
pnpm dev:server

# Build for production
pnpm build

# Run tests
pnpm test
```

## Tech Stack

- **Frontend**: Quasar + Vue 3 + TypeScript + Vite
- **Backend**: Express + TypeORM + SQLite
- **Desktop**: Electron
- **Testing**: Vitest

## Project Structure

```
├── electron/          # Electron main process
├── server/           # Express backend
│   ├── db/          # Database models and migrations
│   ├── routes/      # API routes
│   ├── services/    # Business logic
│   └── utils/       # Utility functions
├── src/             # Quasar frontend
│   ├── components/ # Vue components
│   ├── pages/       # Page components
│   ├── stores/      # Pinia stores
│   └── api/        # API client
└── specs/           # Project specifications
```

## License

MIT
