# Data Model: NAS 照片管理应用

**Feature**: `002-nas-photo-manager`
**Date**: 2026-05-10

## Overview

本数据模型定义了 NAS 照片管理应用的数据库结构。使用 Prisma ORM + SQLite。

## Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐
│ SourceDirectory │       │    Media        │
├─────────────────┤       ├─────────────────┤
│ id              │──┐    │ id              │
│ path            │  │    │ filename        │
│ name            │  └───→│ sourceDirId     │
│ type            │       │ path            │
│ status          │       │ type            │
│ createdAt       │       │ size            │
│ updatedAt       │       │ mimeType        │
└─────────────────┘       │ width           │
                          │ height          │
                          │ duration        │
                          │ hash            │
                          │ metadata         │
                          │ thumbnailPath   │
                          │ status          │
                          │ createdAt       │
                          │ updatedAt       │
                          └─────────────────┘

┌─────────────────┐       ┌─────────────────┐
│    Setting      │       │  ScanCheckpoint │
├─────────────────┤       ├─────────────────┤
│ id              │       │ id              │
│ importPath      │       │ sourceDirId     │
│ organizePattern │       │ lastScannedPath │
│ duplicatePolicy │       │ lastScannedAt   │
│ language        │       │ filesProcessed  │
│ basicAuth       │       │ totalFiles      │
│ createdAt       │       │ status          │
│ updatedAt       │       │ createdAt       │
└─────────────────┘       └─────────────────┘
```

## Entities

### SourceDirectory (照片源目录)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | @id @default(cuid()) | 主键 |
| path | String | @unique | 目录路径 |
| name | String | - | 显示名称 |
| type | String | - | 媒体类型: photo/video |
| status | String | @default("active") | active/disabled/missing |
| createdAt | DateTime | @default(now()) | 创建时间 |
| updatedAt | DateTime | @updatedAt | 更新时间 |
| media | Media[] | - | 关联的媒体文件 |

### Media (媒体文件)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | @id @default(cuid()) | 主键 |
| filename | String | - | 文件名 |
| path | String | @unique | 完整文件路径 |
| type | String | - | 媒体类型: photo/video |
| size | Int | - | 文件大小(字节) |
| mimeType | String | - | MIME 类型 |
| width | Int? | - | 宽度(图片/视频) |
| height | Int? | - | 高度(图片/视频) |
| duration | Int? | - | 时长秒数(视频) |
| hash | String | @unique | SHA256 哈希值 |
| metadata | Json? | - | EXIF/元数据 |
| thumbnailPath | String? | - | 缩略图路径 |
| status | String | @default("active") | active/missing/removed |
| sourceDirId | String | - | 关联的源目录 |
| sourceDir | SourceDirectory | - | 关联的源目录对象 |
| createdAt | DateTime | @default(now()) | 创建时间 |
| updatedAt | DateTime | @updatedAt | 更新时间 |

### Setting (系统设置)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | @id @default("default") | 主键(单条记录) |
| importPath | String? | - | 导入目录路径 |
| organizePattern | String | @default("{year}/{month}/{day}") | 组织规则模板 |
| duplicatePolicy | String | @default("skip") | skip/rename/overwrite |
| language | String | @default("zh") | zh/en |
| basicAuthUsername | String? | - | Basic Auth 用户名 |
| basicAuthPassword | String? | - | Basic Auth 密码(加密存储) |
| createdAt | DateTime | @default(now()) | 创建时间 |
| updatedAt | DateTime | @updatedAt | 更新时间 |

### ScanCheckpoint (扫描检查点)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | @id @default(cuid()) | 主键 |
| sourceDirId | String | - | 关联的源目录 |
| lastScannedPath | String? | - | 最后扫描的路径 |
| lastScannedAt | DateTime? | - | 最后扫描时间 |
| filesProcessed | Int | @default(0) | 已处理文件数 |
| totalFiles | Int | @default(0) | 总文件数 |
| status | String | @default("pending") | pending/running/completed/paused |
| createdAt | DateTime | @default(now()) | 创建时间 |

## Indexes

```prisma
model Media {
  // ... fields

  @@index([sourceDirId])
  @@index([status])
  @@index([type])
  @@index([createdAt])
  @@index([hash])
}

model SourceDirectory {
  // ... fields

  @@index([status])
}
```

## Enums

### MediaType
- `photo` - 图片
- `video` - 视频

### MediaStatus
- `active` - 正常
- `missing` - 文件缺失
- `removed` - 已删除

### DuplicatePolicy
- `skip` - 跳过重复文件
- `rename` - 重命名后导入
- `overwrite` - 覆盖已有文件

### ScanStatus
- `pending` - 待处理
- `running` - 扫描中
- `completed` - 已完成
- `paused` - 已暂停
