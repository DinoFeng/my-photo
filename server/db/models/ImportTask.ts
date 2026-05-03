import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm'

export type ImportStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'duplicate'

@Entity()
export default class ImportTask {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'text' })
  sourcePath!: string

  @Column({ type: 'text', nullable: true })
  targetPath!: string | null

  @Column({ type: 'text' })
  fileName!: string

  @Column({ type: 'text', nullable: true })
  fileHash!: string | null

  @Column({ type: 'text', default: 'pending' })
  status!: ImportStatus

  @Column({ type: 'text', nullable: true })
  errorMessage!: string | null

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date

  @Column({ type: 'datetime', nullable: true })
  completedAt!: Date | null
}
