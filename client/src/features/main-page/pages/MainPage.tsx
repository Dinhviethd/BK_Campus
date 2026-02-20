import {useState } from 'react';
import { Filter, Search, Settings, XCircle } from 'lucide-react';

import { INITIAL_POSTS, LOCATIONS } from '../constant';
import { MainPageLayout } from '../components/modals/MainPageLayout';

// Import Components
import { FilterSidebar } from '../components/FilterSidebar';
import { CreatePostBox } from '../components/CreatePostBox';
import { PostItem } from '../components/PostItem';
import { RightSidebar } from '../components/RightSidebar';
import { MatchModal } from '../components/modals/MatchModal';

export default function HomePage() {
    // --- STATE MANAGEMENT ---
    const [activeTab, setActiveTab] = useState('lost');
    const [posts, setPosts] = useState(INITIAL_POSTS);
    const [newPostContent, setNewPostContent] = useState('');
    
    // Filter State
    const [filterArea, setFilterArea] = useState('all');
    const [searchKeyword, setSearchKeyword] = useState('');

    // AI & Bot Logic State
    const [isScanning, setIsScanning] = useState(false); 
    const [bellActive, setBellActive] = useState(false);
    const [showMatchModal, setShowMatchModal] = useState(false);
    const [matches, setMatches] = useState<any[]>([]);
    const [isBotChecking, setIsBotChecking] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);

    // --- LOGIC HANDLERS ---

    // 1. Bot Lọc Nội Dung (Spam Filter)
    const handlePost = async () => {
        if (!newPostContent.trim()) return;
        setIsBotChecking(true);
        
        setTimeout(() => {
            setIsBotChecking(false);
            if (newPostContent.length < 10) {
                alert("🤖 Bot AI: Nội dung quá ngắn hoặc không liên quan. Vui lòng mô tả chi tiết đồ vật (ít nhất 10 ký tự).");
                return;
            }

            const newPost = {
                id: Date.now(),
                type: activeTab,
                user: 'Bạn (User)',
                avatar: 'https://ui-avatars.com/api/?name=You&background=3b82f6&color=fff',
                content: newPostContent,
                time: 'Vừa xong',
                location: 'Chưa cập nhật',
                area: 'all',
                source: 'web',
                status: 'active'
            };

            setPosts([newPost, ...posts]);
            setNewPostContent('');
        }, 1500);
    };

    // 2. Logic "Cái Chuông" - Kích hoạt AI Matching
    const handleBellClick = () => {
        if (bellActive) return; 
        setIsScanning(true);
        setBellActive(true);

        setTimeout(() => {
            setIsScanning(false);
            const foundMatches = posts.filter(p => p.type === 'found'); 
            setMatches(foundMatches.slice(0, 2)); 
            setShowMatchModal(true);
        }, 3000);
    };

    // 3. Xử lý Kết thúc case (Tìm thấy đồ)
    const handleResolve = (postId: number) => {
        if (window.confirm("Xác nhận bạn đã nhận lại được đồ? Hệ thống sẽ ẩn bài viết và đóng case.")) {
            setPosts(posts.map(p => {
                if (p.id === postId) return { ...p, status: 'resolved' };
                return p;
            }));
            setBellActive(false); 
            setShowMatchModal(false);
            alert("🎉 Chúc mừng bạn! Case đã đóng.");
        }
    };

    const handleSendLink = (postId: number) => {
        alert(`Đã copy liên kết bài viết #${postId}. Hãy gửi cho người mất đồ!`);
    };

    const filteredPosts = posts.filter(p => {
        const matchTab = p.type === activeTab;
        const matchStatus = p.status === 'active';
        const matchArea = filterArea === 'all' || p.area === filterArea || (p.location && p.location.includes(filterArea));
        const matchKeyword = p.content.toLowerCase().includes(searchKeyword.toLowerCase()) || 
                             p.location.toLowerCase().includes(searchKeyword.toLowerCase());
        
        return matchTab && matchStatus && matchArea && matchKeyword;
    });

    return (
        <>
            <MainPageLayout 
                sidebarLeft={
                    <FilterSidebar 
                        filterArea={filterArea} 
                        setFilterArea={setFilterArea} 
                        searchKeyword={searchKeyword} 
                        setSearchKeyword={setSearchKeyword} 
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
                            handlePost={handlePost}
                            isBotChecking={isBotChecking}
                        />
                        
                        {(filterArea !== 'all' || searchKeyword) && (
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Filter size={14} />
                                <span>Đang hiển thị kết quả cho:</span>
                                {filterArea !== 'all' && <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{LOCATIONS.find(l => l.id === filterArea)?.label}</span>}
                                {searchKeyword && <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">"{searchKeyword}"</span>}
                            </div>
                        )}

                        <div className="space-y-4">
                            {filteredPosts.map(post => (
                                <PostItem key={post.id} post={post} activeTab={activeTab} handleSendLink={handleSendLink} />
                            ))}
                            {filteredPosts.length === 0 && (
                                <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
                                    <Search className="w-12 h-12 mx-auto mb-2 opacity-20"/>
                                    <p>Không tìm thấy bài đăng nào phù hợp.</p>
                                </div>
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
                            <h3 className="font-bold text-lg flex items-center gap-2"><Settings size={20}/> Cài đặt</h3>
                            <button onClick={() => setShowSettingsModal(false)}><XCircle size={24} /></button>
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