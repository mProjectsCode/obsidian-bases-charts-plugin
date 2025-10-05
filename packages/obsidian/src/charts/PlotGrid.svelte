<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { CHART_SETTINGS, type ChartView, type DataWrapper } from '../ChartView';
	import { type FullChartProps } from '../utils';
	import PlotGridItem from './PlotGridItem.svelte';

	interface Props {
		view: ChartView;
		chartSnippet: Snippet<[FullChartProps]>;
	}

	let { view, chartSnippet }: Props = $props();

	let data: DataWrapper | null = $state(null) as DataWrapper | null;
	let xName: string = $state('');
	let isGrouped: boolean = $derived(data?.hasMultipleGroups() ?? false);
	let group: string = $derived(data?.getChartGroup() ?? 'var(--bases-charts-accent)');

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

<div class="bases-charts-plot-grid">
	{#if data}
		{#each data.getCharts() as chart}
			<PlotGridItem
				chartSnippet={chartSnippet}
				chartProps={{
					data,
					chart,
					xName,
					isGrouped,
					group,
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
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: var(--size-4-4);
		width: 100%;
		height: 100%;
		padding: var(--size-4-4);
	}
</style>
