import { LayoutGrid, List, Search } from "lucide-react";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Backdrop from "./ez/Backdrop";
import { AnimatePresence, CountUp, motion, Stagger, StaggerItem, spring } from "./ez/motion";
import { Brand, Shell } from "./ez/Shell";
import { Chip, cx, Dot, EmptyState, inputCls, panel, Segmented, Stat } from "./ez/ui";
import AddSiteModal from "./components/AddSiteModal";
import ErrorPage from "./components/Error";
import Loading from "./components/Loading";
import SiteCard from "./components/SiteCard";

const fetcher = (url) => fetch(url).then((res) => res.json());

const STATUS_FILTERS = [
	{ key: "all", label: "All" },
	{ key: "up", label: "Up" },
	{ key: "failing", label: "Failing" },
	{ key: "down", label: "Down" },
];

const SORT_OPTIONS = [
	{ id: "status", label: "Status" },
	{ id: "name", label: "Name" },
	{ id: "uptime", label: "Uptime" },
	{ id: "latency", label: "Latency" },
];

const VIEWS = [
	{ key: "grid", label: <LayoutGrid className="inline h-3.5 w-3.5" aria-label="Grid" />, title: "Grid view" },
	{ key: "list", label: <List className="inline h-3.5 w-3.5" aria-label="List" />, title: "List view" },
];

const App = () => {
	const { data, error, isLoading, mutate } = useSWR("/api/v1/mon", fetcher, { refreshInterval: 60000 });
	const [view, setView] = useState("grid");
	const [statusFilter, setStatusFilter] = useState("all");
	const [sortBy, setSortBy] = useState("status");
	const [search, setSearch] = useState("");

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
		const rank = { down: 0, failing: 1, up: 2 };
		const byUptime = (a, b) => (b.uptime?.uptime ?? -1) - (a.uptime?.uptime ?? -1);
		const byLatency = (a, b) => (a.uptime?.avgResponseTimeMs ?? 1e9) - (b.uptime?.avgResponseTimeMs ?? 1e9);
		const byName = (a, b) => a.name.localeCompare(b.name);
		switch (sortBy) {
			// worst first: a monitor's job is to surface what needs attention
			case "status":
				list.sort((a, b) => (rank[a.status] ?? 9) - (rank[b.status] ?? 9) || byName(a, b));
				break;
			case "uptime":
				list.sort((a, b) => byUptime(a, b) || byName(a, b));
				break;
			case "latency":
				list.sort((a, b) => byLatency(a, b) || byName(a, b));
				break;
			default:
				list.sort(byName);
		}
		return list;
	}, [sites, statusFilter, search, sortBy]);

	if (isLoading) return <Loading />;
	if (error) return <ErrorPage message={error.message} />;

	const worst = counts.down > 0 ? "bad" : counts.failing > 0 ? "warn" : "ok";

	return (
		<Shell
			brand={<Brand name="ezmon" glyph="mn" scope="Uptime monitor" />}
			title="Monitors"
			sub="Every site, its last ten checks and its response time."
			aside={<AddSiteModal key={sites.length} onAdd={() => mutate()} />}
		>
			<Stagger className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
				<StaggerItem className={cx(panel, "grid grid-cols-2 gap-5 p-5 sm:grid-cols-4")}>
					<Stat label="Up" value={counts.up.toLocaleString("en-US")} tone={counts.up ? "ok" : undefined} lead />
					<Stat label="Failing" value={counts.failing.toLocaleString("en-US")} tone={counts.failing ? "warn" : undefined} lead />
					<Stat label="Down" value={counts.down.toLocaleString("en-US")} tone={counts.down ? "bad" : undefined} lead />
					<Stat
						label="Average uptime"
						value={overallUp == null ? null : <CountUp value={overallUp} format={(n) => `${Math.round(n)}%`} />}
						lead
					/>
				</StaggerItem>
				<StaggerItem className={cx(panel, "relative isolate hidden min-h-[112px] overflow-hidden lg:block")}>
					<Backdrop className="-z-10" opacity={0.6} nodes={Math.max(6, Math.min(24, sites.length))} />
					<div className="absolute bottom-3 left-4 flex items-center gap-2 text-[12px] text-mute">
						<Dot tone={worst} live />
						{sites.length.toLocaleString("en-US")} monitors · refresh every 60 s
					</div>
				</StaggerItem>
			</Stagger>

			<div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
				<Segmented label="Filter by status" options={STATUS_FILTERS} value={statusFilter} onChange={setStatusFilter} />

				<div className="relative min-w-[180px] flex-1">
					<Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-mute" />
					<input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Search by name or URL"
						aria-label="Search monitors"
						className={cx(inputCls, "pl-8")}
					/>
				</div>

				<Select value={sortBy} onValueChange={setSortBy}>
					<SelectTrigger className="w-[150px]" aria-label="Sort by">
						<span className="text-mute">Sort</span>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{SORT_OPTIONS.map((o) => (
							<SelectItem key={o.id} value={o.id}>
								{o.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Segmented label="Layout" options={VIEWS} value={view} onChange={setView} />
			</div>

			<div className="mt-3 flex items-center gap-2 text-[12px] text-mute">
				<span>
					Showing <span className="font-mono text-dim">{filtered.length.toLocaleString("en-US")}</span> of{" "}
					<span className="font-mono text-dim">{sites.length.toLocaleString("en-US")}</span>
				</span>
				{counts.down + counts.failing > 0 && (
					<Chip tone={counts.down ? "bad" : "warn"}>
						{(counts.down + counts.failing).toLocaleString("en-US")} need attention
					</Chip>
				)}
			</div>

			<main className={cx("mt-4", view === "grid" ? "grid grid-cols-1 gap-4 md:grid-cols-2" : "flex flex-col gap-3")}>
				<AnimatePresence mode="popLayout" initial={false}>
					{filtered.map((site) => (
						<motion.div
							key={site._id}
							layout
							initial={{ opacity: 0, y: 12 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.98 }}
							transition={spring}
							className="min-w-0"
						>
							<SiteCard site={site} uptime={site.uptime} mutate={mutate} compact={view === "list"} />
						</motion.div>
					))}
				</AnimatePresence>
				{filtered.length === 0 && (
					<EmptyState
						className="md:col-span-2"
						title={sites.length ? "No monitors match these filters." : "No monitors yet."}
						hint={sites.length ? "Clear the search or pick another status." : "Add a site to start checking it."}
					/>
				)}
			</main>
		</Shell>
	);
};

export default App;
