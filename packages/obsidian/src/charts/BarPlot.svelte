<script lang="ts">
	import { AxisX, AxisY, BarY, GridY, Plot, Text } from 'svelteplot';
	import { ChartView, DataWrapper, LABELS_FIELD, PERCENTAGE_FIELD, X_FIELD, Y_FIELD } from '../ChartView';
	import { onMount } from 'svelte';
	import { OBSIDIAN_COLOR_PALETTE, toCompactString } from '../utils';

	interface Props {
		view: ChartView;
	}

	let { view }: Props = $props();

	let data: DataWrapper | null = $state(null);
	let xName: string = $state('');
	let yName: string = $state('');
	let labels: boolean = $state(true);
	let percentage: boolean = $state(false);
	let isGrouped: boolean = $state(false);
	let color = $derived(isGrouped ? 'group' : 'var(--bases-charts-accent)');

	function onUpdate() {
		const xField = view.config?.getAsPropertyId(X_FIELD);
		const yField = view.config?.getAsPropertyId(Y_FIELD);

		xName = xField ? `${view.config.getDisplayName(xField)} →` : '';
		yName = yField ? `↑ ${view.config.getDisplayName(yField)}` : '';

		labels = Boolean(view.config?.get(LABELS_FIELD) ?? true);
		percentage = Boolean(view.config?.get(PERCENTAGE_FIELD) ?? false);
		isGrouped = view.isGrouped();

		data = view.processData();
	}

	onMount(() => {
		view.events.on('data-updated', onUpdate);

		return () => {
			view.events.off('data-updated', onUpdate);
		};
	});

	let height = $state(0);
	let width = $state(0);
</script>

<div class="bases-chart-container" bind:clientHeight={height} bind:clientWidth={width}>
	{#if data}
		<Plot
			color={{ legend: true, scheme: OBSIDIAN_COLOR_PALETTE as unknown as string }}
			x={{ label: xName, type: 'band' }}
			y={{ label: yName, tickFormat: percentage ? d => `${String(d)}%` : d => toCompactString(d) }}
			height={height}
			width={width - 16}
			class="bases-chart"
		>
			<AxisX fill="var(--bases-charts-text)" stroke="var(--bases-charts-text)" opacity={1} />
			<AxisY fill="var(--bases-charts-text)" stroke="var(--bases-charts-text)" opacity={1} />
			<GridY stroke="var(--bases-charts-grid)" strokeOpacity={1} />

			<BarY data={data.getFlat()} x="x" y="y" fill={color} />
			{#if labels}
				<Text
					data={data.getStacked()}
					x="x"
					y="y"
					fill="var(--bases-charts-text)"
					text={d => (percentage ? `${d.y.toFixed(1)}%` : toCompactString(d.y))}
					lineAnchor="bottom"
					dy={-5}
				/>
			{/if}
		</Plot>
	{/if}
</div>
