<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import PlayerSelector from './PlayerSelector.svelte';
	import type { Player } from '$lib/player';
	import { lastTilePosition } from './Game.svelte';
	import { playerImages } from './playerImages';
	import QrCode from '$lib/components/ui/QrCode.svelte';
	import { buildJoinGameUrl } from '$lib/multiplayer/invite';
	import { Input } from '$lib/components/ui/input';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import Toggle from '$lib/components/ui/toggle/toggle.svelte';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import { buttonVariants } from '$lib/components/ui/button';
	import {
		multiplayerStore,
		quitCurrentGame,
		removeLobbyPlayer,
		updateLobbyPlayer
	} from '$lib/multiplayer/client';
	import { canRemovePlayer as canRemoveMultiplayerPlayer } from '$lib/multiplayer/playerPermissions';

	interface Props {
		players: Player[];
		onSubmit: (players: Player[]) => void;
		mode?: 'single' | 'multi';
		inviteCode?: string | null;
		disabled?: boolean;
	}

	let { players, onSubmit, mode = 'single', inviteCode = null, disabled = false }: Props = $props();
	let open = $state(false);
	type PlayerImage = keyof typeof playerImages | 'default';
	let localName = $state('');
	let localImage = $state<PlayerImage>('default');
	let multiplayerError = $state('');

	const multiplayerPlayers = $derived.by(() => {
		if (mode !== 'multi') {
			return players;
		}

		return ($multiplayerStore.lobby?.players as Player[] | undefined) ?? players;
	});

	const localPlayer = $derived.by(() => {
		if (!$multiplayerStore.playerId) {
			return null;
		}

		return multiplayerPlayers.find((player) => player.id === $multiplayerStore.playerId) ?? null;
	});

	const usedImages = $derived.by(() => {
		const localPlayerId = $multiplayerStore.playerId;
		return new Set(
			multiplayerPlayers
				.filter((player) => player.id !== localPlayerId && player.image !== 'default')
				.map((player) => player.image as PlayerImage)
		);
	});

	const inviteUrl = $derived.by(() => {
		if (typeof window === 'undefined' || !inviteCode) {
			return null;
		}

		return buildJoinGameUrl(inviteCode, window.location.origin);
	});

	$effect(() => {
		if (disabled && open) {
			open = false;
		}
	});

	$effect(() => {
		if (!localPlayer) {
			return;
		}

		localName = localPlayer.name;
		localImage = (localPlayer.image in playerImages ? localPlayer.image : 'default') as PlayerImage;
	});

	function canRemovePlayer(playerId?: string) {
		return canRemoveMultiplayerPlayer({
			isHost: $multiplayerStore.isHost,
			actorId: $multiplayerStore.playerId,
			targetPlayerId: playerId
		});
	}

	async function onSaveName() {
		if (!localName.trim()) {
			multiplayerError = 'Nimi on pakollinen';
			return;
		}

		try {
			multiplayerError = '';
			await updateLobbyPlayer({ name: localName.trim() });
		} catch {
			multiplayerError = 'Nimen tallennus epäonnistui';
		}
	}

	async function onSaveImage(image: PlayerImage) {
		try {
			multiplayerError = '';
			await updateLobbyPlayer({ image });
		} catch {
			multiplayerError = 'Hahmon tallennus epäonnistui (hahmo voi olla jo valittu)';
		}
	}

	async function onRemovePlayer(playerId?: string) {
		if (!playerId || !canRemovePlayer(playerId)) {
			return;
		}

		try {
			multiplayerError = '';
			await removeLobbyPlayer(playerId);
			if (playerId === $multiplayerStore.playerId) {
				open = false;
			}
		} catch {
			multiplayerError = 'Pelaajan poistaminen epäonnistui';
		}
	}

	async function onQuitGame() {
		await quitCurrentGame();
		open = false;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger>
		<Button size="lg" class="m-auto grow-0" variant="outline" {disabled}>Muokkaa pelaajia</Button>
	</Dialog.Trigger>
	<Dialog.Content class="max-h-[calc(100vh-24px)] overflow-y-auto sm:max-w-[425px]">
		{#if mode === 'multi'}
			<div class="space-y-4">
				{#if inviteCode && inviteUrl}
					<div class="rounded-xl border border-gray-500 bg-black/20 p-4 text-center">
						<p class="text-sm tracking-[0.2em] text-gray-300 uppercase">Liity kesken pelin</p>
						<p class="mt-2 text-3xl font-semibold tracking-[0.3em] text-white">{inviteCode}</p>
						<p class="mt-3 text-sm text-gray-300">
							Skannaa QR-koodi, niin liittymiskoodi tayttyy automaattisesti.
						</p>
						<div class="mt-4 flex justify-center">
							<QrCode alt={`Liity peliin koodilla ${inviteCode}`} value={inviteUrl} />
						</div>
					</div>
				{/if}

				{#if localPlayer}
					<div class="rounded border border-gray-500 p-3">
						<label for="in-game-multi-name" class="text-sm">Nimi</label>
						<Input
							id="in-game-multi-name"
							class="mt-2"
							bind:value={localName}
							onblur={onSaveName}
						/>

						<Collapsible.Root class="mt-4">
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
											onSaveImage('default');
											e.preventDefault();
										}}
									>
										<p class="text-center text-xs">Ei hahmoa</p>
									</Toggle>
									{#each Object.entries(playerImages) as [name, image] (name)}
										<Toggle
											class="flex h-[unset] w-full flex-col items-center justify-center p-3"
											disabled={usedImages.has(name as PlayerImage)}
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
				{/if}

				<div>
					<h3 class="text-lg font-semibold">Pelaajat</h3>
					<ul class="mt-3 space-y-2">
						{#each multiplayerPlayers as player (player.id)}
							<li class="flex items-center gap-3 rounded-lg border border-gray-500 p-3">
								{#if player.image !== 'default' && player.image in playerImages}
									<img
										src={playerImages[player.image as keyof typeof playerImages]}
										alt={`${player.name} hahmo`}
										class="h-10 w-10 object-contain"
									/>
								{:else}
									<div class="h-10 w-10 rounded-full bg-gray-700"></div>
								{/if}
								<div>
									<p class="font-medium">{player.name}</p>
									<p class="text-sm text-gray-400">Ruutu {player.position}</p>
								</div>
								<Button
									type="button"
									class="ml-auto"
									variant="outline"
									disabled={!canRemovePlayer(player.id)}
									onclick={() => onRemovePlayer(player.id)}
								>
									Poista
								</Button>
							</li>
						{/each}
					</ul>
				</div>

				{#if multiplayerError}
					<p class="text-red-500">{multiplayerError}</p>
				{/if}

				<Button type="button" class="w-full" variant="destructive" onclick={onQuitGame}
					>Poistu pelistä</Button
				>
			</div>
		{:else}
			<div class="space-y-4">
				<PlayerSelector
					submitText="Tallenna"
					compact={true}
					onSubmit={(players) => {
						onSubmit(players);
						open = false;
					}}
					onPlayerAdd={(player) => {
						player.position = Math.min(
							Math.floor(players.map((p) => p.position).reduce((a, b) => a + b, 0) / players.length),
							lastTilePosition - 1
						);
						return player;
					}}
					{players}
				/>

				<Button type="button" class="w-full" variant="destructive" onclick={onQuitGame}
					>Poistu pelistä</Button
				>
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>
