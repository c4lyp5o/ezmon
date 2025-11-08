import mongoose from "mongoose";
import { CronJob } from "cron";

import Site from "./models/Site";
import Heartbeat from "./models/Heartbeat";
import logger from "./utils/logger";

/**
 * Connects to MongoDB. Exits process on failure.
 */
async function connectToMongo() {
	try {
		await mongoose.connect(process.env.MONGO_URI);
		logger.success("Connected to MongoDB");
	} catch (error) {
		logger.error(`MongoDB connection failed: ${JSON.stringify(error)}`);
		process.exit(1);
	}
}

/**
 * Fetches all monitored sites from the database.
 * Returns an empty array on failure.
 */
const getAllMonitoredSites = async () => {
	try {
		const sites = await Site.aggregate([
			{
				$project: {
					_id: 1,
					name: 1,
					url: 1,
					status: 1,
				},
			},
		]);
		return sites;
	} catch (error) {
		console.log(error);
		logger.error(`Failed to fetch sites: ${JSON.stringify(error)}`);
		return [];
	}
};

/**
 * Checks a single website's status and records a Heartbeat.
 */
const checkWebsite = async (site) => {
	const { url, _id: siteId } = site;
	const start = Date.now();
	let responseTime = 0;

	try {
		const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
		responseTime = Date.now() - start;

		const newStatus = res.ok ? "up" : "failing";
		if (site.status !== newStatus) {
			site.lastStatusChangeAt = new Date();
		}
		site.status = newStatus;
		site.lastCheckedAt = new Date();

		await Heartbeat.create({
			site: siteId,
			status: res.status,
			responseTime: responseTime,
		});

		// Save the updated site status
		await Site.findByIdAndUpdate(siteId, site, { new: true });

		logger.info(`✅ ${url} responded in ${responseTime}ms (${res.status})`);
	} catch (err) {
		responseTime = Date.now() - start;
		const errorMessage = err.name === "TimeoutError" ? "Timeout" : err.message;

		const newStatus = "down";
		if (site.status !== newStatus) {
			site.lastStatusChangeAt = new Date();
		}
		site.status = newStatus;
		site.lastCheckedAt = new Date();

		await Heartbeat.create({
			site: siteId,
			status: 500,
			error: errorMessage,
			responseTime: responseTime,
		});

		await Site.findByIdAndUpdate(siteId, site, { new: true });

		logger.error(`❌ ${url} failed after ${responseTime}ms: ${errorMessage}`);
	}
};

/**
 * This is the main function executed by the cron job on every tick.
 */
const runHealthChecks = async () => {
	logger.info("CronJob: Tick started. Fetching sites...");

	const sites = await getAllMonitoredSites();

	if (!sites || sites.length === 0) {
		logger.info("CronJob: No monitored sites found to check.");
		return;
	}

	logger.info(`CronJob: Checking ${sites.length} sites in parallel...`);

	// This creates an array of promises, one for each site check.
	const checkPromises = sites.map((site) => checkWebsite(site));
	const results = await Promise.allSettled(checkPromises);

	const successes = results.filter((r) => r.status === "fulfilled").length;
	const failures = results.length - successes;
	logger.info(
		`CronJob: Tick finished. Successes: ${successes}, Failures: ${failures}`,
	);
};

/**
 * Main application entry point
 */
const main = async () => {
	await connectToMongo();

	logger.info("Running initial check on startup...");
	await runHealthChecks();

	const cronjob = CronJob.from({
		cronTime: "*/1 * * * *",
		onTick: runHealthChecks,
		start: true,
		timeZone: "Asia/Kuala_Lumpur",
	});

	logger.success(`Cron job scheduled. Will run every 1 minute.`);
	logger.info(
		`Next run at: ${cronjob.nextDate().toFormat("yyyy-MM-dd HH:mm:ss")}`,
	);
};

main().catch((error) => {
	logger.error(`An unhandled error occurred in main: ${JSON.stringify(error)}`);
	process.exit(1);
});
