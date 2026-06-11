import { useState, useEffect, useCallback, useRef } from "react";
import { Filter, Search, Settings, XCircle, Loader2 } from "lucide-react";
import ThreeColumnLayout from "@/features/main-page/layouts/three-column-layout";
import FilterSidebar from "@/features/main-page/components/FilterSidebar";
import CreatePostBox from "@/features/main-page/components/CreatePostBox";
import PostItem from "@/features/main-page/components/PostItem";
import RightSidebar from "@/features/main-page/components/RightSidebar";
import { MatchModal } from "@/features/main-page/components/modals/MatchModal";
import { useAuth } from "@/features/auth/stores/authStore";
import {
	confirmMatchingCandidate,
	createPostRealtimeEventSource,
	getPendingMatchingResult,
	getMatchingScanState,
	getMyPosts,
	triggerAiMatching,
} from "@/features/main-page/services/postService";
import { usePostStore } from "@/features/main-page/stores/postStore";
import { LOCATIONS } from "@/features/main-page/constant";
import { PostSource, PostType, ProcessStatus, type Post } from "@/features/main-page/types";

interface MatchItem {
	post: Post;
	similarityScore?: number;
}

export default function MainPage() {
	const user = useAuth((state) => state.user);

	const {
		posts,
		isLoading,
		isCreating,
		showModerationNotice,
		activeTab,
		filterLocation,
		searchKeyword,
		selectedUserId,
		selectedUserName,
		totalPages,
		page,
		fetchPosts,
		loadMore,
		setActiveTab,
		setFilterLocation,
		setSearchKeyword,
		setSelectedUserFilter,
		clearSelectedUserFilter,
		setModerationNotice,
		clearModerationNotice,
		createPost,
		resolvePost,
		deleteOwnPost,
	} = usePostStore();

	const [newPostContent, setNewPostContent] = useState("");
	const [newPostLocation, setNewPostLocation] = useState("");
	const [newPostImages, setNewPostImages] = useState<File[]>([]);

	const [isScanning, setIsScanning] = useState(false);
	const [bellActive, setBellActive] = useState(false);
	const [showMatchModal, setShowMatchModal] = useState(false);
	const [matches, setMatches] = useState<MatchItem[]>([]);
	const [pendingMatchRequestId, setPendingMatchRequestId] = useState<string | null>(null);
	const [matchedLostPostId, setMatchedLostPostId] = useState<string | null>(null);
	const [hiddenPostIds, setHiddenPostIds] = useState<Set<string>>(new Set());
	const [showSettingsModal, setShowSettingsModal] = useState(false);
	const [showRejectedNotice, setShowRejectedNotice] = useState(false);

	const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
	const rejectedPostIdsRef = useRef<Set<string>>(new Set());

	const sentinelRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		fetchPosts();
	}, [activeTab, filterLocation, fetchPosts]);

	useEffect(() => {
		if (!user?.idUser) {
			setModerationNotice(false);
			setBellActive(false);
			setIsScanning(false);
			setMatches([]);
			setPendingMatchRequestId(null);
			setMatchedLostPostId(null);
			return;
		}

		let cancelled = false;

		const restoreAiState = async () => {
			try {
				const [myPostsResult, scanState, pendingResult] = await Promise.all([
					getMyPosts(1, 50),
					getMatchingScanState(),
					getPendingMatchingResult(),
				]);

				if (cancelled) {
					return;
				}

				const hasPendingModeration = myPostsResult.data.some(
					(post) => post.status === ProcessStatus.MODERATING || post.status === ProcessStatus.EMBEDDING,
				);

				const hasPendingResult = pendingResult.matches.length > 0;

				if (hasPendingResult) {
					setMatches(
						pendingResult.matches.map((item) => ({
							post: item.post,
							similarityScore: item.similarity_score,
						})),
					);
					setPendingMatchRequestId(pendingResult.request_id);
					setMatchedLostPostId(pendingResult.lost_post_id);
				} else {
					setMatches([]);
					setPendingMatchRequestId(null);
					setMatchedLostPostId(null);
				}

				setModerationNotice(hasPendingModeration);
				setBellActive(scanState.is_scanning || hasPendingResult);
				setIsScanning(scanState.is_scanning);
			} catch {
				if (cancelled) {
					return;
				}

				setModerationNotice(false);
				setBellActive(false);
				setIsScanning(false);
				setMatches([]);
				setPendingMatchRequestId(null);
				setMatchedLostPostId(null);
			}
		};

		restoreAiState();

		return () => {
			cancelled = true;
		};
	}, [setModerationNotice, user?.idUser]);

	useEffect(() => {
		const eventSource = createPostRealtimeEventSource();
		let refreshTimeout: ReturnType<typeof setTimeout> | undefined;

		eventSource.onmessage = (event) => {
			try {
				const payload = JSON.parse(event.data) as {
					type?: string;
					eventType?: string;
					postId?: string;
					post?: {
						status?: string;
						user?: { idUser?: string | number };
					};
				};

				if (payload.type === "connected") {
					return;
				}

				if (payload.eventType === "MATCHING_CANDIDATES_READY") {
					const matchingPayload = payload.post as {
						request_id?: string;
						lost_post_id?: string;
						matches?: Array<{
							post?: Post;
							similarity_score?: number;
						}>;
					};

					const incomingMatches: MatchItem[] = (matchingPayload.matches || [])
						.filter((item) => !!item.post)
						.map((item) => ({
							post: item.post as Post,
							similarityScore: item.similarity_score,
						}));

					if (incomingMatches.length > 0) {
						setMatches(incomingMatches);
						setPendingMatchRequestId(matchingPayload.request_id || null);
						setMatchedLostPostId(matchingPayload.lost_post_id || null);
						setShowMatchModal(true);
						setBellActive(true);
						setIsScanning(false);
					}

					return;
				}

				const isRejected = payload.post?.status === ProcessStatus.REJECTED;
				const isOwner = String(payload.post?.user?.idUser) === String(user?.idUser);

				if (isRejected && isOwner && payload.postId && !rejectedPostIdsRef.current.has(payload.postId)) {
					rejectedPostIdsRef.current.add(payload.postId);
					setShowRejectedNotice(true);
					clearModerationNotice();
				}
			} catch {
			}

			if (refreshTimeout) {
				clearTimeout(refreshTimeout);
			}

			refreshTimeout = setTimeout(() => {
				fetchPosts();
			}, 250);
		};

		return () => {
			if (refreshTimeout) {
				clearTimeout(refreshTimeout);
			}
			eventSource.close();
		};
	}, [clearModerationNotice, fetchPosts, user?.idUser]);

	useEffect(() => {
		const sentinel = sentinelRef.current;
		if (!sentinel) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && !isLoading && page < totalPages) {
					loadMore();
				}
			},
			{ rootMargin: "300px" },
		);

		observer.observe(sentinel);
		return () => observer.disconnect();
	}, [isLoading, page, totalPages, loadMore]);

	const handleSearchChange = useCallback(
		(keyword: string) => {
			setSearchKeyword(keyword);
			if (searchTimer.current) clearTimeout(searchTimer.current);
			searchTimer.current = setTimeout(() => {
				fetchPosts();
			}, 400);
		},
		[setSearchKeyword, fetchPosts],
	);

	const handlePost = async () => {
		if (!newPostContent.trim()) return;
		if (newPostContent.length < 10) {
			alert("Nội dung quá ngắn. Vui lòng mô tả chi tiết đồ vật (ít nhất 10 ký tự).");
			return;
		}

		try {
			await createPost({
				content: newPostContent,
				location: newPostLocation || "Chưa cập nhật",
				type: activeTab as string,
				source: PostSource.WEB_USER,
				images: newPostImages.length > 0 ? newPostImages : undefined,
			});

			setNewPostContent("");
			setNewPostLocation("");
			setNewPostImages([]);
		} catch (err: any) {
			const message = err?.response?.data?.message || "Đăng bài thất bại. Vui lòng thử lại.";
			alert(message);
		}
	};

	const handleBellClick = async () => {
		if (matches.length > 0) {
			setShowMatchModal(true);
			return;
		}

		if (isScanning) return;

		const latestOwnLostPost = posts.find(
			(post) => post.type === PostType.LOST && String(post.user?.idUser) === String(user?.idUser),
		);

		if (!latestOwnLostPost) {
			alert("Bạn chưa có bài đăng MẤT đồ để bật AI tìm kiếm.");
			return;
		}

		setIsScanning(true);

		try {
			const matchingResponse = await triggerAiMatching(latestOwnLostPost.id);
			setBellActive(true);

			if (matchingResponse.status !== "SCANNING") {
				setIsScanning(false);
			}

			if (matchingResponse.message) {
				alert(matchingResponse.message);
			}
		} catch (err: any) {
			setIsScanning(false);
			setBellActive(false);

			const detailError = err?.response?.data?.detail;
			if (Array.isArray(detailError) && detailError.length > 0) {
				const messages = detailError
					.map((item: { msg?: string }) => item?.msg)
					.filter(Boolean)
					.join("; ");

				alert(messages || "Không thể bật AI tìm kiếm. Vui lòng thử lại.");
				return;
			}

			const message = err?.response?.data?.message || "Không thể bật AI tìm kiếm. Vui lòng thử lại.";
			alert(message);
		}
	};

	const handleResolve = async (foundPostId: string) => {
		try {
			if (pendingMatchRequestId) {
				await confirmMatchingCandidate(pendingMatchRequestId, foundPostId);
			}

			if (matchedLostPostId) {
				await resolvePost(matchedLostPostId);
			}

			setHiddenPostIds((prev) => {
				const next = new Set(prev);
				next.add(foundPostId);
				if (matchedLostPostId) {
					next.add(matchedLostPostId);
				}
				return next;
			});

			setBellActive(false);
			setIsScanning(false);
			setShowMatchModal(false);
			setMatches([]);
			setPendingMatchRequestId(null);
			setMatchedLostPostId(null);
			alert("Đã xác nhận. Hai bài viết liên quan đã được ẩn khỏi giao diện của bạn.");
		} catch {
			alert("Lỗi khi xác nhận. Vui lòng thử lại.");
		}
	};

	const handleSendLink = (postId: string) => {
		const link = `${window.location.origin}/posts/${postId}`;
		navigator.clipboard.writeText(link).then(() => {
			alert("Đã copy liên kết bài viết. Hãy gửi cho người mất đồ!");
		});
	};

	const handleDeletePost = async (postId: string) => {
		if (!window.confirm("Bạn có chắc chắn muốn xóa bài viết này? Hành động này không thể hoàn tác.")) {
			return;
		}

		try {
			await deleteOwnPost(postId);
			alert("Đã xóa bài viết thành công.");
		} catch (err: any) {
			const message = err?.response?.data?.message || "Xóa bài viết thất bại. Vui lòng thử lại.";
			alert(message);
		}
	};

	const handleViewUserPosts = (userId: string, userName?: string) => {
		if (!userId) return;
		setSelectedUserFilter(userId, userName);
	};

	return (
		<>
			<div className="min-h-full bg-[#f3f6fc]">
				<ThreeColumnLayout
					left={
						<FilterSidebar
							filterArea={filterLocation}
							setFilterArea={(loc) => setFilterLocation(loc)}
							searchKeyword={searchKeyword}
							setSearchKeyword={handleSearchChange}
						/>
					}
					center={
						<div className="space-y-4">
							{showModerationNotice && (
								<div className="flex items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900">
									<p className="text-sm font-medium md:text-base">Bài của bạn đang được phê duyệt, vui lòng chờ trong giây lát.</p>
									<button
										type="button"
										onClick={clearModerationNotice}
										className="text-sm font-semibold text-amber-700 hover:text-amber-900"
									>
										Đóng
									</button>
								</div>
							)}

							{showRejectedNotice && (
								<div className="flex items-center justify-between gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-red-900">
									<p className="text-sm font-medium md:text-base">Bài đăng của bạn đã bị từ chối trong quá trình kiểm duyệt AI.</p>
									<button
										type="button"
										onClick={() => setShowRejectedNotice(false)}
										className="text-sm font-semibold text-red-700 hover:text-red-900"
									>
										Đóng
									</button>
								</div>
							)}

							<CreatePostBox
								activeTab={activeTab}
								setActiveTab={setActiveTab}
								bellActive={bellActive}
								newPostContent={newPostContent}
								setNewPostContent={setNewPostContent}
								newPostLocation={newPostLocation}
								setNewPostLocation={setNewPostLocation}
								newPostImages={newPostImages}
								setNewPostImages={setNewPostImages}
								handlePost={handlePost}
								isBotChecking={isCreating}
							/>

							{(filterLocation !== "all" || searchKeyword) && (
								<div className="flex items-center gap-2 text-sm text-gray-500">
									<Filter size={14} />
									<span>Đang hiển thị kết quả cho:</span>
									{filterLocation !== "all" && (
										<span className="rounded bg-blue-50 px-2 py-0.5 font-bold text-blue-600">
											{LOCATIONS.find((l) => l.id === filterLocation)?.label}
										</span>
									)}
									{searchKeyword && <span className="rounded bg-blue-50 px-2 py-0.5 font-bold text-blue-600">&quot;{searchKeyword}&quot;</span>}
								</div>
							)}

							{selectedUserId && (
								<div className="flex items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-blue-900">
									<p className="text-sm font-medium md:text-base">Đang xem tất cả bài viết của {selectedUserName || "người dùng này"}</p>
									<button
										type="button"
										onClick={clearSelectedUserFilter}
										className="text-sm font-semibold text-blue-700 hover:text-blue-900"
									>
										Quay lại feed
									</button>
								</div>
							)}

							<div className="space-y-4">
								{isLoading && posts.length === 0 ? (
									<div className="py-12 text-center">
										<Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-500" />
										<p className="mt-2 text-gray-400">Đang tải bài viết...</p>
									</div>
								) : (
									<>
										{posts.filter((post) => !hiddenPostIds.has(post.id)).map((post) => (
											<PostItem
												key={post.id}
												post={post}
												activeTab={activeTab}
												handleSendLink={handleSendLink}
												canDelete={String(post.user?.idUser) === String(user?.idUser)}
												onDelete={handleDeletePost}
												onViewUserPosts={handleViewUserPosts}
											/>
										))}

										{posts.length === 0 && !isLoading && (
											<div className="rounded-xl border border-dashed border-gray-300 bg-white py-12 text-center text-gray-400">
												<Search className="mx-auto mb-2 h-12 w-12 opacity-20" />
												<p>Không tìm thấy bài đăng nào phù hợp.</p>
											</div>
										)}

										<div ref={sentinelRef} className="h-1" />

										{isLoading && posts.length > 0 && (
											<div className="py-6 text-center">
												<Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-500" />
												<p className="mt-1 text-sm text-gray-400">Đang tải thêm...</p>
											</div>
										)}

										{page >= totalPages && posts.length > 0 && <p className="py-4 text-center text-sm text-gray-400">Đã hiển thị tất cả bài viết</p>}
									</>
								)}
							</div>
						</div>
					}
					right={
						<RightSidebar
							activeTab={activeTab}
							bellActive={bellActive}
							isScanning={isScanning}
							pendingResultCount={matches.length}
							handleBellClick={handleBellClick}
						/>
					}
				/>
			</div>

			{showSettingsModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
					<div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
						<div className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white">
							<h3 className="flex items-center gap-2 text-lg font-bold">
								<Settings size={20} /> Cài đặt
							</h3>
							<button onClick={() => setShowSettingsModal(false)}>
								<XCircle size={24} />
							</button>
						</div>
						<div className="p-6 text-center text-gray-500">Nội dung cài đặt ở đây...</div>
					</div>
				</div>
			)}

			{showMatchModal && <MatchModal matches={matches} onClose={() => setShowMatchModal(false)} onResolve={handleResolve} />}
		</>
	);
}
