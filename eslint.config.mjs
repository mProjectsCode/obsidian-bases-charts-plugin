import { fileURLToPath } from 'node:url';
import { createCIConfig } from '@lemons_dev/eslint-config-obsidian';
import svelteConfig from './svelte.config.js';

export default createCIConfig({
	root: fileURLToPath(new URL('.', import.meta.url)),
	host: ['packages/obsidian/src/**'],
	workers: [],
	svelteConfig,
});
