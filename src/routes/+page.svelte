<script lang="ts">
	import Setup, { type PlayerList } from "$lib/components/game/Setup.svelte";
	import Game from "../lib/components/game/Game.svelte";
	import { gameStateStore as gameState, type GameState, tryLoadData } from "$lib/gameState.svelte";

	let pendingState = $state<GameState | undefined>(tryLoadData());
</script>
<svelte:head>
	<title>Gorilla Blackout</title>
	<meta name="description" content="Gorilla Blackout" />
</svelte:head>

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