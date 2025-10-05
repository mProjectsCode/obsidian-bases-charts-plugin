<script lang="ts">
	import { AxisX, AxisY, BarY, GridY, Plot, Text } from 'svelteplot';
	import { CHART_SETTINGS, ChartView } from '../ChartView';
	import { onMount } from 'svelte';
	import { OBSIDIAN_COLOR_PALETTE, toCompactString } from '../utils';
	import PlotGrid from './PlotGrid.svelte';

	interface Props {
		view: ChartView;
	}

	let { view }: Props = $props();

	let show_labels: boolean = $state(true);
	let show_percentages: boolean = $state(false);

	function onUpdate() {
		show_labels = Boolean(view.config?.get(CHART_SETTINGS.SHOW_LABELS) ?? true);
		show_percentages = Boolean(view.config?.get(CHART_SETTINGS.SHOW_PERCENTAGES) ?? false);
	}

	onMount(() => {
		view.events.on('data-updated', onUpdate);

		return () => {
			view.events.off('data-updated', onUpdate);
		};
	});
</script>

<PlotGrid view={view}>
	{#snippet chartSnippet({ data, chart, xName, group, height })}
		<Plot
			color={{ legend: true, scheme: OBSIDIAN_COLOR_PALETTE as unknown as string }}
			x={{ label: xName, type: 'band' }}
			y={{ label: `↑ ${data.getChartName(chart, view)}`, tickFormat: show_percentages ? d => `${String(d)}%` : d => toCompactString(d) }}
			height={height}
			class="bases-charts-plot"
		>
			<AxisX fill="var(--bases-charts-text)" stroke="var(--bases-charts-text)" opacity={1} />
			<AxisY fill="var(--bases-charts-text)" stroke="var(--bases-charts-text)" opacity={1} />
			<GridY stroke="var(--bases-charts-grid)" strokeOpacity={1} />

			<BarY data={data.getFlat(chart)} x="x" y="y" fill={group} />
			{#if show_labels}
				<Text
					data={data.getStacked(chart)}
					x="x"
					y="y"
					fill="var(--bases-charts-text)"
					text={d => (show_percentages ? `${d.y.toFixed(1)}%` : toCompactString(d.y))}
					lineAnchor="bottom"
					dy={-5}
				/>
			{/if}
		</Plot>
	{/snippet}
</PlotGrid>
