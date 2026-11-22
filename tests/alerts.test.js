import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { alerts } from "../src/services/alerts";

const site = (alertsCfg = {}) => ({
	name: "Example",
	url: "https://example.com",
	responseTimeMs: 120,
	alerts: alertsCfg,
});

let calls;
const realFetch = globalThis.fetch;

beforeEach(() => {
	calls = [];
	globalThis.fetch = mock(async (url, init) => {
		calls.push({ url, body: JSON.parse(init.body) });
		return new Response("ok", { status: 200 });
	});
	process.env.DISCORD_WEBHOOK_URL = "https://discord.test/hook";
	process.env.SLACK_WEBHOOK_URL = "https://slack.test/hook";
	process.env.TELEGRAM_BOT_API = "https://telegram.test/send";
	process.env.TELEGRAM_CHAT_ID = "42";
	process.env.SMTP_ALERT_WEBHOOK_URL = "https://mail.test/hook";
});

afterEach(() => {
	globalThis.fetch = realFetch;
});

describe("alerts.notify", () => {
	test("sends one payload per enabled provider with the status change", async () => {
		await alerts.notify({ site: site({ discord: true, slack: true }), from: "up", to: "down" });
		expect(calls.map((c) => c.url)).toEqual(["https://discord.test/hook", "https://slack.test/hook"]);
		expect(calls[0].body.content).toContain("*Example* — 🔴 DOWN");
		expect(calls[0].body.content).toContain("Status changed from up to down.");
		expect(calls[1].body.text).toContain("Response: 120ms");
	});

	test("telegram needs a chat id; email gets a subject", async () => {
		await alerts.notify({ site: site({ telegram: true, email: true }), from: "down", to: "failing", ssl: "expires in 5 days" });
		const [tg, mail] = calls;
		expect(tg.body).toMatchObject({ chat_id: "42", parse_mode: "Markdown" });
		expect(tg.body.text).toContain("SSL: expires in 5 days");
		expect(mail.body.subject).toBe("[ezmon] Example failing");

		calls = [];
		delete process.env.TELEGRAM_CHAT_ID;
		await alerts.notify({ site: site({ telegram: true }), from: "up", to: "down" });
		expect(calls).toHaveLength(0);
	});

	test("disabled alerts and opted-out recoveries send nothing", async () => {
		await alerts.notify({ site: site({ disabled: true, discord: true }), from: "up", to: "down" });
		await alerts.notify({ site: site({ notifyOnRecovery: false, discord: true }), from: "down", to: "up" });
		expect(calls).toHaveLength(0);
	});

	test("a failing provider does not throw or stop the others", async () => {
		globalThis.fetch = mock(async (url, init) => {
			if (url.includes("discord")) throw new Error("network down");
			calls.push({ url, body: JSON.parse(init.body) });
			return new Response("ok");
		});
		await alerts.notify({ site: site({ discord: true, slack: true }), from: "up", to: "down" });
		expect(calls.map((c) => c.url)).toEqual(["https://slack.test/hook"]);
	});
});
