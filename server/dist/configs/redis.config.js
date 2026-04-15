"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = exports.initRedis = exports.getRedisClient = void 0;
const redis_1 = require("@upstash/redis");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ quiet: true });
const getEnv = (key) => {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
};
let redisClient = null;
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
const initRedis = async () => {
    try {
        await (0, exports.getRedisClient)().get('__redis_healthcheck__');
        console.log('Connected to Upstash Redis');
    }
    catch (error) {
        console.error('Failed to connect to Upstash Redis');
        console.error(error);
        process.exit(1);
    }
};
exports.initRedis = initRedis;
exports.redis = (0, exports.getRedisClient)();
exports.default = exports.redis;
