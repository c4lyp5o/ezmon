import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import mongoose from "mongoose";
import Site from "../src/models/Site";
import monModule from "../src/modules/mon";
import { recordCheck, uptimeFor } from "../src/services/uptime";

// Needs a throwaway MongoDB: MONGO_TEST_URI=mongodb://127.0.0.1:27017/ezmon_test
// (CI starts one as a service). Skipped when unset so `bun test` still runs
// the unit tests on a laptop without Mongo.
const URI = process.env.MONGO_TEST_URI;
const suite = URI ? describe : describe.skip;

suite("mongo integration", () => {
	beforeAll(async () => {
		process.env.API_KEY = "correct-horse";
		await mongoose.connect(URI);
		await mongoose.connection.db.dropDatabase();
		await Site.init(); // build the unique url index before the duplicate test
	});

	afterAll(async () => {
		await mongoose.connection.db?.dropDatabase();
		await mongoose.disconnect();
	});

	const api = (method, path, body) =>
		monModule.handle(
			new Request(`http://localhost/api/v1/mon${path}`, {
				method,
				headers: { "Content-Type": "application/json" },
				body: body ? JSON.stringify(body) : undefined,
			}),
		);

	test("the Site schema validates and applies defaults", async () => {
		const bad = await new Site({ name: "", url: "" }).validate().catch((e) => e);
		expect(Object.keys(bad.errors).sort()).toEqual(["name", "url"]);
		const ok = new Site({ name: "a", url: "https://a.test" });
		await ok.validate();
		expect(ok.status).toBe("failing");
		expect(ok.interval).toBe(60);
	});

	test("create, list, duplicate and delete through the API", async () => {
		const created = await api("POST", "/", { name: "Example", url: "https://example.test", password: "correct-horse" });
		expect(created.status).toBe(200);
		const { site: id } = await created.json();

		const list = await (await api("GET", "/")).json();
		expect(JSON.stringify(list)).toContain("https://example.test");

		const dup = await api("POST", "/", { name: "Again", url: "https://example.test", password: "correct-horse" });
		expect(dup.status).toBe(409);

		const del = await api("DELETE", "/", { id, password: "correct-horse" });
		expect(del.status).toBe(200);
		expect(await Site.countDocuments()).toBe(0);
	});

	test("recordCheck rolls up into uptimeFor", async () => {
		const site = await Site.create({ name: "Rollup", url: "https://rollup.test" });
		for (const [status, ms] of [["up", 100], ["up", 200], ["up", 300], ["down", 0]]) {
			expect(await recordCheck({ siteId: site._id, siteStatus: status, responseTimeMs: ms })).toBe(true);
		}
		const u = await uptimeFor(site._id.toString(), { days: 7 });
		expect(u).toMatchObject({ days: 7, totalChecks: 4, upChecks: 3, downChecks: 1, uptime: 75, avgResponseTimeMs: 150 });

		const empty = await uptimeFor(new mongoose.Types.ObjectId().toString());
		expect(empty).toMatchObject({ totalChecks: 0, uptime: null, avgResponseTimeMs: null });
	});
});
