import type { BasesEntry, QueryController, Value } from 'obsidian';
import type { BasesPropertyId, ViewOption } from 'obsidian';
import { BasesView, DateValue, Events, NumberValue, StringValue } from 'obsidian';
import BarPlot from 'packages/obsidian/src/charts/BarPlot.svelte';
import LinePlot from 'packages/obsidian/src/charts/LinePlot.svelte';
import ScatterPlot from 'packages/obsidian/src/charts/ScatterPlot.svelte';
import { OBSIDIAN_COLOR_PALETTE, OBSIDIAN_DEFAULT_SINGLE_COLOR } from 'packages/obsidian/src/utils/utils';
import { mount, unmount } from 'svelte';

export const SCATTER_CHART_VIEW_TYPE = 'chart-scatter';
export const LINE_CHART_VIEW_TYPE = 'chart-line';
export const BAR_CHART_VIEW_TYPE = 'chart-bar';

export type ChartViewType = typeof SCATTER_CHART_VIEW_TYPE | typeof LINE_CHART_VIEW_TYPE | typeof BAR_CHART_VIEW_TYPE;

export const CHART_SETTINGS = {
	X: 'x',
	SHOW_PERCENTAGES: 'show-percentages',
	SHOW_LABELS: 'show-labels',
	MULTI_CHART: 'multi-chart-mode',
} as const;

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ProcessedData = {
	x: number | Date | string;
	y: number;
	/**
	 * This is always the value by which we color the data point.
	 * In group separated mode, this is the display name of the property.
	 * In property separated mode, this is the group by value.
	 */
	groupIndex: number;
	/**
	 * This is always the chart to sort the data point into.
	 * In group separated mode, this is the group by value.
	 * In property separated mode, this is the property id.
	 */
	chartIndex: number;
	file: string;
};

export interface ProcessedGroupEntry {
	key: string;
	entries: ProcessedData[];
}

export type ProcessedGroupedData =
	| {
			grouped: true;
			groups: ProcessedGroupEntry[];
	  }
	| {
			grouped: false;
			entries: ProcessedData[];
	  };

export enum MultiChartMode {
	GROUP = 'Separate by group',
	PROPERTY = 'Separate by property',
}

function sortDataByGroup(data: ProcessedData[]): ProcessedData[] {
	return data.sort((a, b) => {
		if (a.groupIndex != null && b.groupIndex != null) {
			return a.groupIndex - b.groupIndex;
		}
		return 0;
	});
}

export abstract class AbstractDataWrapper<ChartId, GroupId> {
	readonly view: ChartView;
	readonly data: ProcessedData[];
	readonly groupBySet: string[];

	constructor(view: ChartView, data: ProcessedData[], groupBySet: string[]) {
		this.view = view;
		this.data = data;
		this.groupBySet = groupBySet;
	}

	abstract getChartIdentifiers(): ChartId[];
	abstract getGroupIdentifiers(): GroupId[];

	abstract getChartName(chartIndex: number): string;
	abstract getGroupName(groupIndex: number): string;

	getChartGroupIdentifier(): (d: ProcessedData) => string {
		if (this.hasMultipleGroups()) {
			return d => this.getColorFromGroupIndex(d.groupIndex);
		}

		return OBSIDIAN_DEFAULT_SINGLE_COLOR;
	}

	getColorFromGroupIndex(groupIndex: number): string {
		return OBSIDIAN_COLOR_PALETTE[groupIndex % OBSIDIAN_COLOR_PALETTE.length];
	}

	hasMultipleGroups(): boolean {
		return this.getGroupIdentifiers().length > 1;
	}

	hasMultipleCharts(): boolean {
		return this.getChartIdentifiers().length > 1;
	}

	getFlat(chartIndex: number, sorted: boolean = false): ProcessedData[] {
		const data = this.data.filter(d => d.chartIndex === chartIndex);

		if (sorted) {
			return sortDataByGroup(data);
		}

		return data;
	}

	getStacked(chartIndex: number): ProcessedData[] {
		const xMap = new Map<number | Date | string, number>();
		const stackedData: ProcessedData[] = [];

		for (const entry of this.data) {
			if (entry.chartIndex !== chartIndex) {
				continue;
			}

			const prevY = xMap.get(entry.x) ?? 0;
			const newY = prevY + entry.y;

			stackedData.push({
				...entry,
				y: newY,
			});

			xMap.set(entry.x, newY);
		}

		return stackedData;
	}
}

