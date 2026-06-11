import { getRedisPublisherClient } from '@/configs/redis.config'
import { getPostChannel, PostRealtimeEventType } from '@/modules/realtime/post-realtime.types'

interface PublishPostEventInput {
  postId: string
  eventType: PostRealtimeEventType
  post: unknown
}

export const publishPostEvent = async ({ postId, eventType, post }: PublishPostEventInput): Promise<void> => {
  const channel = getPostChannel(postId)
  const publisher = getRedisPublisherClient()
  if (!publisher) {
    return
  }

  const payload = {
    postId,
    channel,
    eventType,
    occurredAt: new Date().toISOString(),
    post,
  }

  try {
    await publisher.publish(channel, JSON.stringify(payload))
  } catch (error) {
    console.error('[Realtime] Failed to publish post event', error)
  }
}
