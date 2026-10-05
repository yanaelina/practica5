import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [
		cloudflareTest({
			wrangler: { configPath: "./wrangler.jsonc" },
		}),
	],
	test: {
		coverage: {
			// Workers runtime does not support V8 coverage; Istanbul is required
			provider: "istanbul",
			include: ["src/**/*.ts"],
			reporter: ["text", "html", "lcov", "json-summary"],
			reportsDirectory: "./coverage",
		},
	},
});
