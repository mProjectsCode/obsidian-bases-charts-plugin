import type { BasesQueryResult, QueryController, Value } from 'obsidian';
import type { BasesPropertyId, ViewOption } from 'obsidian';
import { BasesView, Events, NumberValue, StringValue } from 'obsidian';
import ScatterPlot from 'packages/obsidian/src/charts/ScatterPlot.svelte';
import { mount, unmount } from 'svelte';

export const CHART_VIEW_TYPE = 'chart';
export const X_FIELD = 'x';
export const Y_FIELD = 'y';
export const LABEL_FIELD = 'label';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ProcessedData = {
	x: number;
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

export function processData(
	queryResult: BasesQueryResult,
	xField: BasesPropertyId | null,
	yField: BasesPropertyId | null,
	labelField: BasesPropertyId | null,
): ProcessedData[] {
	const data: ProcessedData[] = [];

	if (!xField || !yField) {
		return data;
	}

	for (const group of queryResult?.groupedData ?? []) {
		for (const entry of group.entries) {
			try {
				const x = entry.getValue(xField);
				const y = entry.getValue(yField);
				const label = labelField ? entry.getValue(labelField) : null;

				const xNum = parseValueAsNumber(x);
				const yNum = parseValueAsNumber(y);
				const labelStr = label?.toString();

				if (xNum !== null && yNum !== null) {
					data.push({
						x: xNum,
						y: yNum,
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

export class ChartView extends BasesView {
	type = CHART_VIEW_TYPE;
	scrollEl: HTMLElement;
	svelteComponent: ReturnType<typeof ScatterPlot> | null = null;
	events: Events;

	constructor(controller: QueryController, scrollEl: HTMLElement) {
		super(controller);
		this.scrollEl = scrollEl;
		this.events = new Events();
	}

	onload(): void {
		this.svelteComponent = mount(ScatterPlot, {
			target: this.scrollEl,
			props: {
				view: this,
			},
		});
	}

	onunload(): void {
		if (this.svelteComponent) {
			void unmount(this.svelteComponent);
		}
	}

	onDataUpdated(): void {
		this.events.trigger('data-updated');
	}

	static getViewOptions(): ViewOption[] {
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
}
