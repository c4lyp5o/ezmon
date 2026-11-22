import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, describe, expect, test, vi } from "vitest";
import App from "./App.jsx";

const site = (name, status, uptime, extra = {}) => ({
	_id: name,
	name,
	url: `https://${name.toLowerCase()}.test`,
	status,
	heartbeats: [],
	uptime: { uptime, avgResponseTimeMs: 100 },
	...extra,
});

const SITES = [site("Alpha", "up", 100), site("Bravo", "down", 80), site("Charlie", "failing", 95)];

function mockFetch(impl) {
	globalThis.fetch = vi.fn(impl);
}

const renderApp = () =>
	render(
		<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
			<App />
		</SWRConfig>,
	);

afterEach(() => vi.restoreAllMocks());

describe("ezmon dashboard", () => {
	test("loading keeps the ez shell (brand, title, theme toggle) on screen", () => {
		mockFetch(() => new Promise(() => {}));
		renderApp();
		expect(screen.getByText("ezmon")).toBeTruthy();
		expect(screen.getByRole("heading", { name: "Monitors" })).toBeTruthy();
		expect(screen.getByText("Loading monitors…")).toBeTruthy();
	});

	test("a failed request shows the error inside the shell", async () => {
		mockFetch(async () => new Response("boom", { status: 500 }));
		renderApp();
		expect(await screen.findByText("Could not load the monitors")).toBeTruthy();
		expect(screen.getByText("Server responded 500")).toBeTruthy();
		expect(screen.getByText("ezmon")).toBeTruthy();
	});

	test("renders every monitor and filters by status", async () => {
		mockFetch(async () => Response.json({ success: true, sites: SITES }));
		renderApp();
		for (const name of ["Alpha", "Bravo", "Charlie"]) expect(await screen.findByText(name)).toBeTruthy();

		const filter = screen.getByRole("group", { name: "Filter by status" });
		await act(async () => fireEvent.click(within(filter).getByText("Down")));
		await waitFor(() => expect(screen.queryByText("Alpha")).toBeNull());
		expect(screen.queryByText("Charlie")).toBeNull();
		expect(screen.getByText("Bravo")).toBeTruthy();
	});

	test("search filters by name or URL, and an empty result says so", async () => {
		mockFetch(async () => Response.json({ success: true, sites: SITES }));
		renderApp();
		await screen.findByText("Alpha");
		const search = screen.getByRole("textbox", { name: "Search monitors" });

		await act(async () => fireEvent.change(search, { target: { value: "bravo.test" } }));
		await waitFor(() => expect(screen.queryByText("Alpha")).toBeNull());
		expect(screen.getByText("Bravo")).toBeTruthy();

		await act(async () => fireEvent.change(search, { target: { value: "nothing-matches" } }));
		expect(await screen.findByText("No monitors match these filters.")).toBeTruthy();
	});

	test("an empty install invites adding a site", async () => {
		mockFetch(async () => Response.json({ success: true, sites: [] }));
		renderApp();
		expect(await screen.findByText("No monitors yet.")).toBeTruthy();
	});
});
