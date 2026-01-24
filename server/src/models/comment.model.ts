import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Column, CreateDateColumn } from 'typeorm';
import { User } from './user.model';
import { Card } from './card.model';
@Entity('comment')
export class Comment {
  @PrimaryGeneratedColumn()
  idComment!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdBy' })
  createdBy!: User;
  @ManyToOne(() => Card)
  @JoinColumn({ name: 'cardID' })
  card!: Card;

  @Column()
  content!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
