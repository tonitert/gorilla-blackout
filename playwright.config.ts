import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: 'e2e',
	fullyParallel: true,
	workers: 4,
	retries: 1,
	use: {
		baseURL: 'http://localhost:4173'
	},
	webServer: [
		{
			command: 'pnpm --dir backend build && pnpm --dir backend start',
			port: 3001,
			timeout: 120_000,
			reuseExistingServer: false
		},
		{
			command:
				'VITE_PUBLIC_BACKEND_URL=http://localhost:3001 pnpm run build && VITE_PUBLIC_BACKEND_URL=http://localhost:3001 pnpm run preview -- --port 4173',
			port: 4173,
			timeout: 300_000,
			reuseExistingServer: false
		}
	]
});
