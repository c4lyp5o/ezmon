import { useState, useMemo } from "react";
import useSWR from "swr";
import { LayoutGrid, List, Search, ArrowUpDown } from "lucide-react";

import SiteCard from "./components/SiteCard";
import AddSiteModal from "./components/AddSiteModal";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

import Loading from "./components/Loading";
import ErrorPage from "./components/Error";

const fetcher = (url) => fetch(url).then((res) => res.json());

const themes = [
	{
		name: "Default",
		card: { bg: "glass-card", text: "text-foreground", font: "font-sans font-normal" },
		badge: { up: "default", failing: "secondary", down: "destructive" },
		heartbeat: {
			up: "bg-green-500", failing: "bg-yellow-400", down: "bg-red-500", noData: "bg-muted/30",
			style: "rounded-full animate-pulse",
		},
		spark: { stroke: "#22c55e", down: "#ef4444" },
		uptimeGood: "text-green-400", uptimeBad: "text-red-400",
	},
	{
		name: "Dark Forest",
		card: { bg: "glass-card", text: "text-green-200", font: "font-serif font-semibold" },
		badge: { up: "bg-green-700 text-green-50", failing: "bg-yellow-700 text-yellow-50", down: "bg-red-700 text-red-50" },
		heartbeat: { up: "bg-green-400", failing: "bg-yellow-500", down: "bg-red-500", noData: "bg-gray-700", style: "rounded-md shadow-sm" },
		spark: { stroke: "#4ade80", down: "#f87171" },
		uptimeGood: "text-green-400", uptimeBad: "text-red-400",
	},
	{
		name: "Cyberpunk",
		card: { bg: "glass-card", text: "text-pink-300", font: "font-mono font-bold uppercase" },
		badge: { up: "bg-fuchsia-600 text-white", failing: "bg-amber-500 text-black", down: "bg-red-700 text-white" },
		heartbeat: { up: "bg-fuchsia-500 shadow-[0_0_10px_#f0f]", failing: "bg-amber-500 shadow-[0_0_10px_#ff0]", down: "bg-red-600 shadow-[0_0_10px_#f00]", noData: "bg-gray-800", style: "rounded-full" },
		spark: { stroke: "#e879f9", down: "#fb7185" },
		uptimeGood: "text-fuchsia-400", uptimeBad: "text-red-500",
	},
	{
		name: "Solar Desert",
		card: { bg: "glass-card", text: "text-amber-200", font: "font-serif italic font-medium" },
		badge: { up: "bg-amber-500 text-black", failing: "bg-yellow-500 text-black", down: "bg-red-600 text-white" },
		heartbeat: { up: "bg-amber-400", failing: "bg-yellow-400", down: "bg-red-500", noData: "bg-amber-100/50", style: "rounded-md" },
		spark: { stroke: "#fbbf24", down: "#f87171" },
		uptimeGood: "text-amber-300", uptimeBad: "text-red-400",
	},
	{
		name: "Midnight Neon",
		card: { bg: "glass-card", text: "text-cyan-200", font: "font-mono font-semibold" },
		badge: { up: "bg-cyan-600 text-cyan-50", failing: "bg-lime-600 text-lime-50", down: "bg-pink-700 text-pink-50" },
		heartbeat: { up: "bg-cyan-500 shadow-[0_0_12px_#0ff]", failing: "bg-lime-500 shadow-[0_0_12px_#cf0]", down: "bg-pink-600 shadow-[0_0_12px_#f0a]", noData: "bg-gray-800", style: "rounded-lg" },
		spark: { stroke: "#22d3ee", down: "#f472b6" },
		uptimeGood: "text-cyan-300", uptimeBad: "text-pink-400",
	},
];

const STATUS_FILTERS = [
	{ id: "all", label: "All" },
	{ id: "up", label: "Up" },
	{ id: "down", label: "Down" },
	{ id: "failing", label: "Failing" },
];

const SORT_OPTIONS = [
	{ id: "status", label: "Status" },
	{ id: "name", label: "Name" },
	{ id: "uptime", label: "Uptime" },
	{ id: "latency", label: "Latency" },
];

