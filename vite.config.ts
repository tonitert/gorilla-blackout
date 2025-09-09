import { paraglideVitePlugin } from '@inlang/paraglide-js';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { imagetools } from 'vite-imagetools'

export default defineConfig({
	server: {
		allowedHosts: [
			"tonipc.kitty-celsius.ts.net"
		]
	},
	
	plugins: [
		tailwindcss(),
		sveltekit(),
		imagetools({
			defaultDirectives: () => {
				return new URLSearchParams({
					format: 'webp',
				});
			}
		}),
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide'
		})
	]
});
