import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { Post } from '@/modules/posting/models/post.model';
import { MatchRequest } from '@/modules/posting/models/match_request.model';
import { candidate_status } from '@/constants/constants';

@Entity('match_candidates')
export class MatchCandidate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => MatchRequest, (request) => request.candidates)
  @JoinColumn({ name: 'request_id' })
  request!: MatchRequest;

  @ManyToOne(() => Post)
  @JoinColumn({ name: 'found_post_id' })
  foundPost!: Post;

  @Column({ type: 'double precision', name: 'similarity_score' })
  similarityScore!: number;

  @Column({
    type: 'enum',
    enum: candidate_status,
    default: candidate_status.pending,
  })
  status!: candidate_status;

  @Column({ type: 'boolean', name: 'has_verified_details', default: false })
  hasVerifiedDetails!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
