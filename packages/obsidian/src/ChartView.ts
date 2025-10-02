import type { BasesQueryResult, QueryController, Value } from 'obsidian';
import type { BasesPropertyId, ViewOption } from 'obsidian';
import { BasesView, DateValue, Events, NumberValue, StringValue } from 'obsidian';
import ScatterPlot from 'packages/obsidian/src/charts/ScatterPlot.svelte';
import LinePlot from 'packages/obsidian/src/charts/LinePlot.svelte';
import BarPlot from 'packages/obsidian/src/charts/BarPlot.svelte';
import { mount, unmount } from 'svelte';

export const SCATTER_CHART_VIEW_TYPE = 'chart-scatter';
export const LINE_CHART_VIEW_TYPE = 'chart-line';
export const BAR_CHART_VIEW_TYPE = 'chart-bar';

export type ChartViewType = typeof SCATTER_CHART_VIEW_TYPE | typeof LINE_CHART_VIEW_TYPE | typeof BAR_CHART_VIEW_TYPE;

export const X_FIELD = 'x';
export const Y_FIELD = 'y';
export const LABEL_FIELD = 'label';
export const PERCENTAGE_FIELD = 'percentage';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ProcessedData = {
	x: number | Date | string;
	y: number;
	label?: string;
	group?: string;
};

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

	processData(): ProcessedData[] {
		const data: ProcessedData[] = [];

		const queryResult: BasesQueryResult | null = this.data;
		const xField = this.config.getAsPropertyId(X_FIELD);
		const yField = this.config.getAsPropertyId(Y_FIELD);
		const labelField = this.config.getAsPropertyId(LABEL_FIELD);

		if (!xField || !yField) {
			return data;
		}

		for (const group of queryResult?.groupedData ?? []) {
			for (const entry of group.entries) {
				try {
					const x = entry.getValue(xField);
					const y = entry.getValue(yField);
					const label = labelField ? entry.getValue(labelField) : null;

					const xValue = parseValueAsX(x);
					const yValue = parseValueAsNumber(y);
					const labelStr = label?.toString();

					if (xValue !== null && yValue !== null) {
						data.push({
							x: xValue,
							y: yValue,
							label: labelStr,
							group: group.key?.toString(),
						});
					}
				} catch (e) {
					console.warn('Error processing entry', entry, e);
				}
			}
		}

		return data;
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
		]
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
		]
	}

	static barViewOptions(): ViewOption[] {
		return [
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
				displayName: 'Percentage',
				type: 'toggle',
				key: PERCENTAGE_FIELD,
				default: false,
			}
		]
	}
}
