import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Column, CreateDateColumn } from 'typeorm';
import { Workspace } from './workspace.model';
import { User } from './user.model';
import { TypeVisibility } from '@/constants/constants';
@Entity('board')
export class Board {
  @PrimaryGeneratedColumn()
  idBoard!: number;

  @Column()
  boardName!: string;

  @Column({ type: 'enum', enum: TypeVisibility })
  visibility!: TypeVisibility;

  @Column({ nullable: true })
  backgroundUrl?: string;

  @ManyToOne(() => Workspace)
  @JoinColumn({ name: 'idWorkspace' })
  workspace!: Workspace;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdBy' })
  createdBy!: User;
  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  deleteAt?: Date;
}
