import { paraglideVitePlugin } from '@inlang/paraglide-js';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { enhancedImages } from '@sveltejs/enhanced-img';

export default defineConfig({
	server: {
		allowedHosts: [
			"tonipc.kitty-celsius.ts.net"
		]
	},
	
	plugins: [
		tailwindcss(),
		sveltekit(),
		enhancedImages(),
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide'
		})
	]
});
