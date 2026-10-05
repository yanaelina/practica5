import {
	env,
	createExecutionContext,
	waitOnExecutionContext,
	SELF,
} from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import worker from "../src/index";

// For now, you'll need to do something like this to get a correctly-typed
// `Request` to pass to `worker.fetch()`.
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

const USERS = [
	{ id: 1, name: "Yana" },
	{ id: 2, name: "Elina" },
];

async function seedUsers(rows: typeof USERS) {
	await env.p6.exec("DROP TABLE IF EXISTS users");
	await env.p6.exec(
		"CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL)",
	);
	for (const row of rows) {
		await env.p6
			.prepare("INSERT INTO users (id, name) VALUES (?, ?)")
			.bind(row.id, row.name)
			.run();
	}
}

async function callWorker(url = "http://example.com") {
	const request = new IncomingRequest(url);
	// Create an empty context to pass to `worker.fetch()`.
	const ctx = createExecutionContext();
	const response = await worker.fetch(request, env, ctx);
	// Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
	await waitOnExecutionContext(ctx);
	return response;
}

describe("users worker", () => {
	beforeEach(async () => {
		await seedUsers(USERS);
	});

	it("returns all users as JSON (unit style)", async () => {
		const response = await callWorker();
		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toContain(
			"application/json",
		);
		expect(await response.json()).toEqual(USERS);
	});

	it("returns an empty array when there are no users", async () => {
		await seedUsers([]);
		const response = await callWorker();
		expect(await response.json()).toEqual([]);
	});

	it("returns the same data for any path", async () => {
		const response = await callWorker("http://example.com/anything");
		expect(await response.json()).toEqual(USERS);
	});

	it("rejects when the users table does not exist", async () => {
		await env.p6.exec("DROP TABLE IF EXISTS users");
		await expect(callWorker()).rejects.toThrow(/no such table/);
	});

	it("returns all users as JSON (integration style)", async () => {
		const response = await SELF.fetch("https://example.com");
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual(USERS);
	});
});
