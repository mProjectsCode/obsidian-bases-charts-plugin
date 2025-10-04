<script lang="ts">
	import { AxisX, AxisY, Dot, GridX, GridY, Plot, Pointer, Text } from 'svelteplot';
	import { ChartView, DataWrapper, X_FIELD, Y_FIELD } from '../ChartView';
	import { onMount } from 'svelte';
	import { OBSIDIAN_COLOR_PALETTE, toCompactString } from '../utils';

	interface Props {
		view: ChartView;
	}

	let { view }: Props = $props();

	let data: DataWrapper | null = $state(null);
	let xName: string = $state('');
	let yName: string = $state('');
	let isGrouped: boolean = $state(false);
	let color = $derived(isGrouped ? 'group' : 'var(--bases-charts-accent)');

	function onUpdate() {
		const xField = view.config?.getAsPropertyId(X_FIELD);
		const yField = view.config?.getAsPropertyId(Y_FIELD);

		xName = xField ? `${view.config.getDisplayName(xField)} →` : '';
		yName = yField ? `↑ ${view.config.getDisplayName(yField)}` : '';
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
			grid
			color={{ legend: true, scheme: OBSIDIAN_COLOR_PALETTE as unknown as string }}
			x={{ label: xName }}
			y={{ label: yName }}
			height={height}
			width={width - 16}
			class="bases-chart"
		>
			<AxisX fill="var(--bases-charts-text)" stroke="var(--bases-charts-text)" opacity={1} />
			<AxisY fill="var(--bases-charts-text)" stroke="var(--bases-charts-text)" opacity={1} />
			<GridX stroke="var(--bases-charts-grid)" strokeOpacity={1} />
			<GridY stroke="var(--bases-charts-grid)" strokeOpacity={1} />

			<Dot data={data.getFlat()} x="x" y="y" stroke={color} />
			<Pointer data={data.getFlat()} x="x" y="y" maxDistance={50}>
				{#snippet children({ data })}
					<Text data={data} x="x" y="y" fill="var(--bases-charts-text)" text={d => toCompactString(d.y)} lineAnchor="bottom" dy={-10} />
					<Dot data={data} x="x" y="y" fill={color} stroke="var(--bases-charts-text)" />
				{/snippet}
			</Pointer>
		</Plot>
	{/if}
</div>
