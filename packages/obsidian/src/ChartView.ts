import type { BasesEntry, QueryController } from 'obsidian';
import type { BasesPropertyId, ViewOption } from 'obsidian';
import { BasesView, Events } from 'obsidian';
import type { DataWrapper, ProcessedData } from 'packages/obsidian/src/ChartData';
import { emptyDataWrapper, GroupSeparatedData, PropertySeparatedData } from 'packages/obsidian/src/ChartData';
import BarPlot from 'packages/obsidian/src/charts/BarPlot.svelte';
import LinePlot from 'packages/obsidian/src/charts/LinePlot.svelte';
import ScatterPlot from 'packages/obsidian/src/charts/ScatterPlot.svelte';
import { parseValueAsNumber, parseValueAsX } from 'packages/obsidian/src/utils/utils';
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
	SYNC_Y_AXES: 'sync-y-axes',
	MIN_Y_OVERRIDE: 'min-y-override',
	MAX_Y_OVERRIDE: 'max-y-override',
	LABEL_PROP: 'label-property',
	AGGREGATE: 'aggregate',
} as const;

export enum MultiChartMode {
	GROUP = 'Separate by group',
	PROPERTY = 'Separate by property',
}

export enum AggregateMode {
	NONE = 'None',
	AVERAGE = 'Average',
	SUM = 'Sum',
	COUNT = 'Count',
	MIN = 'Min',
	MAX = 'Max',
}

export interface YDomainOverrides {
	min: number | null;
	max: number | null;
	synced: boolean;
}

