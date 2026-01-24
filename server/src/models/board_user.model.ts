import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Board } from './board.model';
import { User } from './user.model';
import { Role } from './role.model';
@Entity('board_user')
export class BoardUser {
  @PrimaryGeneratedColumn()
  idBoard_User!: number;

  @ManyToOne(() => Board)
  @JoinColumn({ name: 'idBoard' })
  board!: Board;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'idUser' })
  user!: User;
  @ManyToOne(() => Role)
  @JoinColumn({ name: 'idRole' })
  role!: Role;
}
