<script lang="ts">
	import { Line, Plot, GridX, GridY, AxisY, AxisX, Pointer, Text, Dot, RuleX } from 'svelteplot';
	import { ChartView } from '../ChartView';
	import { toCompactString } from '../utils/utils';
	import PlotGrid from './PlotGrid.svelte';

	interface Props {
		view: ChartView;
	}

	let { view }: Props = $props();
</script>

<PlotGrid view={view}>
	{#snippet chartSnippet({ data, chartIndex, xName, groupFn, height, setHoveredData })}
		{@const dataPoints = data.getFlat(chartIndex, true)}
		<Plot
			grid
			x={{ label: xName }}
			y={{ label: `↑ ${data.getChartName(chartIndex)}`, domain: data.getYDomainForChart(chartIndex) }}
			height={height}
			class="bases-charts-plot"
		>
			<AxisX fill="var(--bases-charts-text)" stroke="var(--bases-charts-text)" opacity={1} />
			<AxisY fill="var(--bases-charts-text)" stroke="var(--bases-charts-text)" opacity={1} />
			<GridX stroke="var(--bases-charts-grid)" strokeOpacity={1} />
			<GridY stroke="var(--bases-charts-grid)" strokeOpacity={1} />

			<Line data={dataPoints} x="x" y="y" stroke={groupFn} />
			<Pointer data={dataPoints} x="x" z={groupFn} maxDistance={50} onupdate={setHoveredData}>
				{#snippet children({ data })}
					<RuleX data={data} x="x" stroke="var(--bases-charts-grid-hover)" />
					<Text data={data} x="x" y="y" fill="var(--bases-charts-text)" text={d => toCompactString(d.y)} lineAnchor="bottom" dy={-10} />
					<Dot data={data} x="x" y="y" stroke="var(--bases-charts-text)" />
				{/snippet}
			</Pointer>
		</Plot>
	{/snippet}
</PlotGrid>
