"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onPostRealtimeEvent = exports.initPostRealtimeSubscriber = void 0;
const events_1 = require("events");
const redis_config_1 = require("../../configs/redis.config");
const POST_CHANNEL_PATTERN = 'post:*';
const postRealtimeEmitter = new events_1.EventEmitter();
postRealtimeEmitter.setMaxListeners(0);
let isSubscriberReady = false;
const emitPayload = (rawPayload) => {
    try {
        const payload = JSON.parse(rawPayload);
        postRealtimeEmitter.emit('post-event', payload);
    }
    catch (error) {
        console.error('[Realtime] Invalid Redis payload', error);
    }
};
const initPostRealtimeSubscriber = async () => {
    if (isSubscriberReady)
        return;
    const subscriber = (0, redis_config_1.getRedisSubscriberClient)();
    if (!subscriber) {
        console.warn('[Realtime] Redis pub/sub is disabled. Set UPSTASH_REDIS_URL to enable subscriber.');
        return;
    }
    subscriber.on('pmessage', (_pattern, _channel, payload) => {
        emitPayload(payload);
    });
    await subscriber.psubscribe(POST_CHANNEL_PATTERN);
    isSubscriberReady = true;
    console.log(`[Realtime] Redis subscriber started with pattern ${POST_CHANNEL_PATTERN}`);
};
exports.initPostRealtimeSubscriber = initPostRealtimeSubscriber;
const onPostRealtimeEvent = (listener) => {
    postRealtimeEmitter.on('post-event', listener);
    return () => {
        postRealtimeEmitter.off('post-event', listener);
    };
};
exports.onPostRealtimeEvent = onPostRealtimeEvent;
