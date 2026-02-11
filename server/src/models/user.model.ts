import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Notification } from './notification.model';
import {Role} from './role.model'
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

  @ManyToOne(() => Role, role => role.users)
  @JoinColumn({ name: 'roleId' })
  role!: Role;
}
