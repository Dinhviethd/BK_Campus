import type { ReactNode } from "react";

interface ThreeColumnLayoutProps {
	left: ReactNode;
	center: ReactNode;
	right: ReactNode;
}

export default function ThreeColumnLayout({ left, center, right }: ThreeColumnLayoutProps) {
	return (
		<div className="mx-auto grid w-full max-w-[1380px] grid-cols-1 gap-5 px-4 pb-8 pt-5 md:px-6 lg:grid-cols-[310px_minmax(0,1fr)] lg:px-10 xl:grid-cols-[310px_minmax(0,1fr)_292px] xl:px-14">
			<aside className="order-2 lg:order-1">{left}</aside>
			<main className="order-1 lg:order-2 lg:max-w-[780px]">{center}</main>
			<aside className="order-3 hidden xl:block">{right}</aside>
		</div>
	);
}
