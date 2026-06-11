import { useEffect, useRef, useState } from "react";
import { ExternalLink, MapPin, MessageCircle, MoreHorizontal, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Post } from "@/features/main-page/types";
import { PostSource } from "@/features/main-page/types";

interface PostItemProps {
	post: Post;
	activeTab: string;
	handleSendLink: (id: string) => void;
	canDelete: boolean;
	onDelete: (id: string) => void;
	onViewUserPosts: (userId: string, userName?: string) => void;
}

type LegacyImagePost = Post & {
	image_urls?: unknown;
	imageUrls?: unknown;
	extractedInfo?: {
		image_urls?: unknown;
		imageUrls?: unknown;
	};
	extracted_info?: {
		image_urls?: unknown;
		imageUrls?: unknown;
	};
};

const toStringArray = (input: unknown): string[] => {
	if (!input) {
		return [];
	}

	if (Array.isArray(input)) {
		return input.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
	}

	if (typeof input === "string" && input.trim().length > 0) {
		return [input];
	}

	return [];
};

const extractPostImageUrls = (post: Post): string[] => {
	const imageRows = post.images?.flatMap((image) => toStringArray(image?.url)) ?? [];
	const legacyPost = post as LegacyImagePost;
	const legacyRows = [
		...toStringArray(legacyPost.image_urls),
		...toStringArray(legacyPost.imageUrls),
		...toStringArray(legacyPost.extractedInfo?.image_urls),
		...toStringArray(legacyPost.extractedInfo?.imageUrls),
		...toStringArray(legacyPost.extracted_info?.image_urls),
		...toStringArray(legacyPost.extracted_info?.imageUrls),
	];

	return Array.from(new Set([...imageRows, ...legacyRows]));
};

function timeAgo(dateStr: string): string {
	const now = Date.now();
	const diff = now - new Date(dateStr).getTime();
	const mins = Math.floor(diff / 60_000);
	if (mins < 1) return "Vừa xong";
	if (mins < 60) return `${mins} phút trước`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours} giờ trước`;
	const days = Math.floor(hours / 24);
	return `${days} ngày trước`;
}

export default function PostItem({
	post,
	activeTab,
	handleSendLink,
	canDelete,
	onDelete,
	onViewUserPosts,
}: PostItemProps) {
	const [showMenu, setShowMenu] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);
	const imageUrls = extractPostImageUrls(post);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (!menuRef.current) return;
			if (!menuRef.current.contains(event.target as Node)) {
				setShowMenu(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const avatarUrl =
		post.user?.avatarUrl ||
		`https://ui-avatars.com/api/?name=${encodeURIComponent(post.user?.name || "U")}&background=3b82f6&color=fff`;

	return (
		<Card className="rounded-3xl border-blue-100/70 bg-white shadow-sm">
			<CardContent className="space-y-4 p-4 sm:p-5">
				<div className="flex items-start justify-between gap-4">
					<button
						type="button"
						onClick={() => onViewUserPosts(String(post.user?.idUser || ""), post.user?.name)}
						className="flex items-start gap-3 rounded-lg p-1 text-left transition-colors hover:bg-gray-50"
					>
						<div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-blue-100 bg-blue-100">
							<img src={avatarUrl} alt="avt" className="h-full w-full object-cover" />
						</div>
						<div>
							<p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
								{post.user?.name || "Ẩn danh"}
								{post.source === PostSource.FACEBOOK_CRAWL && (
									<span className="rounded border border-blue-200 bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
										FACEBOOK CRAWL
									</span>
								)}
							</p>
							<p className="flex items-center gap-1 text-xs text-slate-500">
								{timeAgo(post.createdAt)} • <MapPin className="h-3 w-3" /> {post.location}
							</p>
						</div>
					</button>
					<div className="flex items-center gap-1">
						{post.source === PostSource.FACEBOOK_CRAWL && post.originalLink && (
							<a
								href={post.originalLink}
								target="_blank"
								rel="noreferrer"
								className="rounded-full p-2 text-blue-600 hover:bg-blue-50"
							>
								<ExternalLink className="h-4 w-4" />
							</a>
						)}

						{canDelete && (
							<div className="relative" ref={menuRef}>
								<button
									type="button"
									onClick={() => setShowMenu((prev) => !prev)}
									className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
									aria-label="Mở menu bài viết"
								>
									<MoreHorizontal className="h-4 w-4" />
								</button>

								{showMenu && (
									<div className="absolute right-0 top-10 z-10 min-w-[140px] rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
										<button
											type="button"
											onClick={() => {
												setShowMenu(false);
												onDelete(post.id);
											}}
											className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
										>
											<Trash2 className="h-4 w-4" /> Xóa bài viết
										</button>
									</div>
								)}
							</div>
						)}
					</div>
				</div>

				<p className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm leading-relaxed text-gray-800">{post.content}</p>

				{imageUrls.length > 0 && (
					<div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
						<div className="flex h-[290px] gap-2 overflow-x-auto p-2">
							{imageUrls.map((imageUrl, index) => (
								<img
									key={`${post.id}-${index}`}
									src={imageUrl}
									alt="post"
									className="h-full w-auto max-w-none rounded-lg border border-gray-200 object-cover"
								/>
							))}
						</div>
					</div>
				)}

				<div className="flex items-center gap-4 border-t border-slate-100 pt-3 text-sm text-slate-500">
					{activeTab === "FOUND" ? (
						<>
							<button type="button" className="inline-flex items-center gap-1.5 hover:text-blue-700">
								<MessageCircle className="h-4 w-4" />
								Nhắn tin
							</button>
							<button type="button" onClick={() => handleSendLink(post.id)} className="inline-flex items-center gap-1.5 hover:text-blue-700">
								<MessageCircle className="h-4 w-4" />
								Gửi link bài này
							</button>
						</>
					) : (
						<button type="button" className="inline-flex items-center gap-1.5 hover:text-blue-700">
							<MessageCircle className="h-4 w-4" />
							Bình luận / Liên hệ
						</button>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
