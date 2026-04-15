"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeSocket = exports.emitToRoom = exports.emitToUser = exports.getSocketIO = exports.initSocket = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const socket_io_1 = require("socket.io");
let io = null;
const DEFAULT_SOCKET_PATH = '/socket.io';
const parseOrigins = (origins) => {
    if (!origins || origins.trim() === '*') {
        return [];
    }
    return origins
        .split(',')
        .map(origin => origin.trim())
        .filter(Boolean);
};
const extractToken = (socket) => {
    const authToken = socket.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) {
        return authToken.replace(/^Bearer\s+/i, '').trim();
    }
    const authorizationHeader = socket.handshake.headers.authorization;
    if (typeof authorizationHeader === 'string' && authorizationHeader.startsWith('Bearer ')) {
        return authorizationHeader.slice(7).trim();
    }
    return null;
};
const authenticateSocket = (socket, next) => {
    try {
        const secret = process.env.JWT_ACCESS_SECRET;
        if (!secret) {
            return next(new Error('JWT_ACCESS_SECRET is not configured'));
        }
        const token = extractToken(socket);
        if (!token) {
            return next(new Error('Unauthorized: missing token'));
        }
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        if (!decoded?.userId) {
            return next(new Error('Unauthorized: invalid token payload'));
        }
        socket.data = { userId: decoded.userId };
        next();
    }
    catch {
        next(new Error('Unauthorized: invalid or expired token'));
    }
};
const initSocket = (server) => {
    if (io)
        return io;
    const socketPath = process.env.SOCKET_PATH || DEFAULT_SOCKET_PATH;
    const allowedOrigins = parseOrigins(process.env.SOCKET_CORS_ORIGINS || process.env.CLIENT_URL);
    io = new socket_io_1.Server(server, {
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
    });
    io.use(authenticateSocket);
    io.on('connection', socket => {
        const { userId } = socket.data;
        socket.join(`user:${userId}`);
        socket.emit('socket:ready', {
            socketId: socket.id,
            userId,
        });
        socket.on('room:join', (room) => {
            if (typeof room !== 'string' || !room.trim())
                return;
            socket.join(room);
        });
        socket.on('room:leave', (room) => {
            if (typeof room !== 'string' || !room.trim())
                return;
            socket.leave(room);
        });
        socket.on('health:ping', (callback) => {
            if (typeof callback === 'function') {
                callback({ ok: true, ts: Date.now() });
            }
        });
        socket.on('disconnect', reason => {
            console.log(`[Socket] ${socket.id} disconnected: ${reason}`);
        });
    });
    io.engine.on('connection_error', err => {
        console.error('[Socket] Connection error:', err.message);
    });
    console.log(`[Socket] Initialized at path ${socketPath}`);
    return io;
};
exports.initSocket = initSocket;
const getSocketIO = () => {
    if (!io) {
        throw new Error('Socket.IO is not initialized. Call initSocket(server) first.');
    }
    return io;
};
exports.getSocketIO = getSocketIO;
const emitToUser = (userId, event, payload) => {
    (0, exports.getSocketIO)().to(`user:${userId}`).emit(event, payload);
};
exports.emitToUser = emitToUser;
const emitToRoom = (room, event, payload) => {
    (0, exports.getSocketIO)().to(room).emit(event, payload);
};
exports.emitToRoom = emitToRoom;
const closeSocket = async () => {
    if (!io)
        return;
    await new Promise(resolve => {
        io?.close(() => {
            resolve();
        });
    });
    io = null;
};
exports.closeSocket = closeSocket;
