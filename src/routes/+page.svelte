<script lang="ts">
	import Setup from "$lib/components/game/Setup.svelte";
	import Game from "../lib/components/game/Game.svelte";
	import { gameStateStore as gameState, type GameState, tryLoadData } from "$lib/gameState.svelte";

	let pendingState = $state<GameState | undefined | "loading">("loading");
	(async () => {
		pendingState = await tryLoadData();
	})();

</script>
<svelte:head>
	<title>Gorilla Blackout - rankka opiskelija-juomapeli! | Tehtäviä kahdelle tai useammalle</title>
	<meta name="description" content="Raju juomapeli opiskelijoille! Heitä noppaa päästäksesi maaliin, mutta varo Rajua Pyörää, vesiputousta ja muita yllätyksiä! Tavoitteenasi on päästä maaliin, mutta matkalla saatat kohdata haasteita, tehtäviä, vesiputous-ruudun ja päästä juomaan shotteja." />
</svelte:head>

<div>
	{#if $gameState.inGame}
		<Game/>
	{:else}	
		<Setup pendingState={pendingState} onStart={(newPlayers) => {
			gameState.update((state) => {
				state.players = newPlayers;
				state.inGame = true;
				return state;
			});
		}}/>
	{/if}
</div>

