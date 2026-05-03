import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm'

@Entity()
export default class AlbumPhoto {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'text' })
  albumId!: string

  @Column({ type: 'text' })
  photoId!: string

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  addedAt!: Date
}
