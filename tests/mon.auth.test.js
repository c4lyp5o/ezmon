import { beforeAll, describe, expect, test } from "bun:test";
import monModule from "../src/modules/mon";

// Write routes must fail closed before touching the database, so these run
// without MongoDB.
const call = (method, body) =>
	monModule.handle(
		new Request("http://localhost/api/v1/mon/", {
			method,
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		}),
	);

beforeAll(() => {
	process.env.API_KEY = "correct-horse";
});

describe("mon write routes", () => {
	test("create with a wrong key is 401", async () => {
		const res = await call("POST", { name: "x", url: "https://x.test", password: "nope" });
		expect(res.status).toBe(401);
		expect(await res.json()).toEqual({ success: false, message: "Unauthorized" });
	});

	test("a key of a different length is rejected", async () => {
		const res = await call("POST", { name: "x", url: "https://x.test", password: "correct-horse-battery" });
		expect(res.status).toBe(401);
	});

	test("update and delete are protected too", async () => {
		expect((await call("PATCH", { id: "507f1f77bcf86cd799439011", password: "nope" })).status).toBe(401);
		expect((await call("DELETE", { id: "507f1f77bcf86cd799439011", password: "nope" })).status).toBe(401);
	});

	test("no API_KEY configured means nobody gets in", async () => {
		const saved = process.env.API_KEY;
		delete process.env.API_KEY;
		try {
			const res = await call("POST", { name: "x", url: "https://x.test", password: "anything" });
			expect(res.status).toBe(401);
		} finally {
			process.env.API_KEY = saved;
		}
	});
});
