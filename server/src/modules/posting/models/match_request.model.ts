import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Post } from '@/modules/posting/models/post.model';
import { User } from '@/modules/auth/models/user.model';
import { MatchCandidate } from '@/modules/posting/models/match_candidate.model';
import { match_request_status } from '@/constants/constants';

@Entity('match_requests')
export class MatchRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Post)
  @JoinColumn({ name: 'lost_post_id' })
  lostPost!: Post;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({
    type: 'enum',
    enum: match_request_status,
    default: match_request_status.scanning,
  })
  status!: match_request_status;

  @Column({ type: 'timestamptz', name: 'last_scan_at', nullable: true })
  lastScanAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @OneToMany(() => MatchCandidate, (candidate) => candidate.request)
  candidates!: MatchCandidate[];
}
