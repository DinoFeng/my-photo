# API Contracts: NAS 照片管理应用

**Feature**: `002-nas-photo-manager`
**Date**: 2026-05-10

## Overview

REST API 契约定义。本 API 使用 HTTP Basic Auth 保护（第一阶段）。

Base URL: `http://localhost:3000/api`

## Common Headers

```
Content-Type: application/json
Authorization: Basic <base64(username:password)>
```

## Common Responses

### Success Response

```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

---

## Source Directories

### GET /api/source-dirs

获取所有源目录列表

**Response**

```json
{
  "success": true,
  "data": [
    {
      "id": "clx1234567890",
      "name": "我的照片",
      "path": "/photos",
      "type": "photo",
      "status": "active",
      "mediaCount": 1234,
      "createdAt": "2026-05-10T00:00:00Z"
    }
  ]
}
```

### POST /api/source-dirs

添加新源目录

**Request**

```json
{
  "name": "我的照片",
  "path": "/photos",
  "type": "photo"
}
```

**Response**

```json
{
  "success": true,
  "data": {
    "id": "clx1234567890",
    "name": "我的照片",
    "path": "/photos",
    "type": "photo",
    "status": "active",
    "createdAt": "2026-05-10T00:00:00Z"
  }
}
```

### GET /api/source-dirs/:id

获取源目录详情

**Response**

```json
{
  "success": true,
  "data": {
    "id": "clx1234567890",
    "name": "我的照片",
    "path": "/photos",
    "type": "photo",
    "status": "active",
    "mediaCount": 1234,
    "lastScannedAt": "2026-05-10T00:00:00Z",
    "createdAt": "2026-05-10T00:00:00Z"
  }
}
```

### PUT /api/source-dirs/:id

更新源目录信息

**Request**

```json
{
  "name": "新名称",
  "status": "disabled"
}
```

### DELETE /api/source-dirs/:id

删除源目录（不删除文件）

### POST /api/source-dirs/:id/scan

触发全量扫描

**Response**

```json
{
  "success": true,
  "data": {
    "checkpointId": "clx0987654321",
    "status": "running"
  }
}
```

### GET /api/source-dirs/:id/scan-status

获取扫描进度

**Response**

```json
{
  "success": true,
  "data": {
    "status": "running",
    "filesProcessed": 500,
    "totalFiles": 10000,
    "percent": 5,
    "lastScannedPath": "/photos/vacation IMG_0500.jpg"
  }
}
```

### POST /api/source-dirs/:id/scan-pause

暂停扫描

### POST /api/source-dirs/:id/scan-resume

恢复扫描

### POST /api/source-dirs/:id/scan-cancel

取消扫描

---

## Media

### GET /api/media

获取媒体列表

**Query Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | 页码 |
| limit | number | 20 | 每页数量 (max 100) |
| sourceDirId | string | - | 按源目录筛选 |
| type | string | - | photo/video |
| status | string | active | active/missing/removed |
| startDate | string | - | 开始日期 (ISO) |
| endDate | string | - | 结束日期 (ISO) |
| search | string | - | 搜索关键词 |

**Response**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "clx1111111111",
        "filename": "IMG_0001.jpg",
        "path": "/photos/2024/05/IMG_0001.jpg",
        "type": "photo",
        "size": 1234567,
        "mimeType": "image/jpeg",
        "width": 4032,
        "height": 3024,
        "thumbnailUrl": "/thumbnails/clx1111111111.webp",
        "metadata": {
          "dateTaken": "2024-05-10T12:00:00Z",
          "camera": "iPhone 15 Pro",
          "location": "Taipei"
        },
        "status": "active"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1234,
      "totalPages": 62
    }
  }
}
```

### GET /api/media/:id

获取单个媒体详情

**Response**

```json
{
  "success": true,
  "data": {
    "id": "clx1111111111",
    "filename": "IMG_0001.jpg",
    "path": "/photos/2024/05/IMG_0001.jpg",
    "type": "photo",
    "size": 1234567,
    "mimeType": "image/jpeg",
    "width": 4032,
    "height": 3024,
    "hash": "abc123...",
    "thumbnailUrl": "/thumbnails/clx1111111111.webp",
    "metadata": {
      "dateTaken": "2024-05-10T12:00:00Z",
      "camera": "iPhone 15 Pro",
      "lens": "f/1.78",
      "iso": 100,
      "location": {
        "latitude": 25.0330,
        "longitude": 121.5654
      }
    },
    "status": "active",
    "sourceDir": {
      "id": "clx1234567890",
      "name": "我的照片"
    },
    "createdAt": "2026-05-10T00:00:00Z"
  }
}
```

### DELETE /api/media/:id

删除媒体索引（不删除原文件）

---

## Settings

### GET /api/settings

获取系统设置

**Response**

```json
{
  "success": true,
  "data": {
    "importPath": "/import",
    "organizePattern": "{year}/{month}/{day}",
    "duplicatePolicy": "skip",
    "language": "zh",
    "basicAuthEnabled": true
  }
}
```

### PUT /api/settings

更新系统设置

**Request**

```json
{
  "importPath": "/import",
  "organizePattern": "{year}/{month}/{day}",
  "duplicatePolicy": "skip",
  "language": "zh",
  "basicAuthUsername": "admin",
  "basicAuthPassword": "secret"
}
```

---

## Import

### GET /api/import/tasks

获取导入任务列表

**Response**

```json
{
  "success": true,
  "data": [
    {
      "id": "clx2222222222",
      "status": "completed",
      "sourcePath": "/import/IMG_0001.jpg",
      "targetPath": "/photos/2024/05/IMG_0001.jpg",
      "completedAt": "2026-05-10T00:00:00Z"
    }
  ]
}
```

### POST /api/import/scan

手动触发导入目录扫描

**Response**

```json
{
  "success": true,
  "data": {
    "newFilesFound": 10
  }
}
```

---

## Watch Status

### GET /api/watch/status

获取监控服务状态

**Response**

```json
{
  "success": true,
  "data": {
    "sourceDirectories": [
      {
        "id": "clx1234567890",
        "watching": true,
        "eventsProcessed": 150
      }
    ],
    "importDirectory": {
      "watching": true,
      "eventsProcessed": 25
    }
  }
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| NOT_FOUND | 404 | 资源不存在 |
| VALIDATION_ERROR | 400 | 请求参数验证失败 |
| UNAUTHORIZED | 401 | 未授权 (Basic Auth 失败) |
| FORBIDDEN | 403 | 禁止访问 |
| INTERNAL_ERROR | 500 | 内部错误 |
| SCAN_IN_PROGRESS | 409 | 扫描正在进行中 |
| DIR_NOT_FOUND | 400 | 目录不存在 |
| DIR_ALREADY_EXISTS | 400 | 目录已添加 |
