"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishPostEvent = void 0;
const redis_config_1 = require("../../configs/redis.config");
const post_realtime_types_1 = require("../../modules/realtime/post-realtime.types");
const publishPostEvent = async ({ postId, eventType, post }) => {
    const channel = (0, post_realtime_types_1.getPostChannel)(postId);
    const publisher = (0, redis_config_1.getRedisPublisherClient)();
    if (!publisher) {
        return;
    }
    const payload = {
        postId,
        channel,
        eventType,
        occurredAt: new Date().toISOString(),
        post,
    };
    await publisher.publish(channel, JSON.stringify(payload));
};
exports.publishPostEvent = publishPostEvent;