function parseConfigAsNumber(value: unknown): number | null {
	if (typeof value === 'number') {
		return value;
	}
	if (typeof value === 'string') {
		if (value.trim() === '') {
			return null;
		}
		const parsed = Number(value);
		if (!isNaN(parsed)) {
			return parsed;
		}
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
		this.scrollEl.addClass('bases-chart-view');

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
		this.scrollEl.removeClass('bases-chart-view');
	}

	onDataUpdated(): void {
		this.events.trigger('data-updated');
	}

	processData(): DataWrapper {
		const xField = this.config.getAsPropertyId(CHART_SETTINGS.X);
		const mode = this.config.get(CHART_SETTINGS.MULTI_CHART) ?? MultiChartMode.PROPERTY;
		const propertyOrder = this.config.getOrder();

		if (mode !== MultiChartMode.GROUP && mode !== MultiChartMode.PROPERTY) {
			/* eslint-disable-next-line @typescript-eslint/no-base-to-string --
			 * this is a safety check to catch when the saved data does not match the type definitions
			 * (mostly because the unknown type if the config.get method)
			 */
			console.warn(`Invalid multi chart mode: ${mode}`);
			return emptyDataWrapper(this);
		}

		if (!xField) {
			return emptyDataWrapper(this);
		}

		const data: ProcessedData[] = [];
		const groupBySet = this.data.groupedData.map(g => g.key?.toString()).filter(k => k != null);

		for (const group of this.data?.groupedData ?? []) {
			const groupKey = group.key?.toString();
			let groupIndex: number;
			if (groupKey == null) {
				groupIndex = 0;
			} else {
				groupIndex = groupBySet.indexOf(groupKey);
			}

			for (const entry of group.entries) {
				const processedEntry = this.processEntry(entry, xField, propertyOrder, groupIndex, mode);
				data.push(...processedEntry);
			}
		}

		const aggregatedData = this.type === LINE_CHART_VIEW_TYPE || this.type === BAR_CHART_VIEW_TYPE
			? aggregateData(data, this.config.get(CHART_SETTINGS.AGGREGATE) as AggregateMode | undefined)
			: data;

		if (mode === MultiChartMode.GROUP) {
			return new GroupSeparatedData(this, aggregatedData, groupBySet);
		} else {
			return new PropertySeparatedData(this, aggregatedData, groupBySet);
		}
	}

	processEntry(entry: BasesEntry, xField: BasesPropertyId, propertyOrder: BasesPropertyId[], groupIndex: number, mode: MultiChartMode): ProcessedData[] {
		try {
			const x = entry.getValue(xField);
			const xValue = parseValueAsX(x);
			const labelProp = this.config.getAsPropertyId(CHART_SETTINGS.LABEL_PROP);

			if (xValue === null) {
				return [];
			}

			const result: ProcessedData[] = [];
			let i = 0;
			for (const prop of propertyOrder) {
				const yValue = parseValueAsNumber(entry.getValue(prop));
				const label = labelProp ? entry.getValue(labelProp)?.toString() : undefined;

				if (xValue !== null && yValue !== null) {
					result.push({
						x: xValue,
						y: yValue,
						groupIndex: mode === MultiChartMode.GROUP ? i : groupIndex,
						chartIndex: mode === MultiChartMode.GROUP ? groupIndex : i,
						files: [entry.file.path],
						fileValues: [yValue],
						label: label,
					});
				}

				i++;
			}

			return result;
		} catch (e) {
			console.warn('Error processing entry', entry, e);
		}

		return [];
	}

	getYDomainOverrides(): YDomainOverrides {
		const min = this.config.get(CHART_SETTINGS.MIN_Y_OVERRIDE);
		const max = this.config.get(CHART_SETTINGS.MAX_Y_OVERRIDE);
		const synced = Boolean(this.config.get(CHART_SETTINGS.SYNC_Y_AXES));

		return {
			min: parseConfigAsNumber(min),
			max: parseConfigAsNumber(max),
			synced,
		};
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

	static commonViewOptions(): ViewOption[] {
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
				displayName: 'X axis',
				type: 'property',
				key: CHART_SETTINGS.X,
				filter: prop => !prop.startsWith('file.'),
				placeholder: 'Property',
			},
			{
				displayName: 'Sync Y axes',
				type: 'toggle',
				key: CHART_SETTINGS.SYNC_Y_AXES,
				default: false,
			},
			{
				displayName: 'Min Y override',
				type: 'text',
				key: CHART_SETTINGS.MIN_Y_OVERRIDE,
				placeholder: 'Leave empty to disable',
				default: '',
			},
			{
				displayName: 'Max Y override',
				type: 'text',
				key: CHART_SETTINGS.MAX_Y_OVERRIDE,
				placeholder: 'Leave empty to disable',
				default: '',
			},
			{
				displayName: 'Aggregate',
				type: 'dropdown',
				key: CHART_SETTINGS.AGGREGATE,
				options: {
					[AggregateMode.NONE]: AggregateMode.NONE,
					[AggregateMode.AVERAGE]: AggregateMode.AVERAGE,
					[AggregateMode.SUM]: AggregateMode.SUM,
					[AggregateMode.COUNT]: AggregateMode.COUNT,
					[AggregateMode.MIN]: AggregateMode.MIN,
					[AggregateMode.MAX]: AggregateMode.MAX,
				},
				default: AggregateMode.NONE,
			},
		];
	}

	static scatterViewOptions(): ViewOption[] {
		return [
			...ChartView.commonViewOptions(),
			{
				displayName: 'Label property',
				type: 'property',
				key: CHART_SETTINGS.LABEL_PROP,
				placeholder: 'Property',
			},
		];
	}

	static lineViewOptions(): ViewOption[] {
		return [...ChartView.commonViewOptions()];
	}

	static barViewOptions(): ViewOption[] {
		return [
			...ChartView.commonViewOptions(),
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

function aggregateData(data: ProcessedData[], mode: AggregateMode | undefined): ProcessedData[] {
	if (!mode || mode === AggregateMode.NONE) {
		return data;
	}

	// Group by x + chartIndex + groupIndex
	const buckets = new Map<string, ProcessedData[]>();
	for (const d of data) {
		const key = `${String(d.x)}|${d.chartIndex}|${d.groupIndex}`;
		let bucket = buckets.get(key);
		if (!bucket) {
			bucket = [];
			buckets.set(key, bucket);
		}
		bucket.push(d);
	}

	const result: ProcessedData[] = [];
	for (const bucket of buckets.values()) {
		const first = bucket[0];
		let y: number;

		switch (mode) {
			case AggregateMode.SUM:
				y = bucket.reduce((sum, d) => sum + d.y, 0);
				break;
			case AggregateMode.AVERAGE:
				y = bucket.reduce((sum, d) => sum + d.y, 0) / bucket.length;
				break;
			case AggregateMode.COUNT:
				y = bucket.length;
				break;
			case AggregateMode.MIN:
				y = Math.min(...bucket.map(d => d.y));
				break;
			case AggregateMode.MAX:
				y = Math.max(...bucket.map(d => d.y));
				break;
			default:
				y = first.y;
		}

		result.push({
			x: first.x,
			y: y,
			groupIndex: first.groupIndex,
			chartIndex: first.chartIndex,
			files: bucket.flatMap(d => d.files),
			fileValues: bucket.flatMap(d => d.fileValues),
			label: first.label,
		});
	}

	return result;
}
