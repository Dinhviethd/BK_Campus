import { Loader2, Bell } from 'lucide-react';

interface RightSidebarProps {
    activeTab: string;
    bellActive: boolean;
    isScanning: boolean;
    handleBellClick: () => void;
}

const StatRow = ({ label, value, color }: any) => (
    <div className="flex justify-between items-center text-sm">
        <span className="text-gray-500">{label}</span>
        <span className={`font-bold ${color}`}>{value}</span>
    </div>
);

export const RightSidebar = ({ activeTab, bellActive, isScanning, handleBellClick }: RightSidebarProps) => {
    return (
        <div className="space-y-6 sticky top-24 h-fit">
            {activeTab === 'lost' && (
                <div className={`rounded-xl border p-5 transition-all duration-300 ${bellActive ? 'bg-white border-green-500 shadow-green-100 shadow-lg' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-800">Trạng thái AI</h3>
                        <span className={`w-3 h-3 rounded-full ${bellActive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></span>
                    </div>
                    <div className="text-center">
                        {bellActive ? (
                            <div className="space-y-3">
                                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto relative">
                                    <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
                                    {isScanning && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span></span>}
                                </div>
                                <div>
                                    <p className="font-bold text-green-700">Đang theo dõi 24/7</p>
                                    <p className="text-xs text-gray-500 mt-1">Hệ thống đang quét các group Facebook và bài đăng mới...</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto text-indigo-600"><Bell size={32} /></div>
                                <p className="text-xs text-gray-500">Kích hoạt để AI tự động so khớp đồ mất của bạn với dữ liệu tìm thấy.</p>
                                <button onClick={handleBellClick} className="w-full py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg text-sm font-bold shadow-md hover:scale-105 transition-transform">Bật AI Tìm kiếm</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Thống kê hôm nay</h4>
                <div className="space-y-3">
                    <StatRow label="Bài viết mới" value="124" color="text-blue-600" />
                    <StatRow label="Đã tìm thấy" value="18" color="text-green-600" />
                    <StatRow label="Crawl từ FB" value="89" color="text-indigo-600" />
                </div>
            </div>
        </div>
    );
};