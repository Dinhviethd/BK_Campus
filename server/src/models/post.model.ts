import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Column, CreateDateColumn, OneToMany, UpdateDateColumn, Index } from 'typeorm';
import  { post_source, post_type, process_status} from '../constants/constants';
import {User} from './user.model'
import { Post_image } from './post_image.model';

@Entity('posts')
@Index('IDX_posts_crawl_cursor', ['source', 'status', 'type', 'updatedAt'])
export class Post {
  @PrimaryGeneratedColumn('uuid') 
  id!: string;
  
  @Column({ type: 'enum', enum: post_source })
  source!: post_source;

  @Column({ unique: true,  name: "original_url" })
  originalLink!: string;

  @Column()
  content!: string;

  @Column()
  location!: string;

  @Column({ type: 'enum', enum: post_type })
  type!: post_type;

  @Column({ type: 'enum', enum: process_status })
  status?: process_status;

  @Column({type: 'vector'})
  content_embedding?: string[];

  @CreateDateColumn({name: 'created_at'})
  createdAt!: Date;

  @UpdateDateColumn({name: 'updated_at'})
  updatedAt!: Date;

    @ManyToOne(() => User, user => user.posts)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @OneToMany(() => Post_image, postImage => postImage.post)
  images!: Post_image[];
}
