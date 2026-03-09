<script lang="ts">
	import { onMount } from 'svelte';
	import { ElementPropsTile } from '../elementProps';

	const props: ElementPropsTile = $props();

	onMount(() => {
		if (!props.canAct) return;
		props.movePlayer?.(-props.positions[props.currentPlayerIndex], props.currentPlayerIndex);
	});
</script>
