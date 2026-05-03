# Data Model: My-Photo

**Feature**: [spec.md](file:///mnt/c/Git/Dino/my-photo/specs/001-photo-album-manager/spec.md)
**Updated**: 2026-05-03

## Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     Photo       │       │     Album       │       │    Setting      │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id: string (PK)│       │ id: string (PK) │       │ id: string (PK)│
│ diskPath: string│       │ name: string    │       │ key: string    │
│ fileName: string│       │ type: enum      │       │ value: any     │
│ fileHash: string│       │ createdAt: date │       │ updatedAt: date│
│ fileSize: number│       │ updatedAt: date │       └─────────────────┘
│ exifDate: date  │       └─────────────────┘
│ camera: string   │              │
│ city: string     │              │ N:M (through AlbumPhoto)
│ country: string  │              │
│ latitude: number │              ▼
│ longitude: number│       ┌─────────────────┐
│ thumbnailPath: str│       │  AlbumPhoto     │
│ createdAt: date │       ├─────────────────┤
│ updatedAt: date  │       │ albumId: string │
└─────────────────┘       │ photoId: string │
         │                │ addedAt: date   │
         │ 1:1            └─────────────────┘
         ▼
┌─────────────────┐       ┌─────────────────┐
│   ImportTask    │       │   PhotoTag      │
├─────────────────┤       ├─────────────────┤
│ id: string (PK) │       │ id: string (PK) │
│ sourcePath: str │       │ photoId: string │
│ targetPath: str │       │ tag: string     │
│ status: enum    │       │ createdAt: date │
│ errorMsg: string│       └─────────────────┘
│ createdAt: date │
│ completedAt:date│
└─────────────────┘
```

## Entity Definitions

### Photo

照片实体，代表一张照片。

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, NOT NULL | 唯一标识符 |
| diskPath | VARCHAR(512) | NOT NULL, UNIQUE | 照片在磁盘上的完整路径 |
| fileName | VARCHAR(255) | NOT NULL | 文件名 |
| fileHash | VARCHAR(64) | INDEX | 文件内容hash (MD5/SHA) |
| fileSize | BIGINT | NOT NULL | 文件大小(字节) |
| mimeType | VARCHAR(50) | NOT NULL | MIME类型 |
| exifDate | DATETIME | INDEX | EXIF拍摄日期 |
| camera | VARCHAR(100) | INDEX | 相机型号 |
| city | VARCHAR(100) | INDEX | 城市 |
| country | VARCHAR(100) | INDEX | 国家 |
| latitude | DECIMAL(10,8) | NULL | GPS纬度 |
| longitude | DECIMAL(11,8) | NULL | GPS经度 |
| thumbnailPath | VARCHAR(512) | NULL | 缩略图路径 |
| importedAt | DATETIME | NOT NULL | 导入时间 |
| createdAt | DATETIME | NOT NULL | 创建时间 |
| updatedAt | DATETIME | NOT NULL | 更新时间 |

**Indexes**:
- `idx_photo_hash` ON (fileHash)
- `idx_photo_exif_date` ON (exifDate)
- `idx_photo_camera` ON (camera)
- `idx_photo_location` ON (city, country)

### Album

相册实体。

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, NOT NULL | 唯一标识符 |
| name | VARCHAR(255) | NOT NULL | 相册名称 |
| type | ENUM('system', 'custom') | NOT NULL | 相册类型 |
| coverPhotoId | VARCHAR(36) | NULL, FK(Photo) | 封面照片 |
| description | TEXT | NULL | 相册描述 |
| sortOrder | INTEGER | DEFAULT 0 | 排序顺序 |
| createdAt | DATETIME | NOT NULL | 创建时间 |
| updatedAt | DATETIME | NOT NULL | 更新时间 |

**System Album Types**:
- `by-date`: 按日期组织
- `by-camera`: 按相机组织
- `by-location`: 按地点组织
- `all`: 所有照片
- `favorites`: 收藏

### AlbumPhoto

相册-照片关联表 (N:M)。

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, NOT NULL | 唯一标识符 |
| albumId | VARCHAR(36) | NOT NULL, FK(Album) | 相册ID |
| photoId | VARCHAR(36) | NOT NULL, FK(Photo) | 照片ID |
| addedAt | DATETIME | NOT NULL | 添加时间 |
| sortOrder | INTEGER | DEFAULT 0 | 排序顺序 |

**Constraints**:
- UNIQUE(albumId, photoId)

### PhotoTag

照片标签关联表。

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, NOT NULL | 唯一标识符 |
| photoId | VARCHAR(36) | NOT NULL, FK(Photo) | 照片ID |
| tag | VARCHAR(100) | NOT NULL | 标签内容 |
| createdAt | DATETIME | NOT NULL | 创建时间 |

**Indexes**:
- `idx_tag_photo` ON (photoId)
- `idx_tag_name` ON (tag)

### Setting

应用设置实体。

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, NOT NULL | 唯一标识符 |
| key | VARCHAR(100) | NOT NULL, UNIQUE | 设置键名 |
| value | TEXT | NOT NULL | 设置值(JSON格式) |
| type | VARCHAR(20) | NOT NULL | 值类型 |
| updatedAt | DATETIME | NOT NULL | 更新时间 |

**System Settings**:

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| photoSourcePath | string | null | 照片源目录路径 |
| importWatchPath | string | null | 导入监控目录路径 |
| organizePattern | string | "{year}/{month}/{day}" | 磁盘组织规则 |
| duplicateMode | string | "hash" | 重复检测模式 |
| thumbnailQuality | string | "medium" | 缩略图质量 |
| remoteAccessEnabled | boolean | false | 远程访问开关 |
| remoteAccessPort | number | 3000 | 远程访问端口 |

### ImportTask

导入任务实体。

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, NOT NULL | 唯一标识符 |
| sourcePath | VARCHAR(512) | NOT NULL | 源文件路径 |
| targetPath | VARCHAR(512) | NULL | 目标路径(导入后) |
| status | ENUM | NOT NULL | 见下方状态枚举 |
| errorMessage | TEXT | NULL | 错误信息 |
| fileSize | BIGINT | NULL | 文件大小 |
| fileHash | VARCHAR(64) | NULL | 文件hash |
| startedAt | DATETIME | NOT NULL | 开始时间 |
| completedAt | DATETIME | NULL | 完成时间 |

**Status Values**:
- `pending`: 待处理
- `scanning`: 扫描中
- `hashing`: 计算hash中
- `importing`: 导入中
- `completed`: 已完成
- `duplicate`: 重复(待处理)
- `failed`: 失败

## State Transitions

### Photo Lifecycle

```
[New File Detected] → [Scanning] → [Hash Computed] → [Duplicate Check]
                                                            ↓
                                                    [Duplicate Found]
                                                            ↓
                                                    [Moved to Pending]
                                                            ↓
                                                    [User Decision]
                                                       ↓     ↓     ↓
                                                   [Skip] [Rename] [Overwrite]
                                                       ↓     ↓     ↓
                                                    [Deleted] [Imported]
                                                                  ↓
                                                            [Indexed]
```

### Import Task Lifecycle

```
[Created] → [Pending] → [Scanning] → [Hashing] → [Importing] → [Completed]
                                ↓
                           [Duplicate]
                                ↓
                          [Pending Decision]
                                ↓
                    [Skip] / [Rename] / [Overwrite]
                                ↓
                           [Completed]
```

## Validation Rules

### Photo
- `diskPath`: 必须为绝对路径
- `fileHash`: 32字符(MD5)或64字符(SHA)
- `latitude`: -90 ~ 90
- `longitude`: -180 ~ 180
- `fileSize`: > 0

### Album
- `name`: 非空，最大255字符
- `type`: 只能是 'system' 或 'custom'

### Setting
- `key`: 非空，最大100字符
- `value`: 必须是有效的JSON

### Directory Validation
- `photoSourcePath` 和 `importWatchPath` 不能相同
- `photoSourcePath` 不能是 `importWatchPath` 的子目录
- `importWatchPath` 不能是 `photoSourcePath` 的子目录
