<script lang="ts">
	import Dice from '$lib/components/ui/dice/Dice.svelte';
	import type { ElementPropsTile } from './elementProps';

	let stage = $state<'waitingForRoll' | 'rolling'>('waitingForRoll');

	const { movePlayer, currentPlayerIndex, setActionButtonText }: ElementPropsTile = $props();

	setActionButtonText?.('Heitä noppaa');

	export function onActionButtonClick() {
		if (stage === 'waitingForRoll') {
			stage = 'rolling';
			setActionButtonText?.('Pyöritetään..');
		}
	}
</script>

{#if stage === 'rolling'}
	<Dice
		result={(results) => {
			setActionButtonText?.(null);
			if (results[0] === 6) {
				movePlayer(1, currentPlayerIndex);
			} else {
				movePlayer(-1, currentPlayerIndex, false);
			}
		}}
		changesBeforeSettle={30}
	/>
{/if}
