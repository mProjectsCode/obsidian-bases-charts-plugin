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

export const X_FIELD = 'x';
export const Y_FIELD = 'y';
export const LABEL_FIELD = 'label';
export const PERCENTAGE_FIELD = 'percentage';
export const LABELS_FIELD = 'labels';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ProcessedData = {
	x: number | Date | string;
	y: number;
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

export class DataWrapper {
	data: ProcessedGroupedData;

	constructor(data: ProcessedGroupedData) {
		this.data = data;
	}

	static empty(): DataWrapper {
		return new DataWrapper({ grouped: false, entries: [] });
	}

	getFlat(): ProcessedData[] {
		if (this.data.grouped) {
			return this.data.groups.flatMap(g => g.entries);
		} else {
			return this.data.entries;
		}
	}

	getStacked(): ProcessedData[] {
		if (!this.data.grouped) {
			return this.data.entries;
		}

		this.data.groups.sort((a, b) => a.key.localeCompare(b.key));

		const xMap = new Map<number | Date | string, number>();
		const stackedData: ProcessedData[] = [];

		for (const group of this.data.groups) {
			for (const entry of group.entries) {
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
		const xField = this.config.getAsPropertyId(X_FIELD);
		const yField = this.config.getAsPropertyId(Y_FIELD);
		const labelField = this.config.getAsPropertyId(LABEL_FIELD);

		if (!xField || !yField) {
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
					const processedEntry = this.processEntry(entry, xField, yField, labelField, group.key?.toString());
					if (processedEntry) {
						groupData.entries.push(processedEntry);
					}
				}

				data.groups.push(groupData);
			}

			return new DataWrapper(data);
		} else {
			const data: ProcessedGroupedData = {
				grouped: false,
				entries: [],
			};

			for (const entry of queryResult?.data ?? []) {
				const processedEntry = this.processEntry(entry, xField, yField, labelField, undefined);
				if (processedEntry) {
					data.entries.push(processedEntry);
				}
			}

			return new DataWrapper(data);
		}
	}

	isGrouped(): boolean {
		return !(this.data.groupedData?.length === 1 && this.data.groupedData[0].key == null);
	}

	processEntry(
		entry: BasesEntry,
		xField: BasesPropertyId,
		yField: BasesPropertyId,
		labelField: BasesPropertyId | null,
		group: string | undefined,
	): ProcessedData | null {
		try {
			const x = entry.getValue(xField);
			const y = entry.getValue(yField);
			const label = labelField ? entry.getValue(labelField) : null;

			const xValue = parseValueAsX(x);
			const yValue = parseValueAsNumber(y);
			const labelStr = label?.toString();

			if (xValue !== null && yValue !== null) {
				return {
					x: xValue,
					y: yValue,
					label: labelStr,
					group: group,
				};
			}
		} catch (e) {
			console.warn('Error processing entry', entry, e);
		}

		return null;
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
				displayName: 'X Axis',
				type: 'property',
				key: X_FIELD,
				filter: prop => !prop.startsWith('file.'),
				placeholder: 'Property',
			},
			{
				displayName: 'Y Axis',
				type: 'property',
				key: Y_FIELD,
				filter: prop => !prop.startsWith('file.'),
				placeholder: 'Property',
			},
			{
				displayName: 'Label',
				type: 'property',
				key: LABEL_FIELD,
				filter: prop => !prop.startsWith('file.'),
				placeholder: 'Property',
			},
		];
	}

	static lineViewOptions(): ViewOption[] {
		return [
			{
				displayName: 'X Axis',
				type: 'property',
				key: X_FIELD,
				filter: prop => !prop.startsWith('file.'),
				placeholder: 'Property',
			},
			{
				displayName: 'Y Axis',
				type: 'property',
				key: Y_FIELD,
				filter: prop => !prop.startsWith('file.'),
				placeholder: 'Property',
			},
			{
				displayName: 'Label',
				type: 'property',
				key: LABEL_FIELD,
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
				key: X_FIELD,
				filter: prop => !prop.startsWith('file.'),
				placeholder: 'Property',
			},
			{
				displayName: 'Y Axis',
				type: 'property',
				key: Y_FIELD,
				filter: prop => !prop.startsWith('file.'),
				placeholder: 'Property',
			},
			{
				displayName: 'Label',
				type: 'property',
				key: LABEL_FIELD,
				filter: prop => !prop.startsWith('file.'),
				placeholder: 'Property',
			},
			{
				displayName: 'Labels',
				type: 'toggle',
				key: LABELS_FIELD,
				default: true,
			},
			{
				displayName: 'Percentage',
				type: 'toggle',
				key: PERCENTAGE_FIELD,
				default: false,
			},
		];
	}
}
