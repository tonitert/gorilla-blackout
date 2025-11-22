<script lang="ts">
	import { onDestroy } from 'svelte';
	import { WebSocketClient } from '$lib/multiplayer/websocketClient';
	import Button from '../ui/button/button.svelte';
	import LobbyCreator from './LobbyCreator.svelte';
	import LobbyJoiner from './LobbyJoiner.svelte';
	import type { PlayerList } from './PlayerSelector.svelte';

	let {
		onBack,
		onGameStart
	}: {
		onBack: () => void;
		onGameStart: (players: PlayerList, lobbyCode: string) => void;
	} = $props();

	type MultiplayerView = 'select' | 'create' | 'join';
	let currentView = $state<MultiplayerView>('select');

	// Get the backend URL from environment or use default
	const backendUrl =
		typeof window !== 'undefined'
			? window.location.hostname === 'localhost'
				? 'ws://localhost:3001/ws'
				: `ws://${window.location.hostname}:3001/ws`
			: 'ws://localhost:3001/ws';

	const wsClient = new WebSocketClient(backendUrl);

	onDestroy(() => {
		wsClient.disconnect();
	});

	function handleGameStart(players: PlayerList, lobbyCode: string) {
		onGameStart(players, lobbyCode);
	}
</script>

<div class="space-y-6">
	{#if currentView === 'select'}
		<div class="space-y-6">
			<div class="flex items-center justify-between">
				<h2 class="text-xl">Monilaitepeli</h2>
				<Button variant="ghost" class="cursor-pointer" onclick={onBack}>Takaisin</Button>
			</div>

			<p class="text-gray-400">
				Monilaitepelissä jokainen pelaaja voi käyttää omaa laitettaan. Yksi pelaaja luo pelihuoneen
				ja jakaa koodin muille pelaajille.
			</p>

			<div class="grid gap-4 sm:grid-cols-2">
				<button
					class="cursor-pointer flex flex-col items-center justify-center space-y-3 rounded-xl border-2 border-gray-600 p-6 transition-all hover:border-blue-500 hover:bg-blue-500/10"
					onclick={() => (currentView = 'create')}
				>
					<div class="text-5xl">➕</div>
					<h3 class="text-lg font-semibold">Luo pelihuone</h3>
					<p class="text-center text-sm text-gray-400">Luo uusi pelihuone ja jaa koodi muille</p>
				</button>

				<button
					class="cursor-pointer flex flex-col items-center justify-center space-y-3 rounded-xl border-2 border-gray-600 p-6 transition-all hover:border-blue-500 hover:bg-blue-500/10"
					onclick={() => (currentView = 'join')}
				>
					<div class="text-5xl">🔗</div>
					<h3 class="text-lg font-semibold">Liity pelihuoneeseen</h3>
					<p class="text-center text-sm text-gray-400">Liity peliin käyttäen koodia</p>
				</button>
			</div>
		</div>
	{:else if currentView === 'create'}
		<LobbyCreator
			{wsClient}
			onBack={() => (currentView = 'select')}
			onGameStart={handleGameStart}
		/>
	{:else if currentView === 'join'}
		<LobbyJoiner {wsClient} onBack={() => (currentView = 'select')} onGameStart={handleGameStart} />
	{/if}
</div>
