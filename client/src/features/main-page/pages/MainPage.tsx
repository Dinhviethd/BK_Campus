import { useState, useEffect, useCallback, useRef } from 'react';
import { Filter, Search, Settings, XCircle, Loader2 } from 'lucide-react';

import { MainPageLayout } from '../components/modals/MainPageLayout';

// Import Components
import { FilterSidebar } from '../components/FilterSidebar';
import { CreatePostBox } from '../components/CreatePostBox';
import { PostItem } from '../components/PostItem';
import { RightSidebar } from '../components/RightSidebar';
import { MatchModal } from '../components/modals/MatchModal';
import { useAuth } from '@/features/auth/stores/authStore';
import {
    createPostRealtimeEventSource,
    getMatchingScanState,
    getMyPosts,
    triggerAiMatching,
} from '../services/postService';

import { usePostStore } from '../stores/postStore';
import { LOCATIONS } from '../constant';
import { PostSource, PostType, ProcessStatus, type Post } from '../types';

export default function HomePage() {
    const user = useAuth((state) => state.user);

    const {
        posts,
        isLoading,
        isCreating,
        showModerationNotice,
        activeTab,
        filterLocation,
        searchKeyword,
        selectedUserId,
        selectedUserName,
        totalPages,
        page,
        fetchPosts,
        loadMore,
        setActiveTab,
        setFilterLocation,
        setSearchKeyword,
        setSelectedUserFilter,
        clearSelectedUserFilter,
        setModerationNotice,
        clearModerationNotice,
        createPost,
        resolvePost,
        deleteOwnPost,
    } = usePostStore();

    const [newPostContent, setNewPostContent] = useState('');
    const [newPostLocation, setNewPostLocation] = useState('');
    const [newPostImages, setNewPostImages] = useState<File[]>([]);

    const [isScanning, setIsScanning] = useState(false);
    const [bellActive, setBellActive] = useState(false);
    const [showMatchModal, setShowMatchModal] = useState(false);
    const [matches] = useState<Post[]>([]);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showRejectedNotice, setShowRejectedNotice] = useState(false);

    const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
    const rejectedPostIdsRef = useRef<Set<string>>(new Set());

    const sentinelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchPosts();
    }, [activeTab, filterLocation, fetchPosts]);

    useEffect(() => {
        if (!user?.idUser) {
            setModerationNotice(false);
            setBellActive(false);
            setIsScanning(false);
            return;
        }

        let cancelled = false;

        const restoreAiState = async () => {
            try {
                const [myPostsResult, scanState] = await Promise.all([
                    getMyPosts(1, 50),
                    getMatchingScanState(),
                ]);

                if (cancelled) {
                    return;
                }

                const hasPendingModeration = myPostsResult.data.some(
                    (post) =>
                        post.status === ProcessStatus.MODERATING ||
                        post.status === ProcessStatus.EMBEDDING
                );

                setModerationNotice(hasPendingModeration);
                setBellActive(scanState.is_scanning);
                setIsScanning(scanState.is_scanning);
            } catch {
                if (cancelled) {
                    return;
                }

                setModerationNotice(false);
                setBellActive(false);
                setIsScanning(false);
            }
        };

        restoreAiState();

        return () => {
            cancelled = true;
        };
    }, [setModerationNotice, user?.idUser]);

    useEffect(() => {
        const eventSource = createPostRealtimeEventSource();
        let refreshTimeout: ReturnType<typeof setTimeout> | undefined;

        eventSource.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data) as {
                    type?: string;
                    postId?: string;
                    post?: {
                        status?: string;
                        user?: { idUser?: string | number };
                    };
                };

                if (payload.type === 'connected') {
                    return;
                }

                const isRejected = payload.post?.status === ProcessStatus.REJECTED;
                const isOwner = String(payload.post?.user?.idUser) === String(user?.idUser);

                if (isRejected && isOwner && payload.postId && !rejectedPostIdsRef.current.has(payload.postId)) {
                    rejectedPostIdsRef.current.add(payload.postId);
                    setShowRejectedNotice(true);
                    clearModerationNotice();
                }
            } catch {
                // Ignore invalid payloads and keep stream alive.
            }

            if (refreshTimeout) {
                clearTimeout(refreshTimeout);
            }

            refreshTimeout = setTimeout(() => {
                fetchPosts();
            }, 250);
        };

        return () => {
            if (refreshTimeout) {
                clearTimeout(refreshTimeout);
            }
            eventSource.close();
        };
    }, [clearModerationNotice, fetchPosts, user?.idUser]);

    // --- INFINITE SCROLL via IntersectionObserver ---
    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !isLoading && page < totalPages) {
                    loadMore();
                }
            },
            { rootMargin: '300px' }
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [isLoading, page, totalPages, loadMore]);

    // Debounce search keyword
    const handleSearchChange = useCallback(
        (keyword: string) => {
            setSearchKeyword(keyword);
            if (searchTimer.current) clearTimeout(searchTimer.current);
            searchTimer.current = setTimeout(() => {
                fetchPosts();
            }, 400);
        },
        [setSearchKeyword, fetchPosts]
    );

    // --- LOGIC HANDLERS ---

    // 1. Đăng bài qua API
    const handlePost = async () => {
        if (!newPostContent.trim()) return;
        if (newPostContent.length < 10) {
            alert('Nội dung quá ngắn. Vui lòng mô tả chi tiết đồ vật (ít nhất 10 ký tự).');
            return;
        }

        try {
            await createPost({
                content: newPostContent,
                location: newPostLocation || 'Chưa cập nhật',
                type: activeTab as string,
                source: PostSource.WEB_USER,
                images: newPostImages.length > 0 ? newPostImages : undefined,
            });

            // Reset form
            setNewPostContent('');
            setNewPostLocation('');
            setNewPostImages([]);
        } catch (err: any) {
            const message =
                err?.response?.data?.message || 'Đăng bài thất bại. Vui lòng thử lại.';
            alert(message);
        }
    };

    // 2. Logic "Cái Chuông" — Kích hoạt AI Matching
    const handleBellClick = async () => {
        if (bellActive || isScanning) return;

        const latestOwnLostPost = posts.find(
            (post) =>
                post.type === PostType.LOST &&
                String(post.user?.idUser) === String(user?.idUser)
        );

        if (!latestOwnLostPost) {
            alert('Bạn chưa có bài đăng MẤT đồ để bật AI tìm kiếm.');
            return;
        }

        setIsScanning(true);

        try {
            const matchingResponse = await triggerAiMatching(latestOwnLostPost.id);
            setBellActive(true);

            if (matchingResponse.status !== 'SCANNING') {
                setIsScanning(false);
            }

            if (matchingResponse.message) {
                alert(matchingResponse.message);
            }
        } catch (err: any) {
            setIsScanning(false);
            setBellActive(false);

            const detailError = err?.response?.data?.detail;
            if (Array.isArray(detailError) && detailError.length > 0) {
                const messages = detailError
                    .map((item: { msg?: string }) => item?.msg)
                    .filter(Boolean)
                    .join('; ');

                alert(messages || 'Không thể bật AI tìm kiếm. Vui lòng thử lại.');
                return;
            }

            const message = err?.response?.data?.message || 'Không thể bật AI tìm kiếm. Vui lòng thử lại.';
            alert(message);
        }
    };

    // 3. Xử lý Kết thúc case (Đóng bài)
    const handleResolve = async (postId: string) => {
        if (window.confirm('Xác nhận bạn đã nhận lại được đồ? Hệ thống sẽ ẩn bài viết và đóng case.')) {
            try {
                await resolvePost(postId);
                setBellActive(false);
                setShowMatchModal(false);
                alert('Chúc mừng bạn! Case đã đóng.');
            } catch {
                alert('Lỗi khi đóng bài. Vui lòng thử lại.');
            }
        }
    };

    const handleSendLink = (postId: string) => {
        const link = `${window.location.origin}/posts/${postId}`;
        navigator.clipboard.writeText(link).then(() => {
            alert('Đã copy liên kết bài viết. Hãy gửi cho người mất đồ!');
        });
    };

    const handleDeletePost = async (postId: string) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa bài viết này? Hành động này không thể hoàn tác.')) {
            return;
        }

        try {
            await deleteOwnPost(postId);
            alert('Đã xóa bài viết thành công.');
        } catch (err: any) {
            const message = err?.response?.data?.message || 'Xóa bài viết thất bại. Vui lòng thử lại.';
            alert(message);
        }
    };

    const handleViewUserPosts = (userId: string, userName?: string) => {
        if (!userId) return;
        setSelectedUserFilter(userId, userName);
    };

    return (
        <>
            <MainPageLayout
                sidebarLeft={
                    <FilterSidebar
                        filterArea={filterLocation}
                        setFilterArea={(loc) => setFilterLocation(loc)}
                        searchKeyword={searchKeyword}
                        setSearchKeyword={handleSearchChange}
                    />
                }
                mainContent={
                    <div className="space-y-6">
                        {showModerationNotice && (
                            <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 flex items-center justify-between gap-3">
                                <p className="text-sm md:text-base font-medium">
                                    Bài của bạn đang được phê duyệt, vui lòng chờ trong giây lát.
                                </p>
                                <button
                                    type="button"
                                    onClick={clearModerationNotice}
                                    className="text-amber-700 hover:text-amber-900 text-sm font-semibold"
                                >
                                    Đóng
                                </button>
                            </div>
                        )}

                        {showRejectedNotice && (
                            <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-red-900 flex items-center justify-between gap-3">
                                <p className="text-sm md:text-base font-medium">
                                    Bài đăng của bạn đã bị từ chối trong quá trình kiểm duyệt AI.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setShowRejectedNotice(false)}
                                    className="text-red-700 hover:text-red-900 text-sm font-semibold"
                                >
                                    Đóng
                                </button>
                            </div>
                        )}

                        <CreatePostBox
                            activeTab={activeTab}
                            setActiveTab={setActiveTab}
                            bellActive={bellActive}
                            newPostContent={newPostContent}
                            setNewPostContent={setNewPostContent}
                            newPostLocation={newPostLocation}
                            setNewPostLocation={setNewPostLocation}
                            newPostImages={newPostImages}
                            setNewPostImages={setNewPostImages}
                            handlePost={handlePost}
                            isBotChecking={isCreating}
                        />

                        {(filterLocation !== 'all' || searchKeyword) && (
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Filter size={14} />
                                <span>Đang hiển thị kết quả cho:</span>
                                {filterLocation !== 'all' && (
                                    <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                        {LOCATIONS.find((l) => l.id === filterLocation)?.label}
                                    </span>
                                )}
                                {searchKeyword && (
                                    <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                        &quot;{searchKeyword}&quot;
                                    </span>
                                )}
                            </div>
                        )}

                        {selectedUserId && (
                            <div className="flex items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-blue-900">
                                <p className="text-sm md:text-base font-medium">
                                    Đang xem tất cả bài viết của {selectedUserName || 'người dùng này'}
                                </p>
                                <button
                                    type="button"
                                    onClick={clearSelectedUserFilter}
                                    className="text-sm font-semibold text-blue-700 hover:text-blue-900"
                                >
                                    Quay lại feed
                                </button>
                            </div>
                        )}

                        <div className="space-y-4">
                            {isLoading && posts.length === 0 ? (
                                <div className="text-center py-12">
                                    <Loader2 className="w-8 h-8 mx-auto animate-spin text-blue-500" />
                                    <p className="text-gray-400 mt-2">Đang tải bài viết...</p>
                                </div>
                            ) : (
                                <>
                                    {posts.map((post) => (
                                        <PostItem
                                            key={post.id}
                                            post={post}
                                            activeTab={activeTab}
                                            handleSendLink={handleSendLink}
                                            canDelete={String(post.user?.idUser) === String(user?.idUser)}
                                            onDelete={handleDeletePost}
                                            onViewUserPosts={handleViewUserPosts}
                                        />
                                    ))}

                                    {posts.length === 0 && !isLoading && (
                                        <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
                                            <Search className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                            <p>Không tìm thấy bài đăng nào phù hợp.</p>
                                        </div>
                                    )}

                                    {/* Sentinel — khi xuất hiện trong viewport sẽ tự gọi loadMore */}
                                    <div ref={sentinelRef} className="h-1" />

                                    {isLoading && posts.length > 0 && (
                                        <div className="text-center py-6">
                                            <Loader2 className="w-6 h-6 mx-auto animate-spin text-blue-500" />
                                            <p className="text-gray-400 text-sm mt-1">Đang tải thêm...</p>
                                        </div>
                                    )}

                                    {page >= totalPages && posts.length > 0 && (
                                        <p className="text-center text-gray-400 text-sm py-4">
                                            Đã hiển thị tất cả bài viết
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                }
                sidebarRight={
                    <RightSidebar
                        activeTab={activeTab}
                        bellActive={bellActive}
                        isScanning={isScanning}
                        handleBellClick={handleBellClick}
                    />
                }
            />

            {showSettingsModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                        <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex justify-between items-center">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Settings size={20} /> Cài đặt
                            </h3>
                            <button onClick={() => setShowSettingsModal(false)}>
                                <XCircle size={24} />
                            </button>
                        </div>
                        <div className="p-6 text-center text-gray-500">Nội dung cài đặt ở đây...</div>
                    </div>
                </div>
            )}

            {showMatchModal && (
                <MatchModal matches={matches} onClose={() => setShowMatchModal(false)} onResolve={handleResolve} />
            )}
        </>
    );
}