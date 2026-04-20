import { useState } from 'react';
import { CheckCircle, XCircle, MapPin } from 'lucide-react';
import type { Post } from '@/features/main-page/types';

interface MatchItem {
    post: Post;
    similarityScore?: number;
}

interface MatchModalProps {
    matches: MatchItem[];
    onClose: () => void;
    onResolve: (id: string) => void;
}

const extractImageUrls = (post: Post): string[] => {
    if (!post.images || post.images.length === 0) {
        return [];
    }

    return post.images.flatMap((img) => {
        const rawUrl = (img as { url?: string | string[] }).url;
        if (!rawUrl) {
            return [];
        }

        return Array.isArray(rawUrl) ? rawUrl : [rawUrl];
    });
};

export const MatchModal = ({ matches, onClose, onResolve }: MatchModalProps) => {
    const [pendingMatchId, setPendingMatchId] = useState<string | null>(null);

    const handleConfirmResolve = () => {
        if (!pendingMatchId) {
            return;
        }

        onResolve(pendingMatchId);
        setPendingMatchId(null);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 bg-gradient-to-r from-green-600 to-teal-600 text-white flex justify-between items-center">
                    <h3 className="font-bold text-lg flex items-center gap-2"><CheckCircle className="text-white"/> AI Tìm thấy {matches.length} kết quả</h3>
                    <button onClick={onClose}><XCircle size={24} /></button>
                </div>
                <div className="p-6 overflow-y-auto bg-gray-50 space-y-4">
                    {matches.map((matchItem) => (
                        <div key={matchItem.post.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            <h4 className="font-bold text-gray-800">{matchItem.post.content}</h4>
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-1"><MapPin size={12}/> {matchItem.post.location}</p>
                            {extractImageUrls(matchItem.post).length > 0 && (
                                <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                                    {extractImageUrls(matchItem.post).map((imageUrl, index) => (
                                        <img
                                            key={`${matchItem.post.id}-${index}`}
                                            src={imageUrl}
                                            alt={`match-${matchItem.post.id}-${index}`}
                                            className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                                        />
                                    ))}
                                </div>
                            )}
                            {typeof matchItem.similarityScore === 'number' && (
                                <p className="text-xs text-emerald-700 mt-1 font-semibold">
                                    Độ tương đồng: {(matchItem.similarityScore * 100).toFixed(1)}%
                                </p>
                            )}
                            <button onClick={() => setPendingMatchId(matchItem.post.id)} className="mt-3 w-full py-2 bg-green-600 text-white rounded-lg font-bold">Đây là đồ của tôi!</button>
                        </div>
                    ))}
                </div>
            </div>

            {pendingMatchId && (
                <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-5 space-y-4">
                        <h4 className="text-lg font-bold text-gray-900">Xác nhận vật phẩm</h4>
                        <p className="text-sm text-gray-700 whitespace-pre-line">
                            Bạn có chắc chắn đây là đồ của bạn?
                            {'\n'}
                            Vui lòng kiểm tra kỹ trước khi xác nhận. Bạn sẽ chịu trách nhiệm nếu có sai sót.
                        </p>
                        <div className="flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setPendingMatchId(null)}
                                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold"
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmResolve}
                                className="px-4 py-2 rounded-lg bg-green-600 text-white font-semibold"
                            >
                                Tôi xác nhận
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};