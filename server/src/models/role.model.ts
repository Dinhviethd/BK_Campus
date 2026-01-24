import { Entity, PrimaryGeneratedColumn, ManyToMany, Column, JoinTable } from 'typeorm';
import { Permission } from './permission.model';
import { RoleScope } from '../constants/constants';
@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn()
  idRole!: number;

  @Column()
  name!: string; // workspace_admin, board_editor...

  @Column()
  scope!: RoleScope; 

  @Column({ nullable: true })
  description?: string;

  @ManyToMany(() => Permission, p => p.roles)
  @JoinTable({
    name: 'role_permission',
    joinColumn: { name: 'idRole' },
    inverseJoinColumn: { name: 'idPermission' },
  })
  permissions!: Permission[];
}


