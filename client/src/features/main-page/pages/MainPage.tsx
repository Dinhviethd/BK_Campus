import { useState, useEffect, useCallback, useRef } from 'react';
import { Filter, Search, Settings, XCircle, Loader2 } from 'lucide-react';

import { MainPageLayout } from '../components/modals/MainPageLayout';

// Import Components
import { FilterSidebar } from '../components/FilterSidebar';
import { CreatePostBox } from '../components/CreatePostBox';
import { PostItem } from '../components/PostItem';
import { RightSidebar } from '../components/RightSidebar';
import { MatchModal } from '../components/modals/MatchModal';

// Store & types
import { usePostStore } from '../stores/postStore';
import { LOCATIONS } from '../constant';
import { PostSource, PostType, type Post } from '../types';

export default function HomePage() {
    // --- ZUSTAND STORE ---
    const {
        posts,
        isLoading,
        isCreating,
        activeTab,
        filterLocation,
        searchKeyword,
        totalPages,
        page,
        fetchPosts,
        loadMore,
        setActiveTab,
        setFilterLocation,
        setSearchKeyword,
        createPost,
        resolvePost,
    } = usePostStore();

    // Local UI state
    const [newPostContent, setNewPostContent] = useState('');
    const [newPostLocation, setNewPostLocation] = useState('');
    const [newPostImages, setNewPostImages] = useState<File[]>([]);

    // AI & Bot Logic State
    const [isScanning, setIsScanning] = useState(false);
    const [bellActive, setBellActive] = useState(false);
    const [showMatchModal, setShowMatchModal] = useState(false);
    const [matches, setMatches] = useState<Post[]>([]);
    const [showSettingsModal, setShowSettingsModal] = useState(false);

    // Debounce timer for search
    const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

    // Infinite scroll sentinel
    const sentinelRef = useRef<HTMLDivElement>(null);

    // --- FETCH khi filter thay đổi ---
    useEffect(() => {
        fetchPosts();
    }, [activeTab, filterLocation, fetchPosts]);

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
    const handleBellClick = () => {
        if (bellActive) return;
        setIsScanning(true);
        setBellActive(true);

        setTimeout(() => {
            setIsScanning(false);
            const foundMatches = posts.filter((p) => p.type === PostType.FOUND);
            setMatches(foundMatches.slice(0, 2));
            setShowMatchModal(true);
        }, 3000);
    };

    // 3. Xử lý Kết thúc case (Đóng bài)
    const handleResolve = async (postId: string) => {
        if (window.confirm('Xác nhận bạn đã nhận lại được đồ? Hệ thống sẽ ẩn bài viết và đóng case.')) {
            try {
                await resolvePost(postId);
                setBellActive(false);
                setShowMatchModal(false);
                alert('🎉 Chúc mừng bạn! Case đã đóng.');
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