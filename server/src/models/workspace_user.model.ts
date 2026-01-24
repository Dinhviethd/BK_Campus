import { Entity, PrimaryColumn, ManyToOne, JoinColumn, Column } from 'typeorm';
import { User } from './user.model';
import { Workspace } from './workspace.model';
import { Role } from './role.model';
@Entity('workspace_user')
export class WorkspaceUser {
  @PrimaryColumn()
  idUser!: number;

  @PrimaryColumn()
  idWorkspace!: number;

  @Column()
  idRole!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'idUser' })
  user!: User;

  @ManyToOne(() => Workspace)
  @JoinColumn({ name: 'idWorkspace' })
  workspace!: Workspace;

  @ManyToOne(() => Role)
  @JoinColumn({ name: 'idRole' })
  role!: Role;
}
