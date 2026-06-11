import { Lightbulb, SlidersHorizontal } from "lucide-react";
import { LOCATIONS } from "@/features/main-page/constant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface FilterProps {
    filterArea: string;
    setFilterArea: (id: string) => void;
    searchKeyword: string;
    setSearchKeyword: (keyword: string) => void;
}

export default function FilterSidebar({
    filterArea,
    setFilterArea,
    searchKeyword,
    setSearchKeyword,
}: FilterProps) {
    return (
        <div className="space-y-5">
            <Card className="overflow-hidden rounded-3xl border border-[#dfe8f6] bg-white shadow-sm">
                <CardHeader className="space-y-4 px-5 pb-4 pt-5">
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                        <SlidersHorizontal className="h-4 w-4 text-blue-700" />
                        Bộ lọc nâng cao
                    </CardTitle>
                    <div className="space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Từ khóa tìm kiếm</p>
                        <Input
                            value={searchKeyword}
                            onChange={(event) => setSearchKeyword(event.target.value)}
                            placeholder="Ví dụ: Chìa khóa, ví, mèo..."
                            className="h-10 rounded-lg border-slate-100 bg-slate-50 text-sm placeholder:text-slate-400 focus-visible:ring-blue-500"
                        />
                    </div>
                </CardHeader>
                <CardContent className="space-y-4 px-5 pb-5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Khu vực mục tiêu</p>
                    <div className="grid grid-cols-2 gap-2">
                        {LOCATIONS.filter((location) => location.id !== "all")
                            .map((location) => (
                                <button
                                    type="button"
                                    key={location.id}
                                    onClick={() => setFilterArea(location.id)}
                                    className={cn(
                                        "rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors",
                                        filterArea === location.id
                                            ? "border-[#9dc0f7] bg-[#e8f1ff] text-[#1f5cb8]"
                                            : "border-transparent bg-slate-100 text-slate-600 hover:bg-slate-200",
                                    )}
                                >
                                    {location.label}
                                </button>
                            ))}
                    </div>
                    {(filterArea !== "all" || searchKeyword) && (
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => {
                                setFilterArea("all");
                                setSearchKeyword("");
                            }}
                            className="h-11 w-full rounded-full text-sm font-semibold"
                        >
                            Xóa bộ lọc
                        </Button>
                    )}
                </CardContent>
            </Card>

            <Card className="rounded-2xl border border-[#f7d9ab] bg-[#fff7eb] shadow-sm">
                <CardContent className="flex items-start gap-3 p-4">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ffe8c7] text-amber-700">
                        <Lightbulb className="h-4 w-4" />
                    </div>
                    <p className="text-sm leading-relaxed text-amber-900">
                        <span className="font-semibold">Mẹo:</span> Bạn có thể thêm mô tả chi tiết hoặc hình ảnh món đồ để giúp tìm kiếm nhanh hơn.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}