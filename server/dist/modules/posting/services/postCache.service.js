"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.postCacheService = exports.PostCacheService = void 0;
const redis_config_1 = __importDefault(require("../../../configs/redis.config"));
const post_repository_1 = require("../../../modules/posting/post.repository");
const LATEST_POSTS_CACHE_KEY = 'posts:latest:20';
const LATEST_POSTS_CACHE_TTL_SECONDS = 60 * 10;
class PostCacheService {
    /**
     * Cache 20 bài post mới nhất trong 10 phút.
     */
    async cacheLatestPosts() {
        const result = await post_repository_1.postRepository.findAll(1, 20);
        const latestPosts = result.data;
        await redis_config_1.default.set(LATEST_POSTS_CACHE_KEY, latestPosts, {
            ex: LATEST_POSTS_CACHE_TTL_SECONDS,
        });
        return latestPosts;
    }
    /**
     * Xóa cache danh sách bài post mới nhất hiện có.
     */
    async clearLatestPostsCache() {
        await redis_config_1.default.del(LATEST_POSTS_CACHE_KEY);
    }
}
exports.PostCacheService = PostCacheService;
exports.postCacheService = new PostCacheService();
