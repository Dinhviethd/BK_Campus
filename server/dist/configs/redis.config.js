"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = exports.closeRedisConnections = exports.initRedis = exports.getRedisSubscriberClient = exports.getRedisPublisherClient = exports.getRedisClient = void 0;
const redis_1 = require("@upstash/redis");
const dotenv_1 = __importDefault(require("dotenv"));
const ioredis_1 = __importDefault(require("ioredis"));
dotenv_1.default.config({ quiet: true });
const getEnv = (key) => {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
};
const getOptionalEnv = (key) => {
    const value = process.env[key];
    return value?.trim() ? value : undefined;
};
let redisClient = null;
let redisPublisherClient = null;
let redisSubscriberClient = null;
const getRedisClient = () => {
    if (redisClient)
        return redisClient;
    redisClient = new redis_1.Redis({
        url: getEnv('UPSTASH_REDIS_REST_URL'),
        token: getEnv('UPSTASH_REDIS_REST_TOKEN'),
    });
    return redisClient;
};
exports.getRedisClient = getRedisClient;
const getRedisPublisherClient = () => {
    if (redisPublisherClient)
        return redisPublisherClient;
    const redisUrl = getOptionalEnv('UPSTASH_REDIS_URL');
    if (!redisUrl) {
        return null;
    }
    redisPublisherClient = new ioredis_1.default(redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
        lazyConnect: true,
    });
    return redisPublisherClient;
};
exports.getRedisPublisherClient = getRedisPublisherClient;
const getRedisSubscriberClient = () => {
    if (redisSubscriberClient)
        return redisSubscriberClient;
    const redisUrl = getOptionalEnv('UPSTASH_REDIS_URL');
    if (!redisUrl) {
        return null;
    }
    redisSubscriberClient = new ioredis_1.default(redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
        lazyConnect: true,
    });
    return redisSubscriberClient;
};
exports.getRedisSubscriberClient = getRedisSubscriberClient;
const initRedis = async () => {
    try {
        const restClient = (0, exports.getRedisClient)();
        const publisher = (0, exports.getRedisPublisherClient)();
        const subscriber = (0, exports.getRedisSubscriberClient)();
        const connectTasks = [restClient.get('__redis_healthcheck__')];
        if (publisher) {
            connectTasks.push(publisher.connect().catch((error) => {
                if (publisher.status !== 'ready') {
                    throw error;
                }
            }));
        }
        if (subscriber) {
            connectTasks.push(subscriber.connect().catch((error) => {
                if (subscriber.status !== 'ready') {
                    throw error;
                }
            }));
        }
        await Promise.all(connectTasks);
        const pingTasks = [];
        if (publisher)
            pingTasks.push(publisher.ping());
        if (subscriber)
            pingTasks.push(subscriber.ping());
        if (pingTasks.length > 0) {
            await Promise.all(pingTasks);
            console.log('Connected to Upstash Redis (REST + pub/sub)');
        }
        else {
            console.warn('Connected to Upstash Redis (REST only). Set UPSTASH_REDIS_URL to enable pub/sub.');
        }
    }
    catch (error) {
        console.error('Failed to connect to Upstash Redis');
        console.error(error);
        process.exit(1);
    }
};
exports.initRedis = initRedis;
const closeRedisConnections = async () => {
    const closeTasks = [];
    if (redisPublisherClient) {
        closeTasks.push(redisPublisherClient.quit());
        redisPublisherClient = null;
    }
    if (redisSubscriberClient) {
        closeTasks.push(redisSubscriberClient.quit());
        redisSubscriberClient = null;
    }
    if (closeTasks.length > 0) {
        await Promise.allSettled(closeTasks);
    }
};
exports.closeRedisConnections = closeRedisConnections;
exports.redis = (0, exports.getRedisClient)();
exports.default = exports.redis;
