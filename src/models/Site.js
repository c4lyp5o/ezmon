import mongoose from "mongoose";

const SiteSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: [true, "Site name required."],
			trim: true,
		},
		url: {
			type: String,
			required: [true, "URL required."],
			unique: true,
			trim: true,
		},
		hideUrl: {
			type: Boolean,
			default: false,
		},
		status: {
			type: String,
			enum: ["up", "down", "failing"],
			default: "failing",
		},
		lastCheckedAt: {
			type: Date,
		},
		lastStatusChangeAt: {
			type: Date,
		},
		// Per-site check cadence, in seconds.
		interval: {
			type: Number,
			min: 15,
			default: 60,
		},
		// Advanced check configuration.
		check: {
			method: {
				type: String,
				enum: ["GET", "POST", "HEAD", "PUT", "PATCH", "DELETE"],
				default: "GET",
			},
			headers: {
				type: Map,
				of: String,
				default: {},
			},
			expectedStatus: {
				type: Number,
				default: 200,
			},
			timeoutMs: {
				type: Number,
				min: 1000,
				max: 60000,
				default: 5000,
			},
			body: {
				type: String,
				default: "",
			},
			// SSL certificate monitoring. When enabled and a domain is present,
			// the worker also checks cert expiry and stores days-remaining on the site.
			ssl: {
				type: Boolean,
				default: false,
			},
			sslDaysBeforeExpiry: {
				type: Number,
				min: 3,
				default: 14,
				// 0 = only alerting when already expired; otherwise alert N days before.
			},
		},
		// Alerting configuration.
		alerts: {
			disabled: { type: Boolean, default: false },
			onlyOnStatusChange: { type: Boolean, default: true },
			notifyOnRecovery: { type: Boolean, default: true },
			// Providers disable individually; all are also gated by env keys.
			telegram: { type: Boolean, default: false },
			discord: { type: Boolean, default: false },
			slack: { type: Boolean, default: false },
			email: { type: Boolean, default: false },
		},
		// SSL state surfaced to the API/UI.
		sslStatus: {
			valid: { type: Boolean, default: true },
			daysRemaining: { type: Number, default: null },
			warning: { type: Boolean, default: false },
			expired: { type: Boolean, default: false },
			checkedAt: { type: Date, default: null },
		},
		responseTimeMs: {
			type: Number,
			default: 0,
			// last known full-page latency, used for the UI's "latency now".
		},
	},
	{
		timestamps: true,
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
	},
);

SiteSchema.virtual("heartbeats", {
	ref: "Heartbeat",
	localField: "_id",
	foreignField: "site",
	options: {
		sort: { timestamp: -1 },
		limit: 10,
	},
});

SiteSchema.post(["find", "findOne", "findOneAndUpdate"], (res) => {
	if (!res) {
		return;
	}
	const docs = Array.isArray(res) ? res : [res];
	for (const doc of docs) {
		if (doc?.hideUrl) {
			doc.url = "";
		}
	}
});

const Site = mongoose.model("Site", SiteSchema);

export default Site;