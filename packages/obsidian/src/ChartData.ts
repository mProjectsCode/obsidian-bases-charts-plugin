import type { BasesPropertyId } from 'obsidian';
import type { ChartView, YDomainOverrides } from 'packages/obsidian/src/ChartView';
import { OBSIDIAN_DEFAULT_SINGLE_COLOR, OBSIDIAN_COLOR_PALETTE } from 'packages/obsidian/src/utils/utils';

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
	label?: string;
};

export abstract class AbstractDataWrapper<ChartId, GroupId> {
	readonly view: ChartView;
	readonly data: ProcessedData[];
	readonly groupBySet: string[];
	readonly yDomain: YDomainOverrides;

	constructor(view: ChartView, data: ProcessedData[], groupBySet: string[]) {
		this.view = view;
		this.data = data;
		this.groupBySet = groupBySet;

		this.yDomain = this.getYDomain();
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

	getYDomainForChart(chartIndex: number): [number, number] {
		const overrides = this.yDomain;

		const min = overrides.min ?? this.getChartYMin(chartIndex);
		const max = overrides.max ?? this.getChartYMax(chartIndex);

		return [min ?? 0, max ?? 0];
	}

	getYDomain(): YDomainOverrides {
		const viewOverrides = this.view.getYDomainOverrides();

		if (viewOverrides.synced) {
			viewOverrides.min ??= this.getGlobalYMin();
			viewOverrides.max ??= this.getGlobalYMax();
		}

		return viewOverrides;
	}

	getGlobalYMin(): number | null {
		let globalMin: number | null = null;

		for (let i = 0; i < this.getChartIdentifiers().length; i++) {
			const chartData = this.getFlat(i);
			for (const entry of chartData) {
				if (globalMin === null || entry.y < globalMin) {
					globalMin = entry.y;
				}
			}
		}

		return globalMin;
	}

	getGlobalYMax(): number | null {
		let globalMax: number | null = null;

		for (let i = 0; i < this.getChartIdentifiers().length; i++) {
			const chartData = this.getFlat(i);
			for (const entry of chartData) {
				if (globalMax === null || entry.y > globalMax) {
					globalMax = entry.y;
				}
			}
		}

		return globalMax;
	}

	getChartYMin(chartIndex: number): number | null {
		let chartMin: number | null = null;

		const chartData = this.getFlat(chartIndex);
		for (const entry of chartData) {
			if (chartMin === null || entry.y < chartMin) {
				chartMin = entry.y;
			}
		}

		return chartMin;
	}

	getChartYMax(chartIndex: number): number | null {
		let chartMax: number | null = null;

		const chartData = this.getFlat(chartIndex);
		for (const entry of chartData) {
			if (chartMax === null || entry.y > chartMax) {
				chartMax = entry.y;
			}
		}

		return chartMax;
	}
}

export class GroupSeparatedData extends AbstractDataWrapper<string, BasesPropertyId> {
	getChartIdentifiers(): string[] {
		// if the data is not grouped, the groupBySet will be empty
		if (this.groupBySet.length === 0) {
			return ['No group'];
		}
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

export function sortDataByGroup(data: ProcessedData[]): ProcessedData[] {
	return data.sort((a, b) => {
		if (a.groupIndex != null && b.groupIndex != null) {
			return a.groupIndex - b.groupIndex;
		}
		return 0;
	});
}
