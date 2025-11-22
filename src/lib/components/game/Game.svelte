<script lang="ts" module>
	export const lastTilePosition = 55;
</script>

<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import Dice from '$lib/components/ui/dice/Dice.svelte';
	import { tiles, type Tile } from './tiles/tiles';
	import type { ElementProps } from './tiles/elements/elementProps';
	import { fade } from 'svelte/transition';
	import { gameStateStore as gameState, clearGameState } from '$lib/gameState.svelte';
	import { derived } from 'svelte/store';
	import board from '$lib/assets/gorilla.png';
	import { playerImages } from './playerImages';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import X from '@lucide/svelte/icons/x';
	import PlayerEditor from './PlayerEditor.svelte';
	import { Player } from '$lib/player';
	import { IsUsingKeyboard } from 'bits-ui';
	import { GameMode } from '$lib/multiplayer/types';
	import { WebSocketClient } from '$lib/multiplayer/websocketClient';
	import { onDestroy } from 'svelte';

	const colors = ['#3559e8', '#d8de23', '#12e627', '#db1229'];
	const shouldShowTooltip = $derived(IsUsingKeyboard.current);

	// WebSocket client for multi-device mode
	const isMultiDevice = $gameState.gameMode === GameMode.MULTI_DEVICE;
	let wsClient: WebSocketClient | null = null;
	let shouldSyncGameState = $state(true);
	let isWsConnected = $state(false);

	if (isMultiDevice && typeof window !== 'undefined') {
		const backendUrl =
			typeof window !== 'undefined'
				? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:3001/ws`
				: 'ws://localhost:3001/ws';

		wsClient = new WebSocketClient(backendUrl);

		// Connect to WebSocket
		wsClient.connect().catch((error) => {
			console.error('Failed to connect WebSocket:', error);
		});

		// Subscribe to connection status
		const statusUnsubscribe = wsClient.state.subscribe((state) => {
			isWsConnected = state.status === 'connected';
		});

		// Subscribe to incoming game state updates
		const unsubscribe = wsClient.state.subscribe((state) => {
			if (state.lobby?.gameState && shouldSyncGameState) {
				// Update local game state from server
				const serverState = state.lobby.gameState;
				shouldSyncGameState = false; // Prevent sending update back
				gameState.update((localState) => ({
					...localState,
					players: serverState.players.map(
						(p) =>
							new Player(
								p.name,
								(p.image as keyof typeof playerImages) || 'default',
								p.position ?? 0,
								p.id
							)
					),
					turn: serverState.turn,
					currentTurnPlayerId: serverState.currentTurnPlayerId
				}));
				// Re-enable syncing after update
				setTimeout(() => {
					shouldSyncGameState = true;
				}, 100);
			}
		});

		onDestroy(() => {
			statusUnsubscribe();
			unsubscribe();
			wsClient?.disconnect();
		});
	}

	// Subscribe to local game state changes and send to server
	if (isMultiDevice && wsClient) {
		gameState.subscribe(($state) => {
			if (shouldSyncGameState && wsClient && isWsConnected) {
				wsClient.updateGameState({
					players: $state.players,
					turn: $state.turn,
					currentTurnPlayerId: $state.currentTurnPlayerId,
					inGame: $state.inGame
				});
			}
		});
	}

	const leftBorderSize = 2;
	const topBorderSize = 2;
	const xTileSize = 12;
	const yTileSize = 12;
	const imagePlayerSize = 9;
	const playerSize = 4;
	const minDistance = 2;

	const xRandomPlacement = 6;
	const yRandomPlacement = 6;

	const oldPositions = Array($gameState.players.length ?? 0).fill(-1);
	const oldCoordinates: [number, number][] = Array($gameState.players.length ?? 0).fill([
		Number.NEGATIVE_INFINITY,
		Number.NEGATIVE_INFINITY
	]);
	let coordinates = derived(gameState, ($gameState) =>
		$gameState.players.map((player, index) => calculatePosition(player.position, index))
	);
	let dieRolling = $state(false);

	let overlayButtonText: string | null = $state(null);
	let currentTile: Tile<any, any> | null = $state(null);

	$gameState.currentTurnPlayerId = $gameState.players[0].id;

	let currentPlayer = derived(
		gameState,
		($gameState) =>
			$gameState.players.find((p) => p.id === $gameState.currentTurnPlayerId) ??
			new Player('Unknown', 'default')
	);
	let currentPlayerIndex = derived(gameState, ($gameState) =>
		$gameState.players.findIndex((p) => p.id === $gameState.currentTurnPlayerId)
	);

	let nextPlayer = derived(gameState, () => {
		const start = $currentPlayerIndex + 1;
		let index = start;
		while (
			hasPlayerWon(index % $gameState.players.length) &&
			index - start <= $gameState.players.length
		) {
			index++;
		}
		return $gameState.players[index % $gameState.players.length];
	});

	function calculateRandom(x: number, y: number, playerIndex: number): [number, number] {
		let boardX = x * xTileSize;
		let boardY = y * yTileSize;
		const maxAttempts = 25;
		for (let attempt = 0; attempt < maxAttempts; attempt++) {
			let candidateX = boardX + xRandomPlacement * Math.random();
			let candidateY = boardY + yRandomPlacement * Math.random();
			if (
				!oldCoordinates.find(
					(val, i) =>
						i != playerIndex &&
						Math.sqrt(Math.pow(val[0] - candidateX, 2) + Math.pow(val[1] - candidateY, 2)) <
							minDistance
				)
			) {
				const result: [number, number] = [candidateX, candidateY];
				oldCoordinates[playerIndex] = result;
				return result;
			}
		}
		// Fallback: just use a random position, even if it overlaps
		let fallbackX = boardX + xRandomPlacement * Math.random();
		let fallbackY = boardY + yRandomPlacement * Math.random();
		const fallback: [number, number] = [fallbackX, fallbackY];
		oldCoordinates[playerIndex] = fallback;
		return fallback;
	}

	function calculatePosition(pos: number, index: number): [number, number] {
		if (pos === oldPositions[index]) return oldCoordinates[index];
		const y =
			Math.min(7, pos) -
			(pos > 14 ? Math.min(21, pos) - 14 : 0) +
			(pos > 27 ? Math.min(33, pos) - 27 : 0) -
			(pos > 38 ? Math.min(43, pos) - 38 : 0) +
			(pos > 47 ? Math.min(51, pos) - 47 : 0) -
			(pos > 54 ? 3 : 0);
		const x =
			(pos > 7 ? Math.min(14, pos) - 7 : 0) -
			(pos > 21 ? Math.min(27, pos) - 21 : 0) +
			(pos > 33 ? Math.min(38, pos) - 33 : 0) -
			(pos > 43 ? Math.min(47, pos) - 43 : 0) +
			(pos > 51 ? Math.min(54, pos) - 51 : 0) -
			(pos > 54 ? 2 : 0);
		oldPositions[index] = pos;
		return calculateRandom(x, y, index);
	}

	function hasPlayerWon(index: number): boolean {
		return $gameState.players[index].position >= lastTilePosition;
	}

	function allPlayersWon(): boolean {
		return $gameState.players.length > 0 && $gameState.players.every((_, i) => hasPlayerWon(i));
	}

	function nextTurn() {
		if (allPlayersWon()) {
			dieRolling = false;
			currentTile = null;
			return;
		}
		if (
			tiles.hasOwnProperty($nextPlayer.position) &&
			tiles[$nextPlayer.position].moveStartElement
		) {
			showTileForPlayer($nextPlayer);
		} else {
			dieRolling = true;
		}
	}

	async function onDiceRolled(results: number[]) {
		const startPos = $currentPlayer.position;
		const steps = results[0];
		let endPos = Math.min(startPos + steps, lastTilePosition);

		// Check for unskippable tiles on the path
		for (let i = 1; i <= steps; i++) {
			const checkPos = startPos + i;
			if (tiles.hasOwnProperty(checkPos) && tiles[checkPos]?.unskippable) {
				endPos = checkPos;
				break;
			}
		}

		gameState.update((state) => {
			state.players = state.players.map((p) => {
				if (p.id === $currentPlayer.id) {
					p.position = endPos;
				}
				return p;
			});
			return state;
		});
		dieRolling = false;
		showTileForPlayer($currentPlayer);
	}

	function showTileForPlayer(player: Player) {
		const pos = player.position;
		if (tiles.hasOwnProperty(pos)) {
			const tile = tiles[pos];
			currentTile = tile;
		} else {
			currentTile = null;
			endTurn();
		}
	}

	let customTileElement: { onActionButtonClick?: () => void } = $state({});

	function buildDefaultOverlayProps(): ElementProps {
		return {
			players: $gameState.players,
			setActionButtonText: (text: string | null) => {
				overlayButtonText = text;
			},
			movePlayer: (offset: number, index: number, triggerTile?: boolean) => {
				$gameState.players[index].position += offset;
				if (triggerTile !== false) {
					showTileForPlayer($gameState.players[index]);
				}
			},
			positions: $gameState.players.map((player) => player.position),
			currentPlayerIndex: $currentPlayerIndex
		};
	}

	function endTurn() {
		$gameState.turn += 1;
		$gameState.currentTurnPlayerId = $nextPlayer.id;
		currentTile = null;
	}

	function handleNextTurnButtonClick() {
		if (allPlayersWon()) {
			clearGameState();
		} else if (currentTile !== null) {
			if (overlayButtonText) {
				customTileElement.onActionButtonClick?.();
			} else endTurn();
		} else {
			nextTurn();
		}
	}
</script>

<section style="height: 100vh; height: 100svh;" class="flex w-full flex-col items-start pb-2">
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="game relative m-auto aspect-square max-h-[100vw] max-w-[100vw] grow-1 bg-contain bg-no-repeat cursor-pointer"
		style="background-image: url({board});"
		onclick={handleNextTurnButtonClick}
		role="button"
		tabindex="-1"
	>
		{#each { length: $gameState.players.length } as _, i}
			<div
				style="
				left: {leftBorderSize + $coordinates[i][0]}%;
				bottom: {topBorderSize + $coordinates[i][1]}%;
				height: {$gameState.players[i].image === 'default' ? playerSize : imagePlayerSize}%;
				aspect-ratio: 1/1;
				"
				class="transition-[bottom, left] absolute flex
				aspect-square items-center justify-center duration-500 ease-in-out"
			>
				{#if $gameState.players[i].image === 'default'}
					<div
						class="aspect-square h-full w-full rounded-xl
						border-2 border-solid border-black"
						style="background-color: {colors[i % colors.length]}"
					></div>
				{:else}
					<img
						src={playerImages[$gameState.players[i].image]}
						alt={`Player ${i + 1}`}
						class="absolute aspect-square drop-shadow-2xl"
					/>
				{/if}
			</div>
		{/each}
		<div class="absolute flex h-full w-full flex-col items-center justify-center">
			{#if dieRolling}
				<Dice result={onDiceRolled} />
			{/if}
			{#if currentTile !== null}
				<div
					in:fade={{ duration: 1200 }}
					class="backdrop flex h-full w-full flex-col items-center justify-center bg-black/60"
				>
					<p class="p-5 text-center text-2xl text-white">{currentTile.message}</p>
					{#if currentTile.image}
						<img src={currentTile.image} alt={currentTile.message} class="w-[40%] object-contain" />
					{/if}
					{#if currentTile.customElement}
						<currentTile.customElement
							bind:this={customTileElement}
							{...{ ...currentTile.props, ...buildDefaultOverlayProps() }}
						/>
					{/if}
				</div>
			{/if}
		</div>
	</div>
	<style>
		.game {
			color: white;
		}
	</style>
	{#if $gameState.players.length > 0}
		<p class="my-4 w-full grow-0 text-center text-2xl text-white">
			Pelaajan {$currentPlayer.name} vuoro!
		</p>
	{/if}

	<div class="m-auto flex grow-0 items-center justify-center gap-12">
		{#snippet nextTurnButton()}
			<Button
				size="lg"
				class="m-auto grow-0 "
				variant="outline"
				disabled={dieRolling}
				onclick={handleNextTurnButtonClick}
			>
				{currentTile !== null
					? overlayButtonText
						? overlayButtonText
						: 'Sulje'
					: allPlayersWon()
						? 'Takaisin aloitusnäyttöön'
						: 'Seuraava vuoro'}
			</Button>
		{/snippet}
		{#if $gameState.spacebarTooltipShown || !shouldShowTooltip}
			{@render nextTurnButton()}
		{:else}
			<Tooltip.Provider>
				<Tooltip.Root>
					<Tooltip.Trigger>
						{@render nextTurnButton()}
					</Tooltip.Trigger>
					<Tooltip.Content class="align-center flex gap-2 text-center">
						<p class="text-lg">
							Vinkki: Voit myös painaa välilyöntiä siirtyäksesi seuraavaan vuoroon!
						</p>
						<button
							onclick={() => {
								gameState.update((state) => {
									state.spacebarTooltipShown = true;
									return state;
								});
							}}
							disabled={$gameState.spacebarTooltipShown}
						>
							<X class="h-6 w-6 cursor-pointer" />
						</button>
					</Tooltip.Content>
				</Tooltip.Root>
			</Tooltip.Provider>
		{/if}
		<PlayerEditor
			players={$gameState.players}
			onSubmit={(players) => {
				$gameState.players = players;
			}}
		/>
	</div>
</section>

<svelte:window
	on:keydown={(e) => {
		if (e.key === ' ' && !dieRolling) {
			handleNextTurnButtonClick();
		}
	}}
/>

<style>
	* {
		touch-action: manipulation;
	}
</style>
