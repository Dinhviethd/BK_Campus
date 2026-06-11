import { Redis as UpstashRedis } from '@upstash/redis'
import dotenv from 'dotenv'
import IORedis from 'ioredis'

dotenv.config({ quiet: true })

type RedisEnvKey = 'UPSTASH_REDIS_REST_URL' | 'UPSTASH_REDIS_REST_TOKEN' | 'UPSTASH_REDIS_URL'

const getEnv = (key: RedisEnvKey): string => {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

const getOptionalEnv = (key: RedisEnvKey): string | undefined => {
  const value = process.env[key]
  return value?.trim() ? value : undefined
}

let redisClient: UpstashRedis | null = null
let redisPublisherClient: IORedis | null = null
let redisSubscriberClient: IORedis | null = null
let hasLoggedInvalidPubSubUrl = false

export const getRedisClient = (): UpstashRedis => {
  if (redisClient) return redisClient

  redisClient = new UpstashRedis({
    url: getEnv('UPSTASH_REDIS_REST_URL'),
    token: getEnv('UPSTASH_REDIS_REST_TOKEN'),
  })

  return redisClient
}

const attachRedisErrorLogger = (client: IORedis, role: 'publisher' | 'subscriber'): void => {
  client.on('error', (error: unknown) => {
    console.error(`[Redis:${role}]`, error)
  })
}

const getValidatedPubSubUrl = (): string | undefined => {
  const redisUrl = getOptionalEnv('UPSTASH_REDIS_URL')
  if (!redisUrl) return undefined

  try {
    const parsed = new URL(redisUrl)
    if (parsed.protocol === 'redis:' || parsed.protocol === 'rediss:') {
      return redisUrl
    }

    if (!hasLoggedInvalidPubSubUrl) {
      hasLoggedInvalidPubSubUrl = true
      console.warn('UPSTASH_REDIS_URL must use redis:// or rediss://. Disabling Redis pub/sub.')
    }
    return undefined
  } catch {
    if (!hasLoggedInvalidPubSubUrl) {
      hasLoggedInvalidPubSubUrl = true
      console.warn('UPSTASH_REDIS_URL is invalid. Disabling Redis pub/sub.')
    }
    return undefined
  }
}

export const getRedisPublisherClient = (): IORedis | null => {
  if (redisPublisherClient) return redisPublisherClient

  const redisUrl = getValidatedPubSubUrl()
  if (!redisUrl) {
    return null
  }

  redisPublisherClient = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: true,
    retryStrategy: () => null,
  })
  attachRedisErrorLogger(redisPublisherClient, 'publisher')
  return redisPublisherClient
}

export const getRedisSubscriberClient = (): IORedis | null => {
  if (redisSubscriberClient) return redisSubscriberClient

  const redisUrl = getValidatedPubSubUrl()
  if (!redisUrl) {
    return null
  }

  redisSubscriberClient = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: true,
    retryStrategy: () => null,
  })
  attachRedisErrorLogger(redisSubscriberClient, 'subscriber')
  return redisSubscriberClient
}

const connectPubSubClient = async (client: IORedis, role: 'publisher' | 'subscriber'): Promise<boolean> => {
  try {
    await client.connect().catch((error: unknown) => {
      if (client.status !== 'ready') {
        throw error
      }
    })

    await client.ping()
    return true
  } catch (error) {
    console.error(`[Redis:${role}] unavailable, continuing without pub/sub`, error)
    try {
      client.disconnect(false)
    } catch {
      // noop
    }
    return false
  }
}

export const initRedis = async (): Promise<void> => {
  try {
    const restClient = getRedisClient()
    const publisher = getRedisPublisherClient()
    const subscriber = getRedisSubscriberClient()

    await restClient.get('__redis_healthcheck__')

    if (!publisher || !subscriber) {
      console.warn('Connected to Upstash Redis (REST only). Set UPSTASH_REDIS_URL to enable pub/sub.')
      return
    }

    const [publisherReady, subscriberReady] = await Promise.all([
      connectPubSubClient(publisher, 'publisher'),
      connectPubSubClient(subscriber, 'subscriber'),
    ])

    if (publisherReady && subscriberReady) {
      console.log('Connected to Upstash Redis (REST + pub/sub)')
      return
    }

    console.warn('Connected to Upstash Redis (REST only). Redis pub/sub is disabled due to connection issues.')
  } catch (error) {
    console.error('Failed to connect to Upstash Redis')
    console.error(error)
    process.exit(1)
  }
}

export const closeRedisConnections = async (): Promise<void> => {
  const closeTasks: Array<Promise<unknown>> = []

  if (redisPublisherClient) {
    closeTasks.push(redisPublisherClient.quit())
    redisPublisherClient = null
  }

  if (redisSubscriberClient) {
    closeTasks.push(redisSubscriberClient.quit())
    redisSubscriberClient = null
  }

  if (closeTasks.length > 0) {
    await Promise.allSettled(closeTasks)
  }
}

export const redis = getRedisClient()

export default redis