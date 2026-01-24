import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Column, CreateDateColumn, ManyToMany, JoinTable } from 'typeorm';
import { List } from './list.model';
import { User } from './user.model';
import { Label } from './label.model';
@Entity('card')
export class Card {
  @PrimaryGeneratedColumn()
  idCard!: number;

  @ManyToOne(() => List)
  @JoinColumn({ name: 'idList' })
  list!: List;
  @Column()
  cardName!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ type: 'date', nullable: true })
  dueDate?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdBy' })
  createdBy!: User;
  @Column({ nullable: true })
  attachmentUrl?: string;

  @Column()
  position!: number;

  @Column({ default: false })
  isArchived!: boolean;

  @ManyToMany(() => Label)
  @JoinTable({
    name: 'card_label',
    joinColumn: { name: 'idCard' },
    inverseJoinColumn: { name: 'idLabel' },
  })
  labels!: Label[];
}
