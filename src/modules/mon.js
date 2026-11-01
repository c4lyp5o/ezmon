import { Elysia, t } from "elysia";
import { timingSafeEqual } from "node:crypto";

import Site from "../models/Site";
import Heartbeat from "../models/Heartbeat";
import logger from "../utils/logger";

import { uptimeFor } from "../services/uptime";

const validApiKey = (candidate) => {
	const expected = process.env.API_KEY;
	if (!expected || typeof candidate !== "string" || !candidate) return false;
	const a = Buffer.from(candidate);
	const b = Buffer.from(expected);
	if (a.length !== b.length) return false;
	return timingSafeEqual(a, b);
};

// Fail-closed: return { ok: false, message } or { ok: true }.
const authorize = (body) => {
	if (!validApiKey(body?.password))
		return { ok: false, message: "Unauthorized", status: 401 };
	return { ok: true };
};

const siteProjection = {
	name: 1,
	url: 1,
	hideUrl: 1,
	status: 1,
	lastCheckedAt: 1,
	lastStatusChangeAt: 1,
	interval: 1,
	check: 1,
	alerts: 1,
	sslStatus: 1,
	responseTimeMs: 1,
	createdAt: 1,
	updatedAt: 1,
};

const checkSchema = t.Object({
	method: t.Optional(
		t.Union([
			t.Literal("GET"),
			t.Literal("POST"),
			t.Literal("HEAD"),
			t.Literal("PUT"),
			t.Literal("PATCH"),
			t.Literal("DELETE"),
		]),
	),
	headers: t.Optional(t.Record(t.String(), t.String())),
	expectedStatus: t.Optional(t.Number({ minimum: 100, maximum: 599 })),
	timeoutMs: t.Optional(t.Number({ minimum: 1000, maximum: 60000 })),
	body: t.Optional(t.String()),
	ssl: t.Optional(t.Boolean()),
	sslDaysBeforeExpiry: t.Optional(t.Number({ minimum: 3, maximum: 365 })),
});

const alertsSchema = t.Object({
	disabled: t.Optional(t.Boolean()),
	onlyOnStatusChange: t.Optional(t.Boolean()),
	notifyOnRecovery: t.Optional(t.Boolean()),
	telegram: t.Optional(t.Boolean()),
	discord: t.Optional(t.Boolean()),
	slack: t.Optional(t.Boolean()),
	email: t.Optional(t.Boolean()),
});

const monModule = new Elysia({ prefix: "/api/v1/mon" })
	// Public read-only dashboard list (no auth — it's a status page).
	.get("/", async () => {
		const sites = await Site.find({}, siteProjection)
			.populate({
				path: "heartbeats",
				options: { sort: { timestamp: -1 }, limit: 10 },
			})
			.lean();
		const withUptime = await Promise.all(
			sites.map(async (site) => ({
				...site,
				uptime: await uptimeFor(site._id, { days: 7 }),
			})),
		);
		return { success: true, sites: withUptime };
	})
	// Per-site latency series.
	.get("/:id/heartbeats", async ({ params, query }) => {
		const limit = Math.min(Number(query.limit) || 120, 500);
		const beats = await Heartbeat.find({ site: params.id })
			.sort({ timestamp: -1 })
			.limit(limit)
			.lean();
		return { success: true, heartbeats: beats.reverse() };
	})
	// Per-site uptime stats.
	.get("/:id/uptime", async ({ params, query }) => {
		const days = Math.min(Number(query.days) || 7, 90);
		return { success: true, ...(await uptimeFor(params.id, { days })) };
	})
	// Protected create.
	.post(
		"/",
		async ({ body, status }) => {
			const auth = authorize(body);
			if (!auth.ok) return status(auth.status, { success: false, message: auth.message });
			try {
				const site = await Site.create({
					name: body.name,
					url: body.url,
					hideUrl: body.hideUrl ?? false,
					interval: body.interval ?? 60,
					check: body.check ?? undefined,
					alerts: body.alerts ?? undefined,
				});
				return { success: true, message: "Site added successfully", site: site._id };
			} catch (err) {
				if (err?.code === 11000)
					return status(409, { success: false, message: "Site already exists" });
				logger.error(`[mon] create failed: ${err.message}`);
				return status(500, { success: false, message: "Internal server error" });
			}
		},
		{
			body: t.Object({
				name: t.String({ minLength: 1 }),
				url: t.String({ minLength: 1 }),
				password: t.String({ minLength: 1 }),
				hideUrl: t.Optional(t.Boolean()),
				interval: t.Optional(t.Number({ minimum: 15, maximum: 3600 })),
				check: t.Optional(checkSchema),
				alerts: t.Optional(alertsSchema),
			}),
		},
	)
	// Protected update (interval / check / alerts / name).
	.patch(
		"/",
		async ({ body, status }) => {
			const auth = authorize(body);
			if (!auth.ok) return status(auth.status, { success: false, message: auth.message });
			const { id, ...rest } = body;
			if (!id || !rest.password) return status(400, { success: false, message: "id required" });
			delete rest.password;
			delete rest.id;
			try {
				const updated = await Site.findByIdAndUpdate(id, { $set: rest }, { new: true });
				if (!updated) return status(404, { success: false, message: "Site not found" });
				return { success: true, message: "Site updated successfully" };
			} catch (err) {
				return status(500, { success: false, message: "Internal server error" });
			}
		},
		{
			body: t.Object({
				id: t.String(),
				password: t.String(),
				name: t.Optional(t.String({ minLength: 1 })),
				interval: t.Optional(t.Number({ minimum: 15, maximum: 3600 })),
				check: t.Optional(checkSchema),
				alerts: t.Optional(alertsSchema),
			}),
		},
	)
	// Protected delete.
	.delete(
		"/",
		async ({ body, status }) => {
			const auth = authorize(body);
			if (!auth.ok) return status(auth.status, { success: false, message: auth.message });
			try {
				const deleted = await Site.findByIdAndDelete(body.id);
				if (!deleted) return status(404, { success: false, message: "Site not found" });
				await Heartbeat.deleteMany({ site: deleted._id });
				return { success: true, message: "Site deleted successfully" };
			} catch (err) {
				logger.error(`[mon] delete failed: ${err.message}`);
				return status(500, { success: false, message: "Internal server error" });
			}
		},
		{
			body: t.Object({ id: t.String(), password: t.String() }),
		},
	);

export default monModule;