import { Entity, Column, PrimaryColumn } from 'typeorm'

export type DuplicateDetectionType = 'hash' | 'name_size' | 'exif_name'
export type ThumbnailQuality = 'low' | 'medium' | 'high'

@Entity()
export default class Setting {
  @PrimaryColumn({ type: 'text' })
  id!: string

  @Column({ type: 'text', nullable: true })
  photoSourcePath!: string | null

  @Column({ type: 'text', nullable: true })
  watchPath!: string | null

  @Column({ type: 'text', default: '{year}/{month}/{day}' })
  organizePattern!: string

  @Column({ type: 'text', default: 'hash' })
  duplicateDetection!: DuplicateDetectionType

  @Column({ type: 'text', default: 'medium' })
  thumbnailQuality!: ThumbnailQuality

  @Column({ type: 'boolean', default: false })
  remoteAccess!: boolean

  @Column({ type: 'integer', default: 3000 })
  remotePort!: number

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt!: Date
}
