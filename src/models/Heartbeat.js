import mongoose from "mongoose";

const HeartbeatSchema = new mongoose.Schema(
	{
		site: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Site",
			required: true,
			index: true,
		},
		status: {
			type: Number, // 200, 404, etc. 0 = network/SSl failure.
			required: true,
		},
		responseTime: {
			type: Number, // in milliseconds
		},
		error: {
			type: String,
		},
		// Records the site's post-check status so long-term uptime
		// rollups can classify up/down without guessing from HTTP code.
		siteStatus: {
			type: String,
			enum: ["up", "down", "failing"],
		},
	},
	{
		timestamps: { createdAt: "timestamp", updatedAt: false }, // check time in 'timestamp'
	},
);

// Keep ~7 days of raw heartbeats for latency graphs. Long-term uptime% is
// rolled up into SiteDaily instead, so this staying small is fine.
HeartbeatSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7 * 24 * 3600 });

const Heartbeat = mongoose.model("Heartbeat", HeartbeatSchema);

export default Heartbeat;