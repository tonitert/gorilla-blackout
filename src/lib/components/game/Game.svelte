<script lang="ts" module>
	export const lastTilePosition = 55;
</script>

<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import Dice from '$lib/components/ui/dice/Dice.svelte';
	import { tiles } from './tiles/tiles';
	import type { ElementProps } from './tiles/elements/elementProps';
	import { fade } from 'svelte/transition';
	import {
		gameStateStore as gameState,
		clearGameState,
		type GameState
	} from '$lib/gameState.svelte';
	import { derived } from 'svelte/store';
	import board from '$lib/assets/gorilla.png';
	import { playerImages } from './playerImages';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import X from '@lucide/svelte/icons/x';
	import PlayerEditor from './PlayerEditor.svelte';
	import { Player } from '$lib/player';
	import { IsUsingKeyboard } from 'bits-ui';
	import { isE2EMode } from '$lib/testing/e2eMode';
	import {
		multiplayerStore,
		requestServerDiceRoll,
		serverDiceRollStore
	} from '$lib/multiplayer/client';
	import { canLocalMultiplayerPlayerAct } from '$lib/multiplayer/connection';
	import { getActiveTileView } from './tiles/activeTile';
	import type { ActiveTileTrigger } from './tiles/tileVariant';

	const colors = ['#3559e8', '#d8de23', '#12e627', '#db1229'];
	const urlSearchParams =
		typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
	const e2eMode = typeof window !== 'undefined' && isE2EMode(window.location.search);
	const useDeterministicE2EDice =
		typeof window !== 'undefined' && e2eMode && urlSearchParams?.get('randomDice') !== '1';
	const autoResolveTilesInE2EMode = e2eMode && urlSearchParams?.get('playTiles') !== '1';
	const isUsingKeyboard = new IsUsingKeyboard();
	const shouldShowTooltip = $derived(isUsingKeyboard.current);

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
	let overlayButtonText: string | null = $state(null);
	let overlayButtonSessionId: number | null = $state(null);
	let currentTile = $derived(
		getActiveTileView($gameState.activeTilePosition, $gameState.activeTileTrigger)
	);
	const activeOverlayButtonText = $derived(
		overlayButtonSessionId === $gameState.activeTileSessionId ? overlayButtonText : null
	);

	let initializedTurnPlayer = $state(false);

	$effect(() => {
		if (initializedTurnPlayer || $gameState.players.length === 0 || $gameState.currentTurnPlayerId)
			return;
		initializedTurnPlayer = true;
		gameState.update((state) => ({ ...state, currentTurnPlayerId: state.players[0].id }));
	});

	let currentPlayer = derived(
		gameState,
		($gameState) =>
			$gameState.players.find((p) => p.id === $gameState.currentTurnPlayerId) ??
			new Player('Unknown', 'default')
	);
	let currentPlayerIndex = derived(gameState, ($gameState) =>
		$gameState.players.findIndex((p) => p.id === $gameState.currentTurnPlayerId)
	);

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

	function hasPlayerWonInState(state: GameState, index: number): boolean {
		return state.players[index]?.position >= lastTilePosition;
	}

	function allPlayersWonInState(state: GameState): boolean {
		return (
			state.players.length > 0 &&
			state.players.every((_, index) => hasPlayerWonInState(state, index))
		);
	}

	function getNextTurnPlayerId(state: GameState): string | null {
		if (state.players.length === 0) {
			return null;
		}

		const currentIndex = state.players.findIndex(
			(player) => player.id === state.currentTurnPlayerId
		);
		const startIndex = currentIndex >= 0 ? currentIndex + 1 : 0;
		let nextIndex = startIndex;

		while (
			hasPlayerWonInState(state, nextIndex % state.players.length) &&
			nextIndex - startIndex <= state.players.length
		) {
			nextIndex++;
		}

		return state.players[nextIndex % state.players.length]?.id ?? null;
	}

	function buildEndTurnState(state: GameState): GameState {
		return {
			...state,
			turn: state.turn + 1,
			currentTurnPlayerId: getNextTurnPlayerId(state),
			turnInProgress: false,
			turnOwnerId: null,
			phase: 'idle',
			activeTilePosition: null,
			activeTileTrigger: null,
			diceValue: null,
			tileState: null
		};
	}

	function buildTileTransitionState(
		state: GameState,
		position: number,
		trigger: ActiveTileTrigger
	): GameState {
		if (tiles.hasOwnProperty(position)) {
			return {
				...state,
				activeTilePosition: position,
				activeTileTrigger: trigger,
				activeTileSessionId: state.activeTileSessionId + 1,
				phase: 'tile',
				tileState: null
			};
		}

		return buildEndTurnState({
			...state,
			activeTilePosition: null,
			activeTileTrigger: null,
			phase: 'idle',
			tileState: null
		});
	}

	function nextTurn() {
		if (allPlayersWon()) {
			gameState.update((state) => ({
				...state,
				turnInProgress: false,
				turnOwnerId: null,
				phase: 'idle',
				activeTilePosition: null,
				activeTileTrigger: null,
				diceValue: null
			}));
			return;
		}

		serverDiceRollStore.set(null);

		gameState.update((state) => ({
			...state,
			turnInProgress: true,
			turnOwnerId: state.currentTurnPlayerId,
			phase: 'rolling',
			activeTilePosition: null,
			activeTileTrigger: null,
			diceValue: null
		}));

		if (
			tiles.hasOwnProperty($currentPlayer.position) &&
			tiles[$currentPlayer.position].moveStartElement
		) {
			showTileForPlayer($currentPlayer, 'moveStart');
		}
	}

	async function onDiceRolled(results: number[]) {
		if (!canLocalPlayerAct) {
			return;
		}
		if ($gameState.phase !== 'rolling' || !$gameState.turnInProgress) {
			return;
		}
		if (
			$multiplayerStore.mode === 'multi' &&
			$gameState.turnOwnerId !== $multiplayerStore.playerId
		) {
			return;
		}
		if ($gameState.diceValue !== null) {
			return;
		}

		const startPos = $currentPlayer.position;
		const steps = useDeterministicE2EDice ? 6 : results[0];
		let endPos = Math.min(startPos + steps, lastTilePosition);

		for (let i = 1; i <= steps; i++) {
			const checkPos = startPos + i;
			if (tiles.hasOwnProperty(checkPos) && tiles[checkPos]?.unskippable) {
				endPos = checkPos;
				break;
			}
		}

		gameState.update((state) => ({
			...state,
			diceValue: steps,
			players: state.players.map((p) =>
				p.id === $currentPlayer.id ? { ...p, position: endPos } : p
			),
			phase: 'tile'
		}));
		showTileForPlayer($currentPlayer, 'landing');
	}

	function showTileForPlayer(player: Player, trigger: ActiveTileTrigger) {
		overlayButtonText = null;
		overlayButtonSessionId = null;
		customTileElement = {};
		if (autoResolveTilesInE2EMode) {
			gameState.update((state) => buildEndTurnState(state));
			return;
		}

		gameState.update((state) => buildTileTransitionState(state, player.position, trigger));
	}

	let customTileElement: { onActionButtonClick?: () => void } = $state({});

	function buildDefaultOverlayProps(): ElementProps {
		const tileSessionId = $gameState.activeTileSessionId;
		const isActiveTileSession = () =>
			$gameState.activeTilePosition !== null && $gameState.activeTileSessionId === tileSessionId;

		return {
			players: $gameState.players,
			setActionButtonText: (text: string | null) => {
				if (!isActiveTileSession()) {
					return;
				}
				overlayButtonText = text;
				overlayButtonSessionId = tileSessionId;
			},
			tileState: $gameState.tileState,
			setTileState: (updater: (prev: Record<string, unknown>) => Record<string, unknown>) => {
				gameState.update((state) => {
					if (state.activeTilePosition === null || state.activeTileSessionId !== tileSessionId) {
						return state;
					}

					const previousTileState = state.tileState ?? {};
					const nextTileState = updater(previousTileState);

					if (nextTileState === previousTileState) {
						return state;
					}

					return {
						...state,
						tileState: nextTileState
					};
				});
			},
			canAct: canLocalPlayerAct,
			movePlayer: (offset: number, index: number, triggerTile?: boolean) => {
				gameState.update((state) => {
					if (state.activeTilePosition === null || state.activeTileSessionId !== tileSessionId) {
						return state;
					}

					const players = state.players.map((player, playerIndex) => {
						if (playerIndex !== index) return player;
						return { ...player, position: player.position + offset };
					});
					const movedPlayer = players[index];
					const movedState = { ...state, players };

					if (!movedPlayer || triggerTile === false) {
						return movedState;
					}

					return buildTileTransitionState(movedState, movedPlayer.position, 'landing');
				});
			},
			positions: $gameState.players.map((player) => player.position),
			currentPlayerIndex: $currentPlayerIndex
		};
	}

	function endTurn() {
		overlayButtonText = null;
		overlayButtonSessionId = null;
		customTileElement = {};
		gameState.update((state) => buildEndTurnState(state));
	}

	const canLocalPlayerAct = $derived.by(() => {
		return canLocalMultiplayerPlayerAct({
			mode: $multiplayerStore.mode,
			connectionState: $multiplayerStore.connectionState,
			localPlayerId: $multiplayerStore.playerId,
			currentTurnPlayerId: $gameState.currentTurnPlayerId
		});
	});

	const shouldShowReconnectOverlay = $derived(
		$multiplayerStore.mode === 'multi' && $multiplayerStore.connectionState !== 'connected'
	);

	$effect(() => {
		if ($multiplayerStore.mode !== 'multi') return;
		if (!canLocalPlayerAct) return;
		if ($gameState.phase !== 'rolling' || $gameState.diceValue !== null) return;
		if ($serverDiceRollStore !== null) return;
		requestServerDiceRoll();
	});

	function handleNextTurnButtonClick() {
		if (!canLocalPlayerAct) return;
		if (allPlayersWon()) {
			clearGameState();
		} else if (currentTile !== null) {
			if (activeOverlayButtonText) {
				customTileElement.onActionButtonClick?.();
			} else endTurn();
		} else {
			nextTurn();
		}
	}

	$effect(() => {
		if (!e2eMode || typeof window === 'undefined') return;
		const target = window as Window & {
			__GB_NEXT__?: () => void;
			__GB_TILE_ACTION__?: () => void;
		};
		target.__GB_NEXT__ = () => {
			handleNextTurnButtonClick();
		};
		target.__GB_TILE_ACTION__ = () => {
			customTileElement.onActionButtonClick?.();
		};
		return () => {
			delete target.__GB_NEXT__;
			delete target.__GB_TILE_ACTION__;
		};
	});
