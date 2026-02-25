import { useRef } from 'react';
import { MapPin, ImageIcon, PlusCircle, Loader2, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { LOCATIONS } from '@/features/main-page/constant';
import { PostType } from '../types';

interface CreateProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    bellActive: boolean;
    newPostContent: string;
    setNewPostContent: (val: string) => void;
    newPostLocation: string;
    setNewPostLocation: (val: string) => void;
    newPostImages: File[];
    setNewPostImages: (val: File[]) => void;
    handlePost: () => void;
    isBotChecking: boolean;
}

export const CreatePostBox = ({
    activeTab, setActiveTab, bellActive,
    newPostContent, setNewPostContent,
    newPostLocation, setNewPostLocation,
    newPostImages, setNewPostImages,
    handlePost, isBotChecking,
}: CreateProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        setNewPostImages([...newPostImages, ...Array.from(files)]);
        // Reset input để có thể chọn lại cùng file
        e.target.value = '';
    };

    const removeImage = (index: number) => {
        setNewPostImages(newPostImages.filter((_, i) => i !== index));
    };

    const selectedLocationLabel = LOCATIONS.find((l) => l.id === newPostLocation)?.label;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex border-b border-gray-100">
                <button onClick={() => setActiveTab(PostType.LOST)} disabled={activeTab === PostType.LOST} className={`flex-1 py-4 font-bold transition-all ${activeTab === PostType.LOST ? 'text-red-500 border-b-2 border-red-500 bg-red-50 cursor-default' : 'text-gray-500 hover:bg-gray-50 cursor-pointer'}`}>🕵️ Tôi bị mất đồ</button>
                <button onClick={() => setActiveTab(PostType.FOUND)} disabled={activeTab === PostType.FOUND} className={`flex-1 py-4 font-bold transition-all ${activeTab === PostType.FOUND ? 'text-green-600 border-b-2 border-green-500 bg-green-50 cursor-default' : 'text-gray-500 hover:bg-gray-50 cursor-pointer'}`}>🙋‍♂️ Tôi nhặt được</button>
            </div>
            <div className="p-4">
                {(!bellActive || activeTab === PostType.FOUND) ? (
                    <div className="flex gap-3">
                        <img src="https://ui-avatars.com/api/?name=You&background=3b82f6&color=fff" className="w-10 h-10 rounded-full" alt="Me" />
                        <div className="flex-1">
                            <textarea value={newPostContent} onChange={(e) => setNewPostContent(e.target.value)} placeholder={activeTab === PostType.LOST ? "Mô tả đồ bị mất..." : "Bạn nhặt được gì..."} className="w-full bg-gray-50 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24 border border-gray-200" />

                            {/* Badges hiển thị location đã chọn & ảnh đã chọn */}
                            {(newPostLocation || newPostImages.length > 0) && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {newPostLocation && (
                                        <span className="inline-flex items-center gap-1 text-xs font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded-full border border-blue-200">
                                            <MapPin size={12} />
                                            {selectedLocationLabel}
                                            <button type="button" onClick={() => setNewPostLocation('')} className="ml-0.5 hover:text-blue-900">
                                                <X size={12} />
                                            </button>
                                        </span>
                                    )}
                                    {newPostImages.length > 0 && (
                                        <span className="inline-flex items-center gap-1 text-xs font-medium bg-green-50 text-green-700 px-2 py-1 rounded-full border border-green-200">
                                            <ImageIcon size={12} />
                                            {newPostImages.length} ảnh
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Preview ảnh đã chọn */}
                            {newPostImages.length > 0 && (
                                <div className="flex gap-2 mt-2 flex-wrap">
                                    {newPostImages.map((file, idx) => (
                                        <div key={idx} className="relative group w-16 h-16">
                                            <img
                                                src={URL.createObjectURL(file)}
                                                alt={`preview-${idx}`}
                                                className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeImage(idx)}
                                                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex justify-between items-center mt-3">
                                <div className="flex gap-2">
                                    {/* Location picker */}
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <button className={`p-2 rounded-full transition-colors ${newPostLocation ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-100'}`}>
                                                <MapPin size={18} />
                                            </button>
                                        </PopoverTrigger>
                                        <PopoverContent align="start" className="w-52 p-2">
                                            <p className="text-xs font-bold text-gray-400 uppercase px-2 pb-1">Chọn khu vực</p>
                                            <div className="max-h-48 overflow-y-auto space-y-0.5">
                                                {LOCATIONS.filter((l) => l.id !== 'all').map((loc) => (
                                                    <button
                                                        key={loc.id}
                                                        onClick={() => setNewPostLocation(loc.id)}
                                                        className={`w-full text-left text-sm px-2 py-1.5 rounded-md transition-colors ${newPostLocation === loc.id ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-gray-100 text-gray-700'}`}
                                                    >
                                                        {loc.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </PopoverContent>
                                    </Popover>

                                    {/* Image picker */}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        onChange={handleImageSelect}
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`p-2 rounded-full transition-colors ${newPostImages.length > 0 ? 'text-green-600 bg-green-50' : 'text-gray-500 hover:bg-gray-100'}`}
                                    >
                                        <ImageIcon size={18} />
                                    </button>
                                </div>
                                <button onClick={handlePost} disabled={isBotChecking} className={`px-6 py-2 rounded-lg text-white font-medium flex items-center gap-2 transition-all ${activeTab === PostType.LOST ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700'}`}>
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