import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm'

export type AlbumType = 'system' | 'custom'

@Entity()
export default class Album {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'text' })
  name!: string

  @Column({ type: 'text', default: 'custom' })
  type!: AlbumType

  @Column({ type: 'text', nullable: true })
  rule!: string | null

  @Column({ type: 'text', nullable: true })
  coverPath!: string | null

  @Column({ type: 'integer', default: 0 })
  photoCount!: number

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date

  @Column({ type: 'datetime', nullable: true })
  updatedAt!: Date | null
}
