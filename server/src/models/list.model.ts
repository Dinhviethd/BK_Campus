import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Column, CreateDateColumn } from 'typeorm';
import { Board } from './board.model';
@Entity('list')
export class List {
  @PrimaryGeneratedColumn()
  idList!: number;

  @Column()
  listName!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @Column()
  position!: number;

  @Column({ type: 'timestamp', nullable: true })
  archivedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  deleteAt?: Date;

  @ManyToOne(() => Board)
  @JoinColumn({ name: 'idBoard' })
  board!: Board;
}
