"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const realtime_controller_1 = require("../../modules/realtime/realtime.controller");
const router = (0, express_1.Router)();
router.get('/posts/stream', realtime_controller_1.realtimeController.streamPosts);
exports.default = router;
