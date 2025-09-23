import { defineConfig } from 'tsup';

export default defineConfig((opts) => ({
	entry: {
		background: 'src/features/background/service-worker.ts',
		content: 'src/content/content-script.ts',
		popup: 'src/features/popup/popup.ts',
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

		// Asset validation: manifest.json depends on assets/icon.png at build time
		const assetsDir = 'assets';
		const requiredIcon = path.join(assetsDir, 'icon.png');

		if (!fs.existsSync(requiredIcon)) {
			console.error(
				`❌ Build failed: Required icon file '${requiredIcon}' is missing.`
			);
			console.error(
				`   The manifest.json references this file and the extension will not load without it.`
			);
			process.exit(1);
		}

		// Ensure dist directory exists
		fs.mkdirSync('dist', { recursive: true });

		// Copy static files
		const files = [
			['public/manifest.json', 'dist/manifest.json'],
			['src/content/styles.css', 'dist/styles.css'],
			['src/styles/tokens.core.css', 'dist/tokens.core.css'],
			['src/styles/tokens.content.css', 'dist/tokens.content.css'],
			['src/features/popup/popup.html', 'dist/popup.html'],
			['src/styles/tokens.popup.css', 'dist/tokens.popup.css'],
			['src/features/popup/popup.css', 'dist/popup.css'],
		];

		files.forEach(([src, dest]) => {
			if (fs.existsSync(src)) {
				fs.copyFileSync(src, dest);
			}
		});

		// Copy assets directory recursively (if present)
		const srcAssets = assetsDir;
		if (fs.existsSync(srcAssets)) {
			const destAssets = path.join('dist', 'assets');
			fs.mkdirSync(destAssets, { recursive: true });

			const copyDir = (src: string, dest: string) => {
				for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
					const s = path.join(src, entry.name);
					const d = path.join(dest, entry.name);
					if (entry.isDirectory()) {
						fs.mkdirSync(d, { recursive: true });
						copyDir(s, d);
					} else {
						fs.copyFileSync(s, d);
					}
				}
			};
			copyDir(srcAssets, destAssets);
		} else {
			console.warn(
				`⚠️  Warning: '${srcAssets}' folder not found. Static assets will not be copied.`
			);
		}
	},
}));
