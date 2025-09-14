<script lang="ts">
	import Setup, { type PlayerList } from "$lib/components/game/Setup.svelte";
	import Game from "../lib/components/game/Game.svelte";
	import { gameStateStore as gameState, type GameState, tryLoadData } from "$lib/gameState.svelte";

	let pendingState = $state<GameState | undefined>(tryLoadData());
</script>
<svelte:head>
	<title>Gorilla Blackout - rankka juomapeli opiskelijoille!</title>
	<meta name="description" content="Erittäin dokattu juomapeli opiskelijoille! Heitä noppaa päästäksesi maaliin, mutta varo Rajua Pyörää ja muita yllätyksiä!" />
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

