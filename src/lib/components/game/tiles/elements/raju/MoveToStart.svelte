<script lang="ts">
	import { onMount } from "svelte";
	import { ElementPropsTile } from "../elementProps";

    const props: ElementPropsTile = $props();

    onMount(() => {
        props.movePlayer?.(-props.positions[props.currentPlayerIndex], props.currentPlayerIndex);
    });
</script>