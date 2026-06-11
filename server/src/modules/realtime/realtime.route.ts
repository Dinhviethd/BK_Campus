import { Router } from 'express'
import { realtimeController } from '@/modules/realtime/realtime.controller'

const router = Router()

router.get('/posts/stream', realtimeController.streamPosts)

export default router
