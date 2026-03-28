<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ChartProps, FullChartProps } from '../utils/utils';
	import { type ChartView, CHART_SETTINGS, AggregateMode } from '../ChartView';
	import type { ProcessedData } from '../ChartData';
	import { Menu } from 'obsidian';

	interface Props {
		view: ChartView;
		chartProps: ChartProps<string, string>;
		chartSnippet: Snippet<[FullChartProps<string, string>]>;
	}

	let { view, chartProps, chartSnippet }: Props = $props();

	let width = $state(0);
	let height = $state(0);
	let enoughSpace = $derived(width > 100 && height > 100);

	let hoveredData: ProcessedData[] = $state([]);

	function setHoveredData(data: ProcessedData[]) {
		hoveredData = data;
	}

	function onClick(e: MouseEvent) {
		if (hoveredData.length < 1) {
			return;
		}

		const { files, fileValues, y } = hoveredData[0];
		const newTab = e.ctrlKey || e.metaKey;
		const columnName = chartProps.data.getChartName(hoveredData[0].chartIndex);

		if (files.length === 1) {
			view.openFile(files[0], newTab);
		} else if (files.length > 1) {
			const menu = new Menu();
			const aggregateMode = (view.config.get(CHART_SETTINGS.AGGREGATE) as AggregateMode | undefined) ?? AggregateMode.NONE;
			menu.addItem(item => {
				item.setTitle(`${columnName} (${aggregateMode}): ${y}`)
					.setIsLabel(true);
			});
			menu.addSeparator();
			for (let i = 0; i < files.length; i++) {
				const filePath = files[i];
				const name = (filePath.split('/').pop() ?? filePath).replace(/\.[^.]+$/, '');
				const value = fileValues[i];
				menu.addItem(item => {
					item.setTitle(`${name}  ·  ${columnName}: ${value}`)
						.setIcon('file-text')
						.onClick(() => {
							view.openFile(filePath, newTab);
						});
				});
			}
			menu.showAtMouseEvent(e);
		}
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="bases-charts-plot-grid-item" bind:clientWidth={width} bind:clientHeight={height} onclick={onClick}>
	{#if enoughSpace}
		{@render chartSnippet({
			...chartProps,
			width,
			height,
			setHoveredData,
		})}
	{:else}
		<span>Not enough space to display chart.</span>
	{/if}
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
