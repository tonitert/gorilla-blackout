<script lang="ts">
	import { onMount } from 'svelte';
	import { ElementPropsTile } from './elementProps';
	import { getRandomIntExcluding } from '$lib/helpers/wait';
	import { isValidTargetIndex } from './advancedTileState';

	const targetKey = 'challenge_targetIndex';
	const {
		players,
		currentPlayerIndex,
		tileState,
		setTileState,
		canAct = true
	}: ElementPropsTile = $props();
	let targetIndex = $state<number | null>(null);

	function applyTarget(nextTargetIndex: number, options: { broadcast?: boolean } = {}) {
		const { broadcast = canAct } = options;

		if (!isValidTargetIndex(players.length, currentPlayerIndex, nextTargetIndex)) {
			return;
		}

		targetIndex = nextTargetIndex;

		if (broadcast) {
			setTileState?.((prev) =>
				prev[targetKey] === nextTargetIndex ? prev : { ...prev, [targetKey]: nextTargetIndex }
			);
		}
	}

	onMount(() => {
		if (!canAct) return;

		const remoteTargetIndex = tileState?.[targetKey];

		if (isValidTargetIndex(players.length, currentPlayerIndex, remoteTargetIndex)) {
			applyTarget(remoteTargetIndex, { broadcast: false });
			return;
		}

		applyTarget(getRandomIntExcluding(0, players.length, currentPlayerIndex));
	});

	$effect(() => {
		const remoteTargetIndex = tileState?.[targetKey];

		if (
			isValidTargetIndex(players.length, currentPlayerIndex, remoteTargetIndex) &&
			remoteTargetIndex !== targetIndex
		) {
			applyTarget(remoteTargetIndex, { broadcast: false });
		}
	});
</script>

{#if targetIndex !== null}
	<p class="text-center text-xl">
		Pelaaja {players[targetIndex].name} keksii sinulle haasteen! Jos et tee haastetta, juo 10 huikkaa.
	</p>
{/if}
