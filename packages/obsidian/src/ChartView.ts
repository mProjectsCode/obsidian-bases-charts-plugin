import type { BasesEntry, BasesQueryResult, QueryController, Value } from 'obsidian';
import type { BasesPropertyId, ViewOption } from 'obsidian';
import { BasesView, DateValue, Events, NumberValue, StringValue } from 'obsidian';
import BarPlot from 'packages/obsidian/src/charts/BarPlot.svelte';
import LinePlot from 'packages/obsidian/src/charts/LinePlot.svelte';
import ScatterPlot from 'packages/obsidian/src/charts/ScatterPlot.svelte';
import { mount, unmount } from 'svelte';

export const SCATTER_CHART_VIEW_TYPE = 'chart-scatter';
export const LINE_CHART_VIEW_TYPE = 'chart-line';
export const BAR_CHART_VIEW_TYPE = 'chart-bar';

export type ChartViewType = typeof SCATTER_CHART_VIEW_TYPE | typeof LINE_CHART_VIEW_TYPE | typeof BAR_CHART_VIEW_TYPE;

export const CHART_SETTINGS = {
	X: 'x',
	LABEL: 'label',
	SHOW_PERCENTAGES: 'show-percentages',
	SHOW_LABELS: 'show-labels',
	MULTI_CHART: 'multi-chart-mode',
} as const;

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ProcessedData = {
	x: number | Date | string;
	y: number;
	yProperty: BasesPropertyId;
	label?: string;
	group?: string;
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

export class DataWrapper {
	readonly data: ProcessedGroupedData;
	readonly properties: BasesPropertyId[];
	readonly mode: MultiChartMode;

	constructor(data: ProcessedGroupedData, properties: BasesPropertyId[], mode: MultiChartMode) {
		this.data = data;
		this.properties = properties;
		this.mode = mode;

		if (this.data.grouped) {
			this.data.groups.sort((a, b) => a.key.localeCompare(b.key));
		}
	}

	static empty(): DataWrapper {
		return new DataWrapper({ grouped: false, entries: [] }, [], MultiChartMode.PROPERTY);
	}

	getCharts(): string[] {
		if (this.mode === MultiChartMode.GROUP) {
			if (this.data.grouped) {
				return this.data.groups.map(g => g.key);
			} else {
				return ['All'];
			}
		} else {
			return this.properties;
		}
	}

	getChartName(chart: string, view: ChartView): string {
		if (this.mode === MultiChartMode.GROUP) {
			return chart;
		} else {
			const xProp = view.config.getAsPropertyId(CHART_SETTINGS.X);
			return xProp ? view.config.getDisplayName(xProp) : 'Unknown';
		}
	}

	getChartGroup(): string {
		if (this.mode === MultiChartMode.GROUP && this.properties.length > 1) {
			return 'group';
		} else if (this.mode === MultiChartMode.PROPERTY && this.data.grouped) {
			return 'group';
		}

		return 'var(--bases-charts-accent)';
	}

	hasMultipleGroups(): boolean {
		return (this.mode === MultiChartMode.GROUP && this.properties.length > 1) || (this.mode === MultiChartMode.PROPERTY && this.data.grouped);
	}

	getFlat(chart: string, sorted: boolean = false): ProcessedData[] {
		let data: ProcessedData[];

		if (this.mode === MultiChartMode.GROUP) {
			if (this.data.grouped) {
				const group = this.data.groups.find(g => g.key === chart);
				data = group ? group.entries : [];
			} else {
				data = this.data.entries;
			}
		} else {
			if (this.data.grouped) {
				data = this.data.groups.flatMap(g => g.entries.filter(d => d.yProperty === chart));
			} else {
				data = this.data.entries.filter(d => d.yProperty === chart);
			}
		}

		if (sorted) {
			data = data.sort((a, b) => {
				if (a.group != null && b.group != null) {
					return a.group.localeCompare(b.group);
				}
				return 0;
			});
		}

		return data;
	}

	getStacked(chart: string): ProcessedData[] {
		if (this.mode === MultiChartMode.GROUP) {
			throw new Error('Stacked data is only available in property mode');
		}

		if (!this.data.grouped) {
			return this.data.entries;
		}

		const xMap = new Map<number | Date | string, number>();
		const stackedData: ProcessedData[] = [];

		for (const group of this.data.groups) {
			for (const entry of group.entries.filter(d => d.yProperty === chart)) {
				const prevY = xMap.get(entry.x) ?? 0;
				const newY = prevY + entry.y;

				stackedData.push({
					...entry,
					y: newY,
				});

				xMap.set(entry.x, newY);
			}
		}

		return stackedData;
	}
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
		const queryResult: BasesQueryResult | null = this.data;
		const xField = this.config.getAsPropertyId(CHART_SETTINGS.X);
		const labelField = this.config.getAsPropertyId(CHART_SETTINGS.LABEL);
		const mode = this.config.get(CHART_SETTINGS.MULTI_CHART) ?? MultiChartMode.PROPERTY;

		if (mode !== MultiChartMode.GROUP && mode !== MultiChartMode.PROPERTY) {
			// eslint-disable-next-line @typescript-eslint/no-base-to-string
			console.warn(`Invalid multi chart mode: ${mode}`);
			return DataWrapper.empty();
		}

		if (!xField) {
			return DataWrapper.empty();
		}

		if (this.isGrouped()) {
			const data: ProcessedGroupedData = {
				grouped: true,
				groups: [],
			};

			for (const group of queryResult?.groupedData ?? []) {
				const groupData: ProcessedGroupEntry = {
					key: group.key!.toString(),
					entries: [],
				};

				for (const entry of group.entries) {
					const processedEntry = this.processEntry(entry, xField, labelField, group.key?.toString(), mode);
					groupData.entries.push(...processedEntry);
				}

				data.groups.push(groupData);
			}

			return new DataWrapper(data, this.data.properties, mode);
		} else {
			const data: ProcessedGroupedData = {
				grouped: false,
				entries: [],
			};

			for (const entry of queryResult?.data ?? []) {
				const processedEntry = this.processEntry(entry, xField, labelField, undefined, mode);
				data.entries.push(...processedEntry);
			}

			return new DataWrapper(data, this.data.properties, mode);
		}
	}

	isGrouped(): boolean {
		return !(this.data.groupedData?.length === 1 && this.data.groupedData[0].key == null);
	}

	processEntry(
		entry: BasesEntry,
		xField: BasesPropertyId,
		labelField: BasesPropertyId | null,
		group: string | undefined,
		mode: MultiChartMode,
	): ProcessedData[] {
		try {
			const x = entry.getValue(xField);
			const label = labelField ? entry.getValue(labelField) : null;
			const xValue = parseValueAsX(x);
			const labelStr = label?.toString();

			if (xValue === null) {
				return [];
			}

			const result: ProcessedData[] = [];
			for (const prop of this.data.properties) {
				const yValue = parseValueAsNumber(entry.getValue(prop));
				const yName = this.config.getDisplayName(prop);

				if (xValue !== null && yValue !== null) {
					result.push({
						x: xValue,
						y: yValue,
						yProperty: prop,
						label: labelStr,
						group: mode === MultiChartMode.GROUP ? yName : group,
					});
				}
			}

			return result;
		} catch (e) {
			console.warn('Error processing entry', entry, e);
		}

		return [];
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
			{
				displayName: 'Label',
				type: 'property',
				key: CHART_SETTINGS.LABEL,
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
			{
				displayName: 'Label',
				type: 'property',
				key: CHART_SETTINGS.LABEL,
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
				displayName: 'Label',
				type: 'property',
				key: CHART_SETTINGS.LABEL,
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
