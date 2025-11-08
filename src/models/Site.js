import mongoose from "mongoose";

const SiteSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: [true, "Site name is required."],
			trim: true,
		},
		url: {
			type: String,
			required: [true, "URL is required."],
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
		// soon..
		// interval: {
		// 	type: Number,
		// 	default: 60, // in seconds
		// },
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
