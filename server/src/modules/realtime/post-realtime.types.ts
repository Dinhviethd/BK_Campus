export type PostRealtimeEventType =
  | 'AI_ANALYZE_UPDATED'
  | 'AI_ANALYZE_RETRIED'
  | 'AI_EMBEDDING_UPDATED'
  | 'AI_EMBEDDING_RETRIED'
  | 'MATCHING_CANDIDATES_READY'

export interface PostRealtimePayload {
  postId: string
  channel: string
  eventType: PostRealtimeEventType
  occurredAt: string
  post: unknown
}

export const getPostChannel = (postId: string): string => `post:${postId}`
