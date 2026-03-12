import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: 'e2e',
	workers: 4,
	retries: 1,
	use: {
		baseURL: 'http://localhost:4173'
	},
	webServer: [
		{
			command:
				'pnpm --dir backend install --frozen-lockfile && pnpm --dir backend build && pnpm --dir backend start',
			port: 3001,
			timeout: 120_000,
			reuseExistingServer: !process.env.CI
		},
		{
			command: 'pnpm run build && pnpm run preview -- --port 4173',
			port: 4173,
			timeout: 180_000,
			reuseExistingServer: !process.env.CI
		}
	]
});
