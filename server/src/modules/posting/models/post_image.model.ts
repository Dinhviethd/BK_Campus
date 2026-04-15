import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Column, CreateDateColumn } from 'typeorm';
import {Post} from './post.model'
@Entity('post_images')
export class Post_image {
  @PrimaryGeneratedColumn('uuid') 
  id!: string;
  @Column({ type: 'jsonb', name: 'urls' })
  url!: string[];

  @Column({ type: 'jsonb', name: 'extracted_features', nullable: true })
  extractedFeatures?: Record<string, unknown> | null;


  @CreateDateColumn({name: 'created_at'})
  createdAt!: Date;

  @ManyToOne(() => Post, post => post.images)
  @JoinColumn({ name: 'post_id' })
  post!: Post;

}