export class GroupSeparatedData extends AbstractDataWrapper<string, BasesPropertyId> {
	getChartIdentifiers(): string[] {
		return this.groupBySet;
	}

	getGroupIdentifiers(): BasesPropertyId[] {
		return this.view.data.properties;
	}

	getChartName(chartIndex: number): string {
		return this.getChartIdentifiers()[chartIndex] ?? `Chart ${chartIndex + 1}`;
	}

	getGroupName(groupIndex: number): string {
		const groupId = this.getGroupIdentifiers()[groupIndex];
		return this.view.config.getDisplayName(groupId) ?? `Group ${groupIndex + 1}`;
	}
}

export class PropertySeparatedData extends AbstractDataWrapper<BasesPropertyId, string> {
	getChartIdentifiers(): BasesPropertyId[] {
		return this.view.data.properties;
	}

	getGroupIdentifiers(): string[] {
		return this.groupBySet;
	}

	getChartName(chartIndex: number): string {
		const chartId = this.getChartIdentifiers()[chartIndex];
		return this.view.config.getDisplayName(chartId) ?? `Chart ${chartIndex + 1}`;
	}

	getGroupName(groupIndex: number): string {
		return this.getGroupIdentifiers()[groupIndex] ?? `Group ${groupIndex + 1}`;
	}
}

export type DataWrapper = GroupSeparatedData | PropertySeparatedData;

export function emptyDataWrapper(view: ChartView): DataWrapper {
	return new GroupSeparatedData(view, [], []);
}

export function parseValueAsNumber(value: Value | null): number | null {
	if (!value) {
		return null;
	}

	if (value instanceof NumberValue) {
		return value.data;
	}
	if (value instanceof StringValue) {
		const parsed = parseFloat(value.data);
		return isNaN(parsed) ? null : parsed;
	}
	return null;
}

export function parseValueAsX(value: Value | null): number | Date | string | null {
	if (!value) {
		return null;
	}

	if (value instanceof NumberValue) {
		return value.data;
	}
	if (value instanceof StringValue) {
		const parsed = parseFloat(value.data);
		return isNaN(parsed) ? value.data : parsed;
	}
	if (value instanceof DateValue) {
		return new Date(value.toString());
	}
	return null;
}

export class ChartView extends BasesView {
	readonly type: ChartViewType;
	readonly scrollEl: HTMLElement;
	readonly events: Events;
	svelteComponent: ReturnType<typeof ScatterPlot> | null = null;

	constructor(type: ChartViewType, controller: QueryController, scrollEl: HTMLElement) {
		super(controller);
		this.type = type;
		this.scrollEl = scrollEl;
		this.events = new Events();
	}

	onload(): void {
		if (this.type === SCATTER_CHART_VIEW_TYPE) {
			this.svelteComponent = mount(ScatterPlot, {
				target: this.scrollEl,
				props: {
					view: this,
				},
			});
		} else if (this.type === LINE_CHART_VIEW_TYPE) {
			this.svelteComponent = mount(LinePlot, {
				target: this.scrollEl,
				props: {
					view: this,
				},
			});
		} else if (this.type === BAR_CHART_VIEW_TYPE) {
			this.svelteComponent = mount(BarPlot, {
				target: this.scrollEl,
				props: {
					view: this,
				},
			});
		}
	}

	onunload(): void {
		if (this.svelteComponent) {
			void unmount(this.svelteComponent);
		}
	}

	onDataUpdated(): void {
		this.events.trigger('data-updated');
	}

	processData(): DataWrapper {
		const xField = this.config.getAsPropertyId(CHART_SETTINGS.X);
		const mode = this.config.get(CHART_SETTINGS.MULTI_CHART) ?? MultiChartMode.PROPERTY;

		if (mode !== MultiChartMode.GROUP && mode !== MultiChartMode.PROPERTY) {
			// eslint-disable-next-line @typescript-eslint/no-base-to-string
			console.warn(`Invalid multi chart mode: ${mode}`);
			return emptyDataWrapper(this);
		}

		if (!xField) {
			return emptyDataWrapper(this);
		}

		const data: ProcessedData[] = [];
		const groupBySet = this.data.groupedData.map(g => g.key?.toString()).filter(v => v != null);
		groupBySet.sort();

		for (const group of this.data?.groupedData ?? []) {
			const groupKey = group.key?.toString();
			let groupIndex: number;
			if (groupKey == null) {
				groupIndex = 0;
			} else {
				groupIndex = groupBySet.indexOf(groupKey);
			}

			for (const entry of group.entries) {
				const processedEntry = this.processEntry(entry, xField, groupIndex, mode);
				data.push(...processedEntry);
			}
		}

		if (mode === MultiChartMode.GROUP) {
			return new GroupSeparatedData(this, data, groupBySet);
		} else {
			return new PropertySeparatedData(this, data, groupBySet);
		}
	}

