<script lang="ts">
	import { onMount } from "svelte";
    import { clearState } from "$lib/gameState.svelte";

    onMount(() => {
        clearState();
    });
</script>

<p class="text-center text-xl">
    Voitit pelin!
</p>