</script>

<section style="height: 100vh; height: 100svh;" class="flex w-full flex-col items-start pb-2">
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="game relative m-auto aspect-square max-h-[100vw] max-w-[100vw] grow-1 cursor-pointer bg-contain bg-no-repeat"
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
				class="transition-[bottom, left] absolute flex aspect-square items-center justify-center duration-500 ease-in-out"
			>
				{#if $gameState.players[i].image === 'default'}
					<div
						class="aspect-square h-full w-full rounded-xl border-2 border-solid border-black"
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
			{#if $gameState.phase === 'rolling'}
				{#if $multiplayerStore.mode === 'multi' && !useDeterministicE2EDice && $serverDiceRollStore === null}
					<p class="rounded bg-black/60 px-4 py-2 text-white">Heitetään noppaa...</p>
				{:else}
					<Dice
						result={onDiceRolled}
						riggedResult={useDeterministicE2EDice
							? [6]
							: $multiplayerStore.mode === 'multi' && $serverDiceRollStore !== null
								? [$serverDiceRollStore]
								: undefined}
						timeBetweenChanges={useDeterministicE2EDice ? 30 : 70}
						changesBeforeSettle={useDeterministicE2EDice ? 3 : 9}
						finalWaitTime={useDeterministicE2EDice ? 250 : 2000}
					/>
				{/if}
			{/if}
			{#if currentTile !== null}
				{#key $gameState.activeTileSessionId}
					<div
						in:fade={{ duration: 1200 }}
						class="backdrop flex h-full w-full flex-col items-center justify-center bg-black/60"
					>
						<p class="p-5 text-center text-2xl text-white">{currentTile.message}</p>
						{#if currentTile.image}
							<img
								src={currentTile.image}
								alt={currentTile.message}
								class="w-[40%] object-contain"
							/>
						{/if}
						{#if currentTile.element}
							<currentTile.element
								bind:this={customTileElement}
								{...{ ...currentTile.props, ...buildDefaultOverlayProps() }}
							/>
						{/if}
					</div>
				{/key}
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

	<div class="relative m-auto flex grow-0 items-center justify-center gap-12">
		{#if shouldShowReconnectOverlay}
			<div
				class="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black/75 px-4 text-center text-sm font-semibold text-white"
				data-testid="multiplayer-reconnect-overlay"
			>
				Yhteys katkennut, yritetään uudelleenyhdistää..
			</div>
		{/if}
		{#snippet nextTurnButton()}
			<Button
				size="lg"
				class="m-auto grow-0"
				variant="outline"
				disabled={$gameState.phase === 'rolling' || !canLocalPlayerAct}
				onclick={handleNextTurnButtonClick}
			>
				{currentTile !== null
					? activeOverlayButtonText
						? activeOverlayButtonText
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
			mode={$multiplayerStore.mode === 'multi' ? 'multi' : 'single'}
			inviteCode={$multiplayerStore.lobby?.code ?? null}
			disabled={shouldShowReconnectOverlay}
			onSubmit={(players) => {
				gameState.update((state) => ({ ...state, players }));
			}}
		/>
	</div>
</section>

<svelte:window
	on:keydown={(e) => {
		if (e.key === ' ' && $gameState.phase !== 'rolling' && canLocalPlayerAct) {
			handleNextTurnButtonClick();
		}
	}}
/>

<style>
	* {
		touch-action: manipulation;
	}
</style>
