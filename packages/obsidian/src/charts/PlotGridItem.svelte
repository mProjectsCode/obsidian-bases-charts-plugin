<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ChartProps, FullChartProps } from '../utils';

	interface Props {
		chartProps: ChartProps;
		chartSnippet: Snippet<[FullChartProps]>;
	}

	let { chartProps, chartSnippet }: Props = $props();

	let width = $state(0);
	let height = $state(0);
</script>

<div class="bases-charts-plot-grid-item" bind:clientWidth={width} bind:clientHeight={height}>
	{@render chartSnippet({
		...chartProps,
		width,
		height,
	})}
</div>

<style>
	.bases-charts-plot-grid-item {
		position: relative;
		width: 100%;
		height: 100%;
		min-height: 300px;
	}
</style>
