"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_route_1 = __importDefault(require("./auth/auth.route"));
const post_route_1 = __importDefault(require("./posting/routes/post.route"));
const webhook_route_1 = __importDefault(require("./posting/routes/webhook.route"));
const realtime_route_1 = __importDefault(require("./realtime/realtime.route"));
const router = (0, express_1.Router)();
router.use('/auth', auth_route_1.default);
router.use('/posts', post_route_1.default);
router.use('/webhook', webhook_route_1.default);
router.use('/realtime', realtime_route_1.default);
exports.default = router;
