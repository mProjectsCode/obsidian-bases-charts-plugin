import { svelte } from '@sveltejs/vite-plugin-svelte';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { UserConfig, defineConfig } from 'vite';
import path from 'path';
import builtins from 'builtin-modules';

const entryFile = 'packages/obsidian/src/main.ts';

export default defineConfig(async ({ mode }) => {
	const { resolve } = path;
	const prod = mode === 'production';

	let plugins;
	if (prod) {
		plugins = [svelte()];
	} else {
		plugins = [
			svelte(),
			viteStaticCopy({
				targets: [
					{
						src: 'manifest.json',
						dest: `exampleVault/.obsidian/plugins/bases-charts/`,
					},
				],
			}),
		];
	}

	return {
		plugins: plugins,
		resolve: {
			alias: {
				packages: path.resolve(__dirname, './packages'),
			},
		},
		build: {
			lib: {
				entry: resolve(__dirname, entryFile),
				name: 'main',
				fileName: () => 'main.js',
				formats: ['cjs'],
			},
			minify: prod,
			sourcemap: prod ? false : 'inline',
			cssCodeSplit: false,
			emptyOutDir: false,
			outDir: '',
			rollupOptions: {
				input: {
					main: resolve(__dirname, entryFile),
				},
				output: {
					dir: prod ? '.' : `exampleVault/.obsidian/plugins/bases-charts/`,
					entryFileNames: 'main.js',
					assetFileNames: 'styles.css',
				},
				external: [
					'obsidian',
					'electron',
					'@codemirror/autocomplete',
					'@codemirror/collab',
					'@codemirror/commands',
					'@codemirror/language',
					'@codemirror/lint',
					'@codemirror/search',
					'@codemirror/state',
					'@codemirror/view',
					'@lezer/common',
					'@lezer/highlight',
					'@lezer/lr',
					...builtins,
				],
			},
		},
	} as UserConfig;
});
