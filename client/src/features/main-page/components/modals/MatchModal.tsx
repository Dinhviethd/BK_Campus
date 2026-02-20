import { CheckCircle, XCircle, MapPin } from 'lucide-react';
import type { Post } from '../../types';

interface MatchModalProps {
    matches: Post[];
    onClose: () => void;
    onResolve: (id: number) => void;
}

export const MatchModal = ({ matches, onClose, onResolve }: MatchModalProps) => (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-gradient-to-r from-green-600 to-teal-600 text-white flex justify-between items-center">
                <h3 className="font-bold text-lg flex items-center gap-2"><CheckCircle className="text-white"/> AI Tìm thấy {matches.length} kết quả</h3>
                <button onClick={onClose}><XCircle size={24} /></button>
            </div>
            <div className="p-6 overflow-y-auto bg-gray-50 space-y-4">
                {matches.map(match => (
                    <div key={match.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <h4 className="font-bold text-gray-800">{match.content}</h4>
                        <p className="text-xs text-gray-500"><MapPin size={12}/> {match.location}</p>
                        <button onClick={() => onResolve(match.id)} className="mt-3 w-full py-2 bg-green-600 text-white rounded-lg font-bold">Đây là đồ của tôi!</button>
                    </div>
                ))}
            </div>
        </div>
    </div>
);