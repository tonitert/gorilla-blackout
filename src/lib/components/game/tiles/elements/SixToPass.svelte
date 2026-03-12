<script lang="ts">
	import Dice from '$lib/components/ui/dice/Dice.svelte';
	import type { ElementPropsTile } from './elementProps';
	import { getDiceTileButtonText, type DiceTileStage } from './advancedTileState';

	let stage = $state<DiceTileStage>('waitingForRoll');
	const stageKey = 'dice_stage';

	const {
		movePlayer,
		currentPlayerIndex,
		setActionButtonText,
		tileState,
		setTileState,
		canAct = true
	}: ElementPropsTile = $props();

	function setStage(nextStage: DiceTileStage, options: { broadcast?: boolean } = {}) {
		const { broadcast = canAct } = options;
		stage = nextStage;

		if (broadcast) {
			setTileState?.((prev) =>
				prev[stageKey] === nextStage ? prev : { ...prev, [stageKey]: nextStage }
			);
		}
	}

	$effect(() => {
		setActionButtonText?.(getDiceTileButtonText(stage));
	});

	$effect(() => {
		const remoteStage = tileState?.[stageKey];

		if (typeof remoteStage === 'string' && remoteStage !== stage) {
			setStage(remoteStage as DiceTileStage, { broadcast: false });
		}
	});

	export function onActionButtonClick() {
		if (!canAct) return;
		if (stage === 'waitingForRoll') {
			setStage('rolling');
		}
	}
</script>

{#if stage === 'rolling'}
	<Dice
		result={(results) => {
			if (!canAct) return;
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
