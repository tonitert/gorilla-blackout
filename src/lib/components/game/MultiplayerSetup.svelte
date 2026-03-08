<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import Button from '$lib/components/ui/button/button.svelte';
	import { playerImages } from './playerImages';
	import {
		createLobby,
		joinLobby,
		multiplayerStore,
		startLobbyGame
	} from '$lib/multiplayer/client';
	import { isValidLobbyCode, normalizeLobbyCode } from '$lib/multiplayer/lobbyCode';
	import { gameStateStore } from '$lib/gameState.svelte';

	let name = $state('');
	let image = $state<'default' | string>('default');
	let code = $state('');
	let error = $state('');

	async function onCreate() {
		try {
			error = '';
			await createLobby(name, image);
		} catch (e) {
			error = 'Lobbyn luonti epäonnistui';
		}
	}
	async function onJoin() {
		try {
			error = '';
			if (!isValidLobbyCode(code)) {
				error = 'Koodin tulee olla 6 merkkiä pitkä';
				return;
			}
			await joinLobby(normalizeLobbyCode(code), name, image);
		} catch {
			error = 'Liittyminen epäonnistui';
		}
	}
</script>

<div class="shadow-grey mt-6 flex flex-col gap-3 rounded-xl p-4 ring ring-gray-600">
	<h3 class="text-lg">Monilaite-tila</h3>
	<label for="multi-name">Nimi</label>
	<Input id="multi-name" bind:value={name} />
	<label for="multi-code">Liittymiskoodi (vain liittyjille)</label>
	<Input id="multi-code" bind:value={code} placeholder="ABC123" />
	<label for="multi-image">Hahmo</label>
	<select id="multi-image" class="rounded border p-2" bind:value={image}>
		<option value="default">Ei hahmoa</option>
		{#each Object.keys(playerImages) as playerImage}
			<option value={playerImage}>{playerImage}</option>
		{/each}
	</select>
	<div class="flex gap-2">
		<Button onclick={onCreate} disabled={!name}>Luo lobby</Button>
		<Button onclick={onJoin} disabled={!name || !code}>Liity lobbyyn</Button>
	</div>
	{#if error}
		<p class="text-red-500">{error}</p>
	{/if}

	{#if $multiplayerStore.lobby}
		<div class="mt-2 rounded border p-3">
			<p>Koodi: <strong>{$multiplayerStore.lobby.code}</strong></p>
			<ul>
				{#each $multiplayerStore.lobby.players as player}
					<li>{player.name}</li>
				{/each}
			</ul>
			{#if $multiplayerStore.isHost && !$multiplayerStore.lobby.inGame}
				<Button
					onclick={() => {
						startLobbyGame();
					}}
					disabled={$multiplayerStore.lobby.players.length < 2}>Aloita moninpelissä</Button
				>
			{/if}
			{#if $multiplayerStore.lobby.inGame}
				<Button
					onclick={() => {
						gameStateStore.update((state) => ({ ...state, inGame: true }));
					}}>Siirry peliin</Button
				>
			{/if}
		</div>
	{/if}
</div>
