import { Plugin } from 'obsidian';
import { CHART_VIEW_TYPE, ChartView } from 'packages/obsidian/src/ChartView';
import type { MyPluginSettings } from 'packages/obsidian/src/settings/Settings';
import { DEFAULT_SETTINGS } from 'packages/obsidian/src/settings/Settings';
import { SampleSettingTab } from 'packages/obsidian/src/settings/SettingTab';
import 'packages/obsidian/src/styles.css';

export default class MyPlugin extends Plugin {
	settings!: MyPluginSettings;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.addSettingTab(new SampleSettingTab(this.app, this));

		this.registerBasesView(CHART_VIEW_TYPE, {
			name: 'Chart',
			icon: 'lucide-map',
			factory: (controller, containerEl) => new ChartView(controller, containerEl),
			options: () => ChartView.getViewOptions(),
		});
	}

	onunload(): void {}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData()) as MyPluginSettings;
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
