<script lang="ts">
	import Dice from '$lib/components/ui/dice/Dice.svelte';
	import type { ElementPropsTile } from './elementProps';

	let stage = $state<'waitingForRoll' | 'rolling'>('waitingForRoll');

	interface DiceRollBackProps extends ElementPropsTile {
		multiplier?: number;
	}

	const {
		multiplier = 1,
		movePlayer,
		currentPlayerIndex,
		setActionButtonText,
		tileState,
		setTileState,
		canAct = true
	}: DiceRollBackProps = $props();

	setActionButtonText?.('Heitä noppaa');

	// Non-acting player: mirror stage from tileState
	$effect(() => {
		if (canAct) return;
		const remoteStage = tileState?.['dice_stage'] as string | undefined;
		if (remoteStage === 'rolling' && stage !== 'rolling') {
			stage = 'rolling';
			setActionButtonText?.('Pyöritetään..');
		}
	});

	export function onActionButtonClick() {
		if (!canAct) return;
		if (stage === 'waitingForRoll') {
			stage = 'rolling';
			setTileState?.((prev) => ({ ...prev, dice_stage: 'rolling' }));
			setActionButtonText?.('Pyöritetään..');
		}
	}
</script>

{#if stage === 'rolling'}
	<Dice
		result={(results) => {
			if (!canAct) return;
			setActionButtonText?.(null);
			movePlayer(-results[0] * multiplier, currentPlayerIndex);
		}}
		changesBeforeSettle={30}
	/>
{/if}
