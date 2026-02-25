import { Post } from '@/models/post.model';
import { postRepository } from '@/repositories/post.repository';

/**
 * In-memory cache cho bài viết crawled (source=FACEBOOK_CRAWL, status=active, type=found).
 *
 * Flow:
 *   1. Server khởi động → init() load tất cả bài crawled active từ DB vào RAM.
 *   2. Bot chạy xong → DB trigger gọi webhook → refresh() fetch bài mới (cursor-based) → merge vào cache.
 *   3. User vào trang chủ → getCachedPosts() trả từ RAM, không query DB.
 */
export class PostCacheService {
  /** Map<postId, Post> để dedup và O(1) lookup */
  private cache: Map<string, Post> = new Map();

  /** Danh sách đã sort sẵn (mới nhất trước) để trả pagination nhanh */
  private sortedPosts: Post[] = [];

  /** Cursor = updatedAt cuối cùng đã load, dùng cho incremental fetch */
  private cursor: string = '1970-01-01T00:00:00.000Z';

  private isInitialized = false;

  // ==================== LIFECYCLE ====================

  /**
   * Load toàn bộ bài crawled active từ DB vào cache.
   * Chạy 1 lần khi server khởi động (sau khi DB connected).
   */
  async init(): Promise<void> {
    console.log('[PostCache] Đang khởi tạo cache...');

    const BATCH_SIZE = 500;
    let hasMore = true;

    while (hasMore) {
      const cursorDate = new Date(this.cursor);
      const posts = await postRepository.findNewCrawledPosts(cursorDate, BATCH_SIZE);

      if (posts.length === 0) {
        hasMore = false;
      } else {
        for (const post of posts) {
          this.cache.set(post.id, post);
        }
        // Cập nhật cursor = updatedAt của bài cuối (đã sort ASC)
        this.cursor = posts[posts.length - 1].updatedAt.toISOString();

        // Nếu trả về ít hơn batch size → đã hết
        if (posts.length < BATCH_SIZE) {
          hasMore = false;
        }
      }
    }

    this.rebuildSortedList();
    this.isInitialized = true;
    console.log(`[PostCache] Đã load ${this.cache.size} bài crawled vào cache`);
  }

  /**
   * Fetch bài mới từ DB (kể từ cursor) và merge vào cache.
   * Gọi bởi webhook khi bot chạy xong.
   */
  async refresh(): Promise<{ newCount: number }> {
    const BATCH_SIZE = 500;
    let totalNew = 0;
    let hasMore = true;

    while (hasMore) {
      const cursorDate = new Date(this.cursor);
      const posts = await postRepository.findNewCrawledPosts(cursorDate, BATCH_SIZE);

      if (posts.length === 0) {
        hasMore = false;
      } else {
        for (const post of posts) {
          this.cache.set(post.id, post);
        }
        totalNew += posts.length;
        this.cursor = posts[posts.length - 1].updatedAt.toISOString();

        if (posts.length < BATCH_SIZE) {
          hasMore = false;
        }
      }
    }

    if (totalNew > 0) {
      this.rebuildSortedList();
    }

    console.log(`[PostCache] Refresh xong — ${totalNew} bài mới (tổng cache: ${this.cache.size})`);
    return { newCount: totalNew };
  }

  // ==================== WRITE ====================

  /**
   * Thêm 1 bài viết vào đầu cache (mới nhất).
   * Gọi ngay sau khi sinh viên tự đăng bài thành công.
   */
  addPost(post: Post): void {
    this.cache.set(post.id, post);
    // Chèn đầu mảng — O(1) amortized, không cần rebuild toàn bộ
    this.sortedPosts.unshift(post);
    console.log(`[PostCache] Thêm bài mới "${post.id}" vào cache (tổng: ${this.cache.size})`);
  }

  // ==================== READ ====================

  /**
   * Trả bài viết từ cache (phân trang, mới nhất trước).
   * Đọc từ RAM — không query DB.
   */
  getCachedPosts(page: number = 1, limit: number = 20) {
    const total = this.sortedPosts.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const start = (page - 1) * limit;
    const data = this.sortedPosts.slice(start, start + limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /** Thông tin cache hiện tại (debug / health check) */
  getStats() {
    return {
      totalCached: this.cache.size,
      lastCursor: this.cursor,
      isInitialized: this.isInitialized,
    };
  }

  // ==================== PRIVATE ====================

  /** Sort lại danh sách sau khi cache thay đổi (mới nhất trước) */
  private rebuildSortedList(): void {
    this.sortedPosts = Array.from(this.cache.values()).sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }
}

// Singleton
export const postCacheService = new PostCacheService();
