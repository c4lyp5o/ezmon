import mongoose from "mongoose";

import Site from "./models/Site";
import Heartbeat from "./models/Heartbeat";
import logger from "./utils/logger";

import { checkSSL } from "./services/ssl";
import { recordCheck } from "./services/uptime";
import { alerts } from "./services/alerts";

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
 * Build the fetch request options for a site from its advanced config.
 */
const buildRequest = (site) => {
	const cfg = site.check || {};
	const headers = cfg.headers && typeof cfg.headers.toObject === "function" ? cfg.headers.toObject() : cfg.headers || {};

	const opts = {
		method: cfg.method || "GET",
		headers: { ...headers },
		signal: AbortSignal.timeout(cfg.timeoutMs || 5000),
	};
	if (cfg.body && (cfg.method === "POST" || cfg.method === "PUT" || cfg.method === "PATCH")) {
		opts.body = cfg.body;
		opts.headers["Content-Type"] = opts.headers["Content-Type"] || "application/json";
	}
	return opts;
};

const classify = (res, expectedStatus) => {
	if (res === null) return "down";
	if (expectedStatus != null && res.status !== expectedStatus) return "failing";
	if (res.ok) return "up";
	// non-ok but reachable → failing (e.g. a 404 page that still renders)
	return "failing";
};

/**
 * Checks a single website and records a Heartbeat + daily uptime rollup.
 * Returns the site's new status.
 */
const checkWebsite = async (site) => {
	const { _id: siteId, url } = site;
	const start = Date.now();
	let responseTime = 0;
	let httpStatus = null;
	let errorMessage = null;
	let reached = false;

	try {
		const res = await fetch(url, buildRequest(site));
		httpStatus = res.status;
		responseTime = Date.now() - start;
		reached = true;
		// Drain the body so keep-alive sockets aren't held up.
		await res.arrayBuffer().catch(() => {});
	} catch (err) {
		responseTime = Date.now() - start;
		errorMessage = err.name === "TimeoutError" ? "Timeout" : err.message;
	}

	const cfg = site.check || {};
	const expected = cfg.expectedStatus ?? 200;
	// Build a synthetic response-like object for classification on reachable fetch.
	const classified = reached
		? classify({ ok: httpStatus >= 200 && httpStatus < 400, status: httpStatus }, expected)
		: "down";

	// Transition tracking (before we persist).
	const from = site.status;
	const to = classified;
	const changed = from !== to;

	// Persist heartbeat (truthful HTTP status; 0 = didn't reach).
	await Heartbeat.create({
		site: siteId,
		status: httpStatus ?? 0,
		responseTime,
		error: errorMessage,
		siteStatus: to,
	});

	// Atomic site update — no full-doc read-modify-write.
	const patch = {
		$set: {
			status: to,
			lastCheckedAt: new Date(),
			responseTimeMs: responseTime,
		},
	};
	if (changed) patch.$set.lastStatusChangeAt = new Date();

	// Optional SSL cert check (only if enabled for the site).
	let sslStatus = null;
	if (cfg.ssl) {
		sslStatus = await checkSSL(site);
		if (sslStatus) patch.$set.sslStatus = sslStatus;
	}

	await Site.findByIdAndUpdate(siteId, patch, { new: true });

	// Daily uptime rollup.
	await recordCheck({ siteId, siteStatus: to, responseTimeMs: responseTime });

	// Alert on status change (or SSL crossing a threshold).
	if (changed) {
		logger.info(`${to === "up" ? "✅" : "❌"} ${url} → ${to} (${responseTime}ms)`);
		await alerts.notify({ site, from, to });
	} else if (sslStatus && sslStatus.warning !== (site.sslStatus || {}).warning) {
		const note = sslStatus.expired
			? "SSL certificate EXPIRED"
			: `SSL certificate expires in ${sslStatus.daysRemaining} days`;
		await alerts.notify({ site, from, to: site.status, ssl: note });
	}

	logger.info(`${to === "up" ? "✅" : "❌"} ${url} responded ${httpStatus ?? 0} in ${responseTime}ms (${to})`);
	return to;
};

/**
 * Schedules per-site checks. Each site with a due-time runs; we pace through
 * the set every tick so short intervals don't hammer all at once.
 */
const runHealthChecks = async () => {
	const sites = await Site.find({}, "name url status check interval alerts sslStatus responseTimeMs").lean();
	if (!sites.length) return;

	const now = Date.now();
	const due = [];
	for (const s of sites) {
		const intervalMs = (Number(s.interval) || 60) * 1000;
		const last = s.lastCheckedAt ? new Date(s.lastCheckedAt).getTime() : 0;
		if (now - last >= intervalMs) due.push(s);
	}

	if (!due.length) {
		logger.info("CronJob: No sites due yet.");
		return;
	}

	logger.info(`CronJob: Checking ${due.length} due site(s) out of ${sites.length}...`);

	// Bounded concurrency: no more than 8 in-flight checks at once.
	let cursor = 0;
	const workers = [...Array(Math.min(8, due.length)).keys()].map(async () => {
		while (cursor < due.length) {
			const site = due[cursor];
			cursor += 1;
			try {
				await checkWebsite(site);
			} catch (err) {
				logger.error(`CronJob: site ${site.name} failed: ${err.message}`);
			}
		}
	});
	await Promise.all(workers);
};

/** Timer that advances the scheduler loop every second. */
const startScheduler = async () => {
	await connectToMongo();
	logger.info("Running initial pass on startup...");
	await runHealthChecks();

	// Tick once every second; runHealthChecks short-circuits cheaply when
	// nothing is due, so this is near-free between poll windows.
	setInterval(async () => {
		try {
			await runHealthChecks();
		} catch (err) {
			logger.error(`Scheduler tick error: ${err.message}`);
		}
	}, 1000);
};

const main = async () => {
	await startScheduler();
	logger.success("Scheduler started. Checking per-site intervals.");
};

main().catch((error) => {
	logger.error(`An unhandled error occurred in main: ${JSON.stringify(error)}`);
	process.exit(1);
});