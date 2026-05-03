import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm'

@Entity()
export default class PhotoTag {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'text' })
  photoId!: string

  @Column({ type: 'text' })
  tagName!: string

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  addedAt!: Date
}
