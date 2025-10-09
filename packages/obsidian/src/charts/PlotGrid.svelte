<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { CHART_SETTINGS, type ChartView } from '../ChartView';
	import { OBSIDIAN_DEFAULT_SINGLE_COLOR, type FullChartProps } from '../utils/utils';
	import PlotGridItem from './PlotGridItem.svelte';
	import type { DataWrapper } from '../ChartData';

	interface Props {
		view: ChartView;
		chartSnippet: Snippet<[FullChartProps<string, string>]>;
	}

	let { view, chartSnippet }: Props = $props();

	let data: DataWrapper | null = $state(null) as DataWrapper | null;
	let xName: string = $state('');
	let isGrouped: boolean = $derived(data?.hasMultipleGroups() ?? false);
	let groupFn = $derived(data?.getChartGroupIdentifier() ?? OBSIDIAN_DEFAULT_SINGLE_COLOR);

	function onUpdate() {
		const xField = view.config?.getAsPropertyId(CHART_SETTINGS.X);

		xName = xField ? `${view.config.getDisplayName(xField)} →` : '';

		data = view.processData();
	}

	onMount(() => {
		view.events.on('data-updated', onUpdate);

		return () => {
			view.events.off('data-updated', onUpdate);
		};
	});
</script>

<div class="bases-charts-plot-legend">
	{#if data}
		{#each data.getGroupIdentifiers() as _, groupIndex}
			<div class="bases-charts-plot-legend-item">
				<div class="bases-charts-plot-legend-color" style="--color: {data.getColorFromGroupIndex(groupIndex)}"></div>
				<span class="bases-charts-plot-legend-label">{data.getGroupName(groupIndex)}</span>
			</div>
		{/each}
	{/if}
</div>

<div class="bases-charts-plot-grid">
	{#if data}
		{#each data.getChartIdentifiers() as _, chartIndex}
			<PlotGridItem
				view={view}
				chartSnippet={chartSnippet}
				chartProps={{
					data,
					chartIndex,
					xName,
					isGrouped,
					groupFn,
				}}
			></PlotGridItem>
		{:else}
			<p>No properties selected</p>
		{/each}
	{:else}
		<p>No data to display</p>
	{/if}
</div>

<style>
	.bases-charts-plot-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(var(--bases-charts-min-width), 1fr));
		gap: var(--size-4-4);
		width: 100%;
		height: 100%;
		padding: var(--size-4-4);
	}

	.bases-charts-plot-legend {
		display: flex;
		flex-wrap: wrap;
		gap: var(--size-4-3);
		padding-inline: var(--size-4-4);
		padding-top: var(--size-4-4);
	}

	.bases-charts-plot-legend-item {
		display: flex;
		align-items: center;
		gap: var(--size-2-2);
		font-size: var(--font-small);
		color: var(--bases-charts-text);
	}

	.bases-charts-plot-legend-color {
		width: var(--size-4-4);
		height: var(--size-4-4);
		background-color: var(--color);
	}
</style>
