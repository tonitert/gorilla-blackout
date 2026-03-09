<script lang="ts">
	import { onMount } from 'svelte';
	import Setup from '$lib/components/game/Setup.svelte';
	import Game from '../lib/components/game/Game.svelte';
	import { gameStateStore as gameState, type GameState, tryLoadData } from '$lib/gameState.svelte';
	import { enableMultiplayerSync, multiplayerStore } from '$lib/multiplayer/client';
	import { isE2EMode } from '$lib/testing/e2eMode';
	import { get } from 'svelte/store';

	let pendingState = $state<GameState | undefined | 'loading'>('loading');
	(async () => {
		pendingState = await tryLoadData();
	})();

	onMount(() => {
		const cleanupMultiplayerSync = enableMultiplayerSync();
		let cleanupE2E = () => {};

		if (isE2EMode(window.location.search)) {
			const unsubscribeState = gameState.subscribe((state) => {
				(window as Window & { __GB_STATE__?: GameState }).__GB_STATE__ = $state.snapshot(state);
			});
			(window as Window & { __GB_ENTER_GAME__?: () => void }).__GB_ENTER_GAME__ = () => {
				const lobby = get(multiplayerStore).lobby;
				gameState.update((state) => ({
					...state,
					players: (lobby?.players as GameState['players'] | undefined) ?? state.players,
					currentTurnPlayerId: lobby?.players[0]?.id ?? state.currentTurnPlayerId,
					turnInProgress: false,
					turnOwnerId: null,
					phase: 'idle',
					activeTilePosition: null,
					diceValue: null,
					inGame: true
				}));
			};

			cleanupE2E = () => {
				unsubscribeState();
				delete (window as Window & { __GB_STATE__?: GameState }).__GB_STATE__;
				delete (window as Window & { __GB_ENTER_GAME__?: () => void }).__GB_ENTER_GAME__;
			};
		}

		return () => {
			cleanupMultiplayerSync();
			cleanupE2E();
		};
	});
</script>

<svelte:head>
	<title>Gorilla Blackout - rankka opiskelija-juomapeli! | Tehtäviä kahdelle tai useammalle</title>
	<meta
		name="description"
		content="Raju juomapeli opiskelijoille! Heitä noppaa päästäksesi maaliin, mutta varo Rajua Pyörää, vesiputousta ja muita yllätyksiä! Tavoitteenasi on päästä maaliin, mutta matkalla saatat kohdata haasteita, tehtäviä, vesiputous-ruudun ja päästä juomaan shotteja."
	/>
</svelte:head>

<div>
	{#if $gameState.inGame}
		<Game />
	{:else}
		<Setup
			{pendingState}
			onStart={(newPlayers) => {
				gameState.update((state) => ({
					...state,
					players: newPlayers,
					inGame: true,
					turnInProgress: false,
					turnOwnerId: null,
					phase: 'idle',
					activeTilePosition: null,
					diceValue: null,
					currentTurnPlayerId: newPlayers[0]?.id ?? null
				}));
			}}
		/>
	{/if}
</div>
