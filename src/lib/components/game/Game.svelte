<script lang="ts">

	import Button from "$lib/components/ui/button/button.svelte";
	import Dice from "$lib/components/ui/dice/Dice.svelte"
	import { tiles, type Tile } from "./tiles/tiles";
	import type { ElementProps } from "./tiles/elements/elementProps";
	import { fade } from "svelte/transition";
	import { gameStateStore as gameState, tryLoadData } from "$lib/gameState.svelte";
	import { derived } from "svelte/store";

	const colors = ["#3559e8", "#d8de23", "#12e627", "#db1229"];
	
	const leftBorderSize = 2;
	const topBorderSize = 2;
	const xTileSize = 12;
	const yTileSize = 12;
	const playerSize = 4;
	const minDistance = 2;

	const xRandomPlacement = 8;
	const yRandomPlacement = 8;

	if($gameState.positions.length === 0) {
		$gameState.positions = Array($gameState.players.length).fill(0);
	}
	const oldPositions = Array($gameState.players.length ?? 0).fill(-1);
	const oldCoordinates: [number, number][] = Array($gameState.players.length ?? 0)
		.fill([Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY]);
	let coordinates = derived(gameState, ($gameState) => $gameState.positions.map((pos, index) => calculatePosition(pos, index)));
	let dieRolling = $state(false);

	let overlayButtonText: string | null = $state(null);

	let currentTile: Tile<any, any> | null = $state(null);

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
		                Math.sqrt(
		                    Math.pow(val[0] - candidateX, 2) +
		                    Math.pow(val[1] - candidateY, 2)
		                ) < minDistance
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
		const y = Math.min(7, pos) 
			- (pos > 14 ? Math.min(21, pos) - 14 : 0)
			+ (pos > 27 ? Math.min(33, pos) - 27 : 0)
			- (pos > 38 ? Math.min(43, pos) - 38 : 0)
			+ (pos > 47 ? Math.min(51, pos) - 47 : 0)
			- (pos > 54 ? 3 : 0);
		const x = 
			(pos > 7 ? Math.min(14, pos) - 7 : 0)
			- (pos > 21 ? Math.min(27, pos) - 21 : 0)
			+ (pos > 33 ? Math.min(38, pos) - 33 : 0)
			- (pos > 43 ? Math.min(47, pos) - 43 : 0)
			+ (pos > 51 ? Math.min(54, pos) - 51 : 0)
			- (pos > 54 ? 2 : 0);
		oldPositions[index] = pos;
		return calculateRandom(x, y, index)
	}

	function hasPlayerWon(index: number): boolean {
		return $gameState.positions[index] === 55;
	}

	function allPlayersWon(): boolean {
		return $gameState.players.length > 0 && $gameState.players.every((_, i) => hasPlayerWon(i));
	}

	function nextTurn() {
		let playerCount = $gameState.players.length;
		if (allPlayersWon()) {
			dieRolling = false;
			currentTile = null;
			return;
		}
		let nextPlayer = $gameState.turn % playerCount;
		let attempts = 0;
		while (hasPlayerWon(nextPlayer) && attempts < playerCount) {
			$gameState.turn += 1;
			nextPlayer = $gameState.turn % playerCount;
			attempts++;
		}
		if (tiles.hasOwnProperty($gameState.positions[nextPlayer]) && 
			tiles[$gameState.positions[nextPlayer]].moveStartElement) {
			showTileForPlayer(nextPlayer);
		} else {
			dieRolling = true;
		}
	}

	async function onDiceRolled(results: number[]) {
		const currentPlayer = $gameState.turn % $gameState.players.length;
		const startPos = $gameState.positions[currentPlayer];
		const steps = results[0];
		let endPos = startPos + steps;

		// Check for unskippable tiles on the path
		for (let i = 1; i <= steps; i++) {
			const checkPos = startPos + i;
			if (tiles.hasOwnProperty(checkPos) && tiles[checkPos]?.unskippable) {
				endPos = checkPos;
				break;
			}
		}

		$gameState.positions[currentPlayer] = endPos;
		dieRolling = false;
		showTileForPlayer(currentPlayer);
	}

	function showTileForPlayer(index: number) {
		const pos = $gameState.positions[index];
		if (tiles.hasOwnProperty(pos)) {
			const tile = tiles[pos];
			currentTile = tile;
		}
	}

	let customTileElement: { onActionButtonClick?: () => void; } = $state({});

	function buildDefaultOverlayProps(): ElementProps {
		return {
			players: $gameState.players,
			setActionButtonText: (text: string | null) => {
				overlayButtonText = text;
			},
			movePlayer: (offset: number, index: number, triggerTile?: boolean) => {
				$gameState.positions[index] += offset;
				if (triggerTile !== false) {
					showTileForPlayer(index);
				}
			},
			positions: $gameState.positions,
			currentPlayerIndex: $gameState.turn % $gameState.players.length
		}
	}

	function endTurn() {
		$gameState.turn += 1;
		currentTile = null;
	}
</script>

<section
	style="height: 100vh; height: 100svh;"
	class="w-full flex flex-col items-start">
	<div class="game grow-1 relative aspect-square bg-no-repeat max-w-[100vw] max-h-[100vw] m-auto bg-[url(/gorilla.png)] bg-contain">
		{#each {length: $gameState.players.length} as _, i}
		<div 
		style="
			background-color: {colors[i % colors.length]};
			left: {leftBorderSize + $coordinates[i][0]}%;
			bottom: {topBorderSize + $coordinates[i][1]}%;
			height: {playerSize}%;
			" 
		class="absolute aspect-square border-2 border-solid border-black 
			rounded-xl flex items-center justify-center
			transition-[bottom, left] ease-in-out duration-500">
			<p class="text-black text-[3vw] text-center"
			>{i + 1}</p>
		</div>
		{/each}
		<div class="absolute w-full h-full flex flex-col items-center justify-center">
			{#if dieRolling}
				<Dice
					result={onDiceRolled}
				/>
			{/if}
			{#if currentTile !== null}
				<div in:fade={{duration: 1200}} class="backdrop bg-black/60 w-full h-full flex flex-col items-center justify-center">
					<p class="text-white text-center text-2xl p-5">{currentTile.message}</p>
					{#if currentTile.image}
						<img src={currentTile.image} alt={currentTile.message} class="object-contain w-[40%]" />
					{/if}
					{#if currentTile.customElement}
						<currentTile.customElement bind:this={customTileElement} {...{...currentTile.props, ...buildDefaultOverlayProps()}}/>
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
		<p class="text-white grow-0 text-center text-2xl my-4 w-full">Pelaajan {$gameState.players[$gameState.turn % $gameState.players.length].name} vuoro!</p>
	{/if}
	
	<Button 
		class="grow-0 m-auto" 
		variant="outline"
		disabled={dieRolling}
		onclick={() => { 
			if (allPlayersWon()) {
				gameState.set({ players: [], positions: [], turn: 0, inGame: false });
			}
			else if (currentTile !== null) {
				if (overlayButtonText) {
					customTileElement.onActionButtonClick?.();
				}
				else endTurn();
			} else {
				nextTurn();
			}
		}}>
		{
			currentTile !== null ? (overlayButtonText ? overlayButtonText : "Sulje") : (allPlayersWon() ? "Takaisin aloitusnäyttöön" : "Seuraava vuoro")
		}
		</Button>
</section>