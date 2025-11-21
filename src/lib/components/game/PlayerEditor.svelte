<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import PlayerSelector from './PlayerSelector.svelte';
	import type { Player } from '$lib/player';
	import { lastTilePosition } from './Game.svelte';

	interface Props {
		players: Player[];
		onSubmit: (players: Player[]) => void;
	}

	let { players, onSubmit }: Props = $props();
	let open = $state(false);
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger>
		<Button size="lg" class="m-auto grow-0" variant="outline">Muokkaa pelaajia</Button>
	</Dialog.Trigger>
	<Dialog.Content class="max-h-[calc(100vh-24px)] overflow-y-auto sm:max-w-[425px]">
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
					// Joining player cannot instantly win
					lastTilePosition - 1
				);
				return player;
			}}
			{players}
		/>
	</Dialog.Content>
</Dialog.Root>
