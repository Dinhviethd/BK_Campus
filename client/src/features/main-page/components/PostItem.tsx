import { MapPin, ExternalLink, MessageCircle } from 'lucide-react';
import type { Post } from '@/features/main-page/types';
import { PostSource } from '@/features/main-page/types';

interface PostItemProps {
    post: Post;
    activeTab: string;
    handleSendLink: (id: string) => void;
}

/** Tính khoảng cách thời gian tương đối */
function timeAgo(dateStr: string): string {
    const now = Date.now();
    const diff = now - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'Vừa xong';
    if (mins < 60) return `${mins} phút trước`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
}

export const PostItem = ({ post, activeTab, handleSendLink }: PostItemProps) => {
    const avatarUrl =
        post.user?.avatarUrl ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(post.user?.name || 'U')}&background=3b82f6&color=fff`;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                    <img src={avatarUrl} alt="avt" className="w-10 h-10 rounded-full border border-gray-100" />
                    <div>
                        <h4 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                            {post.user?.name || 'Ẩn danh'}
                            {post.source === PostSource.FACEBOOK_CRAWL && (
                                <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200 font-bold">
                                    FACEBOOK CRAWL
                                </span>
                            )}
                        </h4>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                            {timeAgo(post.createdAt)} • <MapPin size={12} /> {post.location}
                        </p>
                    </div>
                </div>
                {post.source === PostSource.FACEBOOK_CRAWL && post.originalLink && (
                    <a
                        href={post.originalLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:bg-blue-50 p-2 rounded-full"
                    >
                        <ExternalLink size={18} />
                    </a>
                )}
            </div>

            <p className="text-gray-800 text-sm leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
                {post.content}
            </p>

            {/* Hiển thị ảnh nếu có */}
            {post.images && post.images.length > 0 && (
                <div className="flex gap-2 mt-3 overflow-x-auto">
                    {post.images.map((img) => (
                        <img
                            key={img.id}
                            src={img.url}
                            alt="post"
                            className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                        />
                    ))}
                </div>
            )}

            <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                {activeTab === 'FOUND' ? (
                    <>
                        <button className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg">
                            <MessageCircle size={16} /> Nhắn tin
                        </button>
                        <button
                            onClick={() => handleSendLink(post.id)}
                            className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg"
                        >
                            🔗 Gửi link bài này
                        </button>
                    </>
                ) : (
                    <button className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg">
                        <MessageCircle size={16} /> Bình luận / Liên hệ
                    </button>
                )}
            </div>
        </div>
    );
};