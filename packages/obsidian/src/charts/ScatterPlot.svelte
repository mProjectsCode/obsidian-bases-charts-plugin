<script lang="ts">
	import { AxisX, AxisY, Dot, GridX, GridY, Plot, Pointer, Text } from 'svelteplot';
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
		{@const dataPoints = data.getFlat(chartIndex)}
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

			<Dot data={dataPoints} x="x" y="y" stroke={groupFn} />
			<Pointer data={dataPoints} x="x" y="y" maxDistance={50} onupdate={setHoveredData}>
				{#snippet children({ data })}
					<Text data={data} x="x" y="y" fill="var(--bases-charts-text)" text={d => toCompactString(d.y)} lineAnchor="bottom" dy={-10} />
					<Text data={data} x="x" y="y" fill="var(--bases-charts-text)" text={d => toCompactString(d.label)} lineAnchor="bottom" dy={-25} />
					<Dot data={data} x="x" y="y" fill={groupFn} stroke="var(--bases-charts-text)" />
				{/snippet}
			</Pointer>
		</Plot>
	{/snippet}
</PlotGrid>
