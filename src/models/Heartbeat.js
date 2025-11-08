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
			type: Number, // 200, 404, etc.
			required: true,
		},
		responseTime: {
			type: Number, // in milliseconds
		},
		error: {
			type: String,
		},
	},
	{
		timestamps: { createdAt: "timestamp", updatedAt: false }, // Store check time in 'timestamp'
	},
);

// Create a TTL index on the 'timestamp' field. Documents will be automatically
// deleted 900 seconds (15 minutes) after their timestamp.
HeartbeatSchema.index({ timestamp: 1 }, { expireAfterSeconds: 900 });

const Heartbeat = mongoose.model("Heartbeat", HeartbeatSchema);

export default Heartbeat;
