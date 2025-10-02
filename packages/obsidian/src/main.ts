import { Plugin } from 'obsidian';
import type { MyPluginSettings } from 'packages/obsidian/src/settings/Settings';
import { DEFAULT_SETTINGS } from 'packages/obsidian/src/settings/Settings';
import { SampleSettingTab } from 'packages/obsidian/src/settings/SettingTab';

export default class MyPlugin extends Plugin {
	settings!: MyPluginSettings;

	// eslint-disable-next-line @typescript-eslint/no-misused-promises
	async onload(): Promise<void> {
		await this.loadSettings();

		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	onunload(): void {}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData()) as MyPluginSettings;
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
