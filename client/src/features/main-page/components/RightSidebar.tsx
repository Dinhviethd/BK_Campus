import { Bell, Loader2 } from "lucide-react";
import StatsSidebar from "@/features/main-page/components/StatsSidebar";

interface RightSidebarProps {
	activeTab: string;
	bellActive: boolean;
	isScanning: boolean;
	pendingResultCount: number;
	handleBellClick: () => void;
}

export default function RightSidebar({
	activeTab,
	bellActive,
	isScanning,
	pendingResultCount,
	handleBellClick,
}: RightSidebarProps) {
	const hasPendingResult = pendingResultCount > 0;
	const description = !bellActive
		? "Kích hoạt để AI tự động so khớp đồ mất của bạn với dữ liệu tìm thấy."
		: isScanning
			? "Hệ thống đang quét các group Facebook và bài đăng mới..."
			: hasPendingResult
				? `Bạn có ${pendingResultCount} kết quả chờ xác nhận.`
				: "Hệ thống đang theo dõi các bài đăng mới cho bạn.";

	return (
		<div className="space-y-4">
			{activeTab === "LOST" && (
				<section className="rounded-3xl border border-[#1f5ca0] bg-gradient-to-br from-[#0b4f9e] via-[#0b4a94] to-[#093e7e] p-5 text-white shadow-[0_10px_24px_rgba(11,79,158,0.25)]">
					<div className="flex flex-col items-center text-center">
						<p className="text-lg font-semibold">Trạng thái AI</p>
						<span className="mt-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/12 text-white ring-1 ring-white/15">
							{bellActive && isScanning ? <Loader2 className="h-8 w-8 animate-spin" /> : <Bell className="h-8 w-8" />}
						</span>
					</div>

					<div className="mt-4 rounded-xl border border-white/10 bg-[#2a67ac]/70 px-3 py-2">
						<div className="flex items-center justify-between gap-3 text-sm font-medium">
							<span>Tự động quét tin mới</span>
							<button
								type="button"
								onClick={handleBellClick}
								className={`relative h-6 w-11 rounded-full transition-colors ${bellActive ? "bg-emerald-400/90" : "bg-white/45"}`}
							>
								<span
									className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${
										bellActive ? "right-1" : "left-1"
									}`}
								/>
							</button>
						</div>
					</div>

					<p className="mt-4 text-sm leading-6 text-[#d6e8ff]">{description}</p>

					{bellActive && !isScanning && hasPendingResult && (
						<button
							type="button"
							onClick={handleBellClick}
							className="mt-4 w-full rounded-xl bg-green-500 py-3 font-bold text-white shadow-lg hover:bg-green-600"
						>
							Xem {pendingResultCount} kết quả AI
						</button>
					)}
				</section>
			)}

			<StatsSidebar />
		</div>
	);
}
