<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import Button, { buttonVariants } from '$lib/components/ui/button/button.svelte';
	import Toggle from '../ui/toggle/toggle.svelte';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import {
		createLobby,
		joinLobby,
		multiplayerStore,
		startLobbyGame,
		updateLobbyPlayer
	} from '$lib/multiplayer/client';
	import { isValidLobbyCode, normalizeLobbyCode } from '$lib/multiplayer/lobbyCode';
	import { gameStateStore } from '$lib/gameState.svelte';
	import { playerImages } from './playerImages';

	type SetupMode = 'host' | 'join' | null;
	type PlayerImage = keyof typeof playerImages | 'default';

	let setupMode = $state<SetupMode>(null);
	let code = $state('');
	let error = $state('');
	let localName = $state('Pelaaja');
	let localImage = $state<PlayerImage>('default');

	const usedImages = $derived.by(() => {
		const localPlayerId = $multiplayerStore.playerId;
		return new Set(
			($multiplayerStore.lobby?.players ?? [])
				.filter((player) => player.id !== localPlayerId && player.image !== 'default')
				.map((player) => player.image)
		);
	});

	$effect(() => {
		const localPlayerId = $multiplayerStore.playerId;
		const localPlayer = $multiplayerStore.lobby?.players.find(
			(player) => player.id === localPlayerId
		);
		if (!localPlayer) return;
		localName = localPlayer.name;
		localImage = (localPlayer.image in playerImages ? localPlayer.image : 'default') as PlayerImage;
	});

	async function onCreate() {
		try {
			error = '';
			await createLobby('Pelaaja', 'default');
		} catch {
			error = 'Pelin luonti epäonnistui';
		}
	}

	async function onJoin() {
		try {
			error = '';
			if (!isValidLobbyCode(code)) {
				error = 'Koodin tulee olla 6 merkkiä pitkä';
				return;
			}
			await joinLobby(normalizeLobbyCode(code), 'Pelaaja', 'default');
		} catch {
			error = 'Liittyminen epäonnistui';
		}
	}

	async function onSavePlayer() {
		if (!localName.trim()) {
			error = 'Nimi on pakollinen';
			return;
		}
		try {
			error = '';
			await updateLobbyPlayer({
				name: localName,
				image: localImage
			});
		} catch {
			error = 'Hahmon tallennus epäonnistui (hahmo voi olla jo valittu)';
		}
	}
</script>

<div class="shadow-grey mt-6 flex flex-col gap-4 rounded-xl p-4 ring ring-gray-600">
	<h3 class="text-lg">Moninpeli</h3>

	{#if !$multiplayerStore.lobby}
		<div class="flex gap-2">
			<Button
				variant={setupMode === 'host' ? 'default' : 'outline'}
				onclick={() => (setupMode = 'host')}>Hostaa peli</Button
			>
			<Button
				variant={setupMode === 'join' ? 'default' : 'outline'}
				onclick={() => (setupMode = 'join')}>Liity peliin</Button
			>
		</div>

		{#if setupMode === 'host'}
			<Button onclick={onCreate}>Luo peli</Button>
		{:else if setupMode === 'join'}
			<label for="multi-code">Liittymiskoodi</label>
			<Input id="multi-code" bind:value={code} placeholder="ABC123" />
			<Button data-testid="join-lobby-submit" onclick={onJoin} disabled={!code}>Liity peliin</Button
			>
		{/if}
	{/if}

	{#if error}
		<p class="text-red-500">{error}</p>
	{/if}

	{#if $multiplayerStore.lobby}
		<div class="rounded border p-3">
			<p>Koodi: <strong>{$multiplayerStore.lobby.code}</strong></p>

			<div class="mt-3 rounded border border-gray-500 p-3">
				<label for="multi-name">Nimi</label>
				<Input id="multi-name" class="mt-2" bind:value={localName} />

				<Collapsible.Root class="mt-5">
					<Collapsible.Trigger
						class={buttonVariants({
							variant: 'ghost',
							size: 'sm',
							class: 'w-full justify-start p-2'
						})}
					>
						<div class="flex w-full items-center space-x-2">
							<h4 class="text-sm font-semibold">Valitse pelihahmo</h4>
							<ChevronsUpDownIcon class="ml-auto" />
							<span class="sr-only">Toggle</span>
						</div>
					</Collapsible.Trigger>
					<Collapsible.Content>
						<div class="mt-2 grid w-full grid-cols-3 gap-2">
							<Toggle
								class="flex h-[unset] w-full flex-col items-center justify-center p-3"
								pressed={localImage === 'default'}
								onclick={(e) => {
									localImage = 'default';
									e.preventDefault();
								}}
							>
								<p class="text-center text-xs">Ei hahmoa</p>
							</Toggle>
							{#each Object.entries(playerImages) as [name, image] (name)}
								<Toggle
									class="flex h-[unset] w-full flex-col items-center justify-center p-3"
									disabled={usedImages.has(name)}
									pressed={localImage === name}
									onclick={(e) => {
										localImage = name as PlayerImage;
										e.preventDefault();
									}}
								>
									<img src={image} alt={name} class="h-16 w-16 object-contain" />
									<p class="mt-1 text-center text-xs break-words">{name}</p>
								</Toggle>
							{/each}
						</div>
					</Collapsible.Content>
				</Collapsible.Root>

				<Button class="mt-4" onclick={onSavePlayer}>Tallenna pelaaja</Button>
			</div>

			<ul class="mt-4 space-y-1">
				{#each $multiplayerStore.lobby.players as player (player.id)}
					<li class="flex items-center gap-2">
						{#if player.image !== 'default' && player.image in playerImages}
							<img
								src={playerImages[player.image as keyof typeof playerImages]}
								alt={`${player.name} hahmo`}
								class="h-8 w-8 object-contain"
							/>
						{/if}
						<span>{player.name}</span>
					</li>
				{/each}
			</ul>

			{#if $multiplayerStore.isHost && !$multiplayerStore.lobby.inGame}
				<div class="mt-6">
					<Button
						onclick={() => {
							startLobbyGame();
						}}
						disabled={$multiplayerStore.lobby.players.length < 2}>Aloita moninpeli</Button
					>
				</div>
			{/if}
			{#if $multiplayerStore.lobby.inGame}
				<div class="mt-4">
					<Button
						onclick={() => {
							gameStateStore.update((state) => ({
								...state,
								players: $multiplayerStore.lobby?.players ?? state.players,
								currentTurnPlayerId:
									$multiplayerStore.lobby?.players[0]?.id ?? state.currentTurnPlayerId,
								turnInProgress: false,
								turnOwnerId: null,
								phase: 'idle',
								activeTilePosition: null,
								diceValue: null,
								inGame: true
							}));
						}}>Siirry peliin</Button
					>
				</div>
			{/if}
		</div>
	{/if}
</div>
