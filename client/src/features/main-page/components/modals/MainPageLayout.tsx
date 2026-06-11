import type { ReactNode } from 'react';

interface LayoutProps {
    sidebarLeft: ReactNode;
    mainContent: ReactNode;
    sidebarRight: ReactNode;
}

export const MainPageLayout = ({ sidebarLeft, mainContent, sidebarRight }: LayoutProps) => {
    return (
        <div className="min-h-full bg-gray-100 font-sans text-gray-800">
            <main className="max-w-7xl mx-auto pt-6 px-4 grid grid-cols-1 md:grid-cols-12 gap-6 pb-20 min-h-full">
                <aside className="hidden md:block md:col-span-3 lg:col-span-3">
                    <div className="sticky top-6 max-h-[calc(100vh-6rem)] overflow-y-auto">
                        {sidebarLeft}
                    </div>
                </aside>
                <div className="md:col-span-9 lg:col-span-6">
                    {mainContent}
                </div>
                <aside className="hidden lg:block lg:col-span-3">
                    <div className="sticky top-6 max-h-[calc(100vh-6rem)] overflow-y-auto">
                        {sidebarRight}
                    </div>
                </aside>
            </main>
        </div>
    );
};