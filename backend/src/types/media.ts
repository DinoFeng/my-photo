export interface UpsertResult {
    action: 'update' | 'insert'
    id: string
    sourcePath: string
    filename: string
    filepath: string
    fileSize: number
    fileType: string
    hash: string | null
    width: number | null
    height: number | null
    duration: number | null
    make: string | null
    model: string | null
    dateTaken: string | null
    latitude: number | null
    longitude: number | null
    metadata: string | null
    thumbnailPath: string | null
    status: string
    createdAt: string
    updatedAt: string
}