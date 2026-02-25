import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Column, CreateDateColumn, OneToMany, UpdateDateColumn } from 'typeorm';
import  { post_source, post_type, process_status} from '../constants/constants';
import {Post} from './post.model'
@Entity('post_images')
export class Post_image {
  @PrimaryGeneratedColumn('uuid') 
  id!: string;
  @Column()
  url!: string;

  @Column({type: "float"})
  nsfwScore?: number;

@Column({type: "vector"})
  embedding?: string[];

  @CreateDateColumn({name: 'created_at'})
  createdAt!: Date;

  @ManyToOne(() => Post, post => post.images)
  @JoinColumn({ name: 'post_id' })
  post!: Post;

}
