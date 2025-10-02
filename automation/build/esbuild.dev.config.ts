import esbuild from 'esbuild';
import copy from 'esbuild-plugin-copy-watch';
import manifest from '../../manifest.json' assert { type: 'json' };
import esbuildSvelte from 'esbuild-svelte';
import { sveltePreprocess } from 'svelte-preprocess';
import { getBuildBanner } from 'build/buildBanner';
import { wasmPlugin } from './wasmPlugin';

const banner = getBuildBanner('Dev Build', _ => 'Dev Build');

const context = await esbuild.context({
	banner: {
		js: banner,
	},
	entryPoints: ['packages/obsidian/src/main.ts'],
	bundle: true,
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
	],
	format: 'cjs',
	target: 'es2018',
	logLevel: 'info',
	sourcemap: 'inline',
	treeShaking: true,
	outdir: `exampleVault/.obsidian/plugins/${manifest.id}/`,
	outbase: 'packages/obsidian/src',
	conditions: ['browser', 'development'],
	plugins: [
		copy({
			paths: [
				{
					from: './styles.css',
					to: '',
				},
				{
					from: './manifest.json',
					to: '',
				},
			],
		}),
		wasmPlugin,
		esbuildSvelte({
			compilerOptions: { css: 'injected', dev: false },
			preprocess: sveltePreprocess(),
			filterWarnings: warning => {
				// we don't want warnings from node modules that we can do nothing about
				return !warning.filename?.includes('node_modules');
			},
		}),
	],
});

await context.watch();
