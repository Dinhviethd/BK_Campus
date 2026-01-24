import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Column, CreateDateColumn } from 'typeorm';
import { User } from './user.model';
import { TierWorkspace, Visibility } from '@/constants/constants';
@Entity('workspace')
export class Workspace {
  @PrimaryGeneratedColumn()
  idWorkspace!: number;

  @Column()
  name!: string;

  @Column({ type: 'timestamp', nullable: true })
  deleteAt?: Date;

  @Column({ nullable: true })
  avatarUrl?: string;

  @Column({ type: 'enum', enum: TierWorkspace })
  tier!: TierWorkspace;

  @Column({ type: 'date', nullable: true })
  tierDuration?: Date;

  @Column({ type: 'enum', enum: Visibility })
  status!: Visibility;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdBy' })
  createdBy!: User;
  @CreateDateColumn()
  createdAt!: Date;
}
