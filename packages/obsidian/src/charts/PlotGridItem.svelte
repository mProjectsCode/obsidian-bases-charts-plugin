<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ChartProps, FullChartProps } from '../utils/utils';
	import type { ChartView, ProcessedData } from '../ChartView';

	interface Props {
		view: ChartView;
		chartProps: ChartProps<string, string>;
		chartSnippet: Snippet<[FullChartProps<string, string>]>;
	}

	let { view, chartProps, chartSnippet }: Props = $props();

	let width = $state(0);
	let height = $state(0);

	let hoveredData: ProcessedData[] = $state([]);

	function setHoveredData(data: ProcessedData[]) {
		hoveredData = data;
	}

	function onClick(e: MouseEvent) {
		if (hoveredData.length < 1) {
			return;
		}

		const newTab = e.ctrlKey || e.metaKey;
		const filePath = hoveredData[0].file;
		view.openFile(filePath, newTab);
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="bases-charts-plot-grid-item" bind:clientWidth={width} bind:clientHeight={height} onclick={onClick}>
	{@render chartSnippet({
		...chartProps,
		width,
		height,
		setHoveredData,
	})}
</div>

<style>
	.bases-charts-plot-grid-item {
		position: relative;
		width: 100%;
		height: 100%;
		min-height: var(--bases-charts-min-height);
		min-width: var(--bases-charts-min-width);
	}
</style>
