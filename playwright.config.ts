import { defineConfig } from '@playwright/test';

const backendPort = 3101;

export default defineConfig({
	testDir: 'e2e',
	fullyParallel: false,
	workers: 4,
	retries: 1,
	use: {
		baseURL: 'http://localhost:4173'
	},
	webServer: [
		{
			command: `PORT=${backendPort} pnpm --dir backend build && PORT=${backendPort} pnpm --dir backend start`,
			port: backendPort,
			timeout: 120_000,
			reuseExistingServer: false
		},
		{
			command:
				`VITE_PUBLIC_BACKEND_URL=http://localhost:${backendPort} pnpm run build && VITE_PUBLIC_BACKEND_URL=http://localhost:${backendPort} pnpm run preview -- --port 4173`,
			port: 4173,
			timeout: 300_000,
			reuseExistingServer: false
		}
	]
});
