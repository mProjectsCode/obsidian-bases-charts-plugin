<script lang="ts">
	import { Line, Plot, GridX, GridY, AxisY, AxisX, Pointer, Text, Dot, RuleX } from 'svelteplot';
	import { ChartView } from '../ChartView';
	import { OBSIDIAN_COLOR_PALETTE, toCompactString } from '../utils';
	import PlotGrid from './PlotGrid.svelte';

	interface Props {
		view: ChartView;
	}

	let { view }: Props = $props();
</script>

<PlotGrid view={view}>
	{#snippet chartSnippet({ data, chart, xName, isGrouped, group, height })}
		{@const dataPoints = data.getFlat(chart, true)}
		<Plot
			grid
			color={{ legend: isGrouped, scheme: OBSIDIAN_COLOR_PALETTE as unknown as string }}
			x={{ label: xName }}
			y={{ label: `↑ ${data.getChartName(chart, view)}` }}
			height={height}
			class="bases-charts-plot"
		>
			<AxisX fill="var(--bases-charts-text)" stroke="var(--bases-charts-text)" opacity={1} />
			<AxisY fill="var(--bases-charts-text)" stroke="var(--bases-charts-text)" opacity={1} />
			<GridX stroke="var(--bases-charts-grid)" strokeOpacity={1} />
			<GridY stroke="var(--bases-charts-grid)" strokeOpacity={1} />

			<Line data={dataPoints} x="x" y="y" stroke="group" />
			<Pointer data={dataPoints} x="x" z={group} maxDistance={50}>
				{#snippet children({ data })}
					<RuleX data={data} x="x" stroke="var(--bases-charts-muted)" />
					<Text data={data} x="x" y="y" fill="var(--bases-charts-text)" text={d => toCompactString(d.y)} lineAnchor="bottom" dy={-10} />
					<Dot data={data} x="x" y="y" stroke="var(--bases-charts-text)" />
				{/snippet}
			</Pointer>
		</Plot>
	{/snippet}
</PlotGrid>
