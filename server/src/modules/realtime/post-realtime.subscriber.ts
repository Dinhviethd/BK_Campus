import { EventEmitter } from 'events'
import { getRedisSubscriberClient } from '@/configs/redis.config'
import { PostRealtimePayload } from '@/modules/realtime/post-realtime.types'

const POST_CHANNEL_PATTERN = 'post:*'
const postRealtimeEmitter = new EventEmitter()
postRealtimeEmitter.setMaxListeners(0)

let isSubscriberReady = false

const emitPayload = (rawPayload: string): void => {
  try {
    const payload = JSON.parse(rawPayload) as PostRealtimePayload
    postRealtimeEmitter.emit('post-event', payload)
  } catch (error) {
    console.error('[Realtime] Invalid Redis payload', error)
  }
}

export const initPostRealtimeSubscriber = async (): Promise<void> => {
  if (isSubscriberReady) return

  const subscriber = getRedisSubscriberClient()
  if (!subscriber) {
    console.warn('[Realtime] Redis pub/sub is disabled. Set UPSTASH_REDIS_URL to enable subscriber.')
    return
  }

  subscriber.on('pmessage', (_pattern: string, _channel: string, payload: string) => {
    emitPayload(payload)
  })

  await subscriber.psubscribe(POST_CHANNEL_PATTERN)
  isSubscriberReady = true
  console.log(`[Realtime] Redis subscriber started with pattern ${POST_CHANNEL_PATTERN}`)
}

export const onPostRealtimeEvent = (listener: (payload: PostRealtimePayload) => void): (() => void) => {
  postRealtimeEmitter.on('post-event', listener)

  return () => {
    postRealtimeEmitter.off('post-event', listener)
  }
}
