"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.realtimeController = void 0;
const error_response_1 = require("../../utils/error.response");
const post_realtime_subscriber_1 = require("../../modules/realtime/post-realtime.subscriber");
class RealtimeController {
    streamPosts = (0, error_response_1.asyncHandler)(async (req, res) => {
        const postIdFilter = typeof req.query.postId === 'string' ? req.query.postId : null;
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        if (typeof res.flushHeaders === 'function') {
            res.flushHeaders();
        }
        const sendEvent = (payload) => {
            res.write(`data: ${JSON.stringify(payload)}\n\n`);
        };
        sendEvent({
            type: 'connected',
            message: 'SSE stream connected',
            postIdFilter,
            occurredAt: new Date().toISOString(),
        });
        const heartbeat = setInterval(() => {
            res.write(': keep-alive\n\n');
        }, 25000);
        const unsubscribe = (0, post_realtime_subscriber_1.onPostRealtimeEvent)((payload) => {
            if (postIdFilter && payload.postId !== postIdFilter) {
                return;
            }
            sendEvent(payload);
        });
        req.on('close', () => {
            clearInterval(heartbeat);
            unsubscribe();
            res.end();
        });
    });
}
exports.realtimeController = new RealtimeController();
