import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import { createServer } from 'http'
import cookieParser from 'cookie-parser'
import path from 'path'
import router from '@/modules/index'
import { initDatabase } from '@/configs/database.config'
import errorHandler from "@/middlewares/errorHandlermiddleware";
import { closeRedisConnections, initRedis } from '@/configs/redis.config'
import { closeSocket, initSocket } from '@/configs/socket.config'
import { initPostRealtimeSubscriber } from '@/modules/realtime/post-realtime.subscriber'

dotenv.config()
const app = express()
const server = createServer(app)

const clientBuildPath = path.resolve('/app/public');
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser()); 


app.use(cors({
    origin: process.env.CLIENT_URL || "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}))


app.use(express.static(clientBuildPath))

app.use("/api", router)

app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
});

app.use(errorHandler.notFound)
app.use(errorHandler.errorHandler)
const PORT = process.env.PORT || 8000

let isShuttingDown = false

const startServer = async (): Promise<void> => {
  try {
    await initDatabase()

    await initRedis()
    await initPostRealtimeSubscriber()

    initSocket(server)

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
    })
  } catch (err) {
    console.error('Failed to start server')
    console.error(err)
    process.exit(1)
  }
}
const gracefulShutdown = async (signal: string): Promise<void> => {
  if (isShuttingDown) return
  isShuttingDown = true

  console.log(`[Server] Received ${signal}. Starting graceful shutdown...`)

  const forceExitTimer = setTimeout(() => {
    console.error('[Server] Graceful shutdown timeout. Force exiting...')
    process.exit(1)
  }, 10000)

  try {
    await closeSocket()
    await closeRedisConnections()

    await new Promise<void>((resolve, reject) => {
      server.close(error => {
        if (error) return reject(error)
        resolve()
      })
    })

    clearTimeout(forceExitTimer)
    console.log('[Server] Shutdown completed')
    process.exit(0)
  } catch (error) {
    clearTimeout(forceExitTimer)
    console.error('[Server] Error during shutdown')
    console.error(error)
    process.exit(1)
  }
}

process.on('SIGINT', () => {
  void gracefulShutdown('SIGINT')
})

process.on('SIGTERM', () => {
  void gracefulShutdown('SIGTERM')
})

void startServer()