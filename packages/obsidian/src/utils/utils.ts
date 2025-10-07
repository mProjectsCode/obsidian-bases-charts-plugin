import type { AbstractDataWrapper, ProcessedData } from 'packages/obsidian/src/ChartView';

export function toCompactString(datum: number | string | symbol | boolean | Date | null | undefined): string {
	if (datum == null) {
		return '';
	}
	if (typeof datum === 'number') {
		return datum.toLocaleString(undefined, { notation: 'compact', roundingPriority: 'auto', maximumSignificantDigits: 4 });
	}
	if (typeof datum === 'boolean') {
		return datum ? 'Yes' : 'No';
	}
	if (typeof datum === 'symbol') {
		return Symbol.keyFor(datum) ?? '';
	}
	if (datum instanceof Date) {
		return datum.toLocaleDateString();
	}
	return datum;
}

export const OBSIDIAN_COLOR_PALETTE = [
	'var(--color-blue)',
	'var(--color-orange)',
	'var(--color-red)',
	'var(--color-cyan)',
	'var(--color-green)',
	'var(--color-yellow)',
	'var(--color-purple)',
	'var(--color-pink)',
];

export const OBSIDIAN_DEFAULT_SINGLE_COLOR = (_: unknown): string => 'var(--bases-charts-accent)';

export interface ChartProps<ChartId, GroupId> {
	data: AbstractDataWrapper<ChartId, GroupId>;
	chartIndex: number;
	xName: string;
	isGrouped: boolean;
	groupFn: (d: ProcessedData) => string;
}

export type FullChartProps<ChartId, GroupId> = ChartProps<ChartId, GroupId> & {
	width: number;
	height: number;
	setHoveredData: (data: ProcessedData[]) => void;
};
