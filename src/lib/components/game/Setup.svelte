<script lang="ts">
	import { clearGameState, gameStateStore, type GameState } from '$lib/gameState.svelte';
	import Button from '../ui/button/button.svelte';
	import logo from '$lib/assets/logo.webp';
	import PlayerSelector from './PlayerSelector.svelte';
	import type { PlayerList } from './PlayerSelector.svelte';
	import { Skeleton } from '../ui/skeleton';
	import GameModeSelector from './GameModeSelector.svelte';
	import MultiplayerSetup from './MultiplayerSetup.svelte';
	import { GameMode } from '$lib/multiplayer/types';

	let {
		onStart,
		pendingState
	}: {
		onStart: (players: PlayerList, lobbyCode?: string) => void;
		pendingState: GameState | 'loading' | undefined;
	} = $props();

	type SetupView = 'intro' | 'mode-select' | 'single-device' | 'multi-device';
	let currentView = $state<SetupView>('intro');

	function handleModeSelect(mode: GameMode) {
		if (mode === GameMode.SINGLE_DEVICE) {
			currentView = 'single-device';
		} else {
			currentView = 'multi-device';
		}
	}

	function handleSingleDeviceStart(players: PlayerList) {
		onStart(players);
	}

	function handleMultiplayerStart(players: PlayerList, lobbyCode: string) {
		onStart(players, lobbyCode);
	}
</script>

<div class="m-auto flex max-w-200 flex-col space-y-6 p-5">
	<h1>
		<img src={logo} alt="Gorilla Blackout - rankka juomapeli opiskelijoille!" />
	</h1>

	<p class="text-lg">
		Tervetuloa Gorilla Blackoutiin, kahden opiskelijan kehittämään äärimmäisen rajuun juomapeliin!
		Nopilla pelattavana lautapelinä luonnollisesti tavoitteena on päästä maaliin suorittaen tehtäviä
		laudalla, mutta se on helpommin sanottu kuin tehty - ja peli on sitä rankempi, mitä enemmän
		pelaajia on mukana!
		<br /><br />
		Pelissä juodaan paljon sekä mietoja että vahvoja, joten suosittelemme pelaajia varustautumaan varsin
		runsaasti. Onnea matkaan!
	</p>

	{#if pendingState === 'loading'}
		<Skeleton class="shadow-grey mt-10 h-[300px] w-full rounded-xl ring ring-gray-600" />
	{:else if pendingState && pendingState.inGame}
		<div
			class="pending-game shadow-grey mt-10 flex flex-col gap-2 rounded-xl p-3 shadow-2xl/30 ring ring-gray-600"
		>
			<h2 class="text-xl">Aikaisempi peli löytyi. Haluatko jatkaa?</h2>
			<p>Pelaajat:</p>
			<ul>
				{#each pendingState.players as player}
					<li>{player.name}</li>
				{/each}
			</ul>
			<Button
				onclick={() => {
					gameStateStore.set(pendingState);
				}}>Jatka peliä</Button
			>
		</div>
	{/if}

	<h2 class="text-xl">Aloita peli</h2>

	{#if currentView === 'intro' || currentView === 'mode-select'}
		<GameModeSelector
			onSelect={(mode) => {
				currentView = 'mode-select';
				handleModeSelect(mode);
			}}
		/>
	{/if}

	{#if currentView === 'single-device'}
		<div class="space-y-4">
			<Button variant="ghost" onclick={() => (currentView = 'intro')}>← Takaisin</Button>
			<PlayerSelector onSubmit={handleSingleDeviceStart}></PlayerSelector>
		</div>
	{/if}

	{#if currentView === 'multi-device'}
		<MultiplayerSetup
			onBack={() => (currentView = 'intro')}
			onGameStart={handleMultiplayerStart}
		/>
	{/if}
</div>
<footer class="p-5 text-center text-sm text-gray-500">
	<p>
		Gorilla Blackout on täysin ilmainen opiskelijoille suunnattu juomapeli, ja se on aina
		pelattavissa suomeksi netissä osoitteessa blackout.beer.
	</p>
	<p>
		Ota yhteyttä kehittäjiin: <a class="underline" href="mailto:contact@blackout.beer"
			>contact@blackout.beer</a
		>
	</p>
</footer>
