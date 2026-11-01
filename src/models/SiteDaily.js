import mongoose from "mongoose";

// Long-term uptime rollup. One document per site per day.
// A nightly or on-check rollup increments counters; uptime% for 7/30/90d is
// computed by aggregating these documents, keeping the DB tiny and the query fast.
const SiteDailySchema = new mongoose.Schema(
	{
		site: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Site",
			required: true,
			index: true,
		},
		day: {
			type: String, // "YYYY-MM-DD" (UTC)
			required: true,
		},
		totalChecks: {
			type: Number,
			default: 0,
		},
		upChecks: {
			type: Number,
			default: 0,
		},
		downChecks: {
			type: Number,
			default: 0,
		},
		totalResponseTimeMs: {
			type: Number,
			default: 0,
		},
		// Kept at the site we created the daily on.
		avgResponseTimeMs: {
			type: Number,
			default: 0,
		},
	},
	{
		timestamps: true,
	},
);

// One row per site-day.
SiteDailySchema.index({ site: 1, day: 1 }, { unique: true });

const SiteDaily = mongoose.model("SiteDaily", SiteDailySchema);

export default SiteDaily;