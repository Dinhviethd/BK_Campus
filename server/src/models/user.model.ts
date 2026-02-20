import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Column, CreateDateColumn, OneToMany, UpdateDateColumn } from 'typeorm';
import { Notification } from './notification.model';
import  { userRole } from '../constants/constants';
import { Post } from './post.model';
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') 
  idUser!: string;

  @Column()
  name!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  password!: string;

  @Column({ default: false })
  emailVerified!: boolean;

  @Column({ nullable: true })
  avatarUrl?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  resetOTP?: string;

  @Column({ nullable: true, type: 'timestamp' })
  resetOTPExpires?: Date;

  @CreateDateColumn()
  createdAt!: Date;
  

  @OneToMany(() => Notification, n => n.user)
  notifications!: Notification[];

  @Column({ type: 'enum', enum: userRole, default: userRole.USER })
  role!: userRole;

  @OneToMany(() => Post, post => post.user)
  posts!: Post[];
}