	isGrouped(): boolean {
		return !(this.data.groupedData?.length === 1 && this.data.groupedData[0].key == null);
	}

	processEntry(entry: BasesEntry, xField: BasesPropertyId, groupIndex: number, mode: MultiChartMode): ProcessedData[] {
		try {
			const x = entry.getValue(xField);
			const xValue = parseValueAsX(x);

			if (xValue === null) {
				return [];
			}

			const result: ProcessedData[] = [];
			for (let i = 0; i < this.data.properties.length; i++) {
				const prop = this.data.properties[i];
				const yValue = parseValueAsNumber(entry.getValue(prop));

				if (xValue !== null && yValue !== null) {
					result.push({
						x: xValue,
						y: yValue,
						groupIndex: mode === MultiChartMode.GROUP ? i : groupIndex,
						chartIndex: mode === MultiChartMode.GROUP ? groupIndex : i,
						file: entry.file.path,
					});
				}
			}

			return result;
		} catch (e) {
			console.warn('Error processing entry', entry, e);
		}

		return [];
	}

	async openFile(filePath: string, newTab: boolean): Promise<void> {
		const tFile = this.app.vault.getFileByPath(filePath);
		if (!tFile) {
			return;
		}

		const activeLeaf = this.app.workspace.getLeaf(newTab ? 'tab' : false);
		if (activeLeaf) {
			await activeLeaf.openFile(tFile, {
				state: { mode: 'source' },
			});
		}
	}

	static getViewOptions(type: ChartViewType): ViewOption[] {
		if (type === SCATTER_CHART_VIEW_TYPE) {
			return ChartView.scatterViewOptions();
		} else if (type === LINE_CHART_VIEW_TYPE) {
			return ChartView.lineViewOptions();
		} else if (type === BAR_CHART_VIEW_TYPE) {
			return ChartView.barViewOptions();
		} else {
			return [];
		}
	}

	static scatterViewOptions(): ViewOption[] {
		return [
			{
				displayName: 'Multi chart mode',
				type: 'dropdown',
				key: CHART_SETTINGS.MULTI_CHART,
				options: {
					[MultiChartMode.GROUP]: MultiChartMode.GROUP,
					[MultiChartMode.PROPERTY]: MultiChartMode.PROPERTY,
				},
				default: MultiChartMode.PROPERTY,
			},
			{
				displayName: 'X Axis',
				type: 'property',
				key: CHART_SETTINGS.X,
				filter: prop => !prop.startsWith('file.'),
				placeholder: 'Property',
			},
		];
	}

	static lineViewOptions(): ViewOption[] {
		return [
			{
				displayName: 'Multi chart mode',
				type: 'dropdown',
				key: CHART_SETTINGS.MULTI_CHART,
				options: {
					[MultiChartMode.GROUP]: MultiChartMode.GROUP,
					[MultiChartMode.PROPERTY]: MultiChartMode.PROPERTY,
				},
				default: MultiChartMode.PROPERTY,
			},
			{
				displayName: 'X Axis',
				type: 'property',
				key: CHART_SETTINGS.X,
				filter: prop => !prop.startsWith('file.'),
				placeholder: 'Property',
			},
		];
	}

	static barViewOptions(): ViewOption[] {
		return [
			{
				displayName: 'X Axis',
				type: 'property',
				key: CHART_SETTINGS.X,
				filter: prop => !prop.startsWith('file.'),
				placeholder: 'Property',
			},
			{
				displayName: 'Show labels',
				type: 'toggle',
				key: CHART_SETTINGS.SHOW_LABELS,
				default: true,
			},
			{
				displayName: 'Show as percentages',
				type: 'toggle',
				key: CHART_SETTINGS.SHOW_PERCENTAGES,
				default: false,
			},
		];
	}
}
