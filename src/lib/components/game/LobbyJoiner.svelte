<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Button from '../ui/button/button.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
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

	let lobbyCode = $state('');
	let playerName = $state('');
	let isConnecting = $state(true);
	let connectionError = $state<string | null>(null);
	let multiplayerState = $state<MultiplayerState | null>(null);
	let hasJoined = $state(false);

	const unsubscribe = wsClient.state.subscribe((state) => {
		multiplayerState = state;
		isConnecting = state.status === 'connecting';
		connectionError = state.error;

		// When game starts, notify parent
		if (state.lobby?.gameState && hasJoined) {
			const lobbyPlayers = state.lobby.players.map((p: Player) => ({
				id: p.id,
				name: p.name,
				image: p.image,
				position: p.position || 0
			}));
			onGameStart(lobbyPlayers, state.lobby.code);
		}
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

	function handleJoinLobby(name: string) {
		if (!lobbyCode.trim()) return;

		const player = {
			id: '',
			name: name,
			image: 'default',
			isHost: false
		};

		wsClient.joinLobby(lobbyCode.trim().toUpperCase(), player);
		hasJoined = true;
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<h2 class="text-xl">Liity pelihuoneeseen</h2>
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
			<p class="mb-4 text-gray-400">Syötä isännän antama pelihuoneen koodi liittyäksesi peliin.</p>

			<div class="mb-4">
				<label for="lobby-code-input" class="mb-2 block text-sm font-medium"
					>Pelihuoneen koodi</label
				>
				<Input
					id="lobby-code-input"
					type="text"
					bind:value={lobbyCode}
					placeholder="Esim. ABC123"
					class="text-center text-lg tracking-wider"
					maxlength="6"
				/>
			</div>

			<SinglePlayerInput
				onSubmit={handleJoinLobby}
				submitText="Liity pelihuoneeseen"
				bind:playerName
			/>
		</div>
	{:else}
		<div class="space-y-4 rounded-xl border border-green-500 bg-green-500/10 p-6">
			<div class="text-center">
				<h3 class="text-lg font-semibold">Liitytty pelihuoneeseen!</h3>
				<p class="mt-2 text-sm text-gray-400">Koodi: {multiplayerState.lobby.code}</p>
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

			<p class="text-center text-sm text-gray-400">Odotetaan, että isäntä aloittaa pelin...</p>
		</div>
	{/if}
</div>
