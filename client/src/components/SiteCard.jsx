import { AlertCircle, ShieldAlert, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Collapse } from "@/ez/motion";
import { Chip, cx, Dot, panel } from "@/ez/ui";
import DeleteSiteModal from "./DeleteSiteModal";
import HeartbeatBar from "./HeartbeatBar";
import Sparkline from "./Sparkline";

const TONE = { up: "ok", failing: "warn", down: "bad" };
const LABEL = { up: "Up", failing: "Failing", down: "Down" };

const statusAnalyzer = (heartbeats) => {
	if (!heartbeats || heartbeats.length === 0) return "failing";
	const statuses = heartbeats.map((beat) => beat.status);
	if (statuses.every((s) => s >= 200 && s < 300)) return "up";
	if (statuses.every((s) => s >= 400)) return "down";
	return "failing";
};

const SiteCard = ({ site, uptime, mutate, compact }) => {
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
	const tone = TONE[siteStatus] ?? "neutral";

	useEffect(() => {
		if (!isConfirmingDelete) return;
		const timer = setTimeout(() => setIsConfirmingDelete(false), 3000);
		return () => clearTimeout(timer);
	}, [isConfirmingDelete]);

	const handleDeleteClick = () => {
		if (!isConfirmingDelete) {
			setIsConfirmingDelete(true);
			return;
		}
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
		<article className={cx(panel, "transition-colors hover:border-line-strong", compact ? "p-4" : "p-5")}>
			<div className="flex items-start gap-3">
				<span className="mt-[7px]">
					<Dot tone={tone} live={siteStatus !== "up"} />
				</span>
				<div className="min-w-0 flex-1">
					<h3 className="truncate text-[15px] font-semibold text-ink">{site.name}</h3>
					{!site.hideUrl ? (
						<a
							href={site.url}
							target="_blank"
							rel="noopener noreferrer"
							className="block truncate font-code text-[12px] text-mute hover:text-ink"
						>
							{site.url}
						</a>
					) : (
						<span className="text-[12px] text-mute">URL hidden</span>
					)}
				</div>
				<div className="flex shrink-0 flex-col items-end gap-1">
					<Chip tone={tone}>{LABEL[siteStatus]}</Chip>
					{(siteStatus === "down" || siteStatus === "failing") && site.lastStatusChangeAt && (
						<span className="text-[11px] text-mute">since {new Date(site.lastStatusChangeAt).toLocaleString()}</span>
					)}
				</div>
				<button
					type="button"
					className={cx(
						"grid h-8 w-8 shrink-0 place-items-center rounded-full transition-colors",
						isConfirmingDelete ? "bg-bad-dim text-bad" : "text-mute hover:bg-hover hover:text-ink",
					)}
					onClick={handleDeleteClick}
					onMouseLeave={() => isConfirmingDelete && setIsConfirmingDelete(false)}
					title={isConfirmingDelete ? "Click again to delete" : "Delete monitor"}
				>
					{isConfirmingDelete ? <AlertCircle className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
					<span className="sr-only">Delete site</span>
				</button>
			</div>

			<dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[12px] sm:grid-cols-4">
				<div>
					<dt className="text-mute">Uptime</dt>
					<dd className={cx("font-mono text-[15px] font-semibold", upPct == null ? "text-mute" : upPct >= 99 ? "text-ink" : "text-bad")}>
						{upPct == null ? "–" : `${upPct}%`}
					</dd>
				</div>
				<div>
					<dt className="text-mute">Average response</dt>
					<dd className="font-mono text-[15px] font-semibold text-ink">
						{avgLatency == null ? <span className="text-mute">–</span> : `${avgLatency.toLocaleString("en-US")} ms`}
					</dd>
				</div>
				<div>
					<dt className="text-mute">Interval</dt>
					<dd className="font-mono text-[15px] font-semibold text-ink">
						{check.interval == null ? <span className="text-mute">–</span> : `${check.interval} s`}
					</dd>
				</div>
				<div>
					<dt className="text-mute">Certificate</dt>
					<dd>
						{check.ssl ? (
							<span
								className={cx(
									"inline-flex items-center gap-1 text-[13px] font-medium",
									ssl.expired ? "text-bad" : ssl.warning ? "text-warn" : "text-ok",
								)}
							>
								<ShieldAlert className="h-3 w-3" />
								{ssl.expired ? "Expired" : ssl.warning ? `${ssl.daysRemaining} days left` : "Valid"}
							</span>
						) : (
							<span className="text-[13px] text-mute">Not checked</span>
						)}
					</dd>
				</div>
			</dl>

			<Collapse open={!!deleteError}>
				<p className="pt-3 text-[12px] text-bad">{deleteError}</p>
			</Collapse>

			<div className={compact ? "mt-3" : "mt-4"}>
				<HeartbeatBar heartbeats={heartbeats} />
				{!compact && <Sparkline heartbeats={heartbeats} />}
			</div>

			<DeleteSiteModal
				siteName={site.name}
				open={isModalOpen}
				onOpenChange={handleModalOpenChange}
				onConfirm={handleConfirmDelete}
				isLoading={isLoading}
				error={deleteError}
			/>
		</article>
	);
};

export default SiteCard;
