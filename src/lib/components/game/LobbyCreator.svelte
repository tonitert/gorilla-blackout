<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Button from '../ui/button/button.svelte';
	import { WebSocketClient, type MultiplayerState } from '$lib/multiplayer/websocketClient';
	import SinglePlayerInput from './SinglePlayerInput.svelte';
	import type { Player } from '$lib/multiplayer/types';

	let {
		wsClient,
		onBack,
		onGameStart
	}: {
		wsClient: WebSocketClient;
		onBack: () => void;
		onGameStart: (players: any[], lobbyCode: string) => void;
	} = $props();

	let multiplayerState = $state<MultiplayerState | null>(null);
	let isConnecting = $state(true);
	let connectionError = $state<string | null>(null);
	let playerName = $state('');

	const unsubscribe = wsClient.state.subscribe((state) => {
		multiplayerState = state;
		isConnecting = state.status === 'connecting';
		connectionError = state.error;
	});

	onMount(async () => {
		try {
			await wsClient.connect();
		} catch (error) {
			console.error('Failed to connect:', error);
			connectionError = 'Palvelimeen yhdistäminen epäonnistui';
		}
	});

	onDestroy(() => {
		unsubscribe();
	});

	function handleCreateLobby(name: string) {
		const player = {
			id: '',
			name: name,
			image: 'default',
			isHost: true
		};

		wsClient.createLobby(player);
	}

	function handleStartGame() {
		if (!multiplayerState?.lobby) return;

		// Use all players from the lobby
		const lobbyPlayers = multiplayerState.lobby.players.map((p: Player) => ({
			id: p.id,
			name: p.name,
			image: p.image,
			position: 0
		}));

		onGameStart(lobbyPlayers, multiplayerState.lobby.code);
	}

	function copyCodeToClipboard() {
		if (multiplayerState?.lobby?.code) {
			navigator.clipboard.writeText(multiplayerState.lobby.code);
		}
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<h2 class="text-xl">Luo pelihuone</h2>
		<Button variant="ghost" class="cursor-pointer" onclick={onBack}>Takaisin</Button>
	</div>

	{#if isConnecting}
		<div class="rounded-xl border border-gray-600 p-6 text-center">
			<p class="text-gray-400">Yhdistetään palvelimeen...</p>
		</div>
	{:else if connectionError}
		<div class="rounded-xl border border-red-500 bg-red-500/10 p-6">
			<p class="text-red-400">{connectionError}</p>
			<Button class="mt-4 cursor-pointer" onclick={onBack}>Takaisin</Button>
		</div>
	{:else if !multiplayerState?.lobby}
		<div class="rounded-xl border border-gray-600 p-6">
			<p class="mb-4 text-gray-400">
				Anna oma nimesi ja luo pelihuone. Saat koodin, jonka muut pelaajat voivat käyttää
				liittyäkseen peliin.
			</p>

			<SinglePlayerInput
				onSubmit={handleCreateLobby}
				submitText="Luo pelihuone"
				bind:playerName
			/>
		</div>
	{:else}
		<div class="space-y-4 rounded-xl border border-green-500 bg-green-500/10 p-6">
			<div class="text-center">
				<h3 class="text-lg font-semibold">Pelihuone luotu!</h3>
				<p class="mt-2 text-sm text-gray-400">Jaa tämä koodi muille pelaajille:</p>
			</div>

			<div class="flex items-center justify-center space-x-2">
				<div class="rounded-lg bg-black/30 px-6 py-3">
					<span class="text-3xl font-bold tracking-wider">{multiplayerState.lobby.code}</span>
				</div>
				<Button variant="outline" class="cursor-pointer" onclick={copyCodeToClipboard}
					>Kopioi</Button
				>
			</div>

			<div class="rounded-lg border border-gray-600 p-4">
				<h4 class="mb-2 font-semibold">Pelaajat ({multiplayerState.lobby.players.length})</h4>
				<ul class="space-y-1">
					{#each multiplayerState.lobby.players as player (player.id)}
						<li class="flex items-center justify-between rounded bg-black/20 px-3 py-2">
							<span>{player.name}</span>
							{#if player.isHost}
								<span class="text-xs text-yellow-500">👑 Isäntä</span>
							{/if}
						</li>
					{/each}
				</ul>
			</div>

			<div class="flex space-x-2">
				<Button
					class="flex-1 cursor-pointer"
					onclick={handleStartGame}
					disabled={multiplayerState.lobby.players.length < 2}
				>
					Aloita peli
				</Button>
			</div>

			{#if multiplayerState.lobby.players.length < 2}
				<p class="text-center text-sm text-gray-400">Odota vähintään 2 pelaajaa aloittaaksesi</p>
			{/if}
		</div>
	{/if}
</div>
