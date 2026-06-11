import { FileText, ScanSearch, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const stats = [
	{
		label: "Bài viết mới",
		value: "24",
		icon: FileText,
		delta: "+12%",
	},
	{
		label: "Đồ đã tìm thấy",
		value: "08",
		icon: ShieldCheck,
		delta: "+2",
	},
	{
		label: "Crawled Match",
		value: "20",
		icon: ScanSearch,
		delta: "",
	},
];

export default function StatsSidebar() {
	return (
		<Card className="rounded-3xl border-blue-100/80 bg-white shadow-sm">
			<CardHeader className="pb-3">
				<CardTitle className="text-xl font-semibold text-slate-900">Thống kê hôm nay</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{stats.map((item) => (
					<div key={item.label} className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
								<item.icon className="h-4 w-4" />
							</div>
							<div>
								<p className="text-xs text-slate-500">{item.label}</p>
								<p className="text-2xl font-bold leading-none text-slate-900">{item.value}</p>
							</div>
						</div>
						{item.delta ? <span className="text-xs font-semibold text-amber-700">{item.delta}</span> : null}
					</div>
				))}
			</CardContent>
		</Card>
	);
}
