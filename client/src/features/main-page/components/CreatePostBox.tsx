import { useRef } from "react";
import { Image, ImageIcon, Loader2, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LOCATIONS } from "@/features/main-page/constant";
import { cn } from "@/lib/utils";
import { PostType } from "../types";

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

export default function CreatePostBox({
	activeTab,
	setActiveTab,
	bellActive,
	newPostContent,
	setNewPostContent,
	newPostLocation,
	setNewPostLocation,
	newPostImages,
	setNewPostImages,
	handlePost,
	isBotChecking,
}: CreateProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (!files) return;
		setNewPostImages([...newPostImages, ...Array.from(files)]);
		e.target.value = "";
	};

	const removeImage = (index: number) => {
		setNewPostImages(newPostImages.filter((_, i) => i !== index));
	};

	const isLost = activeTab === PostType.LOST;
	const buttonColor = isLost ? "#dc2626" : "#16a34a";
	const buttonHoverColor = isLost ? "#b91c1c" : "#15803d";
	const selectedLocationLabel = LOCATIONS.find((l) => l.id === newPostLocation)?.label;

	return (
		<Card className="rounded-3xl border-blue-100/70 bg-white p-3 shadow-sm">
			<div className="rounded-2xl bg-slate-100 p-1">
				<div className="grid grid-cols-2 gap-1">
					<button
						type="button"
						onClick={() => setActiveTab(PostType.LOST)}
						disabled={activeTab === PostType.LOST}
						className={cn(
							"rounded-xl border-b-2 px-4 py-2.5 text-base font-bold transition-colors",
							activeTab === PostType.LOST
								? "border-[#ef4444] bg-red-50 text-[#dc2626] shadow-sm"
								: "border-transparent text-slate-600 hover:text-slate-800",
						)}
					>
						Tôi bị mất đồ
					</button>
					<button
						type="button"
						onClick={() => setActiveTab(PostType.FOUND)}
						disabled={activeTab === PostType.FOUND}
						className={cn(
							"rounded-xl border-b-2 px-4 py-2.5 text-base font-bold transition-colors",
							activeTab === PostType.FOUND
								? "border-[#22c55e] bg-green-50 text-[#16a34a] shadow-sm"
								: "border-transparent text-slate-600 hover:text-slate-800",
						)}
					>
						Tôi nhặt được
					</button>
				</div>
			</div>

			<div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
				{!bellActive || activeTab === PostType.FOUND ? (
					<>
						<textarea
							value={newPostContent}
							onChange={(e) => setNewPostContent(e.target.value)}
							placeholder={
								isLost
									? "Mô tả đồ bị mất của bạn (Màu sắc, hình dáng, nơi mất cuối cùng)..."
									: "Mô tả đồ nhặt được (Loại, màu sắc, nơi tìm thấy)..."
							}
							className="min-h-24 w-full resize-none rounded-lg border-0 bg-white p-3 text-sm shadow-none outline-none focus-visible:ring-0"
						/>

						{(newPostLocation || newPostImages.length > 0) && (
							<div className="mt-2 flex flex-wrap gap-2">
								{newPostLocation && (
									<span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
										<MapPin size={12} />
										{selectedLocationLabel}
										<button type="button" onClick={() => setNewPostLocation("")} className="ml-0.5 hover:text-blue-900">
											<X size={12} />
										</button>
									</span>
								)}
								{newPostImages.length > 0 && (
									<span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
										<ImageIcon size={12} />
										{newPostImages.length} ảnh
									</span>
								)}
							</div>
						)}

						{newPostImages.length > 0 && (
							<div className="mt-2 flex flex-wrap gap-2">
								{newPostImages.map((file, idx) => (
									<div key={idx} className="group relative h-16 w-16">
										<img
											src={URL.createObjectURL(file)}
											alt={`preview-${idx}`}
											className="h-16 w-16 rounded-lg border border-gray-200 object-cover"
										/>
										<button
											type="button"
											onClick={() => removeImage(idx)}
											className="absolute -right-1.5 -top-1.5 rounded-full bg-red-500 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
										>
											<X size={12} />
										</button>
									</div>
								))}
							</div>
						)}

						<div className="mt-4 flex items-center justify-between gap-3">
							<div className="flex items-center gap-4 text-sm text-slate-900">
								<input
									ref={fileInputRef}
									type="file"
									accept="image/*"
									multiple
									className="hidden"
									onChange={handleImageSelect}
								/>
								<button
									type="button"
									onClick={() => fileInputRef.current?.click()}
									className="inline-flex items-center gap-1.5 transition-opacity hover:opacity-80"
								>
									<Image className="h-4 w-4" />
									Ảnh
								</button>

								<Popover>
									<PopoverTrigger asChild>
										<button type="button" className="inline-flex items-center gap-1.5 transition-opacity hover:opacity-80">
											<MapPin className="h-4 w-4" />
											Vị trí
										</button>
									</PopoverTrigger>
									<PopoverContent align="start" className="w-52 p-2">
										<p className="px-2 pb-1 text-xs font-bold uppercase text-gray-400">Chọn khu vực</p>
										<div className="max-h-48 space-y-0.5 overflow-y-auto">
											{LOCATIONS.filter((l) => l.id !== "all").map((loc) => (
												<button
													key={loc.id}
													type="button"
													onClick={() => setNewPostLocation(loc.id)}
													className={cn(
														"w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors",
														newPostLocation === loc.id ? "bg-blue-100 font-semibold text-blue-700" : "text-gray-700 hover:bg-gray-100",
													)}
												>
													{loc.label}
												</button>
											))}
										</div>
									</PopoverContent>
								</Popover>
							</div>
							<Button
								onClick={handlePost}
								disabled={isBotChecking}
								className="h-10 rounded-full px-6 font-semibold text-white"
								style={{
									backgroundColor: buttonColor,
								}}
								onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = buttonHoverColor)}
								onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = buttonColor)}
							>
								{isBotChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
								{isBotChecking ? "Bot đang duyệt..." : "Đăng tin"}
							</Button>
						</div>
					</>
				) : (
					<div className="flex items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800">
						<Loader2 className="h-5 w-5 animate-spin" />
						<div>
							<p className="text-sm font-bold">Chế độ Tìm kiếm AI đang bật.</p>
						</div>
					</div>
				)}
			</div>
		</Card>
	);
}
