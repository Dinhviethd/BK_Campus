import { Search, SlidersHorizontal, CheckCircle, Zap } from 'lucide-react';
import { LOCATIONS } from '@/features/main-page/constant';

interface FilterProps {
    filterArea: string;
    setFilterArea: (id: string) => void;
    searchKeyword: string;
    setSearchKeyword: (keyword: string) => void;
}

export const FilterSidebar = ({ filterArea, setFilterArea, searchKeyword, setSearchKeyword }: FilterProps) => {
    return (
        <div className="space-y-4 sticky top-24 h-fit">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                    <SlidersHorizontal size={18} className="text-blue-600"/>
                    <h3 className="font-bold text-gray-800">Bộ lọc nâng cao</h3>
                </div>
                <div className="p-4 space-y-5">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Từ khóa</label>
                        <div className="relative">
                            <input type="text" placeholder="Tìm chìa khóa, ví,..." value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"/>
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Khu vực</label>
                        <div className="space-y-2">
                            {LOCATIONS.map(loc => (
                                <label key={loc.id} className="flex items-center gap-3 cursor-pointer group">
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${filterArea === loc.id ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white group-hover:border-blue-400'}`}>
                                        {filterArea === loc.id && <CheckCircle size={14} className="text-white"/>}
                                    </div>
                                    <input type="radio" name="location" className="hidden" checked={filterArea === loc.id} onChange={() => setFilterArea(loc.id)}/>
                                    <span className={`text-sm ${filterArea === loc.id ? 'font-bold text-blue-700' : 'text-gray-600'}`}>{loc.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    {(filterArea !== 'all' || searchKeyword) && (
                        <button onClick={() => {setFilterArea('all'); setSearchKeyword('')}} className="w-full py-2 text-xs font-bold text-red-500 bg-red-50 rounded-lg hover:bg-red-100">Xóa bộ lọc</button>
                    )}
                </div>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-4 text-white shadow-lg">
                <h3 className="font-bold flex items-center gap-2"><Zap size={16}/> ReFind Premium</h3>
                <p className="text-xs mt-1 text-blue-100">Bot AI sẽ tự động gửi SMS khi tìm thấy đồ khớp 90%.</p>
            </div>
        </div>
    );
};