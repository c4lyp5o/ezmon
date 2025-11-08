import { useState } from "react";
import useSWR from "swr";

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
		card: {
			bg: "bg-card",
			text: "text-foreground",
			font: "font-sans font-normal",
		},
		badge: { up: "default", failing: "secondary", down: "destructive" },
		heartbeat: {
			up: "bg-green-500",
			failing: "bg-yellow-400",
			down: "bg-red-500",
			noData: "bg-muted/30",
			style: "rounded-full animate-pulse",
		},
	},
	{
		name: "Dark Forest",
		card: {
			bg: "bg-gray-900",
			text: "text-green-200",
			font: "font-serif font-semibold",
		},
		badge: {
			up: "bg-green-700 text-green-50",
			failing: "bg-yellow-700 text-yellow-50",
			down: "bg-red-700 text-red-50",
		},
		heartbeat: {
			up: "bg-green-700",
			failing: "bg-yellow-700",
			down: "bg-red-700",
			noData: "bg-gray-700",
			style: "rounded-md animate-pulse shadow-sm",
		},
	},
	{
		name: "Cyberpunk",
		card: {
			bg: "bg-black",
			text: "text-pink-400",
			font: "font-mono font-bold uppercase",
		},
		badge: {
			up: "bg-fuchsia-600 text-white",
			failing: "bg-amber-500 text-black",
			down: "bg-red-700 text-white",
		},
		heartbeat: {
			up: "bg-fuchsia-600 shadow-[0_0_6px_#f0f]",
			failing: "bg-amber-500 shadow-[0_0_6px_#ff0]",
			down: "bg-red-700 shadow-[0_0_6px_#f00]",
			noData: "bg-gray-800",
			style: "rounded-full animate-bounce",
		},
	},
	{
		name: "Solar Desert",
		card: {
			bg: "bg-amber-50",
			text: "text-amber-900",
			font: "font-serif italic font-medium",
		},
		badge: {
			up: "bg-amber-500 text-white",
			failing: "bg-yellow-400 text-amber-900",
			down: "bg-red-600 text-white",
		},
		heartbeat: {
			up: "bg-amber-500",
			failing: "bg-yellow-400",
			down: "bg-red-600",
			noData: "bg-amber-100",
			style: "rounded-md animate-pulse",
		},
	},
	{
		name: "Midnight Neon",
		card: {
			bg: "bg-gray-950",
			text: "text-cyan-200",
			font: "font-mono font-semibold",
		},
		badge: {
			up: "bg-cyan-600 text-cyan-50",
			failing: "bg-lime-600 text-lime-50",
			down: "bg-pink-700 text-pink-50",
		},
		heartbeat: {
			up: "bg-cyan-600 shadow-[0_0_12px_#0ff]",
			failing: "bg-lime-600 shadow-[0_0_12px_#cf0]",
			down: "bg-pink-700 shadow-[0_0_12px_#f0a]",
			noData: "bg-gray-800",
			style: "rounded-lg animate-ping",
		},
	},
];

const App = () => {
	const { data, error, isLoading, mutate } = useSWR("/api/v1/mon", fetcher, {
		refreshInterval: 60000,
	});
	const [selectedThemeName, setSelectedThemeName] = useState(themes[0].name); // This hook is being called conditionally, but all hooks must be called in the exact same order in every component render.
	const currentTheme =
		themes.find((t) => t.name === selectedThemeName) || themes[0];

	if (isLoading) return <Loading />;
	if (error) return <ErrorPage message={error.message} />;

	return (
		<div className="min-h-screen bg-background text-foreground p-4">
			<div className="max-w-2xl mx-auto">
				{/* Header */}
				<header className="flex justify-between items-center mb-6 py-4 flex-wrap gap-2">
					<h1 className="text-2xl font-bold">EZMON - Monitor everything!</h1>
					<div className="flex items-center gap-2">
						<Select
							onValueChange={setSelectedThemeName}
							defaultValue={selectedThemeName}
						>
							<SelectTrigger className="w-[180px]">
								<SelectValue placeholder="Select a theme" />
							</SelectTrigger>
							<SelectContent>
								{themes.map((theme) => (
									<SelectItem key={theme.name} value={theme.name}>
										{theme.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<AddSiteModal />
					</div>
				</header>

				{/* Site List */}
				<main className="flex flex-col gap-4">
					{data.map((site) => (
						<SiteCard
							key={site._id}
							site={site}
							mutate={mutate}
							theme={currentTheme}
						/>
					))}
				</main>
			</div>
		</div>
	);
};

export default App;