const App = () => {
	const { data, error, isLoading, mutate } = useSWR("/api/v1/mon", fetcher, { refreshInterval: 60000 });
	const [selectedThemeName, setSelectedThemeName] = useState(themes[0].name);
	const [view, setView] = useState("grid");
	const [statusFilter, setStatusFilter] = useState("all");
	const [sortBy, setSortBy] = useState("status");
	const [search, setSearch] = useState("");

	const currentTheme = themes.find((t) => t.name === selectedThemeName) || themes[0];
	const sites = data?.sites || [];

	const counts = useMemo(() => {
		const c = { up: 0, down: 0, failing: 0 };
		for (const s of sites) if (c[s.status] != null) c[s.status] += 1;
		return c;
	}, [sites]);

	const overallUp = useMemo(() => {
		const withUp = sites.filter((s) => s.uptime?.uptime != null);
		if (!withUp.length) return null;
		return Math.round(withUp.reduce((a, s) => a + s.uptime.uptime, 0) / withUp.length);
	}, [sites]);

	const filtered = useMemo(() => {
		let list = sites.slice();
		if (statusFilter !== "all") list = list.filter((s) => s.status === statusFilter);
		if (search.trim()) {
			const q = search.toLowerCase();
			list = list.filter((s) => s.name.toLowerCase().includes(q) || (s.url || "").toLowerCase().includes(q));
		}
		const rank = { up: 0, failing: 1, down: 2 };
		const byUptime = (a, b) => (b.uptime?.uptime ?? -1) - (a.uptime?.uptime ?? -1);
		const byLatency = (a, b) => (a.uptime?.avgResponseTimeMs ?? 1e9) - (b.uptime?.avgResponseTimeMs ?? 1e9);
		const byName = (a, b) => a.name.localeCompare(b.name);
		switch (sortBy) {
			case "status": list.sort((a, b) => (rank[a.status] ?? 9) - (rank[b.status] ?? 9) || byName(a, b)); break;
			case "uptime": list.sort((a, b) => byUptime(a, b) || byName(a, b)); break;
			case "latency": list.sort((a, b) => byLatency(a, b) || byName(a, b)); break;
			default: list.sort(byName);
		}
		return list;
	}, [sites, statusFilter, search, sortBy]);

	if (isLoading) return <Loading />;
	if (error) return <ErrorPage message={error.message} />;

	return (
		<div className="min-h-screen text-foreground p-4 sm:p-6 lg:p-8 relative">
			{/* Animated aurora backdrop */}
			<div className="bg-aurora fixed inset-0 -z-10 pointer-events-none" />
			<div className="max-w-5xl mx-auto">

				{/* Header */}
				<header className="glass rounded-2xl p-5 mb-6 flex flex-wrap items-center gap-4">
					<div className="flex items-center gap-3 mr-auto">
						<span className="text-3xl">🛰️</span>
						<div>
							<h1 className="text-2xl font-bold tracking-tight">EZMON</h1>
							<p className="text-sm text-muted-foreground">monitor anything, anywhere</p>
						</div>
					</div>

					{/* Summary chips */}
					<div className="flex items-center gap-3 text-sm">
						<div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-card">
							<span className="h-2.5 w-2.5 rounded-full bg-green-500 pulse-dot text-green-500" />
							<span className="font-semibold">{counts.up}</span><span className="text-muted-foreground">up</span>
						</div>
						<div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-card">
							<span className="h-2.5 w-2.5 rounded-full bg-yellow-400 pulse-dot text-yellow-400" />
							<span className="font-semibold">{counts.failing}</span><span className="text-muted-foreground">failing</span>
						</div>
						<div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-card">
							<span className="h-2.5 w-2.5 rounded-full bg-red-500 pulse-dot text-red-500" />
							<span className="font-semibold">{counts.down}</span><span className="text-muted-foreground">down</span>
						</div>
						{overallUp != null && (
							<div className="px-3 py-1.5 rounded-full glass-card">
								<span className="text-muted-foreground">overall {overallUp}%</span>
							</div>
						)}
					</div>
				</header>

				{/* Controls bar */}
				<div className="flex flex-wrap items-center gap-3 mb-6">
					{/* Status filter pills */}
					<div className="flex items-center gap-1 glass-card rounded-xl p-1">
						{STATUS_FILTERS.map((f) => (
							<button key={f.id} onClick={() => setStatusFilter(f.id)}
								className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
									statusFilter === f.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
								}`}>
								{f.label}
							</button>
						))}
					</div>

					{/* Search */}
					<div className="relative flex-1 min-w-[160px]">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<input value={search} onChange={(e) => setSearch(e.target.value)}
							placeholder="Search sites..."
							className="w-full rounded-xl glass-card py-2 pl-9 pr-3 text-sm outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground" />
					</div>

					{/* Sort */}
					<Select value={sortBy} onValueChange={setSortBy}>
						<SelectTrigger className="w-[140px] glass-card border-0">
							<ArrowUpDown className="mr-2 h-3.5 w-3.5" />
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{SORT_OPTIONS.map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
						</SelectContent>
					</Select>

					{/* View toggle */}
					<div className="flex items-center gap-1 glass-card rounded-xl p-1">
						<button onClick={() => setView("grid")} className={`p-2 rounded-lg transition-colors ${view === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`} title="Grid view">
							<LayoutGrid className="h-4 w-4" />
						</button>
						<button onClick={() => setView("list")} className={`p-2 rounded-lg transition-colors ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`} title="List view">
							<List className="h-4 w-4" />
						</button>
					</div>

					{/* Theme */}
					<Select value={selectedThemeName} onValueChange={setSelectedThemeName}>
						<SelectTrigger className="w-[150px] glass-card border-0">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{themes.map((t) => <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>)}
						</SelectContent>
					</Select>

					<AddSiteModal key={sites.length} onAdd={() => mutate()} theme={currentTheme} />
				</div>

				{/* Sites */}
				<main className={view === "grid" ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "flex flex-col gap-3"}>
					{filtered.length > 0 ? (
						filtered.map((site) => (
							<SiteCard key={site._id} site={site} uptime={site.uptime} mutate={mutate} theme={currentTheme} />
						))
					) : (
						<div className="glass rounded-2xl px-6 py-16 text-center">
							<span className="mb-4 text-6xl">💤</span>
							<h3 className="text-xl font-bold">No sites match</h3>
							<p className="mt-2 text-sm text-muted-foreground">
								Try adjusting your filters or search.
							</p>
						</div>
					)}
				</main>
			</div>
		</div>
	);
};

export default App;