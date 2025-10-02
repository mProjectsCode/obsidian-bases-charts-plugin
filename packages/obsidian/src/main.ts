import { Plugin } from 'obsidian';
import { BAR_CHART_VIEW_TYPE, ChartView, LINE_CHART_VIEW_TYPE, SCATTER_CHART_VIEW_TYPE } from 'packages/obsidian/src/ChartView';
import type { MyPluginSettings } from 'packages/obsidian/src/settings/Settings';
import { DEFAULT_SETTINGS } from 'packages/obsidian/src/settings/Settings';
import { SampleSettingTab } from 'packages/obsidian/src/settings/SettingTab';
import 'packages/obsidian/src/styles.css';

export default class MyPlugin extends Plugin {
	settings!: MyPluginSettings;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.addSettingTab(new SampleSettingTab(this.app, this));

		this.registerBasesView(SCATTER_CHART_VIEW_TYPE, {
			name: 'Scatter Chart',
			icon: 'lucide-chart-scatter',
			factory: (controller, containerEl) => new ChartView(SCATTER_CHART_VIEW_TYPE, controller, containerEl),
			options: () => ChartView.getViewOptions(SCATTER_CHART_VIEW_TYPE),
		});

		this.registerBasesView(LINE_CHART_VIEW_TYPE, {
			name: 'Line Chart',
			icon: 'lucide-chart-line',
			factory: (controller, containerEl) => new ChartView(LINE_CHART_VIEW_TYPE, controller, containerEl),
			options: () => ChartView.getViewOptions(LINE_CHART_VIEW_TYPE),
		});

		this.registerBasesView(BAR_CHART_VIEW_TYPE, {
			name: 'Bar Chart',
			icon: 'lucide-chart-column',
			factory: (controller, containerEl) => new ChartView(BAR_CHART_VIEW_TYPE, controller, containerEl),
			options: () => ChartView.getViewOptions(BAR_CHART_VIEW_TYPE),
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
