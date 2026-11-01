import SiteDaily from "../models/SiteDaily";
import mongoose from "mongoose";
import logger from "../utils/logger";

// Bisect two dates, returning [startOfRange, cursor] inclusive of 'end'.
const utcDay = (d) => {
	const x = new Date(d);
	x.setUTCHours(0, 0, 0, 0);
	return x;
};

const dayStr = (d) => utcDay(d).toISOString().slice(0, 10);

// Aggregate SiteDaily docs over the last N days, also counting today's partial.
export const uptimeFor = async (siteId, { days = 7 } = {}) => {
	const since = utcDay(Date.now());
	since.setUTCDate(since.getUTCDate() - (days - 1));

	const rows = await SiteDaily.aggregate([
		{ $match: { site: new mongoose.Types.ObjectId(siteId), day: { $gte: dayStr(since) } } },
		{
			$group: {
				_id: null,
				totalChecks: { $sum: "$totalChecks" },
				upChecks: { $sum: "$upChecks" },
				downChecks: { $sum: "$downChecks" },
				totalResponseTimeMs: { $sum: "$totalResponseTimeMs" },
			},
		},
	]);

	if (!rows.length) {
		return { days, totalChecks: 0, upChecks: 0, downChecks: 0, uptime: null, avgResponseTimeMs: null };
	}

	const r = rows[0];
	const uptime =
		r.totalChecks > 0 ? Math.round((r.upChecks / r.totalChecks) * 1000) / 10 : null;
	const avg = r.totalChecks > 0 ? Math.round(r.totalResponseTimeMs / r.totalChecks) : null;
	return {
		days,
		totalChecks: r.totalChecks,
		upChecks: r.upChecks,
		downChecks: r.downChecks,
		uptime,
		avgResponseTimeMs: avg,
	};
};

// Record a single check into today's rollup (upsert, atomic increments).
export const recordCheck = async ({ siteId, siteStatus, responseTimeMs }) => {
	const day = dayStr(Date.now());
	try {
		await SiteDaily.updateOne(
			{ site: siteId, day },
			{
				$inc: {
					totalChecks: 1,
					upChecks: siteStatus === "up" ? 1 : 0,
					downChecks: siteStatus === "up" ? 0 : 1,
					totalResponseTimeMs: responseTimeMs || 0,
				},
				$setOnInsert: { site: siteId, day },
			},
			{ upsert: true },
		);
		return true;
	} catch (err) {
		logger.error(`[uptime] recordCheck failed: ${err.message}`);
		return false;
	}
};

export default { uptimeFor, recordCheck };