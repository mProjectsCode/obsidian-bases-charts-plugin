import type { Value } from 'obsidian';
import { DateValue, NumberValue, StringValue } from 'obsidian';
import type { AbstractDataWrapper, ProcessedData } from 'packages/obsidian/src/ChartData';

export function toCompactString(datum: object | number | string | symbol | boolean | Date | null | undefined): string {
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
	if (typeof datum === 'object') {
		return 'object';
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
