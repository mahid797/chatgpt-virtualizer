import { defineConfig } from 'tsup';

export default defineConfig((opts) => ({
	entry: {
		background: 'src/background/service_worker.ts',
		content: 'src/content/content.ts',
		popup: 'src/ui/popup.ts',
	},
	format: ['esm'],
	splitting: false,
	sourcemap: opts.watch ? true : false,
	clean: true,
	outDir: 'dist',
	dts: false,
	minify: !opts.watch,
	// Copy static files during build
	publicDir: false, // Disable default public dir
	async onSuccess() {
		const fs = await import('fs');
		const path = await import('path');

		// Ensure dist directory exists
		fs.mkdirSync('dist', { recursive: true });

		// Copy static files
		const files = [
			['public/manifest.json', 'dist/manifest.json'],
			['src/ui/popup.html', 'dist/popup.html'],
			['src/ui/popup.css', 'dist/popup.css'],
			['src/content/styles.css', 'dist/styles.css'],
		];

		files.forEach(([src, dest]) => {
			if (fs.existsSync(src)) {
				fs.copyFileSync(src, dest);
			}
		});
	},
}));
