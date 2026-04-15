import { create } from 'zustand';
import type { Post, PostType } from '../types';
import { ProcessStatus } from '../types';
import * as postApi from '../services/postService';

// const getPostSource = (post: Post): string | undefined => {
//   const postWithLegacySource = post as Post & { post_source?: string };
//   return postWithLegacySource.source ?? postWithLegacySource.post_source;
// };

// const shouldHideFromLostTab = (post: Post, activeTab: string): boolean => {
//   if (activeTab !== 'LOST') return false;
//   return getPostSource(post) === 'FACEBOOK_CRAWL';
// };

interface PostState {
  // Data
  posts: Post[];
  total: number;
  page: number;
  totalPages: number;

  // Filters
  activeTab: PostType | string;
  filterLocation: string;
  searchKeyword: string;

  // UI State
  isLoading: boolean;
  isCreating: boolean;
  showModerationNotice: boolean;
  error: string | null;

  // Actions
  fetchPosts: () => Promise<void>;
  loadMore: () => Promise<void>;
  setActiveTab: (tab: string) => void;
  setFilterLocation: (location: string) => void;
  setSearchKeyword: (keyword: string) => void;
  clearModerationNotice: () => void;
  createPost: (payload: postApi.CreatePostPayload) => Promise<Post>;
  resolvePost: (id: string) => Promise<void>;
}

export const usePostStore = create<PostState>((set, get) => ({
  // Initial data
  posts: [],
  total: 0,
  page: 1,
  totalPages: 1,

  activeTab: 'LOST',
  filterLocation: 'all',
  searchKeyword: '',

  isLoading: false,
  isCreating: false,
  showModerationNotice: false,
  error: null,

  // ==================== FETCH ====================

  fetchPosts: async () => {
    const { activeTab, filterLocation, searchKeyword } = get();
    set({ isLoading: true, error: null });

    try {
      const params: Record<string, any> = {
        type: activeTab,
        status: ProcessStatus.ACTIVE,
        page: 1,
        limit: 20,
      };
      if (filterLocation !== 'all') params.location = filterLocation;
      if (searchKeyword.trim()) params.search = searchKeyword.trim();

      const result = await postApi.getPosts(params);
      // const filteredPosts = result.data.filter((post) => !shouldHideFromLostTab(post, activeTab));

      set({
        posts: result.data,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        isLoading: false,
      });
    } catch (err: any) {
      set({
        error: err?.response?.data?.message || 'Lỗi khi tải bài viết',
        isLoading: false,
      });
    }
  },

  loadMore: async () => {
    const { page, totalPages, activeTab, filterLocation, searchKeyword, posts } = get();
    if (page >= totalPages) return;

    const nextPage = page + 1;
    set({ isLoading: true });

    try {
      const params: Record<string, any> = {
        type: activeTab,
        status: ProcessStatus.ACTIVE,
        page: nextPage,
        limit: 20,
      };
      if (filterLocation !== 'all') params.location = filterLocation;
      if (searchKeyword.trim()) params.search = searchKeyword.trim();

      const result = await postApi.getPosts(params);
      // const filteredPosts = result.data.filter((post) => !shouldHideFromLostTab(post, activeTab));

      set({
        posts: [...posts, ...result.data],
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        isLoading: false,
      });
    } catch (err: any) {
      set({
        error: err?.response?.data?.message || 'Lỗi khi tải thêm',
        isLoading: false,
      });
    }
  },

  // ==================== FILTERS ====================

  setActiveTab: (tab: string) => {
    set({ activeTab: tab, page: 1, posts: [] });
    // fetchPosts sẽ được gọi bởi useEffect khi activeTab thay đổi
  },

  setFilterLocation: (location: string) => {
    set({ filterLocation: location, page: 1, posts: [] });
  },

  setSearchKeyword: (keyword: string) => {
    set({ searchKeyword: keyword });
  },

  clearModerationNotice: () => {
    set({ showModerationNotice: false });
  },

  // ==================== CREATE ====================

  createPost: async (payload) => {
    set({ isCreating: true, error: null });

    try {
      const newPost = await postApi.createPost(payload);

      // Nếu bài active → thêm lên đầu danh sách trong store
      if (newPost.status === ProcessStatus.ACTIVE) {
        set((state) => ({
          posts: [newPost, ...state.posts],
          total: state.total + 1,
          isCreating: false,
          showModerationNotice: false,
        }));
      } else if (newPost.status === ProcessStatus.MODERATING) {
        set({
          isCreating: false,
          showModerationNotice: true,
        });
      } else {
        set({
          isCreating: false,
          showModerationNotice: false,
        });
      }

      return newPost;
    } catch (err: any) {
      set({
        error: err?.response?.data?.message || 'Lỗi khi đăng bài',
        isCreating: false,
      });
      throw err;
    }
  },

  // ==================== RESOLVE ====================

  resolvePost: async (id: string) => {
    try {
      await postApi.updatePostStatus(id, 'closed');
      set((state) => ({
        posts: state.posts.filter((p) => p.id !== id),
        total: state.total - 1,
      }));
    } catch (err: any) {
      set({ error: err?.response?.data?.message || 'Lỗi khi đóng bài' });
      throw err;
    }
  },
}));
