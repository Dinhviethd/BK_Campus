import React from 'react';

interface MainPageLayoutProps {
  leftSidebar: React.ReactNode;
  mainContent: React.ReactNode;
  rightSidebar: React.ReactNode;
}

export const MainPageLayout = ({ leftSidebar, mainContent, rightSidebar }: MainPageLayoutProps) => {
  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-12 gap-6">
          {/* Cột trái: 3 phần */}
          <div className="col-span-12 lg:col-span-3 space-y-4">
            {leftSidebar}
          </div>

          {/* Cột giữa: 6 phần */}
          <div className="col-span-12 lg:col-span-6 space-y-4">
            {mainContent}
          </div>

          {/* Cột phải: 3 phần */}
          <div className="col-span-12 lg:col-span-3 space-y-4">
            {rightSidebar}
          </div>
        </div>
      </div>
    </div>
  );
};