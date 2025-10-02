<script lang="ts">
	import { Dot, Plot } from 'svelteplot';
	import { ChartView, LABEL_FIELD, processData, X_FIELD, Y_FIELD, type ProcessedData } from '../ChartView';
	import { onMount } from 'svelte';

	interface Props {
		view: ChartView;
	}

	let { view }: Props = $props();

	let data: ProcessedData[] = $state([]);
	let xName: string = $state('');
	let yName: string = $state('');

	function onUpdate() {
		const xField = view.config?.getAsPropertyId(X_FIELD);
		const yField = view.config?.getAsPropertyId(Y_FIELD);
		const labelField = view.config?.getAsPropertyId(LABEL_FIELD);

		xName = xField ? `${view.config.getDisplayName(xField)} →` : '';
		yName = yField ? `↑ ${view.config.getDisplayName(yField)}` : '';

		data = processData(view.data, xField, yField, labelField);
	}

	onMount(() => {
		view.events.on('data-updated', onUpdate);

		return () => {
			view.events.off('data-updated', onUpdate);
		};
	});
</script>

<div class="bases-chart-container">
	<Plot grid color={{ legend: true, scheme: 'tableau10' }} x={{ label: xName }} y={{ label: yName }} class="bases-chart">
		<Dot data={data} x="x" y="y" stroke="group" />
	</Plot>
</div>
