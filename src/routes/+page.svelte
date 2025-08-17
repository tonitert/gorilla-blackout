<script lang="ts">
	import Game from "../lib/components/game/Game.svelte";
	let initialized = $state(false);
</script>
<svelte:head>
	<title>Home</title>
	<meta name="description" content="Gorilla Blackout" />
</svelte:head>

{#if initialized}
	<Game/>
{:else}
	
{/if}