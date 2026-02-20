import { MapPin, ImageIcon, PlusCircle, Loader2 } from 'lucide-react';

interface CreateProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    bellActive: boolean;
    newPostContent: string;
    setNewPostContent: (val: string) => void;
    handlePost: () => void;
    isBotChecking: boolean;
}

export const CreatePostBox = ({ activeTab, setActiveTab, bellActive, newPostContent, setNewPostContent, handlePost, isBotChecking }: CreateProps) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex border-b border-gray-100">
                <button onClick={() => setActiveTab('lost')} className={`flex-1 py-4 font-bold transition-all ${activeTab === 'lost' ? 'text-red-500 border-b-2 border-red-500 bg-red-50' : 'text-gray-500 hover:bg-gray-50'}`}>🕵️ Tôi bị mất đồ</button>
                <button onClick={() => setActiveTab('found')} className={`flex-1 py-4 font-bold transition-all ${activeTab === 'found' ? 'text-green-600 border-b-2 border-green-500 bg-green-50' : 'text-gray-500 hover:bg-gray-50'}`}>🙋‍♂️ Tôi nhặt được</button>
            </div>
            <div className="p-4">
                {(!bellActive || activeTab === 'found') ? (
                    <div className="flex gap-3">
                        <img src="https://ui-avatars.com/api/?name=You&background=3b82f6&color=fff" className="w-10 h-10 rounded-full" alt="Me" />
                        <div className="flex-1">
                            <textarea value={newPostContent} onChange={(e) => setNewPostContent(e.target.value)} placeholder={activeTab === 'lost' ? "Mô tả đồ bị mất..." : "Bạn nhặt được gì..."} className="w-full bg-gray-50 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24 border border-gray-200" />
                            <div className="flex justify-between items-center mt-3">
                                <div className="flex gap-2">
                                    <button className="text-gray-500 hover:bg-gray-100 p-2 rounded-full"><MapPin size={18}/></button>
                                    <button className="text-gray-500 hover:bg-gray-100 p-2 rounded-full"><ImageIcon size={18}/></button>
                                </div>
                                <button onClick={handlePost} disabled={isBotChecking} className={`px-6 py-2 rounded-lg text-white font-medium flex items-center gap-2 transition-all ${activeTab === 'lost' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700'}`}>
                                    {isBotChecking ? <Loader2 className="animate-spin w-4 h-4"/> : <PlusCircle size={16} />}
                                    {isBotChecking ? 'Bot đang duyệt...' : 'Đăng tin'}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3 text-yellow-800">
                        <Loader2 className="animate-spin w-5 h-5"/>
                        <div><p className="font-bold text-sm">Chế độ Tìm kiếm AI đang bật.</p></div>
                    </div>
                )}
            </div>
        </div>
    );
};