import { Entity, PrimaryGeneratedColumn, ManyToMany, Column, JoinTable, OneToMany } from 'typeorm';
import { Permission } from './permission.model';
import {User} from './user.model'
@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  idRole!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @ManyToMany(() => Permission, p => p.roles)
  @JoinTable({
    name: 'role_permission',
    joinColumn: { name: 'idRole' },
    inverseJoinColumn: { name: 'idPermission' },
  })
  permissions!: Permission[];
  @OneToMany(() => User, user => user.role)
  users!: User[];
}


