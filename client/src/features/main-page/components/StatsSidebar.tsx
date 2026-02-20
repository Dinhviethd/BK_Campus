export const StatsSidebar = () => {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h3 className="text-xs font-bold text-gray-500 uppercase mb-4">Thống kê hôm nay</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm">Bài viết mới</span>
            <span className="font-bold text-blue-600">124</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm">Đã tìm thấy</span>
            <span className="font-bold text-green-600">18</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm">Crawl từ FB</span>
            <span className="font-bold text-purple-600">89</span>
          </div>
        </div>
      </div>
      
    </div>
  );
};