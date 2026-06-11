import { Server as HttpServer } from 'http'
import jwt from 'jsonwebtoken'
import { Server, Socket } from 'socket.io'

type AuthPayload = {
  userId: string
}

type SocketData = {
  userId: string
}

let io: Server | null = null

const DEFAULT_SOCKET_PATH = '/socket.io'

const parseOrigins = (origins: string | undefined): string[] => {
  if (!origins || origins.trim() === '*') {
    return []
  }

  return origins
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
}

const extractToken = (socket: Socket): string | null => {
  const authToken = socket.handshake.auth?.token
  if (typeof authToken === 'string' && authToken.trim()) {
    return authToken.replace(/^Bearer\s+/i, '').trim()
  }

  const authorizationHeader = socket.handshake.headers.authorization
  if (typeof authorizationHeader === 'string' && authorizationHeader.startsWith('Bearer ')) {
    return authorizationHeader.slice(7).trim()
  }

  return null
}

const authenticateSocket = (socket: Socket, next: (err?: Error) => void): void => {
  try {
    const secret = process.env.JWT_ACCESS_SECRET
    if (!secret) {
      return next(new Error('JWT_ACCESS_SECRET is not configured'))
    }

    const token = extractToken(socket)
    if (!token) {
      return next(new Error('Unauthorized: missing token'))
    }

    const decoded = jwt.verify(token, secret) as AuthPayload
    if (!decoded?.userId) {
      return next(new Error('Unauthorized: invalid token payload'))
    }

    socket.data = { userId: decoded.userId }
    next()
  } catch {
    next(new Error('Unauthorized: invalid or expired token'))
  }
}

export const initSocket = (server: HttpServer): Server => {
  if (io) return io

  const socketPath = process.env.SOCKET_PATH || DEFAULT_SOCKET_PATH
  const allowedOrigins = parseOrigins(process.env.SOCKET_CORS_ORIGINS || process.env.CLIENT_URL)

  io = new Server(server, {
    path: socketPath,
    transports: ['websocket', 'polling'],
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
      skipMiddlewares: false,
    },
    cors: {
      origin: allowedOrigins.length > 0 ? allowedOrigins : true,
      credentials: true,
      methods: ['GET', 'POST'],
    },
  })

  io.use(authenticateSocket)

  io.on('connection', socket => {
    const { userId } = socket.data as SocketData
    socket.join(`user:${userId}`)

    socket.emit('socket:ready', {
      socketId: socket.id,
      userId,
    })

    socket.on('room:join', (room: string) => {
      if (typeof room !== 'string' || !room.trim()) return
      socket.join(room)
    })

    socket.on('room:leave', (room: string) => {
      if (typeof room !== 'string' || !room.trim()) return
      socket.leave(room)
    })

    socket.on('health:ping', (callback?: (payload: { ok: boolean; ts: number }) => void) => {
      if (typeof callback === 'function') {
        callback({ ok: true, ts: Date.now() })
      }
    })

    socket.on('disconnect', reason => {
      console.log(`[Socket] ${socket.id} disconnected: ${reason}`)
    })
  })

  io.engine.on('connection_error', err => {
    console.error('[Socket] Connection error:', err.message)
  })

  console.log(`[Socket] Initialized at path ${socketPath}`)

  return io
}

export const getSocketIO = (): Server => {
  if (!io) {
    throw new Error('Socket.IO is not initialized. Call initSocket(server) first.')
  }
  return io
}

export const emitToUser = (userId: string, event: string, payload: unknown): void => {
  getSocketIO().to(`user:${userId}`).emit(event, payload)
}

export const emitToRoom = (room: string, event: string, payload: unknown): void => {
  getSocketIO().to(room).emit(event, payload)
}

export const closeSocket = async (): Promise<void> => {
  if (!io) return

  await new Promise<void>(resolve => {
    io?.close(() => {
      resolve()
    })
  })

  io = null
}
