<script lang="ts">

	import Button from "$lib/components/ui/button/button.svelte";
	import Dice from "$lib/components/ui/dice/Dice.svelte"
	import { tiles, type Tile } from "./tiles/tiles";
	import type { ElementProps } from "./tiles/elements/elementProps";

	const {
		players = ["Test1", "Test2", "Test3", "Test4"]
	 }: {
		players?: string[]
	} = $props();

	const playerCount = players.length
	const colors = ["#3559e8", "#d8de23", "#12e627", "#db1229"];
	
	const leftBorderSize = 2;
	const topBorderSize = 2;
	const xTileSize = 12;
	const yTileSize = 12;
	const playerSize = 4;
	const minDistance = 2;

	const xRandomPlacement = 8;
	const yRandomPlacement = 8;

	const positions = $state(Array(playerCount).fill(0));
	const oldPositions = Array(playerCount).fill(-1)
	const oldCoordinates: [number, number][] = Array(playerCount)
		.fill([Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY]);
	let coordinates: [number, number][] = 
		$derived(positions.map((pos, index) => calculatePosition(pos, index)))
	let turn = $state(0);
	let dieRolling = $state(false);

	let currentTile: Tile<any> | null = $state(null);

	$inspect(positions);

	function calculateRandom(x: number, y: number, playerIndex: number): [number, number] {
		let boardX = x * xTileSize;
		let boardY = y * yTileSize;

		while(true) {
			let candidateX = boardX + xRandomPlacement * Math.random();
			let candidateY = boardY + yRandomPlacement * Math.random();
			if (oldCoordinates.find((val, i) => i != playerIndex && Math.sqrt(
					Math.pow(val[0] - candidateX, 2) + 
					Math.pow(val[1] - candidateY, 2)) < minDistance)) {
						continue;
					}
			const result: [number, number] = [candidateX, candidateY];
			oldCoordinates[playerIndex] = result;
			return result;
		}
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

	async function onDiceRolled(results: number[]) {
		positions[turn % playerCount] += results[0];
		const pos = positions[turn % playerCount];
		turn += 1;
		dieRolling = false
		if (tiles.hasOwnProperty(pos)) {
			const tile = tiles[pos];
			currentTile = tile;
		}
	}

	function onOverlayFinished() {

	}
	
	function buildDefaultOverlayProps(): ElementProps {
		return {
			players: players,
			finishedCallback: onOverlayFinished
		}
	}

</script>

<link rel="preload" as="video" href="video/rajupyora.mp4" type="video/mp4"/>
<section class="w-full h-[100vh] flex flex-col items-start">
	<div class="game grow-1 relative aspect-square bg-no-repeat max-w-[100vw] max-h-[100vw] m-auto bg-[url(/gorilla.png)] bg-contain">
		{#each {length: playerCount} as _, i}
		<div 
		style="
			background-color: {colors[i % colors.length]};
			left: {leftBorderSize + coordinates[i][0]}%;
			bottom: {topBorderSize + coordinates[i][1]}%;
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
				<div class="backdrop bg-black/60 w-full h-full flex flex-col items-center justify-center">
					<p class="text-white text-2xl">{currentTile.message}</p>
					{#if currentTile.customElement}
						<currentTile.customElement {...{...currentTile.props, ...buildDefaultOverlayProps()}}/>
					{/if}
					<style>
						@keyframes fade-in {
							0% {
								opacity: 0%;
							}
							100% {
								opacity: 100%;
							}
						}
						.backdrop {
							animation: fade-in 0.5s linear;
						}
					</style>
				</div>
			{/if}
		</div>
	</div>
	<style>
		.game {
			color: white;
		}
	</style>
	<p class="text-white grow-0 text-center text-2xl my-4 w-full">Pelaajan {players[turn % playerCount]} vuoro!</p>
	<Button 
		class="grow-0 m-auto" 
		variant="outline"
		disabled={dieRolling}
		onclick={() => { 
			if (currentTile !== null) {
				currentTile = null;
			} else {
				dieRolling = true;
			}
		 }}>{currentTile !== null ? "Sulje" : "Heitä noppaa"}</Button>
</section>
<section class="">
	
</section>