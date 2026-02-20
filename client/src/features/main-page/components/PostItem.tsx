import { MapPin, ExternalLink, MessageCircle } from 'lucide-react';
import type { Post } from '../types';
interface PostItemProps {
    post: Post;
    activeTab: string;
    handleSendLink: (id: number) => void;
}

export const PostItem = ({ post, activeTab, handleSendLink }: PostItemProps) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                    <img src={post.avatar} alt="avt" className="w-10 h-10 rounded-full border border-gray-100" />
                    <div>
                        <h4 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                            {post.user}
                            {post.source === 'facebook' && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200 font-bold">FACEBOOK CRAWL</span>}
                        </h4>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                            {post.time} • <MapPin size={12}/> {post.location}
                        </p>
                    </div>
                </div>
                {post.source === 'facebook' && (
                    <a href={post.fbLink} target="_blank" rel="noreferrer" className="text-blue-600 hover:bg-blue-50 p-2 rounded-full"><ExternalLink size={18} /></a>
                )}
            </div>
            <p className="text-gray-800 text-sm leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">{post.content}</p>
            <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                {activeTab === 'found' ? (
                    <>
                        <button className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg"><MessageCircle size={16}/> Nhắn tin</button>
                        <button onClick={() => handleSendLink(post.id)} className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg">🔗 Gửi link bài này</button>
                    </>
                ) : (
                    <button className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg"><MessageCircle size={16}/> Bình luận / Liên hệ</button>
                )}
            </div>
        </div>
    );
};