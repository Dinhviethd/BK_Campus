import { Redis } from '@upstash/redis'
import dotenv from 'dotenv'

dotenv.config({ quiet: true })

const getEnv = (key: 'UPSTASH_REDIS_REST_URL' | 'UPSTASH_REDIS_REST_TOKEN'): string => {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

let redisClient: Redis | null = null

export const getRedisClient = (): Redis => {
  if (redisClient) return redisClient

  redisClient = new Redis({
    url: getEnv('UPSTASH_REDIS_REST_URL'),
    token: getEnv('UPSTASH_REDIS_REST_TOKEN'),
  })

  return redisClient
}

export const initRedis = async (): Promise<void> => {
  try {
    await getRedisClient().get('__redis_healthcheck__')
    console.log('Connected to Upstash Redis')
  } catch (error) {
    console.error('Failed to connect to Upstash Redis')
    console.error(error)
    process.exit(1)
  }
}

export const redis = getRedisClient()

export default redis