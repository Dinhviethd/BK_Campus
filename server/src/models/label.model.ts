import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Column } from 'typeorm';
import { Board } from './board.model';
@Entity('label')
export class Label {
  @PrimaryGeneratedColumn()
  idLabel!: number;

  @Column()
  name!: string;

  @Column()
  color!: string;

  @ManyToOne(() => Board)
  @JoinColumn({ name: 'idBoard' })
  board!: Board;
}
