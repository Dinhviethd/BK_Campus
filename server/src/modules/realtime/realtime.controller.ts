import { Request, Response } from 'express'
import { asyncHandler } from '@/utils/error.response'
import { onPostRealtimeEvent } from '@/modules/realtime/post-realtime.subscriber'
import { PostRealtimePayload } from '@/modules/realtime/post-realtime.types'

class RealtimeController {
  streamPosts = asyncHandler(async (req: Request, res: Response) => {
    const postIdFilter = typeof req.query.postId === 'string' ? req.query.postId : null

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')

    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders()
    }

    const sendEvent = (payload: unknown): void => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`)
    }

    sendEvent({
      type: 'connected',
      message: 'SSE stream connected',
      postIdFilter,
      occurredAt: new Date().toISOString(),
    })

    const heartbeat = setInterval(() => {
      res.write(': keep-alive\n\n')
    }, 25000)

    const unsubscribe = onPostRealtimeEvent((payload: PostRealtimePayload) => {
      if (postIdFilter && payload.postId !== postIdFilter) {
        return
      }

      sendEvent(payload)
    })

    req.on('close', () => {
      clearInterval(heartbeat)
      unsubscribe()
      res.end()
    })
  })
}

export const realtimeController = new RealtimeController()
