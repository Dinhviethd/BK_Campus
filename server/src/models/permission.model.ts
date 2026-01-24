import { Entity, PrimaryGeneratedColumn, ManyToMany, Column } from 'typeorm';
import { Role } from './role.model';
@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn()
  idPermission!: number;

  @Column({ unique: true })
  code!: string;

  @Column({ nullable: true })
  description?: string;

  @ManyToMany(() => Role, r => r.permissions)
  roles!: Role[];
}
