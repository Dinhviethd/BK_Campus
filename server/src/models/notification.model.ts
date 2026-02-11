import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Column, CreateDateColumn } from 'typeorm';
import { User } from './user.model';
@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid') 
  idNotification!: string;

  @Column()
  content!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  readAt?: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user!: User;
}
