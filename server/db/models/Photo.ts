import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm'

@Entity()
export default class Photo {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'text' })
  filePath!: string

  @Column({ type: 'text' })
  fileName!: string

  @Column({ type: 'text', nullable: true })
  fileHash!: string | null

  @Column({ type: 'text', nullable: true })
  thumbnailPath!: string | null

  @Column({ type: 'json', nullable: true })
  exif!: {
    date?: string
    camera?: string
    model?: string
    aperture?: string
    shutterSpeed?: string
    iso?: number
    focalLength?: string
    gps?: {
      latitude: number
      longitude: number
      city?: string
      country?: string
    }
  } | null

  @Column({ type: 'text', nullable: true })
  takenDate!: string | null

  @Column({ type: 'integer', default: 0 })
  fileSize!: number

  @Column({ type: 'integer', default: 0 })
  width!: number

  @Column({ type: 'integer', default: 0 })
  height!: number

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  importedAt!: Date

  @Column({ type: 'datetime', nullable: true })
  updatedAt!: Date | null
}
