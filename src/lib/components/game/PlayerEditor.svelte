<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import PlayerSelector from './PlayerSelector.svelte';
	import type { Player } from '$lib/player';
	import { lastTilePosition } from './Game.svelte';
	import { playerImages } from './playerImages';
	import QrCode from '$lib/components/ui/QrCode.svelte';
	import { buildJoinGameUrl } from '$lib/multiplayer/invite';

	interface Props {
		players: Player[];
		onSubmit: (players: Player[]) => void;
		mode?: 'single' | 'multi';
		inviteCode?: string | null;
	}

	let { players, onSubmit, mode = 'single', inviteCode = null }: Props = $props();
	let open = $state(false);
	const inviteUrl = $derived.by(() => {
		if (typeof window === 'undefined' || !inviteCode) {
			return null;
		}

		return buildJoinGameUrl(inviteCode, window.location.origin);
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger>
		<Button size="lg" class="m-auto grow-0" variant="outline">Muokkaa pelaajia</Button>
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

				<div>
					<h3 class="text-lg font-semibold">Pelaajat</h3>
					<ul class="mt-3 space-y-2">
						{#each players as player (player.id)}
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
							</li>
						{/each}
					</ul>
				</div>
			</div>
		{:else}
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
		{/if}
	</Dialog.Content>
</Dialog.Root>
