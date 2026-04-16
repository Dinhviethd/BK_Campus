"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const http_1 = require("http");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const path_1 = __importDefault(require("path"));
const index_1 = __importDefault(require("./modules/index"));
const database_config_1 = require("./configs/database.config");
const errorHandlermiddleware_1 = __importDefault(require("./middlewares/errorHandlermiddleware"));
const redis_config_1 = require("./configs/redis.config");
const socket_config_1 = require("./configs/socket.config");
const post_realtime_subscriber_1 = require("./modules/realtime/post-realtime.subscriber");
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const clientBuildPath = path_1.default.resolve('/app/public');
app.use(express_1.default.json({ limit: "5mb" }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.CLIENT_URL || "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express_1.default.static(clientBuildPath));
app.use("/api", index_1.default);
app.get(/(.*)/, (req, res) => {
    res.sendFile(path_1.default.join(clientBuildPath, 'index.html'));
});
app.use(errorHandlermiddleware_1.default.notFound);
app.use(errorHandlermiddleware_1.default.errorHandler);
const PORT = process.env.PORT || 8000;
let isShuttingDown = false;
const startServer = async () => {
    try {
        await (0, database_config_1.initDatabase)();
        await (0, redis_config_1.initRedis)();
        await (0, post_realtime_subscriber_1.initPostRealtimeSubscriber)();
        (0, socket_config_1.initSocket)(server);
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    }
    catch (err) {
        console.error('Failed to start server');
        console.error(err);
        process.exit(1);
    }
};
const gracefulShutdown = async (signal) => {
    if (isShuttingDown)
        return;
    isShuttingDown = true;
    console.log(`[Server] Received ${signal}. Starting graceful shutdown...`);
    const forceExitTimer = setTimeout(() => {
        console.error('[Server] Graceful shutdown timeout. Force exiting...');
        process.exit(1);
    }, 10000);
    try {
        await (0, socket_config_1.closeSocket)();
        await (0, redis_config_1.closeRedisConnections)();
        await new Promise((resolve, reject) => {
            server.close(error => {
                if (error)
                    return reject(error);
                resolve();
            });
        });
        clearTimeout(forceExitTimer);
        console.log('[Server] Shutdown completed');
        process.exit(0);
    }
    catch (error) {
        clearTimeout(forceExitTimer);
        console.error('[Server] Error during shutdown');
        console.error(error);
        process.exit(1);
    }
};
process.on('SIGINT', () => {
    void gracefulShutdown('SIGINT');
});
process.on('SIGTERM', () => {
    void gracefulShutdown('SIGTERM');
});
void startServer();
