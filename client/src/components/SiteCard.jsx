import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Trash2, AlertCircle, ShieldAlert } from "lucide-react";
import HeartbeatBar from "./HeartbeatBar";
import Sparkline from "./Sparkline";
import DeleteSiteModal from "./DeleteSiteModal";

const getBadgeVariant = (status) => {
	if (status === "up") return "default";
	if (status === "down") return "destructive";
	if (status === "failing") return "secondary";
	return "outline";
};

const statusAnalyzer = (heartbeats) => {
	if (!heartbeats || heartbeats.length === 0) return "failing";
	const statuses = heartbeats.map((beat) => beat.status);
	if (statuses.every((s) => s >= 200 && s < 300)) return "up";
	if (statuses.every((s) => s >= 400)) return "down";
	return "failing";
};

const SiteCard = ({ site, uptime, mutate, theme }) => {
	const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [deleteError, setDeleteError] = useState(null);

	const heartbeats = site.heartbeats || [];
	const siteStatus = statusAnalyzer(heartbeats);
	const ssl = site.sslStatus || {};
	const upPct = uptime?.uptime;
	const avgLatency = uptime?.avgResponseTimeMs;
	const check = site.check || {};

	useEffect(() => {
		if (!isConfirmingDelete) return;
		const timer = setTimeout(() => setIsConfirmingDelete(false), 3000);
		return () => clearTimeout(timer);
	}, [isConfirmingDelete]);

	const handleDeleteClick = () => {
		if (!isConfirmingDelete) { setIsConfirmingDelete(true); return; }
		setDeleteError(null);
		setIsModalOpen(true);
	};

	const handleConfirmDelete = async (password) => {
		setIsLoading(true);
		setDeleteError(null);
		try {
			const response = await fetch(`/api/v1/mon`, {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ id: site._id, password }),
			});
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || "Failed to delete site.");
			}
			setIsModalOpen(false);
			setIsConfirmingDelete(false);
			mutate();
		} catch (error) {
			console.error("Delete Error:", error);
			setDeleteError(error.message);
		} finally {
			setIsLoading(false);
		}
	};

	const handleModalOpenChange = (open) => {
		setIsModalOpen(open);
		if (!open) { setIsConfirmingDelete(false); setDeleteError(null); }
	};

	return (
		<Card className={cn(theme.card.bg, theme.card.text, theme.card.font)}>
			<CardHeader>
				<div className="flex justify-between items-start gap-4">
					<div className="flex items-start gap-2">
						<div>
							<CardTitle className={cn("text-lg", theme.card.text)}>
								{site.name}
							</CardTitle>
							{!site.hideUrl ? (
								<a href={site.url} target="_blank" rel="noopener noreferrer"
									className="text-sm text-muted-foreground transition-colors hover:underline hover:text-primary">
									{site.url}
								</a>
							) : null}

							{/* Uptime + latency chips */}
							<div className="flex items-center gap-3 mt-2 flex-wrap">
								{upPct != null && (
									<span className={cn("text-xs font-semibold", upPct >= 99 ? theme.uptimeGood : theme.uptimeBad)}>
										{upPct}% uptime
									</span>
								)}
								{avgLatency != null && (
									<span className="text-xs text-muted-foreground">{avgLatency}ms avg</span>
								)}
								{check.interval != null && (
									<span className="text-xs text-muted-foreground">every {check.interval}s</span>
								)}
								{check.ssl && (
									<span className={cn("text-xs inline-flex items-center gap-1 font-semibold",
										ssl.expired ? "text-red-600" : ssl.warning ? "text-amber-600" : "text-green-600")}>
										<ShieldAlert className="h-3 w-3" />
										{ssl.expired ? "SSL expired" : ssl.warning ? `SSL in ${ssl.daysRemaining}d` : "SSL ok"}
									</span>
								)}
							</div>
						</div>

						<Button variant="ghost" size="icon"
							className={`h-8 w-8 shrink-0 ${isConfirmingDelete ? "text-destructive" : ""}`}
							onClick={handleDeleteClick}
							onMouseLeave={() => setIsConfirmingDelete(false)}>
							{isConfirmingDelete ? <AlertCircle className="h-4 w-4 text-red-500" /> : <Trash2 className="h-4 w-4" />}
							<span className="sr-only">Delete site</span>
						</Button>
						{deleteError && <p className="text-destructive text-sm mt-2">{deleteError}</p>}
					</div>

					<div className="text-right shrink-0">
						<Badge variant={getBadgeVariant(siteStatus)}
							className={cn("capitalize", {
								[theme.badge.up]: siteStatus === "up",
								[theme.badge.failing]: siteStatus === "failing",
								[theme.badge.down]: siteStatus === "down",
							})}>
							{siteStatus}
						</Badge>
						{(siteStatus === "down" || siteStatus === "failing") && site.lastStatusChangeAt && (
							<p className={cn("text-xs", "mt-2", theme.card.text)}>
								since {new Date(site.lastStatusChangeAt).toLocaleString()}
							</p>
						)}
					</div>
				</div>
			</CardHeader>

			<CardContent className="pt-2">
				<HeartbeatBar heartbeats={heartbeats} themeHeartbeat={theme.heartbeat} />
				<Sparkline heartbeats={heartbeats} themeSpark={theme.spark} />
			</CardContent>

			<DeleteSiteModal siteName={site.name} open={isModalOpen} onOpenChange={handleModalOpenChange}
				onConfirm={handleConfirmDelete} isLoading={isLoading} error={deleteError} />
		</Card>
	);
};

export default SiteCard;