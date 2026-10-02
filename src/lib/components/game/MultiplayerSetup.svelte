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
	import { buildJoinGameUrl, getJoinCodeFromSearch } from '$lib/multiplayer/invite';
	import QrCode from '$lib/components/ui/QrCode.svelte';
	import { isValidLobbyCode, normalizeLobbyCode } from '$lib/multiplayer/lobbyCode';
	import { gameStateStore } from '$lib/gameState.svelte';
	import { playerImages } from './playerImages';
	import { Player } from '$lib/player';
	import { m } from '$lib/paraglide/messages';

	type SetupMode = 'host' | 'join' | null;
	type PlayerImage = keyof typeof playerImages | 'default';

	let setupMode = $state<SetupMode>(null);
	let code = $state('');
	// Stored as a message getter so the error re-translates if the language changes.
	let error = $state<(() => string) | null>(null);
	let localName = $state(m.multi_default_name());
	let localImage = $state<PlayerImage>('default');
	let appliedJoinCode = $state(false);

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

	const inviteUrl = $derived.by(() => {
		if (typeof window === 'undefined' || !$multiplayerStore.lobby?.code) {
			return null;
		}

		return buildJoinGameUrl($multiplayerStore.lobby.code, window.location.origin);
	});

	$effect(() => {
		if (appliedJoinCode || typeof window === 'undefined' || $multiplayerStore.lobby) {
			return;
		}

		const joinCode = getJoinCodeFromSearch(window.location.search);
		if (!joinCode) {
			appliedJoinCode = true;
			return;
		}

		appliedJoinCode = true;
		setupMode = 'join';
		code = joinCode;
	});

	async function onCreate() {
		try {
			error = null;
			await createLobby(m.multi_default_name(), 'default');
		} catch {
			error = m.multi_create_failed;
		}
	}

	async function onJoin() {
		try {
			error = null;
			if (!isValidLobbyCode(code)) {
				error = m.multi_code_length;
				return;
			}
			await joinLobby(normalizeLobbyCode(code), m.multi_default_name(), 'default');
		} catch {
			error = m.multi_join_failed;
		}
	}

	async function onSaveImage(image: PlayerImage) {
		try {
			error = null;
			await updateLobbyPlayer({ image });
		} catch {
			error = m.common_image_save_failed;
		}
	}

	async function onSaveName() {
		if (!localName.trim()) {
			error = m.common_name_required;
			return;
		}
		try {
			error = null;
			await updateLobbyPlayer({ name: localName });
		} catch {
			error = m.common_name_save_failed;
		}
	}

	function getLobbyPlayersForGame() {
		return (
			$multiplayerStore.lobby?.players.map(
				(player) => new Player(player.name, player.image as PlayerImage, player.position, player.id)
			) ?? []
		);
	}
</script>

<div class="shadow-grey mt-6 flex flex-col gap-4 rounded-xl p-4 ring ring-gray-600">
	<h3 class="text-lg">{m.multi_heading()}</h3>

	{#if !$multiplayerStore.lobby}
		<div class="flex gap-2">
			<Button
				variant={setupMode === 'host' ? 'default' : 'outline'}
				onclick={() => (setupMode = 'host')}>{m.multi_host()}</Button
			>
			<Button
				variant={setupMode === 'join' ? 'default' : 'outline'}
				onclick={() => (setupMode = 'join')}>{m.multi_join()}</Button
			>
		</div>

		{#if setupMode === 'host'}
			<Button onclick={onCreate}>{m.multi_create()}</Button>
		{:else if setupMode === 'join'}
			<label for="multi-code">{m.multi_join_code()}</label>
			<Input id="multi-code" bind:value={code} placeholder="ABC123" />
			<Button data-testid="join-lobby-submit" onclick={onJoin} disabled={!code}
				>{m.multi_join()}</Button
			>
		{/if}
	{/if}

	{#if error}
		<p class="text-red-500">{error()}</p>
	{/if}

	{#if $multiplayerStore.lobby}
		<div class="rounded border p-3">
			<div class="rounded-xl border border-gray-500 bg-black/20 p-4 text-center">
				<p class="text-sm tracking-[0.2em] text-gray-300 uppercase">{m.multi_join()}</p>
				<p class="mt-2 text-3xl font-semibold tracking-[0.3em] text-white">
					{$multiplayerStore.lobby.code}
				</p>
				<p class="mt-3 text-sm text-gray-300">
					{m.common_scan_qr()}
				</p>
				{#if inviteUrl}
					<div class="mt-4 flex justify-center">
						<QrCode
							alt={m.common_join_with_code_alt({ code: $multiplayerStore.lobby.code })}
							value={inviteUrl}
						/>
					</div>
				{/if}
			</div>

			<div class="mt-3 rounded border border-gray-500 p-3">
				<label for="multi-name">{m.common_name()}</label>
				<Input id="multi-name" class="mt-2" bind:value={localName} onblur={onSaveName} />

				<Collapsible.Root class="mt-5">
					<Collapsible.Trigger
						class={buttonVariants({
							variant: 'ghost',
							size: 'sm',
							class: 'w-full justify-start p-2'
						})}
					>
						<div class="flex w-full items-center space-x-2">
							<h4 class="text-sm font-semibold">{m.common_choose_character()}</h4>
							<ChevronsUpDownIcon class="ml-auto" />
							<span class="sr-only">{m.common_toggle()}</span>
						</div>
					</Collapsible.Trigger>
					<Collapsible.Content>
						<div class="mt-2 grid w-full grid-cols-3 gap-2">
							<Toggle
								class="flex h-[unset] w-full flex-col items-center justify-center p-3"
								pressed={localImage === 'default'}
								onclick={(e) => {
									localImage = 'default';
									onSaveImage('default');
									e.preventDefault();
								}}
							>
								<p class="text-center text-xs">{m.common_no_character()}</p>
							</Toggle>
							{#each Object.entries(playerImages) as [name, image] (name)}
								<Toggle
									class="flex h-[unset] w-full flex-col items-center justify-center p-3"
									disabled={usedImages.has(name)}
									pressed={localImage === name}
									onclick={(e) => {
										localImage = name as PlayerImage;
										onSaveImage(name as PlayerImage);
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
			</div>

			<ul class="mt-4 space-y-1">
				{#each $multiplayerStore.lobby.players as player (player.id)}
					<li class="flex items-center gap-2">
						{#if player.image !== 'default' && player.image in playerImages}
							<img
								src={playerImages[player.image as keyof typeof playerImages]}
								alt={m.common_player_character_alt({ name: player.name })}
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
						disabled={$multiplayerStore.lobby.players.length < 2}>{m.multi_start()}</Button
					>
				</div>
			{:else if !$multiplayerStore.isHost && !$multiplayerStore.lobby.inGame}
				<p class="mt-6 text-center text-gray-400">{m.multi_waiting_start()}</p>
			{/if}
			{#if $multiplayerStore.lobby.inGame}
				<div class="mt-4">
					<Button
						onclick={() => {
							gameStateStore.update((state) => ({
								...(state.inGame
									? state
									: {
											...state,
											players: getLobbyPlayersForGame(),
											currentTurnPlayerId:
												state.currentTurnPlayerId ??
												$multiplayerStore.lobby?.players[0]?.id ??
												null,
											turnInProgress: false,
											turnOwnerId: null,
											phase: 'idle',
											activeTilePosition: null,
											activeTileTrigger: null,
											activeTileSessionId: 0,
											diceValue: null,
											inGame: true
										})
							}));
						}}>{m.multi_go_to_game()}</Button
					>
				</div>
			{/if}
		</div>
	{/if}
</div>
