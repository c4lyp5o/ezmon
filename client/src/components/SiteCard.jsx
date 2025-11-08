import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Trash2, AlertCircle } from "lucide-react";
import HeartbeatBar from "./HeartbeatBar";
import DeleteSiteModal from "./DeleteSiteModal";

// Helper: Get badge variant from status
const getBadgeVariant = (status) => {
	if (status === "up") {
		return "default";
	} else if (status === "down") {
		return "destructive";
	} else if (status === "failing") {
		return "secondary";
	} else {
		return "outline";
	}
};

// Helper: Analyze heartbeats to determine overall status
const statusAnalyzer = (heartbeats) => {
	if (!heartbeats || heartbeats.length === 0) {
		return "failing";
	}

	const statuses = heartbeats.map((beat) => beat.status);

	if (statuses.every((status) => status >= 200 && status < 300)) {
		return "up";
	} else if (statuses.every((status) => status >= 400)) {
		return "down";
	} else {
		return "failing";
	}
};

const SiteCard = ({ site, mutate, theme }) => {
	const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [deleteError, setDeleteError] = useState(null);

	const heartbeats = site.heartbeats;
	const siteStatus = statusAnalyzer(heartbeats);

	useEffect(() => {
		if (!isConfirmingDelete) return;

		const timer = setTimeout(() => {
			setIsConfirmingDelete(false);
		}, 3000);

		return () => clearTimeout(timer);
	}, [isConfirmingDelete]);

	const handleDeleteClick = () => {
		if (!isConfirmingDelete) {
			setIsConfirmingDelete(true);
			return;
		}
		// Second click: open the modal
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
		if (!open) {
			setIsConfirmingDelete(false);
			setDeleteError(null);
		}
	};

	return (
		<Card className={cn(theme.card.bg, theme.card.text, theme.card.font)}>
			<CardHeader>
				<div className="flex justify-between items-start gap-4">
					{/* Left Side: Info & Delete Button */}
					<div className="flex items-start gap-2">
						{/* Title & URL */}
						<div>
							<CardTitle className={cn("text-lg", theme.card.text)}>
								{site.name}
							</CardTitle>
							{!site.hideUrl ? (
								<a
									href={site.url}
									target="_blank"
									rel="noopener noreferrer"
									className="text-sm text-muted-foreground transition-colors hover:underline hover:text-primary"
								>
									{site.url}
								</a>
							) : null}
						</div>

						{/* Delete Button */}
						<Button
							variant="ghost"
							size="icon"
							className={`h-8 w-8 shrink-0 ${
								isConfirmingDelete ? "text-destructive" : ""
							}`}
							onClick={handleDeleteClick}
							onMouseLeave={() => setIsConfirmingDelete(false)}
						>
							{isConfirmingDelete ? (
								<AlertCircle className="h-4 w-4 text-red-500" />
							) : (
								<Trash2 className="h-4 w-4" />
							)}
							<span className="sr-only">Delete site</span>
						</Button>
						{/* Error message for delete */}
						{deleteError && (
							<p className="text-destructive text-sm mt-2">{deleteError}</p>
						)}
					</div>

					{/* Right Side: Status & Timestamp */}
					<div className="text-right shrink-0">
						<Badge
							variant={getBadgeVariant(siteStatus)}
							className={cn("capitalize", {
								[theme.badge.up]: siteStatus === "up",
								[theme.badge.failing]: siteStatus === "failing",
								[theme.badge.down]: siteStatus === "down",
							})}
						>
							{siteStatus}
						</Badge>
						{(siteStatus === "down" || siteStatus === "failing") &&
							site.lastStatusChangeAt && (
								<p className={cn("text-xs", "mt-2", theme.card.text)}>
									since {new Date(site.lastStatusChangeAt).toLocaleString()}
								</p>
							)}
					</div>
				</div>
			</CardHeader>

			<CardContent className="pt-2">
				<HeartbeatBar
					heartbeats={heartbeats}
					themeHeartbeat={theme.heartbeat}
				/>
			</CardContent>

			{/* Delete Modal */}
			<DeleteSiteModal
				siteName={site.name}
				open={isModalOpen}
				onOpenChange={handleModalOpenChange}
				onConfirm={handleConfirmDelete}
				isLoading={isLoading}
				error={deleteError}
			/>
		</Card>
	);
};

export default SiteCard;
