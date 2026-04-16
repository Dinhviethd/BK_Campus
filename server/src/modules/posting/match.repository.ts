import { Repository } from 'typeorm';
import { AppDataSource } from '@/configs/database.config';
import { MatchRequest } from '@/modules/posting/models/match_request.model';
import { MatchCandidate } from '@/modules/posting/models/match_candidate.model';
import { candidate_status, match_request_status } from '@/constants/constants';

export class MatchRepository {
  private requestRepository: Repository<MatchRequest>;
  private candidateRepository: Repository<MatchCandidate>;

  constructor() {
    this.requestRepository = AppDataSource.getRepository(MatchRequest);
    this.candidateRepository = AppDataSource.getRepository(MatchCandidate);
  }

  async createRequest(input: { lostPostId: string; userId: string }): Promise<MatchRequest> {
    const entity = this.requestRepository.create({
      lostPost: { id: input.lostPostId } as any,
      user: { idUser: input.userId } as any,
      status: match_request_status.scanning,
    });

    return this.requestRepository.save(entity);
  }

  async findRequestById(id: string): Promise<MatchRequest | null> {
    return this.requestRepository.findOne({
      where: { id },
      relations: ['lostPost', 'user'],
    });
  }

  async findLatestScanningRequestByUser(userId: string): Promise<MatchRequest | null> {
    return this.requestRepository.findOne({
      where: {
        user: { idUser: userId } as any,
        status: match_request_status.scanning,
      },
      relations: ['lostPost', 'user'],
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async updateRequestStatus(
    id: string,
    status: match_request_status,
    lastScanAt?: Date | null
  ): Promise<MatchRequest | null> {
    await this.requestRepository.update(id, {
      status,
      ...(lastScanAt !== undefined ? { lastScanAt } : {}),
    });

    return this.findRequestById(id);
  }

  async replaceCandidates(
    requestId: string,
    candidates: Array<{ foundPostId: string; similarityScore: number }>
  ): Promise<MatchCandidate[]> {
    await this.candidateRepository.delete({ request: { id: requestId } as any });

    if (candidates.length === 0) {
      return [];
    }

    const entities = candidates.map((candidate) =>
      this.candidateRepository.create({
        request: { id: requestId } as any,
        foundPost: { id: candidate.foundPostId } as any,
        similarityScore: candidate.similarityScore,
        status: candidate_status.pending,
      })
    );

    return this.candidateRepository.save(entities);
  }
}

export const matchRepository = new MatchRepository();
