import redis from '@/configs/redis.config';
import { postRepository } from '@/modules/posting/post.repository';
import { Post } from '@/modules/posting/models/post.model';

const LATEST_POSTS_CACHE_KEY = 'posts:latest:20';
const LATEST_POSTS_CACHE_TTL_SECONDS = 60 * 10;

export class PostCacheService {
	/**
	 * Cache 20 bài post mới nhất trong 10 phút.
	 */
	async cacheLatestPosts(): Promise<Post[]> {
		const result = await postRepository.findAll(1, 20);
		const latestPosts = result.data;

		await redis.set(LATEST_POSTS_CACHE_KEY, latestPosts, {
			ex: LATEST_POSTS_CACHE_TTL_SECONDS,
		});

		return latestPosts;
	}


	async clearLatestPostsCache(): Promise<void> {
		await redis.del(LATEST_POSTS_CACHE_KEY);
	}
}

export const postCacheService = new PostCacheService();
